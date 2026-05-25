from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store

_usage_events: list[dict[str, Any]] = []


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def record_usage_events(project_id: str, job: dict[str, Any], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = [_normalize_event(project_id, job, event) for event in events]
    store = _persistent_store()
    if store:
        try:
            return store.record_usage_events(project_id, job, normalized)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    existing_by_id = {event["id"]: index for index, event in enumerate(_usage_events)}
    for event in normalized:
        existing_index = existing_by_id.get(event["id"])
        if existing_index is None:
            existing_by_id[event["id"]] = len(_usage_events)
            _usage_events.append(event)
        else:
            _usage_events[existing_index] = {**_usage_events[existing_index], **event}
    return normalized


def list_usage_events(project_id: str, run_id: str | None = None) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return store.list_usage_events(project_id, run_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    events = [event for event in _usage_events if event["project_id"] == project_id]
    if run_id:
        events = [event for event in events if event.get("run_id") == run_id]
    return sorted(events, key=lambda event: event["created_at"], reverse=True)


def cost_summary(project_id: str, run_id: str | None = None) -> dict[str, Any]:
    events = list_usage_events(project_id, run_id)
    by_provider: dict[str, dict[str, Any]] = {}
    for event in events:
        provider = str(event.get("provider") or "unknown")
        bucket = by_provider.setdefault(
            provider,
            {
                "provider": provider,
                "events": 0,
                "request_count": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "estimated_cost_usd": 0.0,
                "actual_cost_usd": 0.0,
            },
        )
        bucket["events"] += 1
        bucket["request_count"] += int(event.get("request_count") or 0)
        bucket["input_tokens"] += int(event.get("input_tokens") or 0)
        bucket["output_tokens"] += int(event.get("output_tokens") or 0)
        bucket["estimated_cost_usd"] += float(event.get("estimated_cost_usd") or 0)
        bucket["actual_cost_usd"] += float(event.get("actual_cost_usd") or event.get("estimated_cost_usd") or 0)

    summary = {
        "events": len(events),
        "request_count": sum(int(event.get("request_count") or 0) for event in events),
        "input_tokens": sum(int(event.get("input_tokens") or 0) for event in events),
        "output_tokens": sum(int(event.get("output_tokens") or 0) for event in events),
        "estimated_cost_usd": round(sum(float(event.get("estimated_cost_usd") or 0) for event in events), 4),
        "actual_cost_usd": round(
            sum(float(event.get("actual_cost_usd") or event.get("estimated_cost_usd") or 0) for event in events),
            4,
        ),
        "currency": "USD",
    }
    return {
        "project_id": project_id,
        "run_id": run_id,
        "summary": summary,
        "by_provider": [
            {
                **bucket,
                "estimated_cost_usd": round(float(bucket["estimated_cost_usd"]), 4),
                "actual_cost_usd": round(float(bucket["actual_cost_usd"]), 4),
            }
            for bucket in sorted(by_provider.values(), key=lambda item: item["actual_cost_usd"], reverse=True)
        ],
        "events": events[:100],
    }


def clear_usage_events() -> None:
    _usage_events.clear()


def _normalize_event(project_id: str, job: dict[str, Any], event: dict[str, Any]) -> dict[str, Any]:
    metadata = {
        **(event.get("metadata") or {}),
        "api_project_id": project_id,
        "api_run_id": job.get("run_id"),
        "api_job_id": job["id"],
    }
    return {
        "id": event.get("id") or f"use_{uuid.uuid4().hex[:12]}",
        "workspace_id": settings.demo_workspace_id,
        "project_id": project_id,
        "run_id": job.get("run_id"),
        "job_id": job["id"],
        "provider": event.get("provider") or "stackcert_worker",
        "model": event.get("model"),
        "operation": event["operation"],
        "input_tokens": int(event.get("input_tokens") or 0),
        "output_tokens": int(event.get("output_tokens") or 0),
        "request_count": int(event.get("request_count") or 0),
        "duration_ms": int(event["duration_ms"]) if event.get("duration_ms") is not None else None,
        "estimated_cost_usd": round(float(event.get("estimated_cost_usd") or 0), 4),
        "actual_cost_usd": round(float(event.get("actual_cost_usd") or event.get("estimated_cost_usd") or 0), 4),
        "currency": event.get("currency") or "USD",
        "metadata": metadata,
        "created_at": event.get("created_at") or _now(),
    }


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
