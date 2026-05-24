from __future__ import annotations

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


PrincipalDep = Annotated[Principal, Depends(current_principal)]
