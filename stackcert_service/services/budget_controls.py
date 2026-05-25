from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.services import projects
from stackcert_service.services import usage

_workspace_policies: dict[str, dict[str, Any]] = {}
_project_policies: dict[str, dict[str, Any]] = {}

_DEFAULT_WORKSPACE_POLICY = {
    "monthly_cap_usd": None,
    "per_run_cap_usd": None,
    "measurement_cap_usd": None,
    "alert_threshold_pct": 0.8,
    "hard_stop_pct": 1.0,
    "enforce_hard_stop": True,
    "provider_spend_disabled": False,
    "notes": "",
}

_DEFAULT_PROJECT_POLICY = {
    "monthly_cap_usd": None,
    "per_run_cap_usd": None,
    "measurement_cap_usd": None,
    "provider_spend_disabled": False,
    "notes": "",
}


def get_workspace_policy(workspace_id: str) -> dict[str, Any]:
    store = _persistent_store()
    if store:
        try:
            row = store.get_workspace_budget_policy(workspace_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        if row:
            return _normalize_workspace_policy(workspace_id, row, source="persisted", configured=True)
    if workspace_id in _workspace_policies:
        return _normalize_workspace_policy(workspace_id, _workspace_policies[workspace_id], source="memory", configured=True)
    return _default_workspace_policy(workspace_id)


def update_workspace_policy(workspace_id: str, values: dict[str, Any], *, actor_id: str | None = None) -> dict[str, Any]:
    if not any(workspace["id"] == workspace_id for workspace in projects.list_workspaces()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    policy = _normalize_workspace_policy(workspace_id, {**get_workspace_policy(workspace_id), **values}, source="memory", configured=True)
    store = _persistent_store()
    if store:
        try:
            return _normalize_workspace_policy(
                workspace_id,
                store.upsert_workspace_budget_policy(workspace_id, policy, actor_id=actor_id),
                source="persisted",
                configured=True,
            )
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _workspace_policies[workspace_id] = policy
    return policy


def get_project_policy(project_id: str) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    store = _persistent_store()
    if store:
        try:
            row = store.get_project_budget_policy(project_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        if row:
            return _normalize_project_policy(project_id, str(project["workspace_id"]), row, source="persisted", configured=True)
    if project_id in _project_policies:
        return _normalize_project_policy(project_id, str(project["workspace_id"]), _project_policies[project_id], source="memory", configured=True)
    return _default_project_policy(project_id, str(project["workspace_id"]))


def update_project_policy(project_id: str, values: dict[str, Any], *, actor_id: str | None = None) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    workspace_id = str(project["workspace_id"])
    policy = _normalize_project_policy(project_id, workspace_id, {**get_project_policy(project_id), **values}, source="memory", configured=True)
    store = _persistent_store()
    if store:
        try:
            return _normalize_project_policy(
                project_id,
                workspace_id,
                store.upsert_project_budget_policy(project_id, policy, actor_id=actor_id),
                source="persisted",
                configured=True,
            )
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _project_policies[project_id] = policy
    return policy


def workspace_budget_overview(workspace_id: str, *, pending_cost_usd: float = 0.0) -> dict[str, Any]:
    workspace_projects = [project for project in projects.list_projects() if str(project.get("workspace_id")) == workspace_id]
    spent = sum(_project_spend(str(project["id"])) for project in workspace_projects)
    policy = get_workspace_policy(workspace_id)
    state = _monthly_state(policy, spent, pending_cost_usd)
    return {
        "workspace_id": workspace_id,
        "policy": policy,
        "state": state,
        "project_count": len(workspace_projects),
    }


def project_budget_overview(project_id: str, *, pending_cost_usd: float = 0.0, operation: str = "evaluation_run") -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        return {
            "project_id": project_id,
            "workspace_id": None,
            "configured": False,
            "status": "unknown_project",
            "pending_cost_usd": round(float(pending_cost_usd), 4),
            "blocking_reasons": ["unknown_project"],
        }
    workspace_id = str(project["workspace_id"])
    workspace_policy = get_workspace_policy(workspace_id)
    project_policy = get_project_policy(project_id)
    workspace_spend = _workspace_spend(workspace_id)
    project_spend = _project_spend(project_id)
    pending = round(float(pending_cost_usd or 0), 4)
    workspace_state = _monthly_state(workspace_policy, workspace_spend, pending)
    project_state = _monthly_state(project_policy, project_spend, pending)
    run_state = _run_state(workspace_policy, project_policy, pending, operation=operation)
    blocking_reasons = [
        *workspace_state["blocking_reasons"],
        *[f"project_{reason}" for reason in project_state["blocking_reasons"]],
        *run_state["blocking_reasons"],
    ]
    configured = bool(workspace_policy.get("configured") or project_policy.get("configured"))
    statuses = [workspace_state["status"], project_state["status"], run_state["status"]]
    aggregate_status = "blocked" if "blocked" in statuses else "warning" if "warning" in statuses else "ok" if configured else "not_configured"
    return {
        "project_id": project_id,
        "workspace_id": workspace_id,
        "configured": configured,
        "status": aggregate_status,
        "pending_cost_usd": pending,
        "blocking_reasons": blocking_reasons,
        "workspace": {
            "policy": workspace_policy,
            "state": workspace_state,
        },
        "project": {
            "policy": project_policy,
            "state": project_state,
        },
        "run": run_state,
        "effective": {
            "per_run_cap_usd": _effective_run_cap(workspace_policy, project_policy, operation),
            "provider_spend_disabled": bool(workspace_policy.get("provider_spend_disabled") or project_policy.get("provider_spend_disabled")),
        },
    }


def workspace_budget_state(project_id: str, *, pending_cost_usd: float = 0.0) -> dict[str, Any]:
    overview = project_budget_overview(project_id, pending_cost_usd=pending_cost_usd)
    workspace = overview.get("workspace") or {}
    state = workspace.get("state") or {}
    policy = workspace.get("policy") or {}
    return {
        "workspace_id": overview.get("workspace_id"),
        "configured": bool(policy.get("configured")),
        "status": state.get("status") or overview.get("status"),
        "spent_usd": state.get("spent_usd", 0.0),
        "pending_cost_usd": overview.get("pending_cost_usd", 0.0),
        "projected_spend_usd": state.get("projected_spend_usd", 0.0),
        "cap_usd": state.get("cap_usd"),
        "remaining_usd": state.get("remaining_usd"),
        "alert_threshold_usd": state.get("alert_threshold_usd"),
        "hard_stop_usd": state.get("hard_stop_usd"),
        "blocking_reasons": state.get("blocking_reasons", []),
    }


def enforce_workspace_budget(project_id: str, *, pending_cost_usd: float) -> dict[str, Any]:
    return enforce_project_budget(project_id, pending_cost_usd=pending_cost_usd, operation="evaluation_run")


def enforce_project_budget(project_id: str, *, pending_cost_usd: float, operation: str = "evaluation_run") -> dict[str, Any]:
    state = project_budget_overview(project_id, pending_cost_usd=pending_cost_usd, operation=operation)
    if state.get("status") == "blocked":
        reasons = ", ".join(_reason_label(reason) for reason in (state.get("blocking_reasons") or ["budget_cap"]))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estimated {operation.replace('_', ' ')} spend is blocked by budget policy: {reasons}",
        )
    return state


def clear_budget_policies() -> None:
    _workspace_policies.clear()
    _project_policies.clear()


def _monthly_state(policy: dict[str, Any], spent_usd: float, pending_cost_usd: float) -> dict[str, Any]:
    spent = round(float(spent_usd or 0), 4)
    pending = round(float(pending_cost_usd or 0), 4)
    projected = round(spent + pending, 4)
    cap = _optional_float(policy.get("monthly_cap_usd"))
    reasons: list[str] = []
    if policy.get("provider_spend_disabled"):
        reasons.append("provider_spend_disabled")
    if cap is None:
        return {
            "status": "blocked" if reasons else "not_configured",
            "spent_usd": spent,
            "pending_cost_usd": pending,
            "projected_spend_usd": projected,
            "cap_usd": None,
            "remaining_usd": None,
            "alert_threshold_usd": None,
            "hard_stop_usd": None,
            "usage_percent": None,
            "blocking_reasons": reasons,
        }
    alert_threshold = round(cap * float(policy.get("alert_threshold_pct") or 0.8), 4)
    hard_stop = round(cap * float(policy.get("hard_stop_pct") or 1.0), 4)
    if policy.get("enforce_hard_stop", True) and projected > hard_stop:
        reasons.append("monthly_cap_exceeded")
    status_value = "blocked" if reasons else "warning" if projected >= alert_threshold else "ok"
    return {
        "status": status_value,
        "spent_usd": spent,
        "pending_cost_usd": pending,
        "projected_spend_usd": projected,
        "cap_usd": round(cap, 4),
        "remaining_usd": round(cap - spent, 4),
        "alert_threshold_usd": alert_threshold,
        "hard_stop_usd": hard_stop,
        "usage_percent": round(projected / cap, 4) if cap > 0 else 1.0,
        "blocking_reasons": reasons,
    }


def _run_state(workspace_policy: dict[str, Any], project_policy: dict[str, Any], pending_cost_usd: float, *, operation: str) -> dict[str, Any]:
    pending = round(float(pending_cost_usd or 0), 4)
    cap = _effective_run_cap(workspace_policy, project_policy, operation)
    reasons: list[str] = []
    if workspace_policy.get("provider_spend_disabled") or project_policy.get("provider_spend_disabled"):
        reasons.append("provider_spend_disabled")
    if cap is not None and pending > cap:
        reasons.append("per_run_cap_exceeded" if operation != "measurement_plan" else "measurement_cap_exceeded")
    return {
        "operation": operation,
        "status": "blocked" if reasons else "ok",
        "pending_cost_usd": pending,
        "cap_usd": round(cap, 4) if cap is not None else None,
        "blocking_reasons": reasons,
    }


def _effective_run_cap(workspace_policy: dict[str, Any], project_policy: dict[str, Any], operation: str) -> float | None:
    field = "measurement_cap_usd" if operation == "measurement_plan" else "per_run_cap_usd"
    candidates = [
        _optional_float(workspace_policy.get(field)),
        _optional_float(project_policy.get(field)),
    ]
    if operation == "measurement_plan":
        candidates.extend([
            _optional_float(workspace_policy.get("per_run_cap_usd")),
            _optional_float(project_policy.get("per_run_cap_usd")),
        ])
    values = [candidate for candidate in candidates if candidate is not None]
    return min(values) if values else None


def _workspace_spend(workspace_id: str) -> float:
    total = 0.0
    for project in projects.list_projects():
        if str(project.get("workspace_id")) != workspace_id:
            continue
        total += _project_spend(str(project["id"]))
    return round(total, 4)


def _project_spend(project_id: str) -> float:
    summary = usage.cost_summary(project_id)["summary"]
    return round(float(summary.get("actual_cost_usd") or summary.get("estimated_cost_usd") or 0), 4)


def _default_workspace_policy(workspace_id: str) -> dict[str, Any]:
    cap = _legacy_workspace_cap(workspace_id)
    values = {**_DEFAULT_WORKSPACE_POLICY}
    if cap is not None:
        values["monthly_cap_usd"] = cap
        values["notes"] = "Loaded from STACKCERT_WORKSPACE_BUDGET_CAPS_JSON or STACKCERT_WORKSPACE_BUDGET_CAP_USD."
    return _normalize_workspace_policy(workspace_id, values, source="environment" if cap is not None else "default", configured=cap is not None)


def _default_project_policy(project_id: str, workspace_id: str) -> dict[str, Any]:
    return _normalize_project_policy(project_id, workspace_id, _DEFAULT_PROJECT_POLICY, source="default", configured=False)


def _normalize_workspace_policy(workspace_id: str, policy: dict[str, Any], *, source: str, configured: bool) -> dict[str, Any]:
    values = {**_DEFAULT_WORKSPACE_POLICY, **(policy or {})}
    return {
        "workspace_id": workspace_id,
        "configured": configured,
        "source": source,
        "monthly_cap_usd": _optional_float(values.get("monthly_cap_usd")),
        "per_run_cap_usd": _optional_float(values.get("per_run_cap_usd")),
        "measurement_cap_usd": _optional_float(values.get("measurement_cap_usd")),
        "alert_threshold_pct": _bounded_float(values.get("alert_threshold_pct"), 0.8, 0.0, 1.5),
        "hard_stop_pct": _bounded_float(values.get("hard_stop_pct"), 1.0, 0.0, 2.0),
        "enforce_hard_stop": bool(values.get("enforce_hard_stop", True)),
        "provider_spend_disabled": bool(values.get("provider_spend_disabled", False)),
        "notes": str(values.get("notes") or ""),
        "created_at": values.get("created_at"),
        "updated_at": values.get("updated_at") or _now(),
    }


def _normalize_project_policy(project_id: str, workspace_id: str, policy: dict[str, Any], *, source: str, configured: bool) -> dict[str, Any]:
    values = {**_DEFAULT_PROJECT_POLICY, **(policy or {})}
    return {
        "project_id": project_id,
        "workspace_id": workspace_id,
        "configured": configured,
        "source": source,
        "monthly_cap_usd": _optional_float(values.get("monthly_cap_usd")),
        "per_run_cap_usd": _optional_float(values.get("per_run_cap_usd")),
        "measurement_cap_usd": _optional_float(values.get("measurement_cap_usd")),
        "provider_spend_disabled": bool(values.get("provider_spend_disabled", False)),
        "notes": str(values.get("notes") or ""),
        "created_at": values.get("created_at"),
        "updated_at": values.get("updated_at") or _now(),
    }


def _legacy_workspace_cap(workspace_id: str) -> float | None:
    caps = _workspace_caps()
    if workspace_id in caps:
        return caps[workspace_id]
    default = os.getenv("STACKCERT_WORKSPACE_BUDGET_CAP_USD", "").strip()
    if default:
        try:
            return max(0.0, float(default))
        except ValueError:
            return None
    return None


def _workspace_caps() -> dict[str, float]:
    raw = os.getenv("STACKCERT_WORKSPACE_BUDGET_CAPS_JSON", "").strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}
    caps: dict[str, float] = {}
    for key, value in parsed.items():
        try:
            caps[str(key)] = max(0.0, float(value))
        except (TypeError, ValueError):
            continue
    return caps


def _optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return round(max(0.0, float(value)), 4)
    except (TypeError, ValueError):
        return None


def _bounded_float(value: Any, default: float, lower: float, upper: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return round(min(max(parsed, lower), upper), 4)


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _reason_label(reason: str) -> str:
    return {
        "monthly_cap_exceeded": "workspace budget cap exceeded",
        "project_monthly_cap_exceeded": "project budget cap exceeded",
        "per_run_cap_exceeded": "per-run budget cap exceeded",
        "measurement_cap_exceeded": "measurement budget cap exceeded",
        "provider_spend_disabled": "provider spend disabled",
        "project_provider_spend_disabled": "project provider spend disabled",
    }.get(reason, reason.replace("_", " "))


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
