from __future__ import annotations

import json
import os
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.services import projects
from stackcert_service.services import usage


def workspace_budget_state(project_id: str, *, pending_cost_usd: float = 0.0) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        return {"status": "unknown_project", "configured": False, "pending_cost_usd": round(float(pending_cost_usd), 4)}
    workspace_id = str(project["workspace_id"])
    cap = _workspace_cap(workspace_id)
    spent = _workspace_spend(workspace_id)
    pending = round(float(pending_cost_usd or 0), 4)
    projected = round(spent + pending, 4)
    if cap is None:
        return {
            "workspace_id": workspace_id,
            "configured": False,
            "status": "not_configured",
            "spent_usd": spent,
            "pending_cost_usd": pending,
            "projected_spend_usd": projected,
            "cap_usd": None,
        }
    remaining = round(float(cap) - spent, 4)
    return {
        "workspace_id": workspace_id,
        "configured": True,
        "status": "blocked" if projected > float(cap) else "ok",
        "spent_usd": spent,
        "pending_cost_usd": pending,
        "projected_spend_usd": projected,
        "cap_usd": round(float(cap), 4),
        "remaining_usd": remaining,
    }


def enforce_workspace_budget(project_id: str, *, pending_cost_usd: float) -> dict[str, Any]:
    state = workspace_budget_state(project_id, pending_cost_usd=pending_cost_usd)
    if state.get("configured") and state.get("status") == "blocked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Estimated worker run projects workspace spend to ${state['projected_spend_usd']:.4f}, "
                f"above the ${state['cap_usd']:.4f} workspace budget cap"
            ),
        )
    return state


def _workspace_spend(workspace_id: str) -> float:
    total = 0.0
    for project in projects.list_projects():
        if str(project.get("workspace_id")) != workspace_id:
            continue
        summary = usage.cost_summary(str(project["id"]))["summary"]
        total += float(summary.get("actual_cost_usd") or summary.get("estimated_cost_usd") or 0)
    return round(total, 4)


def _workspace_cap(workspace_id: str) -> float | None:
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
