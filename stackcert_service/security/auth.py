from __future__ import annotations

import hashlib
import hmac
import os
from dataclasses import dataclass
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status

from stackcert_service.config import settings


@dataclass(frozen=True)
class Principal:
    user_id: str
    email: str | None
    role: str = "owner"
    workspace_ids: tuple[str, ...] = (settings.demo_workspace_id,)
    principal_type: str = "user"
    scopes: tuple[str, ...] = ("app:read", "app:write", "mcp:read", "mcp:write")
    allowed_project_ids: tuple[str, ...] = ()


def _decode_supabase_jwt(token: str) -> Principal:
    try:
        payload = jwt.decode(
            token,
            str(settings.supabase_jwt_secret),
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_exp": True},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token") from exc
    return Principal(
        user_id=str(payload.get("sub") or "unknown"),
        email=payload.get("email"),
        role=str(payload.get("app_metadata", {}).get("role") or "member"),
    )


def _fetch_supabase_user(token: str) -> Principal:
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase token validation requires SUPABASE_JWT_SECRET or SUPABASE_URL plus SUPABASE_SECRET_KEY.",
        )

    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "authorization": f"Bearer {token}",
                "apikey": settings.supabase_secret_key,
            },
            timeout=5.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase Auth validation failed") from exc

    if response.status_code in {401, 403}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase Auth validation failed")

    payload = response.json()
    app_metadata = payload.get("app_metadata") or {}
    return Principal(
        user_id=str(payload.get("id") or payload.get("sub") or "unknown"),
        email=payload.get("email"),
        role=str(app_metadata.get("role") or "member"),
    )


def _authenticate_bearer_token(token: str) -> Principal:
    if settings.supabase_jwt_secret:
        return _decode_supabase_jwt(token)
    return _fetch_supabase_user(token)


def _authenticate_mcp_machine_token(token: str) -> Principal | None:
    return _authenticate_machine_token(
        token,
        hashes_env="STACKCERT_MCP_MACHINE_TOKEN_HASHES",
        scopes_env="STACKCERT_MCP_MACHINE_TOKEN_SCOPES",
        projects_env="STACKCERT_MCP_MACHINE_TOKEN_PROJECTS",
        default_scopes=("mcp:read",),
    )


def _authenticate_release_gate_machine_token(token: str) -> Principal | None:
    return _authenticate_machine_token(
        token,
        hashes_env="STACKCERT_RELEASE_GATE_TOKEN_HASHES",
        scopes_env="STACKCERT_RELEASE_GATE_TOKEN_SCOPES",
        projects_env="STACKCERT_RELEASE_GATE_TOKEN_PROJECTS",
        default_scopes=("release_gate:read",),
    )


def _authenticate_machine_token(
    token: str,
    *,
    hashes_env: str,
    scopes_env: str,
    projects_env: str,
    default_scopes: tuple[str, ...],
) -> Principal | None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    for token_id, expected_hash in _machine_token_hashes(hashes_env).items():
        if hmac.compare_digest(token_hash, expected_hash):
            return Principal(
                user_id=f"machine:{token_id}",
                email=None,
                role="machine",
                principal_type="machine",
                scopes=_machine_token_scopes(scopes_env).get(token_id, default_scopes),
                allowed_project_ids=_machine_token_projects(projects_env).get(token_id, (settings.demo_project_id,)),
            )
    return None


def _machine_token_hashes(env_name: str) -> dict[str, str]:
    raw = os.getenv(env_name, "")
    parsed: dict[str, str] = {}
    for entry in raw.split(","):
        if ":" not in entry:
            continue
        token_id, token_hash = entry.split(":", 1)
        token_id = token_id.strip()
        token_hash = token_hash.strip().removeprefix("sha256:")
        if token_id and len(token_hash) == 64:
            parsed[token_id] = token_hash.lower()
    return parsed


def _machine_token_scopes(env_name: str) -> dict[str, tuple[str, ...]]:
    raw = os.getenv(env_name, "")
    parsed: dict[str, tuple[str, ...]] = {}
    for entry in raw.split(","):
        if "=" not in entry:
            continue
        token_id, scopes = entry.split("=", 1)
        values = tuple(scope.strip() for scope in scopes.split("|") if scope.strip())
        if token_id.strip() and values:
            parsed[token_id.strip()] = values
    return parsed


def _machine_token_projects(env_name: str) -> dict[str, tuple[str, ...]]:
    raw = os.getenv(env_name, "")
    parsed: dict[str, tuple[str, ...]] = {}
    for entry in raw.split(","):
        if "=" not in entry:
            continue
        token_id, project_ids = entry.split("=", 1)
        values = tuple(project_id.strip() for project_id in project_ids.split("|") if project_id.strip())
        if token_id.strip() and values:
            parsed[token_id.strip()] = values
    return parsed


def current_principal(authorization: Annotated[str | None, Header()] = None) -> Principal:
    """Return the authenticated user.

    Local development intentionally allows a demo principal so the seeded app is
    usable before Supabase Auth is wired. Production environments should set
    `STACKCERT_ENV=production` and either `SUPABASE_JWT_SECRET` or
    `SUPABASE_URL` plus backend-only `SUPABASE_SECRET_KEY`.
    """

    if authorization and authorization.lower().startswith("bearer "):
        return _authenticate_bearer_token(authorization.split(" ", 1)[1].strip())
    if settings.environment != "production":
        return Principal(user_id="demo_user", email="demo@stackcert.local")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")


def current_mcp_principal(authorization: Annotated[str | None, Header()] = None) -> Principal:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        machine = _authenticate_mcp_machine_token(token)
        if machine:
            return machine
    return current_principal(authorization)


def current_release_gate_principal(authorization: Annotated[str | None, Header()] = None) -> Principal:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        machine = _authenticate_release_gate_machine_token(token)
        if machine:
            return machine
    return current_principal(authorization)


PrincipalDep = Annotated[Principal, Depends(current_principal)]
McpPrincipalDep = Annotated[Principal, Depends(current_mcp_principal)]
ReleaseGatePrincipalDep = Annotated[Principal, Depends(current_release_gate_principal)]
