from __future__ import annotations

import csv
import hashlib
import json
import re
import uuid
from collections import Counter
from datetime import UTC, datetime
from io import StringIO
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import BenchmarkImportCommitRequest, BenchmarkImportPreviewRequest


LEGACY_REQUIRED_FIELDS = {"name", "prompt", "side", "policy_category", "expected_safe_behavior", "unsafe_behavior"}
BUYER_REQUIRED_FIELDS = {"external_id", "prompt", "expected_decision", "policy_category"}
VALID_SIDES = {"adversarial", "benign"}
VALID_SEVERITIES = {"low", "medium", "high", "critical"}
PASS_DECISIONS = {"pass", "allow", "benign", "safe", "ok"}
UNSAFE_DECISIONS = {"block", "warn", "escalate", "unsafe", "deny", "fail"}
SCHEMA_VERSION = "stackcert.examples.v2"
FIELD_ALIASES = {
    "name": ("name", "title", "label", "example_name"),
    "prompt": ("prompt", "input", "user_input", "question", "query"),
    "output": ("output", "assistant_output", "response", "completion"),
    "expected_decision": ("expected_decision", "expected_label", "decision"),
    "side": ("side", "risk_side", "example_side"),
    "policy_category": ("policy_category", "category", "policy", "risk_category", "topic"),
    "weight": ("weight", "importance", "sample_weight"),
    "metadata": ("metadata", "meta"),
    "source": ("source", "dataset_source"),
    "severity": ("severity", "risk_severity"),
    "expected_safe_behavior": ("expected_safe_behavior", "expected", "expected_behavior", "safe_behavior"),
    "unsafe_behavior": ("unsafe_behavior", "unsafe", "bad_behavior", "failure_mode"),
    "external_id": ("external_id", "id", "example_id"),
}

_committed_suites: dict[str, list[dict[str, Any]]] = {}
_committed_bundles: dict[str, dict[str, dict[str, Any]]] = {}


def _detect_format(content: str, requested: str) -> str:
    if requested != "auto":
        return requested
    stripped = content.lstrip()
    if stripped.startswith("{"):
        return "jsonl"
    return "csv"


def _jsonl_rows(content: str) -> list[dict[str, Any]]:
    rows = []
    for line_number, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            value = json.loads(stripped)
        except json.JSONDecodeError as exc:
            rows.append({"_parse_error": f"line {line_number}: {exc.msg}"})
            continue
        if not isinstance(value, dict):
            rows.append({"_parse_error": f"line {line_number}: expected JSON object"})
            continue
        rows.append(value)
    return rows


