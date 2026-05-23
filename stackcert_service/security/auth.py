from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

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
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase JWT validation is not configured for this environment.",
        )
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
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


def current_principal(authorization: Annotated[str | None, Header()] = None) -> Principal:
    """Return the authenticated user.

    Local development intentionally allows a demo principal so the seeded app is
    usable before Supabase Auth is wired. Production environments should set
    `STACKCERT_ENV=production` and `SUPABASE_JWT_SECRET`.
    """

    if authorization and authorization.lower().startswith("bearer "):
        return _decode_supabase_jwt(authorization.split(" ", 1)[1].strip())
    if settings.environment != "production":
        return Principal(user_id="demo_user", email="demo@stackcert.local")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")


PrincipalDep = Annotated[Principal, Depends(current_principal)]

