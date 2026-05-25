from __future__ import annotations

import json
import socket
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any
from urllib.error import HTTPError, URLError

from stackcert.data.schemas import BenchmarkExample, GuardOutput
from stackcert.guards.base import normalize_decision


class RESTGuardAdapterError(RuntimeError):
    def __init__(self, message: str, *, error_class: str = "provider_unavailable", status_code: int | None = None):
        super().__init__(message)
        self.error_class = error_class
        self.status_code = status_code


@dataclass
class RESTGuardAdapter:
    guard_id: str
    endpoint_url: str
    run_id: str = "rest_adapter"
    timeout_sec: int = 60
    threshold: float = 0.5
    headers: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    raise_on_error: bool = False

    def score(self, example: BenchmarkExample) -> GuardOutput:
        payload = {
            "guard_id": self.guard_id,
            "run_id": self.run_id,
            "example_id": example.example_id,
            "cell_id": example.cell_id,
            "prompt_hash": example.prompt_hash,
            "prompt": example.prompt_text or example.prompt_redacted,
            "prompt_redacted": example.prompt_redacted,
            "source": example.source,
            "policy_category": example.policy_category or example.metadata.get("policy_category"),
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
        except Exception as exc:
            error = self._adapter_error(exc)
            if self.raise_on_error:
                raise error from exc
            return normalize_decision(
                run_id=self.run_id,
                guard_id=self.guard_id,
                example_id=example.example_id,
                binary_pass=False,
                block_probability=1.0,
                metadata={**self.metadata, "adapter": "rest_guard", "error_class": error.error_class},
                error=str(error),
            )

    def _parse_response(self, example: BenchmarkExample, data: dict[str, Any]) -> GuardOutput:
        block_probability = _coerce_optional_probability(data.get("block_probability"))
        if block_probability is None and data.get("risk_score") is not None:
            block_probability = _coerce_probability(data.get("risk_score"))
        if block_probability is None and data.get("score") is not None:
            block_probability = _coerce_probability(data.get("score"))

        if "binary_pass" in data:
            binary_pass = _coerce_bool(data["binary_pass"])
        elif "safe" in data:
            binary_pass = _coerce_bool(data["safe"])
        elif "block" in data:
            binary_pass = not _coerce_bool(data["block"])
        elif "unsafe" in data:
            binary_pass = not _coerce_bool(data["unsafe"])
        elif "binary_block" in data:
            binary_pass = not _coerce_bool(data["binary_block"])
        elif block_probability is not None:
            binary_pass = block_probability < self.threshold
        else:
            raise ValueError("REST guard response must include binary_pass, safe, block, unsafe, or a score")

        metadata = dict(self.metadata)
        metadata.update({"adapter": "rest_guard", "endpoint_host": _safe_endpoint_host(self.endpoint_url)})
        metadata.update(dict(data.get("metadata") or {}))
        metadata.update(_usage_metadata(data))
        return normalize_decision(
            run_id=self.run_id,
            guard_id=self.guard_id,
            example_id=example.example_id,
            binary_pass=binary_pass,
            raw_score=_coerce_optional_float(data.get("raw_score", data.get("score"))),
            pass_probability=_coerce_optional_probability(data.get("pass_probability")),
            block_probability=block_probability,
            metadata=metadata,
        )

    @staticmethod
    def _adapter_error(exc: Exception) -> RESTGuardAdapterError:
        if isinstance(exc, RESTGuardAdapterError):
            return exc
        if isinstance(exc, HTTPError):
            try:
                body = exc.read(240).decode("utf-8", errors="replace") if exc.fp else ""
            finally:
                exc.close()
            error_class = _http_error_class(exc.code)
            return RESTGuardAdapterError(
                f"REST guard returned HTTP {exc.code}: {body or exc.reason}",
                error_class=error_class,
                status_code=exc.code,
            )
        if isinstance(exc, TimeoutError | socket.timeout):
            return RESTGuardAdapterError("REST guard request timed out", error_class="timeout")
        if isinstance(exc, URLError):
            reason = str(exc.reason)
            error_class = "timeout" if "timed out" in reason.lower() else "provider_unavailable"
            return RESTGuardAdapterError(f"REST guard request failed: {reason}", error_class=error_class)
        if isinstance(exc, json.JSONDecodeError):
            return RESTGuardAdapterError("REST guard response was not valid JSON", error_class="invalid_configuration")
        if isinstance(exc, ValueError):
            return RESTGuardAdapterError(str(exc), error_class="invalid_configuration")
        return RESTGuardAdapterError(f"{type(exc).__name__}: {exc}", error_class="worker_exception")


def _http_error_class(status_code: int) -> str:
    if status_code in {408, 504}:
        return "timeout"
    if status_code == 429:
        return "rate_limited"
    if status_code in {500, 502, 503}:
        return "provider_unavailable"
    if status_code in {400, 401, 403, 404, 422}:
        return "invalid_configuration"
    return "http_error"


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "safe", "pass", "allow", "allowed"}:
        return True
    if normalized in {"0", "false", "no", "n", "unsafe", "block", "blocked", "deny", "denied"}:
        return False
    raise ValueError(f"Could not parse REST guard boolean value: {value!r}")


def _coerce_probability(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Could not parse REST guard probability: {value!r}") from exc
    return max(0.0, min(1.0, parsed))


def _coerce_optional_probability(value: Any) -> float | None:
    if value is None:
        return None
    return _coerce_probability(value)


def _coerce_optional_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Could not parse REST guard score: {value!r}") from exc


def _safe_endpoint_host(endpoint_url: str) -> str:
    try:
        return urllib.parse.urlparse(endpoint_url).netloc
    except Exception:
        return "unknown"


def _usage_metadata(data: dict[str, Any]) -> dict[str, int]:
    usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
    candidates = {
        "usage_input_tokens": data.get("input_tokens", usage.get("input_tokens", usage.get("prompt_tokens"))),
        "usage_output_tokens": data.get("output_tokens", usage.get("output_tokens", usage.get("completion_tokens"))),
        "usage_total_tokens": data.get("total_tokens", usage.get("total_tokens")),
    }
    parsed: dict[str, int] = {}
    for key, value in candidates.items():
        if value is None:
            continue
        try:
            parsed[key] = max(0, int(value))
        except (TypeError, ValueError):
            continue
    return parsed