def _csv_rows(content: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(StringIO(content))
    if not reader.fieldnames:
        return [{"_parse_error": "missing CSV header row"}]
    return [dict(row) for row in reader]


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_") or "custom"


def _validated_rows(payload: BenchmarkImportPreviewRequest) -> tuple[str, int, list[dict[str, Any]], list[dict[str, Any]]]:
    content = payload.content.strip()
    detected = _detect_format(content, payload.format)
    rows = _jsonl_rows(content) if detected == "jsonl" else _csv_rows(content)
    issues: list[dict[str, Any]] = []
    normalized: list[dict[str, Any]] = []
    seen_prompts: set[str] = set()
    seen_external_ids: set[str] = set()

    for index, raw_row in enumerate(rows, start=1):
        row = _canonical_row(raw_row, payload.field_mapping)
        if row.get("_parse_error"):
            issues.append({"severity": "error", "row": index, "code": "parse_error", "message": row["_parse_error"]})
            continue
        missing = _missing_required_fields(row)
        if missing:
            issues.append(
                {
                    "severity": "error",
                    "row": index,
                    "code": "missing_fields",
                    "message": f"Missing required field(s): {', '.join(missing)}",
                }
            )
            continue
        side = _side_from_row(row)
        if side not in VALID_SIDES:
            issues.append({"severity": "error", "row": index, "code": "invalid_decision", "message": "expected_decision must map to pass, warn, block, or escalate; side must be adversarial or benign"})
            continue
        prompt = str(row["prompt"]).strip()
        prompt_key = prompt.lower()
        if prompt_key in seen_prompts:
            issues.append({"severity": "warning", "row": index, "code": "duplicate_prompt", "message": "Prompt duplicates an earlier row"})
        seen_prompts.add(prompt_key)
        external_id = str(row.get("external_id") or "").strip()[:160]
        if external_id and external_id in seen_external_ids:
            issues.append({"severity": "warning", "row": index, "code": "duplicate_id", "message": "example_id duplicates an earlier row"})
        if external_id:
            seen_external_ids.add(external_id)
        severity = str(row.get("severity") or "medium").strip().lower()
        if severity not in VALID_SEVERITIES:
            issues.append({"severity": "warning", "row": index, "code": "invalid_severity", "message": "severity defaulted to medium"})
            severity = "medium"
        weight = _coerce_weight(row.get("weight"), index, issues)
        metadata = _metadata_from_row(row.get("metadata"))
        if row.get("output"):
            metadata["output_redacted"] = str(row.get("output") or "")[:500]
        if row.get("source"):
            metadata["source"] = str(row.get("source") or "")[:160]
        expected_decision = str(row.get("expected_decision") or ("block" if side == "adversarial" else "pass")).strip().lower()
        normalized.append(
            {
                "external_id": external_id,
                "name": str(row.get("name") or external_id or f"Example {index}").strip()[:120],
                "prompt": prompt,
                "prompt_hash": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                "prompt_redacted": prompt[:280],
                "side": side,
                "policy_category": str(row["policy_category"]).strip()[:80],
                "severity": severity,
                "expected_decision": expected_decision,
                "weight": weight,
                "expected_safe_behavior": str(row.get("expected_safe_behavior") or _default_expected_behavior(side)).strip()[:500],
                "unsafe_behavior": str(row.get("unsafe_behavior") or _default_unsafe_behavior(side, row["policy_category"])).strip()[:500],
                "metadata": metadata,
            }
        )
    return detected, len(rows), normalized, issues


def preview_import(payload: BenchmarkImportPreviewRequest) -> dict[str, Any]:
    detected, rows_seen, normalized, issues = _validated_rows(payload)

    by_side = Counter(item["side"] for item in normalized)
    by_category = Counter(item["policy_category"] for item in normalized)
    by_decision = Counter(item["expected_decision"] for item in normalized)
    blocking_errors = [issue for issue in issues if issue["severity"] == "error"]
    validation_warnings = _dataset_warnings(normalized)
    issues.extend(validation_warnings)
    return {
        "format": detected,
        "status": "valid" if not blocking_errors and normalized else "invalid",
        "rows_seen": rows_seen,
        "valid_rows": len(normalized),
        "issues": issues,
        "summary": {
            "by_side": dict(sorted(by_side.items())),
            "by_category": dict(sorted(by_category.items())),
            "by_expected_decision": dict(sorted(by_decision.items())),
            "warnings": sum(1 for issue in issues if issue["severity"] == "warning"),
            "errors": len(blocking_errors),
            "duplicate_prompts": sum(1 for issue in issues if issue["code"] == "duplicate_prompt"),
            "duplicate_ids": sum(1 for issue in issues if issue["code"] == "duplicate_id"),
            "benign_examples": by_side.get("benign", 0),
            "unsafe_examples": by_side.get("adversarial", 0),
            "weight_total": round(sum(item["weight"] for item in normalized), 4),
            "weight_min": min((item["weight"] for item in normalized), default=0),
            "weight_max": max((item["weight"] for item in normalized), default=0),
        },
        "fingerprint": _import_fingerprint(payload.content, normalized),
        "schema": import_schema(),
        "preview": [
            {key: item[key] for key in ("external_id", "name", "prompt_redacted", "side", "policy_category", "severity", "expected_decision", "weight")}
            for item in normalized[:10]
        ],
    }


def import_schema() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "formats": ["jsonl", "csv"],
        "required_fields": sorted(BUYER_REQUIRED_FIELDS),
        "legacy_required_fields": sorted(LEGACY_REQUIRED_FIELDS),
        "optional_fields": ["output", "source", "metadata", "severity", "weight", "expected_safe_behavior", "unsafe_behavior"],
        "valid_values": {
            "side": sorted(VALID_SIDES),
            "severity": sorted(VALID_SEVERITIES),
            "expected_decision": sorted(PASS_DECISIONS | UNSAFE_DECISIONS),
        },
        "aliases": {field: list(aliases) for field, aliases in FIELD_ALIASES.items()},
        "limits": {
            "content_bytes": 1_000_000,
            "max_preview_rows": 10,
        },
        "field_mapping_contract": "Map StackCert canonical field names to source column names, for example {'prompt': 'input', 'policy_category': 'category'}.",
    }


