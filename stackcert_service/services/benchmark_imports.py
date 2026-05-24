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


REQUIRED_FIELDS = {"name", "prompt", "side", "policy_category", "expected_safe_behavior", "unsafe_behavior"}
VALID_SIDES = {"adversarial", "benign"}
VALID_SEVERITIES = {"low", "medium", "high", "critical"}

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

    for index, row in enumerate(rows, start=1):
        if row.get("_parse_error"):
            issues.append({"severity": "error", "row": index, "code": "parse_error", "message": row["_parse_error"]})
            continue
        missing = sorted(field for field in REQUIRED_FIELDS if not str(row.get(field) or "").strip())
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
        side = str(row["side"]).strip().lower()
        if side not in VALID_SIDES:
            issues.append({"severity": "error", "row": index, "code": "invalid_side", "message": "side must be adversarial or benign"})
            continue
        prompt = str(row["prompt"]).strip()
        prompt_key = prompt.lower()
        if prompt_key in seen_prompts:
            issues.append({"severity": "warning", "row": index, "code": "duplicate_prompt", "message": "Prompt duplicates an earlier row"})
        seen_prompts.add(prompt_key)
        severity = str(row.get("severity") or "medium").strip().lower()
        if severity not in VALID_SEVERITIES:
            issues.append({"severity": "warning", "row": index, "code": "invalid_severity", "message": "severity defaulted to medium"})
            severity = "medium"
        normalized.append(
            {
                "name": str(row["name"]).strip()[:120],
                "prompt": prompt,
                "prompt_hash": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                "prompt_redacted": prompt[:280],
                "side": side,
                "policy_category": str(row["policy_category"]).strip()[:80],
                "severity": severity,
                "expected_safe_behavior": str(row["expected_safe_behavior"]).strip()[:500],
                "unsafe_behavior": str(row["unsafe_behavior"]).strip()[:500],
            }
        )
    return detected, len(rows), normalized, issues


def preview_import(payload: BenchmarkImportPreviewRequest) -> dict[str, Any]:
    detected, rows_seen, normalized, issues = _validated_rows(payload)

    by_side = Counter(item["side"] for item in normalized)
    by_category = Counter(item["policy_category"] for item in normalized)
    blocking_errors = [issue for issue in issues if issue["severity"] == "error"]
    return {
        "format": detected,
        "status": "valid" if not blocking_errors and normalized else "invalid",
        "rows_seen": rows_seen,
        "valid_rows": len(normalized),
        "issues": issues,
        "summary": {
            "by_side": dict(sorted(by_side.items())),
            "by_category": dict(sorted(by_category.items())),
            "warnings": sum(1 for issue in issues if issue["severity"] == "warning"),
            "errors": len(blocking_errors),
        },
        "preview": [
            {key: item[key] for key in ("name", "prompt_redacted", "side", "policy_category", "severity")}
            for item in normalized[:10]
        ],
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


def commit_import(project_id: str, payload: BenchmarkImportCommitRequest) -> dict[str, Any]:
    bundle = build_import_bundle(project_id, payload)
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


def build_import_bundle(project_id: str, payload: BenchmarkImportCommitRequest) -> dict[str, Any]:
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
                "source": "custom_import",
                "policy_category": category,
                "severity": _highest_severity(row["severity"] for row in rows),
                "weight": round(len(rows) / total, 6),
                "description": f"{len(rows)} imported {side} behavior(s) for {category}.",
                "examples": len(rows),
            }
        )
        for row_index, row in enumerate(rows, start=1):
            examples.append(
                {
                    "external_id": f"{cell_key}_{row_index:04d}",
                    "cell_id": cell_id,
                    "prompt_hash": row["prompt_hash"],
                    "prompt_redacted": row["prompt_redacted"],
                    "metadata": {
                        "name": row["name"],
                        "side": row["side"],
                        "severity": row["severity"],
                        "policy_category": row["policy_category"],
                        "expected_safe_behavior": row["expected_safe_behavior"],
                        "unsafe_behavior": row["unsafe_behavior"],
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
            "source": "custom_import",
            "description": payload.description or "",
            "license": payload.license,
            "created_at": now.isoformat(),
            "artifact": None,
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


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
