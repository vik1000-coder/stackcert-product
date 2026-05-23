from __future__ import annotations

import uuid
from dataclasses import dataclass

from stackcert.cass.intervals import pair_interval_for
from stackcert.cass.moments import (
    architecture_name,
    build_candidate_architectures,
    compute_first_order,
    compute_pair_statistics,
    examples_by_cell,
    normalize_cell_weights,
    pair_key,
    outputs_index,
)
from stackcert.cass.residuals import residual_radius
from stackcert.cass.welfare import clipped_probability, welfare_from_sides
from stackcert.data.schemas import (
    Architecture,
    BenchmarkCell,
    BenchmarkExample,
    ComparisonCertificate,
    FirstOrderStats,
    Guard,
    GuardOutput,
    PairInterval,
    PairStatistics,
    StackCertificate,
    ValidationReport,
    WelfareEstimate,
    WelfareProfile,
    utc_now_iso,
)
from stackcert.data.validation import validate_project


@dataclass
class CassEngine:
    guards: list[Guard]
    cells: list[BenchmarkCell]
    examples: list[BenchmarkExample]
    outputs: list[GuardOutput]
    welfare_profile: WelfareProfile
    run_id: str = "default"
    max_k: int = 2
    rho_prior: float = 0.6
    measured_pairs: set[tuple[tuple[str, str], str]] | None = None
    use_feasible_bounds: bool = True
    reveal_oracle_for_invalid_prior: bool = True

    def __post_init__(self) -> None:
        self.guards = sorted(self.guards, key=lambda guard: guard.guard_id)
        self.cells = sorted(self.cells, key=lambda cell: cell.cell_id)
        self.cell_weights = normalize_cell_weights(self.cells)
        self.validation_report = validate_project(self.guards, self.cells, self.examples, self.outputs)
        if not self.validation_report.complete:
            messages = "; ".join(issue.message for issue in self.validation_report.issues if issue.severity == "error")
            raise ValueError(f"cannot certify incomplete project: {messages}")

        self.architectures = build_candidate_architectures(self.guards, max_k=self.max_k)
        self.first_order = compute_first_order(self.guards, self.cells, self.examples, self.outputs)
        self.pair_statistics = compute_pair_statistics(
            self.guards,
            self.cells,
            self.examples,
            self.outputs,
            self.first_order,
            run_id=self.run_id,
        )
        self.measured_pairs = set(self.measured_pairs or set())
        self.pair_intervals = self._build_pair_intervals()

    def with_measured_pairs(self, measured_pairs: set[tuple[tuple[str, str], str]]) -> "CassEngine":
        clone = object.__new__(CassEngine)
        clone.guards = self.guards
        clone.cells = self.cells
        clone.examples = self.examples
        clone.outputs = self.outputs
        clone.welfare_profile = self.welfare_profile
        clone.run_id = self.run_id
        clone.max_k = self.max_k
        clone.rho_prior = self.rho_prior
        clone.measured_pairs = set(measured_pairs)
        clone.use_feasible_bounds = self.use_feasible_bounds
        clone.reveal_oracle_for_invalid_prior = self.reveal_oracle_for_invalid_prior
        clone.cell_weights = self.cell_weights
        clone.validation_report = self.validation_report
        clone.architectures = self.architectures
        clone.first_order = self.first_order
        clone.pair_statistics = self.pair_statistics
        clone.pair_intervals = clone._build_pair_intervals()
        return clone

    def _build_pair_intervals(self) -> dict[tuple[tuple[str, str], str], PairInterval]:
        intervals: dict[tuple[tuple[str, str], str], PairInterval] = {}
        for key, stats in self.pair_statistics.items():
            pair, cell_id = key
            cell = self.cell_by_id[cell_id]
            intervals[key] = pair_interval_for(
                pair,
                cell,
                stats,
                self.first_order,
                measured_pairs=self.measured_pairs,
                rho_prior=self.rho_prior,
                use_feasible_bounds=self.use_feasible_bounds,
                reveal_oracle_for_invalid_prior=self.reveal_oracle_for_invalid_prior,
            )
        return intervals

    @property
    def cell_by_id(self) -> dict[str, BenchmarkCell]:
        return {cell.cell_id: cell for cell in self.cells}

    @property
    def guard_ids(self) -> tuple[str, ...]:
        return tuple(guard.guard_id for guard in self.guards)

    def first_order_stats(self, guard_id: str, cell_id: str) -> FirstOrderStats:
        return self.first_order[(guard_id, cell_id)]

    def pair_interval(self, pair: tuple[str, str], cell_id: str) -> PairInterval:
        return self.pair_intervals[(pair_key(*pair), cell_id)]

    def pair_coeff(self, architecture: Architecture, pair: tuple[str, str], cell_id: str) -> float:
        if architecture.size != 2:
            return 0.0
        arch_pair = pair_key(*architecture.guard_ids)
        if arch_pair != pair_key(*pair):
            return 0.0
        a, b = arch_pair
        return self.first_order_stats(a, cell_id).std_block * self.first_order_stats(b, cell_id).std_block

    def product_of_means(self, architecture: Architecture, cell_id: str) -> float:
        product = 1.0
        for guard_id in architecture.guard_ids:
            product *= self.first_order_stats(guard_id, cell_id).q_pass
        return product

    def serial_pass_interval(self, architecture: Architecture, cell_id: str) -> tuple[float, float, float]:
        if architecture.size == 1:
            center = self.product_of_means(architecture, cell_id)
            return center, center, center
        if architecture.size != 2:
            raise ValueError("this prototype supports exact serial pass intervals only for K<=2")
        pair = pair_key(*architecture.guard_ids)
        interval = self.pair_interval(pair, cell_id)
        coeff = self.pair_coeff(architecture, pair, cell_id)
        pi = self.product_of_means(architecture, cell_id)
        center = clipped_probability(pi + interval.center * coeff)
        low = clipped_probability(pi + interval.low * coeff)
        high = clipped_probability(pi + interval.high * coeff)
        return center, min(low, high), max(low, high)

    def welfare_estimate(self, architecture: Architecture) -> WelfareEstimate:
        benign_center = 0.0
        benign_low = 0.0
        benign_high = 0.0
        adv_center = 0.0
        adv_low = 0.0
        adv_high = 0.0
        for cell in self.cells:
            weight = self.cell_weights[cell.cell_id]
            center, low, high = self.serial_pass_interval(architecture, cell.cell_id)
            if cell.side == "benign":
                benign_center += weight * center
                benign_low += weight * low
                benign_high += weight * high
            else:
                adv_center += weight * center
                adv_low += weight * low
                adv_high += weight * high

        welfare_center = welfare_from_sides(benign_center, adv_center, self.welfare_profile.lambda_cost)
        welfare_low = benign_low - self.welfare_profile.lambda_cost * adv_high
        welfare_high = benign_high - self.welfare_profile.lambda_cost * adv_low
        return WelfareEstimate(
            architecture=architecture,
            welfare_center=welfare_center,
            welfare_low=welfare_low,
            welfare_high=welfare_high,
            benign_pass_center=benign_center,
            adversarial_miss_center=adv_center,
            residual_radius=residual_radius(architecture),
        )

    def welfare_estimates(self) -> list[WelfareEstimate]:
        return [self.welfare_estimate(architecture) for architecture in self.architectures]

    def comparison(self, incumbent: Architecture, competitor: Architecture) -> ComparisonCertificate:
        center = 0.0
        radius = 0.0
        for cell in self.cells:
            scale = self.cell_weights[cell.cell_id]
            if cell.side == "adversarial":
                scale *= -self.welfare_profile.lambda_cost
            abs_scale = abs(scale)
            center += scale * (
                self.product_of_means(incumbent, cell.cell_id)
                - self.product_of_means(competitor, cell.cell_id)
            )
            for pair in self.all_pairs:
                interval = self.pair_interval(pair, cell.cell_id)
                delta = self.pair_coeff(incumbent, pair, cell.cell_id) - self.pair_coeff(
                    competitor, pair, cell.cell_id
                )
                center += scale * interval.center * delta
                radius += abs_scale * interval.radius * abs(delta)
        gap_low = center - radius
        gap_high = center + radius
        return ComparisonCertificate(
            incumbent=incumbent,
            competitor=competitor,
            gap_center=center,
            gap_radius=radius,
            gap_low=gap_low,
            gap_high=gap_high,
            certified=gap_low > 1e-12,
        )

    @property
    def all_pairs(self) -> tuple[tuple[str, str], ...]:
        pairs = []
        ids = self.guard_ids
        for idx, a in enumerate(ids):
            for b in ids[idx + 1 :]:
                pairs.append(pair_key(a, b))
        return tuple(pairs)

    def all_comparisons(self) -> list[ComparisonCertificate]:
        rows: list[ComparisonCertificate] = []
        for incumbent in self.architectures:
            for competitor in self.architectures:
                if incumbent != competitor:
                    rows.append(self.comparison(incumbent, competitor))
        return rows

    def best_by_center(self) -> Architecture:
        estimates = self.welfare_estimates()
        return max(estimates, key=lambda estimate: estimate.welfare_center).architecture

    def best_by_lower_bound(self) -> Architecture:
        estimates = self.welfare_estimates()
        return max(estimates, key=lambda estimate: estimate.welfare_low).architecture

    def certified_winner(self) -> Architecture | None:
        for architecture in self.architectures:
            comparisons = [
                self.comparison(architecture, competitor)
                for competitor in self.architectures
                if competitor != architecture
            ]
            if comparisons and all(comparison.certified for comparison in comparisons):
                return architecture
        return None

    def current_recommendation(self) -> Architecture:
        return self.certified_winner() or self.best_by_lower_bound()

    def active_comparisons(self, architecture: Architecture | None = None) -> list[ComparisonCertificate]:
        incumbent = architecture or self.current_recommendation()
        rows = []
        for competitor in self.architectures:
            if competitor == incumbent:
                continue
            comparison = self.comparison(incumbent, competitor)
            if comparison.gap_low <= 1e-12:
                rows.append(comparison)
        return rows

    def top_cofailure_rows(self, *, side: str, limit: int = 10) -> list[PairStatistics]:
        rows = [
            stats
            for (pair, cell_id), stats in self.pair_statistics.items()
            if self.cell_by_id[cell_id].side == side
        ]
        metric = (lambda row: row.both_pass_rate) if side == "adversarial" else (lambda row: row.both_block_rate)
        return sorted(rows, key=lambda row: (metric(row), row.correlation), reverse=True)[:limit]

    def build_certificate(self, measurement_actions=()) -> StackCertificate:
        certified = self.certified_winner()
        recommended = certified or self.best_by_lower_bound()
        status = "certified_winner" if certified else "recommended_not_certified"
        comparisons = tuple(
            self.comparison(recommended, competitor)
            for competitor in self.architectures
            if competitor != recommended
        )
        return StackCertificate(
            certificate_id=f"cert_{uuid.uuid4().hex[:12]}",
            run_id=self.run_id,
            status=status,
            recommended_architecture=recommended,
            certified_architecture=certified,
            welfare_profile=self.welfare_profile,
            generated_at=utc_now_iso(),
            benchmark_cells=tuple(self.cells),
            candidate_architectures=tuple(self.architectures),
            welfare_estimates=tuple(self.welfare_estimates()),
            comparisons=comparisons,
            measurement_actions=tuple(measurement_actions),
            validation_report=self.validation_report,
            assumptions={
                "aggregation": "serial",
                "max_k": self.max_k,
                "rho_prior": self.rho_prior,
                "use_feasible_bounds": self.use_feasible_bounds,
                "residual_treatment": "zero for K<=2",
                "certificate_scope": "finite benchmark mixture",
            },
            limitations=(
                "The certificate is conditional on the specified benchmark mixture and candidate set.",
                "It is not a guarantee of universal deployment safety.",
                "Source shift, guard version changes, prompt changes, and policy changes require re-certification.",
                "This prototype supports exact K=2 serial stack certificates; larger stacks are out of scope.",
            ),
            recertification_triggers=(
                "Base model version changes",
                "Guardrail model, prompt, policy, or threshold changes",
                "Traffic mixture or benchmark weights drift",
                "New attack class or safety incident appears",
                "Certificate expiration date is reached",
            ),
        )
