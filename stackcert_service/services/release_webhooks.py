from __future__ import annotations

import hashlib
import hmac
import os
import time
from datetime import datetime
from typing import Mapping

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.security.auth import Principal

MAX_REPLAY_AGE_SECONDS = 300


def authenticate_webhook(project_id: str, headers: Mapping[str, str], body: bytes) -> Principal:
    timestamp = str(headers.get("x-stackcert-timestamp") or headers.get("X-StackCert-Timestamp") or "").strip()
    signature = _normalize_signature(str(headers.get("x-stackcert-signature") or headers.get("X-StackCert-Signature") or ""))
    if not timestamp or not signature:
        raise _unauthorized("Missing webhook timestamp or signature")
    if settings.environment == "production" and _is_replay(timestamp):
        raise _unauthorized("Webhook timestamp is outside the allowed replay window")

    signed_payload = timestamp.encode("utf-8") + b"." + body
    for secret_id, secret in _webhook_secrets().items():
        expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected, signature):
            return Principal(
                user_id=f"webhook:{secret_id}",
                email=None,
                role="machine",
                principal_type="machine",
                scopes=("release_gate:read",),
                allowed_project_ids=_webhook_projects().get(secret_id, (settings.demo_project_id,)),
            )
    raise _unauthorized("Invalid webhook signature")


def _webhook_secrets() -> dict[str, str]:
    parsed: dict[str, str] = {}
    raw = os.getenv("STACKCERT_RELEASE_WEBHOOK_SECRET_HASHES", "")
    for entry in raw.split(","):
        if ":" not in entry:
            continue
        secret_id, secret = entry.split(":", 1)
        secret_id = secret_id.strip()
        secret = secret.strip()
        for prefix in ("raw:", "hmac:", "sha256:"):
            if secret.startswith(prefix):
                secret = secret.removeprefix(prefix)
                break
        if secret_id and secret:
            parsed[secret_id] = secret
    return parsed


def _webhook_projects() -> dict[str, tuple[str, ...]]:
    parsed: dict[str, tuple[str, ...]] = {}
    raw = os.getenv("STACKCERT_RELEASE_WEBHOOK_SECRET_PROJECTS", "")
    for entry in raw.split(","):
        if "=" not in entry:
            continue
        secret_id, projects = entry.split("=", 1)
        values = tuple(project_id.strip() for project_id in projects.split("|") if project_id.strip())
        if secret_id.strip() and values:
            parsed[secret_id.strip()] = values
    return parsed


def _normalize_signature(value: str) -> str:
    signature = value.strip()
    if signature.startswith("sha256="):
        signature = signature.removeprefix("sha256=")
    if len(signature) != 64:
        return ""
    try:
        int(signature, 16)
    except ValueError:
        return ""
    return signature.lower()


def _is_replay(timestamp: str) -> bool:
    parsed = _timestamp_seconds(timestamp)
    if parsed is None:
        return True
    return abs(time.time() - parsed) > MAX_REPLAY_AGE_SECONDS


def _timestamp_seconds(timestamp: str) -> float | None:
    try:
        return float(timestamp)
    except ValueError:
        pass
    try:
        return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
