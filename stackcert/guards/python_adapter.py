from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from stackcert.data.schemas import BenchmarkExample, GuardOutput
from stackcert.guards.base import AdapterDecision, normalize_decision


PythonGuardFn = Callable[[BenchmarkExample], AdapterDecision | bool | dict[str, Any]]


@dataclass
class PythonGuardAdapter:
    guard_id: str
    fn: PythonGuardFn
    run_id: str = "python_adapter"
    metadata: dict[str, Any] = field(default_factory=dict)

    def score(self, example: BenchmarkExample) -> GuardOutput:
        try:
            result = self.fn(example)
            decision = self._coerce(result)
            metadata = dict(self.metadata)
            metadata.update(decision.metadata)
            return normalize_decision(
                run_id=self.run_id,
                guard_id=self.guard_id,
                example_id=example.example_id,
                binary_pass=decision.binary_pass,
                raw_score=decision.raw_score,
                pass_probability=decision.pass_probability,
                block_probability=decision.block_probability,
                metadata=metadata,
            )
        except Exception as exc:  # pragma: no cover - exercised by integration users
            return normalize_decision(
                run_id=self.run_id,
                guard_id=self.guard_id,
                example_id=example.example_id,
                binary_pass=False,
                block_probability=1.0,
                metadata=dict(self.metadata),
                error=repr(exc),
            )

    @staticmethod
    def _coerce(result: AdapterDecision | bool | dict[str, Any]) -> AdapterDecision:
        if isinstance(result, AdapterDecision):
            return result
        if isinstance(result, bool):
            return AdapterDecision(binary_pass=result)
        if isinstance(result, dict):
            if "binary_pass" in result:
                binary_pass = bool(result["binary_pass"])
            elif "binary_block" in result:
                binary_pass = not bool(result["binary_block"])
            elif "block" in result:
                binary_pass = not bool(result["block"])
            else:
                raise ValueError("Python guard dict must include binary_pass, binary_block, or block")
            return AdapterDecision(
                binary_pass=binary_pass,
                raw_score=result.get("raw_score"),
                pass_probability=result.get("pass_probability"),
                block_probability=result.get("block_probability"),
                metadata=dict(result.get("metadata") or {}),
            )
        raise TypeError(f"unsupported Python guard result: {type(result)!r}")

