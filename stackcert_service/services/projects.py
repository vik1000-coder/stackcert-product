from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import ProjectCreate, WorkspaceCreate
from stackcert_service.services import demo_project


_workspaces: list[dict[str, Any]] = []
_projects: list[dict[str, Any]] = []


def list_workspaces() -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return _demo_first(store.list_workspaces(), demo_project.workspace())
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _demo_first(_workspaces, demo_project.workspace())


def create_workspace(payload: WorkspaceCreate) -> dict[str, Any]:
    workspace = {
        "id": f"ws_{uuid.uuid4().hex[:12]}",
        "name": payload.name,
        "slug": payload.slug or _slug(payload.name),
        "role": "owner",
        "plan": payload.plan,
        "created_at": _now(),
    }
    store = _persistent_store()
    if store:
        try:
            return store.create_workspace(workspace)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _workspaces.insert(0, workspace)
    return workspace


def list_projects() -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return _demo_first(store.list_projects(), demo_project.project())
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _demo_first(_projects, demo_project.project())


def get_project(project_id: str) -> dict[str, Any] | None:
    if project_id == settings.demo_project_id:
        return demo_project.project()
    for project in list_projects():
        if project["id"] == project_id:
            return project
    return None


def create_project(workspace_id: str, payload: ProjectCreate) -> dict[str, Any]:
    workspaces = list_workspaces()
    if not any(workspace["id"] == workspace_id for workspace in workspaces):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    project = {
        "id": f"proj_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "slug": payload.slug or _slug(payload.name),
        "name": payload.name,
        "environment": payload.environment,
        "risk_tier": payload.risk_tier,
        "data_mode": payload.data_mode,
        "description": payload.description or "",
        "setup_status": "needs_benchmark_suite",
        "created_at": _now(),
    }
    store = _persistent_store()
    if store:
        try:
            return store.create_project(workspace_id, project)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _projects.insert(0, project)
    return project


def clear_setup_records() -> None:
    _workspaces.clear()
    _projects.clear()


def _demo_first(rows: list[dict[str, Any]], demo: dict[str, Any]) -> list[dict[str, Any]]:
    return [demo] + [row for row in rows if row["id"] != demo["id"]]


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "project"


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
