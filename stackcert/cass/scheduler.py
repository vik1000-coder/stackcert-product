from __future__ import annotations

import itertools
import uuid
from dataclasses import dataclass

from stackcert.cass.certificates import CassEngine
from stackcert.cass.moments import pair_key
from stackcert.data.schemas import ComparisonCertificate, MeasurementAction


@dataclass(frozen=True)
class SchedulerResult:
    actions: tuple[MeasurementAction, ...]
    measured_pairs: frozenset[tuple[tuple[str, str], str]]
    final_engine: CassEngine


def selected_cells_to_pairs(selected_cells: set[tuple[str, str]]) -> set[tuple[tuple[str, str], str]]:
    by_cell: dict[str, set[str]] = {}
    for guard_id, cell_id in selected_cells:
        by_cell.setdefault(cell_id, set()).add(guard_id)
    measured: set[tuple[tuple[str, str], str]] = set()
    for cell_id, guards in by_cell.items():
        for a, b in itertools.combinations(sorted(guards), 2):
            measured.add((pair_key(a, b), cell_id))
    return measured


def bundle_gain(
    engine: CassEngine,
    *,
    cell_id: str,
    bundle_guards: tuple[str, ...],
    selected_cells: set[tuple[str, str]],
    active_comparisons: list[ComparisonCertificate],
) -> tuple[float, list[tuple[str, str]]]:
    current_guards = {guard_id for guard_id, selected_cell in selected_cells if selected_cell == cell_id}
    after_guards = current_guards.union(bundle_guards)
    measured_pairs = selected_cells_to_pairs(selected_cells).union(engine.measured_pairs)
    new_pairs: list[tuple[str, str]] = []
    for a, b in itertools.combinations(sorted(after_guards), 2):
        pair = pair_key(a, b)
        if (pair, cell_id) not in measured_pairs:
            new_pairs.append(pair)

    if not new_pairs:
        return 0.0, []

    if not active_comparisons:
        return 0.0, new_pairs

    cell = engine.cell_by_id[cell_id]
    abs_scale = engine.cell_weights[cell_id]
    if cell.side == "adversarial":
        abs_scale *= engine.welfare_profile.lambda_cost

    gain = 0.0
    for pair in new_pairs:
        interval = engine.pair_interval(pair, cell_id)
        if interval.radius <= 0.0:
            continue
        for comparison in active_comparisons:
            delta = engine.pair_coeff(comparison.incumbent, pair, cell_id) - engine.pair_coeff(
                comparison.competitor, pair, cell_id
            )
            gain += abs_scale * interval.radius * abs(delta)
    return gain, new_pairs


def greedy_measurement_plan(
    engine: CassEngine,
    *,
    budget_fraction: float,
    max_bundle_size: int = 3,
) -> SchedulerResult:
    total_agent_cells = len(engine.guards) * len(engine.cells)
    budget = int(round(budget_fraction * total_agent_cells))
    selected_cells: set[tuple[str, str]] = set()
    actions: list[MeasurementAction] = []
    current = engine

    while len(selected_cells) < budget and current.certified_winner() is None:
        remaining = budget - len(selected_cells)
        incumbent = current.current_recommendation()
        active = current.active_comparisons(incumbent)
        if not active:
            break
        best = None
        for cell in current.cells:
            for size in range(2, min(max_bundle_size, len(current.guards)) + 1):
                for guards in itertools.combinations(current.guard_ids, size):
                    new_cells = {(guard_id, cell.cell_id) for guard_id in guards if (guard_id, cell.cell_id) not in selected_cells}
                    cost = len(new_cells)
                    if cost == 0 or cost > remaining:
                        continue
                    gain, new_pairs = bundle_gain(
                        current,
                        cell_id=cell.cell_id,
                        bundle_guards=guards,
                        selected_cells=selected_cells,
                        active_comparisons=active,
                    )
                    if gain <= 0.0:
                        continue
                    score = gain / cost
                    candidate = (score, gain, cost, cell.cell_id, guards, new_cells, new_pairs)
                    if best is None or candidate > best:
                        best = candidate

        if best is None:
            break

        _, gain, cost, cell_id, guards, new_cells, _ = best
        selected_cells.update(new_cells)
        measured_pairs = selected_cells_to_pairs(selected_cells).union(current.measured_pairs)
        current = current.with_measured_pairs(measured_pairs)
        actions.append(
            MeasurementAction(
                action_id=f"act_{uuid.uuid4().hex[:10]}",
                run_id=current.run_id,
                action_type="measure_guard_bundle",
                guard_ids=tuple(guards),
                cell_id=cell_id,
                expected_radius_reduction=gain,
                cost_estimate=float(cost),
                status="recommended",
            )
        )

    measured_pairs = selected_cells_to_pairs(selected_cells).union(current.measured_pairs)
    return SchedulerResult(tuple(actions), frozenset(measured_pairs), current)
