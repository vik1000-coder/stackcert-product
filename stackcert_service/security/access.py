from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.security.auth import Principal


ROLE_RANK: dict[str, int] = {
    "viewer": 0,
    "risk_reviewer": 1,
    "platform": 2,
    "security": 3,
    "admin": 4,
    "owner": 5,
}

ROLE_ALIASES: dict[str, str] = {
    "member": "viewer",
    "reviewer": "risk_reviewer",
    "risk": "risk_reviewer",
    "maintainer": "platform",
    "developer": "platform",
}

ROLE_GROUPS: dict[str, frozenset[str]] = {
    "workspace_admin": frozenset({"owner", "admin"}),
    "project_maintainer": frozenset({"owner", "admin", "platform", "security"}),
    "evidence_issuer": frozenset({"owner", "admin", "security"}),
    "evidence_reviewer": frozenset({"owner", "admin", "security", "risk_reviewer"}),
    "viewer": frozenset(ROLE_RANK),
}

BUYER_ROLE_LABELS: dict[str, str] = {
    "owner": "Admin",
    "admin": "Admin",
    "platform": "Editor",
    "security": "Editor",
    "risk_reviewer": "Reviewer",
    "viewer": "Viewer",
}

CAPABILITY_GROUPS: dict[str, str] = {
    "configure_project": "project_maintainer",
    "configure_connectors": "project_maintainer",
    "create_runs": "project_maintainer",
    "issue_report": "evidence_issuer",
    "signoff_report": "evidence_reviewer",
    "manage_retention": "workspace_admin",
    "manage_secrets": "workspace_admin",
    "view": "viewer",
    "export_report": "viewer",
}


@dataclass(frozen=True)
class AccessGrant:
    workspace_id: str
    project_id: str | None = None
    run_id: str | None = None
    certificate_id: str | None = None
    role: str = "viewer"


def normalize_role(role: str | None) -> str:
    if not role:
        return "viewer"
    value = role.strip().lower().replace("-", "_")
    return ROLE_ALIASES.get(value, value)


def role_allows(actual_role: str | None, required_role: str) -> bool:
    actual = normalize_role(actual_role)
    required = normalize_role(required_role)
    if actual not in ROLE_RANK or required not in ROLE_RANK:
        return False
    return ROLE_RANK[actual] >= ROLE_RANK[required]


def role_in_group(actual_role: str | None, group: str) -> bool:
    actual = normalize_role(actual_role)
    allowed = ROLE_GROUPS.get(group)
    if allowed is None:
        return role_allows(actual, group)
    return actual in allowed


def require_role(actual_role: str | None, group_or_role: str) -> str:
    role = normalize_role(actual_role)
    if not role_in_group(role, group_or_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {group_or_role} access",
        )
    return role


def require_scope(principal: Principal, scope: str) -> Principal:
    if scope not in principal.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {scope} scope",
        )
    return principal


def permissions_for_role(role: str | None) -> dict[str, Any]:
    normalized = normalize_role(role)
    capabilities = {name: role_in_group(normalized, group) for name, group in CAPABILITY_GROUPS.items()}
    return {
        "role": normalized,
        "role_label": BUYER_ROLE_LABELS.get(normalized, "Viewer"),
        "capabilities": capabilities,
    }


def require_any_scope(principal: Principal, scopes: Iterable[str]) -> Principal:
    required = tuple(scopes)
    if not any(scope in principal.scopes for scope in required):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of: {', '.join(required)}",
        )
    return principal


def machine_project_allowed(principal: Principal, project_id: str) -> bool:
    if principal.principal_type != "machine":
        return False
    allowed = set(principal.allowed_project_ids or ())
    return "*" in allowed or project_id in allowed


def grant_from_workspace(
    principal: Principal,
    workspace_id: str,
    *,
    membership_role: str | None = None,
    required: str = "viewer",
) -> AccessGrant:
    role = _workspace_role_for_principal(principal, workspace_id, membership_role)
    require_role(role, required)
    return AccessGrant(workspace_id=workspace_id, role=role)


def grant_from_project(
    principal: Principal,
    project: dict[str, Any] | None,
    *,
    membership_role: str | None = None,
    required: str = "viewer",
) -> AccessGrant:
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    workspace_id = str(project.get("workspace_id") or "")
    role = _workspace_role_for_principal(principal, workspace_id, membership_role)
    require_role(role, required)
    return AccessGrant(workspace_id=workspace_id, project_id=str(project.get("id")), role=role)


def grant_from_run(
    principal: Principal,
    run: dict[str, Any] | None,
    *,
    membership_role: str | None = None,
    required: str = "viewer",
) -> AccessGrant:
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    workspace_id = str(run.get("workspace_id") or "")
    role = _workspace_role_for_principal(principal, workspace_id, membership_role)
    require_role(role, required)
    return AccessGrant(
        workspace_id=workspace_id,
        project_id=str(run.get("project_id") or "") or None,
        run_id=str(run.get("id") or "") or None,
        role=role,
    )


def grant_from_certificate(
    principal: Principal,
    certificate: dict[str, Any] | None,
    *,
    membership_role: str | None = None,
    required: str = "viewer",
) -> AccessGrant:
    if not certificate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issued certificate not found")
    workspace_id = str(certificate.get("workspace_id") or "")
    role = _workspace_role_for_principal(principal, workspace_id, membership_role)
    require_role(role, required)
    return AccessGrant(
        workspace_id=workspace_id,
        project_id=str(certificate.get("project_id") or "") or None,
        certificate_id=str(certificate.get("certificate_id") or certificate.get("id") or "") or None,
        role=role,
    )


def can_use_app_routes(principal: Principal) -> bool:
    return principal.principal_type == "user"


def can_use_demo_workspace(principal: Principal, workspace_id: str) -> bool:
    if workspace_id not in {settings.demo_workspace_id, settings.demo_workspace_db_id}:
        return False
    if principal.principal_type != "user":
        return False
    if settings.environment == "production" and not settings.enable_demo_workspace:
        return False
    return _is_demo_principal(principal)


def require_app_principal(principal: Principal) -> Principal:
    if not can_use_app_routes(principal):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Machine tokens cannot access app routes")
    return principal


def _workspace_role_for_principal(
    principal: Principal,
    workspace_id: str,
    membership_role: str | None,
) -> str:
    if principal.principal_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace membership requires a user principal")

    if _is_demo_workspace(principal, workspace_id):
        return "owner"

    if membership_role:
        return normalize_role(membership_role)

    if workspace_id in principal.workspace_ids:
        return normalize_role(principal.role)

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace access denied")


def _is_demo_workspace(principal: Principal, workspace_id: str) -> bool:
    return can_use_demo_workspace(principal, workspace_id)


def _is_demo_principal(principal: Principal) -> bool:
    email = (principal.email or "").strip().lower()
    if email and email in settings.demo_user_emails:
        return True
    if settings.environment != "production" and principal.user_id == "demo_user":
        return True
    if settings.environment != "production" and settings.demo_workspace_id in principal.workspace_ids:
        return True
    return False