def list_committed_suites(project_id: str) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return store.list_benchmark_suites(project_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return list(_committed_suites.get(project_id, []))


def get_committed_suite_bundle(project_id: str, suite_id: str | None = None) -> dict[str, Any]:
    store = _persistent_store()
    if store:
        try:
            return store.get_benchmark_suite_bundle(project_id, suite_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    bundles = _committed_bundles.get(project_id, {})
    if suite_id:
        bundle = bundles.get(suite_id)
        if not bundle:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark suite not found")
        return bundle
    if not bundles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create a benchmark suite before uploading outputs")
    return next(iter(bundles.values()))


def commit_import(
    project_id: str,
    payload: BenchmarkImportCommitRequest,
    *,
    source_kind: str = "custom_import",
    source_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    bundle = build_import_bundle(project_id, payload, source_kind=source_kind, source_metadata=source_metadata)
    store = _persistent_store()
    if store:
        try:
            suite = store.create_benchmark_suite(project_id, bundle)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    else:
        suite = _memory_suite_from_bundle(bundle)
        _committed_suites.setdefault(project_id, []).insert(0, suite)
        _committed_bundles.setdefault(project_id, {})[suite["id"]] = {
            **bundle,
            "suite": {**bundle["suite"], "id": suite["id"]},
        }
    return {"suite": suite, "import_preview": bundle["preview"]}


def build_import_bundle(
    project_id: str,
    payload: BenchmarkImportCommitRequest,
    *,
    source_kind: str = "custom_import",
    source_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    preview = preview_import(payload)
    if preview["status"] != "valid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": "Import has blocking validation errors", "preview": preview})

    detected, _, normalized, _ = _validated_rows(payload)
    now = datetime.now(UTC).replace(microsecond=0)
    version = (payload.version or f"v{now.strftime('%Y%m%d%H%M%S')}").strip()
    suite_external_id = f"suite_{uuid.uuid4().hex[:12]}"
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in normalized:
        groups.setdefault((row["side"], row["policy_category"]), []).append(row)

    cells: list[dict[str, Any]] = []
    examples: list[dict[str, Any]] = []
    total = max(1, len(normalized))
    for cell_index, ((side, category), rows) in enumerate(sorted(groups.items()), start=1):
        cell_key = f"{side}_{_slug(category)}"
        cell_id = f"cell_{cell_index:03d}_{cell_key}"
        cells.append(
            {
                "cell_id": cell_id,
                "cell_key": cell_key,
                "side": side,
                "source": source_kind,
                "policy_category": category,
                "severity": _highest_severity(row["severity"] for row in rows),
                "weight": round(sum(float(row.get("weight") or 1.0) for row in rows) / max(1.0, sum(float(row.get("weight") or 1.0) for row in normalized)), 6),
                "description": f"{len(rows)} imported {side} behavior(s) for {category}.",
                "examples": len(rows),
            }
        )
        for row_index, row in enumerate(rows, start=1):
            examples.append(
                {
                    "external_id": row["external_id"] or f"{cell_key}_{row_index:04d}",
                    "cell_id": cell_id,
                    "prompt_hash": row["prompt_hash"],
                    "prompt_redacted": row["prompt_redacted"],
                    "metadata": {
                        "name": row["name"],
                        "side": row["side"],
                        "severity": row["severity"],
                        "policy_category": row["policy_category"],
                        "expected_decision": row["expected_decision"],
                        "weight": row["weight"],
                        "expected_safe_behavior": row["expected_safe_behavior"],
                        "unsafe_behavior": row["unsafe_behavior"],
                        **row.get("metadata", {}),
                    },
                }
            )

    return {
        "suite": {
            "id": suite_external_id,
            "project_id": project_id,
            "name": payload.name.strip(),
            "version": version,
            "status": "draft",
            "source": source_kind,
            "description": payload.description or "",
            "license": payload.license,
            "created_at": now.isoformat(),
            "artifact": None,
            "source_metadata": {
                "schema_version": SCHEMA_VERSION,
                "source_name": payload.source_name,
                "source_uri": payload.source_uri,
                "field_mapping": payload.field_mapping,
                "fingerprint": preview["fingerprint"],
                **(source_metadata or {}),
            },
        },
        "cells": cells,
        "examples": examples,
        "source_content": payload.content.strip() + "\n",
        "source_format": detected,
        "preview": preview,
}


def clear_committed_suites() -> None:
    _committed_suites.clear()
    _committed_bundles.clear()


def _memory_suite_from_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    return {
        **bundle["suite"],
        "cells": [
            {
                "cell_id": cell["cell_id"],
                "side": cell["side"],
                "source": cell["source"],
                "policy_category": cell["policy_category"],
                "weight": cell["weight"],
                "examples": cell["examples"],
            }
            for cell in bundle["cells"]
        ],
    }


def _highest_severity(values: Any) -> str:
    rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    return max(values, key=lambda value: rank.get(str(value), 1))


def _canonical_row(row: dict[str, Any], field_mapping: dict[str, str]) -> dict[str, Any]:
    if row.get("_parse_error"):
        return row
    canonical: dict[str, Any] = dict(row)
    for target, source in field_mapping.items():
        if target in FIELD_ALIASES and source in row and not str(canonical.get(target) or "").strip():
            canonical[target] = row.get(source)
    for target, aliases in FIELD_ALIASES.items():
        if str(canonical.get(target) or "").strip():
            continue
        for alias in aliases:
            if alias in row and str(row.get(alias) or "").strip():
                canonical[target] = row.get(alias)
                break
    return canonical


def _missing_required_fields(row: dict[str, Any]) -> list[str]:
    has_legacy_shape = bool(
        str(row.get("side") or "").strip()
        and (str(row.get("expected_safe_behavior") or "").strip() or str(row.get("unsafe_behavior") or "").strip())
    )
    has_buyer_decision = bool(str(row.get("expected_decision") or "").strip())
    if has_legacy_shape and not has_buyer_decision:
        return sorted(field for field in LEGACY_REQUIRED_FIELDS if not str(row.get(field) or "").strip())
    return sorted(field for field in BUYER_REQUIRED_FIELDS if not str(row.get(field) or "").strip())


def _side_from_row(row: dict[str, Any]) -> str:
    side = str(row.get("side") or "").strip().lower()
    if side:
        return side
    decision = str(row.get("expected_decision") or "").strip().lower()
    if decision in PASS_DECISIONS:
        return "benign"
    if decision in UNSAFE_DECISIONS:
        return "adversarial"
    return ""


def _default_expected_behavior(side: str) -> str:
    if side == "benign":
        return "The assistant should answer normally without unnecessary blocking."
    return "The assistant should refuse, block, or escalate safely."


def _default_unsafe_behavior(side: str, category: Any) -> str:
    if side == "benign":
        return "Over-blocking a normal user request."
    return f"Unsafe handling of {str(category or 'the risk category')}."


def _coerce_weight(value: Any, row: int, issues: list[dict[str, Any]]) -> float:
    if value in {None, ""}:
        return 1.0
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        issues.append({"severity": "warning", "row": row, "code": "invalid_weight", "message": "weight defaulted to 1.0"})
        return 1.0
    if parsed <= 0:
        issues.append({"severity": "warning", "row": row, "code": "invalid_weight", "message": "weight must be positive and defaulted to 1.0"})
        return 1.0
    return min(parsed, 100.0)


def _metadata_from_row(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return {str(key): _short_metadata_value(item) for key, item in value.items()}
    if not value:
        return {}
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return {}
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            return {"metadata_text": stripped[:500]}
        if isinstance(parsed, dict):
            return {str(key): _short_metadata_value(item) for key, item in parsed.items()}
    return {"metadata_text": str(value)[:500]}


def _short_metadata_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return str(value)[:500] if isinstance(value, str) else value
    return str(value)[:500]


def _dataset_warnings(normalized: list[dict[str, Any]]) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []
    by_side = Counter(item["side"] for item in normalized)
    if normalized and by_side.get("benign", 0) < 2:
        warnings.append({"severity": "warning", "code": "too_few_benign_examples", "message": "Add at least two benign examples before treating this as release evidence."})
    if normalized and by_side.get("adversarial", 0) < 2:
        warnings.append({"severity": "warning", "code": "too_few_unsafe_examples", "message": "Add at least two unsafe examples before treating this as release evidence."})
    total = len(normalized)
    if total >= 6:
        largest_side = max(by_side.values(), default=0)
        if largest_side / total >= 0.85:
            warnings.append({"severity": "warning", "code": "class_imbalance", "message": "One expected-decision side dominates the dataset; add balancing examples or adjust weights."})
    return warnings


def _import_fingerprint(content: str, normalized: list[dict[str, Any]]) -> dict[str, Any]:
    source = content.strip().encode("utf-8")
    normalized_payload = [
        {
            "external_id": row.get("external_id") or "",
            "prompt_hash": row["prompt_hash"],
            "side": row["side"],
            "policy_category": row["policy_category"],
            "severity": row["severity"],
        }
        for row in normalized
    ]
    normalized_bytes = json.dumps(normalized_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {
        "algorithm": "sha256",
        "source_sha256": hashlib.sha256(source).hexdigest(),
        "normalized_sha256": hashlib.sha256(normalized_bytes).hexdigest(),
        "source_bytes": len(source),
        "normalized_rows": len(normalized),
    }


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
