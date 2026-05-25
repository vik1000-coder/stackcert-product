from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.security.auth import Principal


_audit_events: list[dict[str, Any]] = []


def record_event(
    action: str,
    principal: Principal,
    *,
    workspace_id: str | None = None,
    project_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    event = {
        "id": f"audit_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "project_id": project_id,
        "actor_user_id": principal.user_id if principal.principal_type == "user" else None,
        "actor_type": principal.principal_type,
        "actor": principal.user_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "metadata": metadata or {},
        "created_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
    }
    store = _persistent_store()
    if store:
        try:
            return store.record_audit_event(event)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _audit_events.insert(0, event)
    return event


def list_events() -> list[dict[str, Any]]:
    return list(_audit_events)


def clear_events() -> None:
    _audit_events.clear()


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
