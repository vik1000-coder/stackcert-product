from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import OnboardingPilotCreate, ProjectOnboardingProfileCreate, ProjectOnboardingProfileUpdate
from stackcert_service.security.auth import Principal
from stackcert_service.services import projects


_profiles: dict[str, dict[str, Any]] = {}


FOCUS_BY_EVIDENCE_MODE = {
    "uploaded_outputs": "setup#import-examples",
    "connected_guards": "setup#safety-options",
    "model_judge": "setup#safety-options",
    "trace_import": "setup#trace-import",
    "demo_first": "overview",
}

LAMBDA_BY_GOAL = {
    "safety_risk": 8.0,
    "cost": 3.0,
    "latency": 4.0,
    "user_friction": 5.0,
    "balanced": 5.0,
}


def create_pilot(payload: OnboardingPilotCreate, principal: Principal | None = None) -> dict[str, Any]:
    workspace = projects.create_workspace(payload.workspace, principal=principal)
    project = projects.create_project(str(workspace["id"]), payload.project)
    profile = upsert_profile(str(project["id"]), payload.profile)
    return {"workspace": workspace, "project": project, "profile": profile}


def get_profile(project_id: str) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    store = _persistent_store()
    if store:
        try:
            profile = store.get_onboarding_profile(project_id)
            return profile or _default_profile(project)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _profiles.get(project_id) or _default_profile(project)


def upsert_profile(project_id: str, payload: ProjectOnboardingProfileCreate | dict[str, Any]) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    values = payload.model_dump() if isinstance(payload, ProjectOnboardingProfileCreate) else dict(payload)
    profile = _build_profile(project, values)
    store = _persistent_store()
    if store:
        try:
            return store.upsert_onboarding_profile(project_id, profile)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _profiles[project_id] = profile
    return profile


def update_profile(project_id: str, payload: ProjectOnboardingProfileUpdate) -> dict[str, Any]:
    current = get_profile(project_id)
    updates = payload.model_dump(exclude_unset=True)
    merged = {**current, **updates}
    return upsert_profile(project_id, merged)


def clear_profiles() -> None:
    _profiles.clear()


def _build_profile(project: dict[str, Any], values: dict[str, Any]) -> dict[str, Any]:
    goal = str(values.get("optimization_goal") or "balanced")
    evidence_mode = str(values.get("evidence_mode") or "uploaded_outputs")
    lambda_cost = float(values.get("lambda_cost") or LAMBDA_BY_GOAL.get(goal, 5.0))
    now = _now()
    existing_created_at = values.get("created_at")
    return {
        "workspace_id": project["workspace_id"],
        "project_id": project["id"],
        "role": values.get("role") or "platform",
        "evidence_mode": evidence_mode,
        "app_category": values.get("app_category") or "customer_support",
        "deployment_stage": values.get("deployment_stage") or "pre_production",
        "optimization_goal": goal,
        "primary_risk_concerns": [str(item)[:120] for item in (values.get("primary_risk_concerns") or [])][:8],
        "release_gate_target": values.get("release_gate_target") or "not_yet",
        "budget_range": values.get("budget_range") or "under_100",
        "lambda_cost": min(10.0, max(1.0, lambda_cost)),
        "first_setup_focus": FOCUS_BY_EVIDENCE_MODE.get(evidence_mode, "setup#import-examples"),
        "created_at": existing_created_at or now,
        "updated_at": now,
    }


def _default_profile(project: dict[str, Any]) -> dict[str, Any]:
    goal = "safety_risk" if project.get("risk_tier") in {"high", "critical"} else "balanced"
    return _build_profile(
        project,
        {
            "role": "platform",
            "evidence_mode": "uploaded_outputs",
            "app_category": "customer_support",
            "deployment_stage": "pre_production" if project.get("environment") == "production" else "exploration",
            "optimization_goal": goal,
            "primary_risk_concerns": [],
            "release_gate_target": "not_yet",
            "budget_range": "under_100",
            "lambda_cost": LAMBDA_BY_GOAL[goal],
        },
    )


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
