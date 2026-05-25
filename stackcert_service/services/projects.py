from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import ProjectCreate, WorkspaceCreate
from stackcert_service.security.auth import Principal
from stackcert_service.services import demo_project


_workspaces: list[dict[str, Any]] = []
_projects: list[dict[str, Any]] = []
_workspace_memberships: dict[tuple[str, str], str] = {}


def list_workspaces(principal: Principal | None = None) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            rows = store.list_workspaces_for_user(principal.user_id) if principal else store.list_workspaces()
            return _with_demo_workspace(rows, principal)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if principal:
        rows = [
            {**workspace, "role": membership_role(str(workspace["id"]), principal) or workspace.get("role") or "viewer"}
            for workspace in _workspaces
            if membership_role(str(workspace["id"]), principal)
        ]
        return _with_demo_workspace(rows, principal)
    return _with_demo_workspace(_workspaces, principal)


def create_workspace(payload: WorkspaceCreate, principal: Principal | None = None) -> dict[str, Any]:
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
            return store.create_workspace(workspace, owner_user_id=principal.user_id if principal else None)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _workspaces.insert(0, workspace)
    if principal:
        _workspace_memberships[(workspace["id"], principal.user_id)] = "owner"
    return workspace


def list_projects(principal: Principal | None = None) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            rows = store.list_projects_for_user(principal.user_id) if principal else store.list_projects()
            return _with_demo_project(rows, principal)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if principal:
        rows = [
            project
            for project in _projects
            if membership_role(str(project["workspace_id"]), principal)
        ]
        return _with_demo_project(rows, principal)
    return _with_demo_project(_projects, principal)


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


def set_project_setup_status(project_id: str, setup_status: str) -> None:
    if project_id == settings.demo_project_id:
        return
    store = _persistent_store()
    if store:
        try:
            store.update_project_setup_status(project_id, setup_status)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        return
    for project in _projects:
        if project["id"] == project_id:
            project["setup_status"] = setup_status
            return


def clear_setup_records() -> None:
    _workspaces.clear()
    _projects.clear()
    _workspace_memberships.clear()


def membership_role(workspace_id: str, principal: Principal) -> str | None:
    if _can_use_demo_workspace(workspace_id, principal):
        return "owner"
    store = _persistent_store()
    if store:
        try:
            return store.get_workspace_membership_role(workspace_id, principal.user_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if (workspace_id, principal.user_id) in _workspace_memberships:
        return _workspace_memberships[(workspace_id, principal.user_id)]
    if workspace_id in principal.workspace_ids:
        return principal.role
    return None


def project_membership_role(project_id: str, principal: Principal) -> str | None:
    project = get_project(project_id)
    if not project:
        return None
    return membership_role(str(project["workspace_id"]), principal)


def _with_demo_workspace(rows: list[dict[str, Any]], principal: Principal | None) -> list[dict[str, Any]]:
    demo = demo_project.workspace()
    if principal is not None and not _can_use_demo_workspace(demo["id"], principal):
        return [row for row in rows if row["id"] != demo["id"]]
    return [demo] + [row for row in rows if row["id"] != demo["id"]]


def _with_demo_project(rows: list[dict[str, Any]], principal: Principal | None) -> list[dict[str, Any]]:
    demo = demo_project.project()
    if principal is not None and not _can_use_demo_workspace(demo["workspace_id"], principal):
        return [row for row in rows if row["id"] != demo["id"]]
    return [demo] + [row for row in rows if row["id"] != demo["id"]]


def _can_use_demo_workspace(workspace_id: str, principal: Principal) -> bool:
    if settings.environment == "production":
        if not settings.enable_demo_workspace:
            return False
    return principal.principal_type == "user" and workspace_id in {settings.demo_workspace_id, settings.demo_workspace_db_id}


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "project"


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
