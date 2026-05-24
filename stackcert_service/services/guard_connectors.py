from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import GuardConnectorCreate
from stackcert_service.services import demo_project
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


def clear_connectors() -> None:
    _connectors.clear()
    provider_secrets.clear_memory_secrets()


def _connector_from_payload(project_id: str, payload: GuardConnectorCreate) -> dict[str, Any]:
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
        "unit_cost_usd": 0.0002,
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
            "config": {"source": "seeded_outputs", "has_secret": False},
            "redaction": {"auth_secret_stored": False, "auth_secret_visible": False},
        }
        for guard in engine.guards
    ]


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
