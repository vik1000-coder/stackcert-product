from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings


_memory_provider_secrets: dict[str, str] = {}


@dataclass(frozen=True)
class SecretConfig:
    has_secret: bool
    secret_env_var: str | None
    secret_ref: str | None
    secret_status: str


def prepare_secret_config(
    *,
    project_id: str,
    guard_id: str,
    raw_secret: str | None,
    secret_env_var: str | None = None,
) -> SecretConfig:
    env_name = (secret_env_var or default_secret_env_name(guard_id)).strip()
    raw_secret = (raw_secret or "").strip()
    if not raw_secret:
        return SecretConfig(False, None, None, "not_required")

    if settings.environment == "production":
        return SecretConfig(True, env_name, f"env://{env_name}", "pending_runtime_secret")

    ref = _memory_secret_ref(project_id, guard_id)
    _memory_provider_secrets[ref] = raw_secret
    return SecretConfig(True, env_name, ref, "available_local_memory")


def connector_auth_headers(guard_id: str, connector: dict[str, Any]) -> dict[str, str]:
    config = connector.get("config") or {}
    header_name = str(config.get("auth_header_name") or "Authorization").strip() or "Authorization"
    if not bool(config.get("has_secret")):
        return {}
    secret = resolve_connector_secret(guard_id, connector)
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guard {guard_id} requires a backend secret; set {default_secret_env_name(guard_id)} or the configured secret env var in the worker environment.",
        )
    return {header_name: secret}


def resolve_connector_secret(guard_id: str, connector: dict[str, Any]) -> str | None:
    config = connector.get("config") or {}
    for env_name in _candidate_env_names(guard_id, config):
        value = os.getenv(env_name)
        if value:
            return value
    secret_ref = str(config.get("secret_ref") or "").strip()
    if secret_ref.startswith("memory-vault://"):
        return _memory_provider_secrets.get(secret_ref)
    if secret_ref.startswith("env://"):
        return os.getenv(secret_ref.removeprefix("env://"))
    return None


def default_secret_env_name(guard_id: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", guard_id).strip("_").upper()
    return f"STACKCERT_GUARD_SECRET_{normalized}"


def clear_memory_secrets() -> None:
    _memory_provider_secrets.clear()


def _candidate_env_names(guard_id: str, config: dict[str, Any]) -> list[str]:
    candidates = []
    configured_env = str(config.get("secret_env_var") or "").strip()
    if configured_env:
        candidates.append(configured_env)
    candidates.append(default_secret_env_name(guard_id))
    secret_ref = str(config.get("secret_ref") or "").strip()
    if secret_ref.startswith("env://"):
        candidates.append(secret_ref.removeprefix("env://"))
    if secret_ref.startswith("pending-vault://"):
        candidates.append(default_secret_env_name(secret_ref.removeprefix("pending-vault://")))
    deduped: list[str] = []
    for env_name in candidates:
        if env_name and env_name not in deduped:
            deduped.append(env_name)
    return deduped


def _memory_secret_ref(project_id: str, guard_id: str) -> str:
    normalized_project = re.sub(r"[^A-Za-z0-9_-]+", "_", project_id).strip("_") or "project"
    normalized_guard = re.sub(r"[^A-Za-z0-9_-]+", "_", guard_id).strip("_") or "guard"
    return f"memory-vault://{normalized_project}/{normalized_guard}"
