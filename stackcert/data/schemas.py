from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal


Side = Literal["benign", "adversarial"]
Aggregation = Literal["serial"]
CertificateStatus = Literal[
    "certified_winner",
    "recommended_not_certified",
    "no_clear_winner",
    "source_fragile",
    "expired",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass(frozen=True)
class Guard:
    guard_id: str
    name: str
    version: str
    guard_type: str
    vendor: str | None = None
    threshold: float | None = None
    latency_ms: float | None = None
    unit_cost_usd: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass(frozen=True)
class BenchmarkCell:
    cell_id: str
    side: Side
    source: str
    weight: float
    policy_category: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass(frozen=True)
class BenchmarkExample:
    example_id: str
    cell_id: str
    prompt_hash: str
    prompt_redacted: str | None = None
    prompt_text: str | None = None
    source: str | None = None
    policy_category: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass(frozen=True)
class GuardOutput:
    run_id: str
    example_id: str
    guard_id: str
    pass_probability: float
    block_probability: float
    binary_pass: bool
    raw_score: float | None = None
    output_metadata: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    created_at: str = field(default_factory=utc_now_iso)

    @property
    def binary_block(self) -> bool:
        return not self.binary_pass


@dataclass(frozen=True)
class Architecture:
    architecture_id: str
    guard_ids: tuple[str, ...]
    aggregation: Aggregation = "serial"
    constraints: dict[str, Any] = field(default_factory=dict)

    @property
    def size(self) -> int:
        return len(self.guard_ids)


@dataclass(frozen=True)
class WelfareProfile:
    name: str
    lambda_cost: float
    adversarial_prior: float | None = None
    source_weights: dict[str, float] = field(default_factory=dict)
    business_rationale: str | None = None
    version: str = "v1"


@dataclass(frozen=True)
class FirstOrderStats:
    guard_id: str
    cell_id: str
    mu_block: float
    q_pass: float
    std_block: float
    n_examples: int


@dataclass(frozen=True)
class PairStatistics:
    run_id: str
    cell_id: str
    guard_id_a: str
    guard_id_b: str
    correlation: float
    feasible_low: float
    feasible_high: float
    both_pass_rate: float
    both_block_rate: float
    disagreement_rate: float
    n_examples: int

    @property
    def pair_key(self) -> tuple[str, str]:
        return tuple(sorted((self.guard_id_a, self.guard_id_b)))


@dataclass(frozen=True)
class PairInterval:
    guard_a: str
    guard_b: str
    cell_id: str
    side: Side
    low: float
    high: float
    center: float
    radius: float
    measured: bool
    feasible_low: float
    feasible_high: float
    n_examples: int

    @property
    def pair_key(self) -> tuple[str, str]:
        return tuple(sorted((self.guard_a, self.guard_b)))


@dataclass(frozen=True)
class WelfareEstimate:
    architecture: Architecture
    welfare_center: float
    welfare_low: float
    welfare_high: float
    benign_pass_center: float
    adversarial_miss_center: float
    residual_radius: float = 0.0


@dataclass(frozen=True)
class ComparisonCertificate:
    incumbent: Architecture
    competitor: Architecture
    gap_center: float
    gap_radius: float
    gap_low: float
    gap_high: float
    certified: bool


@dataclass(frozen=True)
class MeasurementAction:
    action_id: str
    run_id: str
    action_type: str
    guard_ids: tuple[str, ...]
    cell_id: str
    expected_radius_reduction: float
    cost_estimate: float
    status: str
    created_at: str = field(default_factory=utc_now_iso)


@dataclass(frozen=True)
class ValidationIssue:
    severity: Literal["error", "warning"]
    code: str
    message: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ValidationReport:
    examples: int
    guards: int
    outputs: int
    complete: bool
    issues: tuple[ValidationIssue, ...] = ()


@dataclass(frozen=True)
class StackCertificate:
    certificate_id: str
    run_id: str
    status: CertificateStatus
    recommended_architecture: Architecture
    certified_architecture: Architecture | None
    welfare_profile: WelfareProfile
    generated_at: str
    benchmark_cells: tuple[BenchmarkCell, ...]
    candidate_architectures: tuple[Architecture, ...]
    welfare_estimates: tuple[WelfareEstimate, ...]
    comparisons: tuple[ComparisonCertificate, ...]
    measurement_actions: tuple[MeasurementAction, ...]
    validation_report: ValidationReport
    assumptions: dict[str, Any]
    limitations: tuple[str, ...]
    recertification_triggers: tuple[str, ...]

