from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.schemas import BenchmarkImportCommitRequest, ConfigImportRequest, GuardConnectorCreate
from stackcert_service.services import benchmark_imports, guard_connectors, onboarding


def import_config(project_id: str, payload: ConfigImportRequest) -> dict[str, Any]:
    parsed = _parse_config(payload.content)
    changes = _plan_changes(parsed)
    result: dict[str, Any] = {
        "project_id": project_id,
        "mode": payload.mode,
        "status": "valid" if not changes["errors"] else "invalid",
        "changes": changes,
    }
    if changes["errors"]:
        return result
    if payload.mode == "apply":
        applied = _apply(project_id, parsed)
        result["applied"] = applied
    return result


def _parse_config(content: str) -> dict[str, Any]:
    stripped = content.strip()
    try:
        if stripped.startswith("{"):
            parsed = json.loads(stripped)
        else:
            try:
                import yaml  # type: ignore
            except Exception:
                parsed = _parse_minimal_yaml(stripped)
            else:
                parsed = yaml.safe_load(stripped)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Could not parse config: {exc}") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Config must parse to an object")
    return parsed


def _plan_changes(parsed: dict[str, Any]) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    profile = parsed.get("profile") or parsed.get("scope") or {}
    safety_options = parsed.get("safety_options") or parsed.get("checks") or []
    examples = parsed.get("examples") or []
    example_refs = parsed.get("examples_file") or parsed.get("example_files") or parsed.get("examples_files")
    if safety_options and not isinstance(safety_options, list):
        errors.append({"code": "invalid_safety_options", "message": "safety_options must be a list."})
    if examples and not isinstance(examples, list):
        errors.append({"code": "invalid_examples", "message": "examples must be a list when provided inline."})
    if example_refs:
        warnings.append({"code": "file_refs_not_loaded", "message": "File references are recorded in dry-run output; upload contents through the import UI or inline examples to apply them."})
    return {
        "profile": bool(profile),
        "safety_options": len(safety_options) if isinstance(safety_options, list) else 0,
        "inline_examples": len(examples) if isinstance(examples, list) else 0,
        "example_file_refs": example_refs,
        "combination_rules": parsed.get("combination_rules") or parsed.get("combination_rule"),
        "release_context": parsed.get("release_context") or {},
        "warnings": warnings,
        "errors": errors,
    }


def _apply(project_id: str, parsed: dict[str, Any]) -> dict[str, Any]:
    applied: dict[str, Any] = {"profile": False, "safety_options": 0, "suite": None}
    profile = parsed.get("profile") or parsed.get("scope")
    if isinstance(profile, dict) and profile:
        onboarding.upsert_profile(project_id, profile)
        applied["profile"] = True
    options = parsed.get("safety_options") or parsed.get("checks") or []
    if isinstance(options, list):
        for option in options:
            if not isinstance(option, dict):
                continue
            guard_key = str(option.get("guard_key") or option.get("id") or option.get("name") or "").strip().lower().replace("-", "_")
            if not guard_key:
                continue
            guard_connectors.create_connector(
                project_id,
                GuardConnectorCreate(
                    guard_key=guard_key[:80],
                    display_name=str(option.get("display_name") or option.get("name") or guard_key)[:120],
                    guard_type=str(option.get("guard_type") or option.get("adapter_type") or "uploaded_outputs"),
                    adapter_type=str(option.get("adapter_type") or option.get("guard_type") or "uploaded_outputs"),
                    vendor=option.get("vendor"),
                    version=str(option.get("version") or "config-v1"),
                    endpoint_url=option.get("endpoint_url"),
                    secret_env_var=option.get("secret_env_var"),
                    decision_mapping=option.get("decision_mapping") or {},
                ),
            )
            applied["safety_options"] += 1
    examples = parsed.get("examples") or []
    if isinstance(examples, list) and examples:
        content = "\n".join(json.dumps(row) for row in examples if isinstance(row, dict)) + "\n"
        if content.strip():
            committed = benchmark_imports.commit_import(
                project_id,
                BenchmarkImportCommitRequest(
                    format="jsonl",
                    content=content,
                    name=str(parsed.get("suite_name") or "Config imported suite")[:120],
                    version=str(parsed.get("suite_version") or "config-v1")[:60],
                    source_name="config-as-code import",
                ),
                source_kind="config_import",
                source_metadata={"config_import": True, "release_context": parsed.get("release_context") or {}},
            )
            applied["suite"] = committed["suite"]
    return applied


def _parse_minimal_yaml(content: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    current_list_key: str | None = None
    for raw_line in content.splitlines():
        line = raw_line.rstrip()
        if not line.strip() or line.strip().startswith("#"):
            continue
        if not raw_line.startswith(" ") and ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()
            if value:
                result[key] = _coerce_scalar(value)
                current_list_key = None
            else:
                result[key] = []
                current_list_key = key
        elif current_list_key and line.strip().startswith("-"):
            item = line.strip()[1:].strip()
            result.setdefault(current_list_key, []).append(_coerce_scalar(item))
    return result


def _coerce_scalar(value: str) -> Any:
    if value in {"true", "false"}:
        return value == "true"
    if value.startswith("{") or value.startswith("["):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value.strip('"')
