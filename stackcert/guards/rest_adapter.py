from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass, field
from typing import Any

from stackcert.data.schemas import BenchmarkExample, GuardOutput
from stackcert.guards.base import normalize_decision


@dataclass
class RESTGuardAdapter:
    guard_id: str
    endpoint_url: str
    run_id: str = "rest_adapter"
    timeout_sec: int = 60
    headers: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def score(self, example: BenchmarkExample) -> GuardOutput:
        payload = {
            "example_id": example.example_id,
            "prompt": example.prompt_text or example.prompt_redacted,
            "metadata": example.metadata,
        }
        request = urllib.request.Request(
            self.endpoint_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", **self.headers},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_sec) as response:
                data = json.loads(response.read().decode("utf-8"))
            return self._parse_response(example, data)
        except Exception as exc:  # pragma: no cover - network path
            return normalize_decision(
                run_id=self.run_id,
                guard_id=self.guard_id,
                example_id=example.example_id,
                binary_pass=False,
                block_probability=1.0,
                metadata=dict(self.metadata),
                error=repr(exc),
            )

    def _parse_response(self, example: BenchmarkExample, data: dict[str, Any]) -> GuardOutput:
        if "binary_pass" in data:
            binary_pass = bool(data["binary_pass"])
        elif "safe" in data:
            binary_pass = bool(data["safe"])
        elif "block" in data:
            binary_pass = not bool(data["block"])
        elif "unsafe" in data:
            binary_pass = not bool(data["unsafe"])
        else:
            raise ValueError("REST guard response must include binary_pass, safe, block, or unsafe")

        metadata = dict(self.metadata)
        metadata.update(dict(data.get("metadata") or {}))
        return normalize_decision(
            run_id=self.run_id,
            guard_id=self.guard_id,
            example_id=example.example_id,
            binary_pass=binary_pass,
            raw_score=data.get("raw_score") or data.get("score"),
            pass_probability=data.get("pass_probability"),
            block_probability=data.get("block_probability"),
            metadata=metadata,
        )

