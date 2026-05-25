from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import GuardConnectorCreate
from stackcert_service.services import demo_project
from stackcert_service.services import pricing
from stackcert_service.services.display import guard_label
from stackcert_service.services import provider_secrets


_connectors: dict[str, list[dict[str, Any]]] = {}


def list_connectors(project_id: str, lambda_cost: float = 5.0) -> list[dict[str, Any]]:
    demo = _demo_connectors(lambda_cost) if project_id == settings.demo_project_id else []
    store = _persistent_store()
    if store:
        try:
            return store.list_guard_connectors(project_id) + demo
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return list(_connectors.get(project_id, [])) + demo


def create_connector(project_id: str, payload: GuardConnectorCreate) -> dict[str, Any]:
    connector = _connector_from_payload(project_id, payload)
    store = _persistent_store()
    if store:
        try:
            return store.create_guard_connector(project_id, connector)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _connectors.setdefault(project_id, []).insert(0, connector)
    return connector


def upsert_connector_secret(
    project_id: str,
    guard_id: str,
    *,
    raw_secret: str | None = None,
    secret_env_var: str | None = None,
    secret_ref: str | None = None,
    backend: str = "auto",
    actor_id: str | None = None,
    action: str = "upsert",
) -> dict[str, Any]:
    connector = _find_connector(project_id, guard_id)
    update = provider_secrets.prepare_secret_update(
        project_id=project_id,
        guard_id=str(connector.get("guard_key") or guard_id),
        current_config=connector.get("config") or {},
        raw_secret=raw_secret,
        secret_env_var=secret_env_var,
        secret_ref=secret_ref,
        backend=backend,
        actor_id=actor_id,
        action=action,
    )
    return _apply_connector_config_patch(project_id, connector, update.config_patch)


def disable_connector_secret(project_id: str, guard_id: str, *, actor_id: str | None = None) -> dict[str, Any]:
    connector = _find_connector(project_id, guard_id)
    update = provider_secrets.prepare_secret_disable(connector.get("config") or {}, actor_id=actor_id)
    return _apply_connector_config_patch(project_id, connector, update.config_patch)


def connector_secret_state(project_id: str, guard_id: str) -> dict[str, Any]:
    connector = _find_connector(project_id, guard_id)
    return provider_secrets.redacted_secret_response(connector.get("config") or {})


def clear_connectors() -> None:
    _connectors.clear()
    provider_secrets.clear_memory_secrets()


def _connector_from_payload(project_id: str, payload: GuardConnectorCreate) -> dict[str, Any]:
    price_card = pricing.price_card_from_payload(payload)
    secret_config = provider_secrets.prepare_secret_config(
        project_id=project_id,
        guard_id=payload.guard_key,
        raw_secret=payload.auth_secret,
        secret_env_var=payload.secret_env_var,
    )
    config: dict[str, Any] = {
        "endpoint_url": payload.endpoint_url,
        "auth_header_name": payload.auth_header_name,
        "has_secret": secret_config.has_secret,
        "secret_ref": secret_config.secret_ref,
        "secret_env_var": secret_config.secret_env_var,
        "secret_status": secret_config.secret_status,
        "price_card": price_card,
        "rate_limit_per_minute": payload.rate_limit_per_minute,
        "retry_max_attempts": payload.retry_max_attempts,
        "retry_backoff_base_seconds": payload.retry_backoff_base_seconds,
    }
    if secret_config.has_secret:
        config["secret_metadata"] = {
            "provider": "local_memory" if str(secret_config.secret_ref or "").startswith("memory-vault://") else "env",
            "secret_ref": secret_config.secret_ref,
            "secret_env_var": secret_config.secret_env_var,
            "status": secret_config.secret_status,
            "created_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
            "rotation_count": 0,
        }
    if payload.adapter_type == "model_judge" or payload.guard_type == "model_judge":
        config.update(
            {
                "model": payload.model or "gpt-4.1-mini",
                "provider_format": payload.provider_format or "openai_chat",
                "system_prompt": payload.system_prompt or _default_model_judge_prompt(payload.display_name),
                "timeout_sec": payload.timeout_sec or 60,
            }
        )
    elif payload.timeout_sec:
        config["timeout_sec"] = payload.timeout_sec
    return {
        "id": f"guard_{uuid.uuid4().hex[:12]}",
        "project_id": project_id,
        "guard_key": payload.guard_key,
        "label": payload.display_name,
        "display_name": payload.display_name,
        "name": payload.display_name,
        "type": payload.guard_type,
        "guard_type": payload.guard_type,
        "vendor": payload.vendor or "custom",
        "version": payload.version,
        "adapter_type": payload.adapter_type,
        "threshold": payload.threshold,
        "status": "configured",
        "latency_ms": 100,
        "unit_cost_usd": price_card["request_price_usd"],
        "price_card": price_card,
        "created_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "config": config,
        "redaction": {
            "auth_secret_stored": secret_config.has_secret,
            "auth_secret_visible": False,
            "secret_status": secret_config.secret_status,
        },
    }


def _demo_connectors(lambda_cost: float) -> list[dict[str, Any]]:
    engine, _, _ = demo_project.demo_bundle(lambda_cost)
    return [
        {
            "id": guard.guard_id,
            "project_id": settings.demo_project_id,
            "guard_key": guard.guard_id,
            "label": guard_label(guard.guard_id),
            "display_name": guard_label(guard.guard_id),
            "name": guard.name,
            "type": guard.guard_type,
            "guard_type": guard.guard_type,
            "vendor": "seeded_demo",
            "version": guard.version,
            "adapter_type": "uploaded_outputs",
            "threshold": None,
            "status": "available",
            "latency_ms": guard.latency_ms or 85,
            "unit_cost_usd": guard.unit_cost_usd or 0.0002,
            "price_card": pricing.connector_price_card({"unit_cost_usd": guard.unit_cost_usd or 0.0002}),
            "config": {"source": "seeded_outputs", "has_secret": False},
            "redaction": {"auth_secret_stored": False, "auth_secret_visible": False},
        }
        for guard in engine.guards
    ]


def _find_connector(project_id: str, guard_id: str) -> dict[str, Any]:
    for connector in list_connectors(project_id):
        if guard_id in {str(connector.get("id")), str(connector.get("guard_key"))}:
            return connector
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guard connector not found")


def _apply_connector_config_patch(project_id: str, connector: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    config = {**(connector.get("config") or {}), **patch}
    config.pop("auth_secret", None)
    connector = {
        **connector,
        "config": config,
        "redaction": {
            **(connector.get("redaction") or {}),
            "auth_secret_stored": bool(config.get("has_secret")),
            "auth_secret_visible": False,
            "secret_status": config.get("secret_status"),
            "secret": provider_secrets.redacted_secret_response(config),
        },
    }
    store = _persistent_store()
    if store:
        try:
            return store.update_guard_connector_config(
                project_id,
                str(connector.get("guard_key") or connector.get("id")),
                config,
            )
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    connectors = _connectors.setdefault(project_id, [])
    for index, existing in enumerate(connectors):
        if str(existing.get("id")) == str(connector.get("id")) or str(existing.get("guard_key")) == str(connector.get("guard_key")):
            connectors[index] = connector
            break
    else:
        connectors.insert(0, connector)
    return connector


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


def _default_model_judge_prompt(display_name: str) -> str:
    return (
        f"You are {display_name}, a safety-check judge for an LLM application. "
        "Classify whether the user prompt should be blocked by this safety check. "
        "Return only JSON with fields: block, risk_score, category, rationale."
    )
