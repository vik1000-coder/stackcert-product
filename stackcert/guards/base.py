from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from stackcert.data.schemas import BenchmarkExample, GuardOutput


class GuardAdapter(Protocol):
    guard_id: str

    def score(self, example: BenchmarkExample) -> GuardOutput:
        ...


@dataclass(frozen=True)
class AdapterDecision:
    binary_pass: bool
    raw_score: float | None = None
    pass_probability: float | None = None
    block_probability: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


def normalize_decision(
    *,
    run_id: str,
    guard_id: str,
    example_id: str,
    binary_pass: bool,
    raw_score: float | None = None,
    pass_probability: float | None = None,
    block_probability: float | None = None,
    metadata: dict[str, Any] | None = None,
    error: str | None = None,
) -> GuardOutput:
    if block_probability is None:
        if pass_probability is None:
            block_probability = 0.0 if binary_pass else 1.0
        else:
            block_probability = 1.0 - pass_probability
    if pass_probability is None:
        pass_probability = 1.0 - block_probability

    return GuardOutput(
        run_id=run_id,
        example_id=example_id,
        guard_id=guard_id,
        pass_probability=max(0.0, min(1.0, pass_probability)),
        block_probability=max(0.0, min(1.0, block_probability)),
        binary_pass=binary_pass,
        raw_score=raw_score,
        output_metadata=metadata or {},
        error=error,
    )

