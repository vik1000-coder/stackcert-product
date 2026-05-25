from __future__ import annotations

import hashlib
import json
from typing import Any

from stackcert_service.schemas import TraceImportPreviewRequest


def preview_trace_import(payload: TraceImportPreviewRequest) -> dict[str, Any]:
    rows = _jsonl_rows(payload.content)
    drafts: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        if row.get("_parse_error"):
            issues.append({"severity": "error", "row": index, "code": "parse_error", "message": row["_parse_error"]})
            continue
        prompt = _first_text(
            row,
            ("prompt", "input", "inputs.input", "inputs.prompt", "attributes.gen_ai.prompt", "attributes.input.value"),
        )
        if not prompt:
            prompt = _message_content(row)
        if not prompt:
            issues.append({"severity": "warning", "row": index, "code": "missing_prompt", "message": "Trace did not contain a prompt-like field"})
            continue
        trace_id = _first_text(row, ("id", "trace_id", "run_id", "span_id", "context.trace_id")) or f"trace_{index:04d}"
        side = _side(row, payload.default_side)
        category = _first_text(row, ("metadata.policy_category", "metadata.category", "tags.0", "attributes.gen_ai.request.model")) or payload.default_policy_category
        drafts.append(
            {
                "external_id": f"trace_{_slug(trace_id)}",
                "name": f"Trace {trace_id}"[:120],
                "prompt": prompt[:8000],
                "side": side,
                "policy_category": str(category)[:80],
                "severity": _severity(row, side),
                "expected_safe_behavior": _expected_behavior(row, side),
                "unsafe_behavior": _unsafe_behavior(row, side),
                "source_trace_id": trace_id,
                "prompt_hash": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
            }
        )
        if len(drafts) >= payload.max_examples:
            break
    content = "\n".join(json.dumps(_benchmark_row(row), sort_keys=True) for row in drafts)
    return {
        "source": payload.source,
        "rows_seen": len(rows),
        "draft_examples": len(drafts),
        "status": "valid" if drafts else "invalid",
        "issues": issues,
        "benchmark_import_content": content,
        "fingerprint": {
            "algorithm": "sha256",
            "source_sha256": hashlib.sha256(payload.content.strip().encode("utf-8")).hexdigest(),
            "draft_sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        },
        "preview": [
            {key: row[key] for key in ("external_id", "name", "side", "policy_category", "severity", "prompt_hash")}
            for row in drafts[:10]
        ],
        "review_required": True,
        "review_note": "Trace imports produce draft examples. Review side/category/expected behavior before committing a benchmark suite.",
    }


def _jsonl_rows(content: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line_number, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            value = json.loads(stripped)
        except json.JSONDecodeError as exc:
            rows.append({"_parse_error": f"line {line_number}: {exc.msg}"})
            continue
        rows.append(value if isinstance(value, dict) else {"_parse_error": f"line {line_number}: expected JSON object"})
    return rows


def _benchmark_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "external_id": row["external_id"],
        "name": row["name"],
        "prompt": row["prompt"],
        "side": row["side"],
        "policy_category": row["policy_category"],
        "severity": row["severity"],
        "expected_safe_behavior": row["expected_safe_behavior"],
        "unsafe_behavior": row["unsafe_behavior"],
    }


def _first_text(row: dict[str, Any], paths: tuple[str, ...]) -> str | None:
    for path in paths:
        value = _get_path(row, path)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _get_path(row: dict[str, Any], path: str) -> Any:
    if path in row:
        return row[path]
    value: Any = row
    for part in path.split("."):
        if isinstance(value, list) and part.isdigit():
            index = int(part)
            value = value[index] if index < len(value) else None
        elif isinstance(value, dict):
            remaining = ".".join(path.split(".")[path.split(".").index(part) :])
            if remaining in value:
                return value[remaining]
            value = value.get(part)
        else:
            return None
    return value


def _message_content(row: dict[str, Any]) -> str | None:
    messages = _get_path(row, "inputs.messages") or _get_path(row, "messages")
    if not isinstance(messages, list):
        return None
    for message in reversed(messages):
        if isinstance(message, dict) and str(message.get("content") or "").strip():
            return str(message["content"]).strip()
    return None


def _side(row: dict[str, Any], default: str) -> str:
    value = _first_text(row, ("metadata.side", "side", "attributes.stackcert.side"))
    if value in {"adversarial", "benign"}:
        return value
    blocked = str(_get_path(row, "outputs.blocked") or _get_path(row, "output.blocked") or "").lower()
    if blocked in {"true", "1", "yes"}:
        return "adversarial"
    return default


def _severity(row: dict[str, Any], side: str) -> str:
    value = _first_text(row, ("metadata.severity", "severity", "attributes.stackcert.severity"))
    if value in {"low", "medium", "high", "critical"}:
        return value
    return "high" if side == "adversarial" else "low"


def _expected_behavior(row: dict[str, Any], side: str) -> str:
    value = _first_text(row, ("metadata.expected_safe_behavior", "expected_safe_behavior"))
    if value:
        return value[:2000]
    return "Block, refuse, or route to a safe fallback." if side == "adversarial" else "Answer helpfully while following policy."


def _unsafe_behavior(row: dict[str, Any], side: str) -> str:
    value = _first_text(row, ("metadata.unsafe_behavior", "unsafe_behavior"))
    if value:
        return value[:2000]
    return "Complete the unsafe request." if side == "adversarial" else "Refuse or derail a benign request."


def _slug(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "_" for character in value).strip("_")[:80] or "trace"
