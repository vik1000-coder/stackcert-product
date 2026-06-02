from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store


_workspace_policies: dict[str, dict[str, Any]] = {}
_project_policies: dict[str, dict[str, Any]] = {}


def workspace_policy(workspace_id: str) -> dict[str, Any]:
    store = _persistent_store()
    if store and hasattr(store, "get_workspace_retention_policy"):
        try:
            return store.get_workspace_retention_policy(workspace_id) or _default_policy(workspace_id=workspace_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _workspace_policies.get(workspace_id) or _default_policy(workspace_id=workspace_id)


def update_workspace_policy(workspace_id: str, patch: dict[str, Any], *, actor_id: str | None = None) -> dict[str, Any]:
    policy = {**workspace_policy(workspace_id), **_clean_patch(patch), "updated_at": _now()}
    store = _persistent_store()
    if store and hasattr(store, "upsert_workspace_retention_policy"):
        try:
            return store.upsert_workspace_retention_policy(workspace_id, policy, actor_id=actor_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _workspace_policies[workspace_id] = policy
    return policy


def project_policy(project_id: str, *, workspace_id: str | None = None) -> dict[str, Any]:
    store = _persistent_store()
    if store and hasattr(store, "get_project_retention_policy"):
        try:
            return store.get_project_retention_policy(project_id) or _default_policy(project_id=project_id, workspace_id=workspace_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _project_policies.get(project_id) or _default_policy(project_id=project_id, workspace_id=workspace_id)


def update_project_policy(project_id: str, patch: dict[str, Any], *, workspace_id: str | None = None, actor_id: str | None = None) -> dict[str, Any]:
    policy = {**project_policy(project_id, workspace_id=workspace_id), **_clean_patch(patch), "updated_at": _now()}
    store = _persistent_store()
    if store and hasattr(store, "upsert_project_retention_policy"):
        try:
            return store.upsert_project_retention_policy(project_id, policy, actor_id=actor_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _project_policies[project_id] = policy
    return policy


def dry_run_project(project_id: str, *, workspace_id: str | None = None) -> dict[str, Any]:
    policy = project_policy(project_id, workspace_id=workspace_id)
    raw_days = int(policy.get("raw_examples_retention_days") or 0)
    actions = [
        {
            "id": "raw_examples",
            "label": "Raw examples",
            "action": "delete" if raw_days == 0 else "expire_after_days",
            "retention_days": raw_days,
            "estimated_records": 0,
            "status": "ready",
        },
        {
            "id": "provider_responses",
            "label": "Provider responses",
            "action": "delete" if policy.get("delete_provider_responses") else "keep",
            "estimated_records": 0,
            "status": "ready",
        },
        {
            "id": "redacted_snippets",
            "label": "Redacted snippets",
            "action": "keep" if policy.get("keep_redacted_snippets") else "delete",
            "estimated_records": 0,
            "status": "ready",
        },
    ]
    return {
        "project_id": project_id,
        "workspace_id": workspace_id or policy.get("workspace_id"),
        "mode": "dry_run",
        "policy": policy,
        "actions": actions,
        "summary": {
            "raw_examples_retention_days": raw_days,
            "delete_provider_responses": bool(policy.get("delete_provider_responses")),
            "export_before_delete": bool(policy.get("export_before_delete")),
            "estimated_records": sum(int(action["estimated_records"]) for action in actions),
        },
    }


def apply_project(project_id: str, *, workspace_id: str | None = None, actor_id: str | None = None) -> dict[str, Any]:
    plan = dry_run_project(project_id, workspace_id=workspace_id)
    applied_at = _now()
    return {
        **plan,
        "mode": "apply",
        "applied_at": applied_at,
        "actor_id": actor_id,
        "actions": [{**action, "status": "applied"} for action in plan["actions"]],
        "summary": {**plan["summary"], "applied": True},
    }


def clear_policies() -> None:
    _workspace_policies.clear()
    _project_policies.clear()


def _default_policy(*, workspace_id: str | None = None, project_id: str | None = None) -> dict[str, Any]:
    now = _now()
    return {
        "workspace_id": workspace_id,
        "project_id": project_id,
        "raw_examples_retention_days": 30,
        "keep_aggregate_metrics": True,
        "keep_redacted_snippets": True,
        "delete_provider_responses": True,
        "export_before_delete": True,
        "notes": "Default hosted-pilot retention posture.",
        "created_at": now,
        "updated_at": now,
    }


def _clean_patch(patch: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in patch.items() if value is not None}


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
