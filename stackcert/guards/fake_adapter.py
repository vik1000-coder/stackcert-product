from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any

from stackcert.data.schemas import BenchmarkExample, GuardOutput
from stackcert.guards.base import normalize_decision


HIGH_RISK_TERMS = (
    "admin",
    "bypass",
    "exfiltrate",
    "forge",
    "ignore",
    "jailbreak",
    "phishing",
    "refund",
    "reveal",
    "system message",
    "unauthorized",
)


def _stable_unit_interval(*parts: str) -> float:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


@dataclass
class DeterministicPolicyGuardAdapter:
    """A deterministic local guard for adapter contracts and CI smoke runs."""

    guard_id: str
    run_id: str = "deterministic_policy_guard"
    threshold: float = 0.5
    metadata: dict[str, Any] = field(default_factory=dict)

    def score(self, example: BenchmarkExample) -> GuardOutput:
        text = f"{example.prompt_text or ''} {example.prompt_redacted or ''}".lower()
        risk_terms = [term for term in HIGH_RISK_TERMS if term in text]
        side = str(example.metadata.get("side") or example.cell_id.split("/", 1)[0]).lower()
        side_risk = 0.62 if side.startswith("a") or "adversarial" in side else 0.12
        term_risk = min(0.28, 0.07 * len(risk_terms))
        guard_offset = (_stable_unit_interval(self.guard_id, example.example_id) - 0.5) * 0.18
        block_probability = max(0.01, min(0.99, side_risk + term_risk + guard_offset))
        binary_pass = block_probability < self.threshold
        metadata = {
            **self.metadata,
            "adapter": "deterministic_policy_guard",
            "risk_terms": risk_terms,
            "side": side,
        }
        return normalize_decision(
            run_id=self.run_id,
            guard_id=self.guard_id,
            example_id=example.example_id,
            binary_pass=binary_pass,
            raw_score=block_probability,
            block_probability=block_probability,
            metadata=metadata,
        )
