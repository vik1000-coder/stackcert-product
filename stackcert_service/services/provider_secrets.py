from __future__ import annotations

import base64
import os
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException, status

from stackcert_service.config import settings


_memory_provider_secrets: dict[str, str] = {}
ALLOWED_SECRET_REF_PREFIXES = ("env://", "gcp-secret://", "memory-vault://")


@dataclass(frozen=True)
class SecretConfig:
    has_secret: bool
    secret_env_var: str | None
    secret_ref: str | None
    secret_status: str


@dataclass(frozen=True)
class SecretUpdate:
    config_patch: dict[str, Any]
    response: dict[str, Any]


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
        return SecretConfig(True, env_name, f"env://{env_name}", _env_secret_status(env_name))

    ref = _memory_secret_ref(project_id, guard_id)
    _memory_provider_secrets[ref] = raw_secret
    return SecretConfig(True, env_name, ref, "available_local_memory")


def prepare_secret_update(
    *,
    project_id: str,
    guard_id: str,
    current_config: dict[str, Any] | None,
    raw_secret: str | None = None,
    secret_env_var: str | None = None,
    secret_ref: str | None = None,
    backend: str = "auto",
    actor_id: str | None = None,
    action: str = "upsert",
) -> SecretUpdate:
    current_config = current_config or {}
    raw_secret = (raw_secret or "").strip()
    secret_env_var = (secret_env_var or current_config.get("secret_env_var") or default_secret_env_name(guard_id)).strip()
    secret_ref = (secret_ref or "").strip()
    backend = (backend or "auto").strip().lower()
    if backend not in {"auto", "env", "local_memory", "gcp_secret_manager"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported secret backend")

    if raw_secret and settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Production secret updates require a backend secret reference or environment variable name; do not send raw provider secrets to the API.",
        )

    if secret_ref:
        _validate_secret_ref(secret_ref)
        resolved_ref = secret_ref
        provider = _provider_from_ref(secret_ref)
        resolved_env = secret_env_var if provider == "env" else None
        secret_status = _status_for_ref(secret_ref)
    elif raw_secret:
        resolved_ref = _memory_secret_ref(project_id, guard_id)
        _memory_provider_secrets[resolved_ref] = raw_secret
        provider = "local_memory"
        resolved_env = secret_env_var
        secret_status = "available_local_memory"
    else:
        if backend == "gcp_secret_manager":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="gcp_secret_manager backend requires a gcp-secret:// secret_ref.",
            )
        resolved_env = secret_env_var
        resolved_ref = f"env://{resolved_env}"
        provider = "env"
        secret_status = _env_secret_status(resolved_env)

    previous_metadata = current_config.get("secret_metadata") or {}
    now = _now()
    rotation_count = int(previous_metadata.get("rotation_count") or 0)
    if action == "rotate":
        rotation_count += 1
    metadata = {
        "provider": provider,
        "secret_ref": resolved_ref,
        "secret_env_var": resolved_env,
        "status": secret_status,
        "created_at": previous_metadata.get("created_at") or now,
        "created_by": previous_metadata.get("created_by") or actor_id,
        "last_rotated_at": now if action == "rotate" else previous_metadata.get("last_rotated_at"),
        "last_rotated_by": actor_id if action == "rotate" else previous_metadata.get("last_rotated_by"),
        "last_registered_at": now,
        "last_registered_by": actor_id,
        "rotation_count": rotation_count,
    }
    patch = {
        "has_secret": True,
        "secret_ref": resolved_ref,
        "secret_env_var": resolved_env,
        "secret_status": secret_status,
        "secret_metadata": metadata,
    }
    return SecretUpdate(config_patch=patch, response=redacted_secret_response(patch))


def prepare_secret_disable(current_config: dict[str, Any] | None, *, actor_id: str | None = None) -> SecretUpdate:
    current_config = current_config or {}
    metadata = {
        **(current_config.get("secret_metadata") or {}),
        "status": "disabled",
        "disabled_at": _now(),
        "disabled_by": actor_id,
    }
    patch = {
        "has_secret": False,
        "secret_ref": None,
        "secret_env_var": None,
        "secret_status": "disabled",
        "secret_metadata": metadata,
    }
    return SecretUpdate(config_patch=patch, response=redacted_secret_response(patch))


def redacted_secret_response(config: dict[str, Any]) -> dict[str, Any]:
    metadata = config.get("secret_metadata") or {}
    secret_ref = config.get("secret_ref") or metadata.get("secret_ref")
    return {
        "has_secret": bool(config.get("has_secret")),
        "secret_ref": _redact_secret_ref(str(secret_ref)) if secret_ref else None,
        "secret_env_var": config.get("secret_env_var") or metadata.get("secret_env_var"),
        "secret_status": config.get("secret_status") or metadata.get("status") or "not_required",
        "provider": metadata.get("provider") or (_provider_from_ref(str(secret_ref)) if secret_ref else None),
        "created_at": metadata.get("created_at"),
        "last_rotated_at": metadata.get("last_rotated_at"),
        "last_registered_at": metadata.get("last_registered_at"),
        "last_used_at": metadata.get("last_used_at"),
        "rotation_count": int(metadata.get("rotation_count") or 0),
        "auth_secret_visible": False,
    }


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
    if _should_prefix_bearer(header_name, config, secret):
        secret = f"Bearer {secret.strip()}"
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
    if secret_ref.startswith("gcp-secret://"):
        return resolve_gcp_secret_manager_ref(secret_ref)
    return None


