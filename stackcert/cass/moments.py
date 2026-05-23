from __future__ import annotations

import itertools
import math
from collections import defaultdict

from stackcert.data.schemas import (
    Architecture,
    BenchmarkCell,
    BenchmarkExample,
    FirstOrderStats,
    Guard,
    GuardOutput,
    PairStatistics,
)


def architecture_name(guard_ids: tuple[str, ...]) -> str:
    return "+".join(guard_ids)


def pair_key(a: str, b: str) -> tuple[str, str]:
    return tuple(sorted((a, b)))


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def pearson_corr(x: list[float], y: list[float]) -> float:
    if len(x) != len(y) or not x:
        return 0.0
    mx = mean(x)
    my = mean(y)
    vx = mean([(value - mx) ** 2 for value in x])
    vy = mean([(value - my) ** 2 for value in y])
    denom = math.sqrt(vx * vy)
    if denom < 1e-12:
        return 0.0
    cov = mean([(a - mx) * (b - my) for a, b in zip(x, y)])
    return max(-1.0, min(1.0, cov / denom))


def bernoulli_corr_bounds(mu1: float, mu2: float, eps: float = 1e-12) -> tuple[float, float]:
    denom = math.sqrt(mu1 * (1.0 - mu1) * mu2 * (1.0 - mu2))
    if denom < eps:
        return 0.0, 0.0
    p11_min = max(0.0, mu1 + mu2 - 1.0)
    p11_max = min(mu1, mu2)
    r_min = (p11_min - mu1 * mu2) / denom
    r_max = (p11_max - mu1 * mu2) / denom
    return max(-1.0, r_min), min(1.0, r_max)


def normalize_cell_weights(cells: list[BenchmarkCell]) -> dict[str, float]:
    total = sum(max(0.0, cell.weight) for cell in cells)
    if total <= 0.0:
        equal = 1.0 / len(cells) if cells else 0.0
        return {cell.cell_id: equal for cell in cells}
    return {cell.cell_id: max(0.0, cell.weight) / total for cell in cells}


def build_candidate_architectures(
    guards: list[Guard],
    *,
    max_k: int = 2,
    mandatory_guards: set[str] | None = None,
    forbidden_pairs: set[tuple[str, str]] | None = None,
) -> list[Architecture]:
    if max_k < 1:
        raise ValueError("max_k must be at least 1")
    if max_k > 2:
        raise ValueError("this prototype supports max_k <= 2")

    guard_ids = sorted(guard.guard_id for guard in guards)
    mandatory_guards = mandatory_guards or set()
    forbidden_pairs = {pair_key(*pair) for pair in (forbidden_pairs or set())}
    architectures: list[Architecture] = []

    for size in range(1, max_k + 1):
        for combo in itertools.combinations(guard_ids, size):
            if mandatory_guards and not mandatory_guards.issubset(combo):
                continue
            if size == 2 and pair_key(combo[0], combo[1]) in forbidden_pairs:
                continue
            architectures.append(Architecture(architecture_name(combo), combo))
    return architectures


def outputs_index(outputs: list[GuardOutput]) -> dict[tuple[str, str], GuardOutput]:
    return {(output.guard_id, output.example_id): output for output in outputs}


def examples_by_cell(examples: list[BenchmarkExample]) -> dict[str, list[BenchmarkExample]]:
    by_cell: dict[str, list[BenchmarkExample]] = defaultdict(list)
    for example in examples:
        by_cell[example.cell_id].append(example)
    return by_cell


def binary_blocks_for(
    guard_id: str,
    cell_examples: list[BenchmarkExample],
    by_output: dict[tuple[str, str], GuardOutput],
) -> list[float]:
    values: list[float] = []
    for example in cell_examples:
        key = (guard_id, example.example_id)
        if key not in by_output:
            raise ValueError(f"missing output for guard {guard_id} on example {example.example_id}")
        values.append(1.0 if by_output[key].binary_block else 0.0)
    return values


def compute_first_order(
    guards: list[Guard],
    cells: list[BenchmarkCell],
    examples: list[BenchmarkExample],
    outputs: list[GuardOutput],
) -> dict[tuple[str, str], FirstOrderStats]:
    by_cell = examples_by_cell(examples)
    by_output = outputs_index(outputs)
    stats: dict[tuple[str, str], FirstOrderStats] = {}
    for guard in guards:
        for cell in cells:
            values = binary_blocks_for(guard.guard_id, by_cell[cell.cell_id], by_output)
            mu = mean(values)
            stats[(guard.guard_id, cell.cell_id)] = FirstOrderStats(
                guard_id=guard.guard_id,
                cell_id=cell.cell_id,
                mu_block=mu,
                q_pass=1.0 - mu,
                std_block=math.sqrt(mu * (1.0 - mu)),
                n_examples=len(values),
            )
    return stats


def compute_pair_statistics(
    guards: list[Guard],
    cells: list[BenchmarkCell],
    examples: list[BenchmarkExample],
    outputs: list[GuardOutput],
    first_order: dict[tuple[str, str], FirstOrderStats],
    *,
    run_id: str,
) -> dict[tuple[tuple[str, str], str], PairStatistics]:
    by_cell = examples_by_cell(examples)
    by_output = outputs_index(outputs)
    stats: dict[tuple[tuple[str, str], str], PairStatistics] = {}
    guard_ids = sorted(guard.guard_id for guard in guards)
    for a, b in itertools.combinations(guard_ids, 2):
        pair = pair_key(a, b)
        for cell in cells:
            rows = by_cell[cell.cell_id]
            xa = binary_blocks_for(a, rows, by_output)
            xb = binary_blocks_for(b, rows, by_output)
            both_pass = mean([1.0 if x == 0.0 and y == 0.0 else 0.0 for x, y in zip(xa, xb)])
            both_block = mean([1.0 if x == 1.0 and y == 1.0 else 0.0 for x, y in zip(xa, xb)])
            disagreement = mean([1.0 if x != y else 0.0 for x, y in zip(xa, xb)])
            mu_a = first_order[(a, cell.cell_id)].mu_block
            mu_b = first_order[(b, cell.cell_id)].mu_block
            feasible_low, feasible_high = bernoulli_corr_bounds(mu_a, mu_b)
            stats[(pair, cell.cell_id)] = PairStatistics(
                run_id=run_id,
                cell_id=cell.cell_id,
                guard_id_a=pair[0],
                guard_id_b=pair[1],
                correlation=pearson_corr(xa, xb),
                feasible_low=feasible_low,
                feasible_high=feasible_high,
                both_pass_rate=both_pass,
                both_block_rate=both_block,
                disagreement_rate=disagreement,
                n_examples=len(rows),
            )
    return stats