def resolve_gcp_secret_manager_ref(secret_ref: str) -> str | None:
    resource = _gcp_secret_resource(secret_ref)
    token = _metadata_access_token()
    api_base = os.getenv("STACKCERT_GCP_SECRET_MANAGER_API_BASE", "https://secretmanager.googleapis.com/v1").rstrip("/")
    try:
        response = httpx.get(
            f"{api_base}/{resource}:access",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Secret Manager access failed") from exc
    if response.status_code in {401, 403, 404}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Secret Manager reference is not accessible")
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Secret Manager access failed")
    encoded = (response.json().get("payload") or {}).get("data")
    if not encoded:
        return None
    return base64.b64decode(encoded).decode("utf-8")


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


def _should_prefix_bearer(header_name: str, config: dict[str, Any], secret: str) -> bool:
    if header_name.lower() != "authorization":
        return False
    if str(config.get("auth_scheme") or "").strip().lower() != "bearer":
        return False
    normalized = secret.strip().lower()
    return bool(normalized) and not normalized.startswith(("bearer ", "basic ", "token "))


def _memory_secret_ref(project_id: str, guard_id: str) -> str:
    normalized_project = re.sub(r"[^A-Za-z0-9_-]+", "_", project_id).strip("_") or "project"
    normalized_guard = re.sub(r"[^A-Za-z0-9_-]+", "_", guard_id).strip("_") or "guard"
    return f"memory-vault://{normalized_project}/{normalized_guard}"


def _validate_secret_ref(secret_ref: str) -> None:
    if not secret_ref.startswith(ALLOWED_SECRET_REF_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="secret_ref must use env://, gcp-secret://, or memory-vault://",
        )
    if secret_ref.startswith("memory-vault://") and settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="memory-vault:// secret refs are local-development only",
        )
    if secret_ref.startswith("env://"):
        env_name = secret_ref.removeprefix("env://")
        if not re.fullmatch(r"[A-Z_][A-Z0-9_]*", env_name):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="env:// secret refs must name an uppercase env var")
    if secret_ref.startswith("gcp-secret://"):
        _gcp_secret_resource(secret_ref)


def _gcp_secret_resource(secret_ref: str) -> str:
    resource = secret_ref.removeprefix("gcp-secret://").strip("/")
    pattern = r"projects/[A-Za-z0-9:_-]+/secrets/[A-Za-z0-9_-]+/versions/(?:[A-Za-z0-9_-]+|latest)$"
    if not re.fullmatch(pattern, resource):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="gcp-secret:// refs must be projects/{project}/secrets/{secret}/versions/{version}",
        )
    return resource


def _metadata_access_token() -> str:
    token_url = os.getenv(
        "STACKCERT_GCP_METADATA_TOKEN_URL",
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    )
    try:
        response = httpx.get(token_url, headers={"Metadata-Flavor": "Google"}, timeout=3.0)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GCP metadata token unavailable") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GCP metadata token unavailable")
    token = response.json().get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GCP metadata token unavailable")
    return str(token)


def _provider_from_ref(secret_ref: str) -> str:
    if secret_ref.startswith("gcp-secret://"):
        return "gcp_secret_manager"
    if secret_ref.startswith("memory-vault://"):
        return "local_memory"
    return "env"


def _status_for_ref(secret_ref: str) -> str:
    if secret_ref.startswith("env://"):
        return _env_secret_status(secret_ref.removeprefix("env://"))
    if secret_ref.startswith("gcp-secret://"):
        return "registered_secret_manager_ref"
    if secret_ref.startswith("memory-vault://"):
        return "available_local_memory" if secret_ref in _memory_provider_secrets else "missing_local_memory"
    return "registered"


def _env_secret_status(env_name: str) -> str:
    return "available_runtime_secret" if os.getenv(env_name) else "pending_runtime_secret"


def _redact_secret_ref(secret_ref: str) -> str:
    if secret_ref.startswith("env://"):
        return secret_ref
    if secret_ref.startswith("gcp-secret://"):
        resource = secret_ref.removeprefix("gcp-secret://").strip("/")
        parts = resource.split("/")
        if len(parts) >= 6:
            return f"gcp-secret://projects/{parts[1]}/secrets/{parts[3]}/versions/{parts[5]}"
    if secret_ref.startswith("memory-vault://"):
        return "memory-vault://redacted"
    return "redacted"


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()
