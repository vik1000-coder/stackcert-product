from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import CostEstimateRequest, CustomBehaviorCreate

_behaviors: list[dict[str, Any]] = []


def list_behaviors(project_id: str) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return store.list_custom_behaviors(project_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return [behavior for behavior in _behaviors if behavior["project_id"] == project_id]


def create_behavior(project_id: str, payload: CustomBehaviorCreate) -> dict[str, Any]:
    behavior = build_behavior(project_id, payload)
    store = _persistent_store()
    if store:
        try:
            return store.create_custom_behavior(project_id, behavior)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _behaviors.append(behavior)
    return behavior


def build_behavior(project_id: str, payload: CustomBehaviorCreate) -> dict[str, Any]:
    prompt_hash = hashlib.sha256(payload.prompt.encode("utf-8")).hexdigest()
    return {
        "id": f"beh_{uuid.uuid4().hex[:12]}",
        "project_id": project_id,
        "name": payload.name,
        "description": payload.description,
        "side": payload.side,
        "policy_category": payload.policy_category,
        "severity": payload.severity,
        "prompt_hash": prompt_hash,
        "prompt_redacted": payload.prompt[:280],
        "expected_safe_behavior": payload.expected_safe_behavior,
        "unsafe_behavior": payload.unsafe_behavior,
        "status": "validated",
        "version": "draft-v1",
        "created_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "validation": {
            "complete": True,
            "issues": [],
            "notes": [
                "Stored as a draft custom behavior until a reviewer approves the benchmark suite.",
                "Prompt text should follow the project data handling mode before production persistence.",
            ],
        },
    }


def estimate_cost(payload: CostEstimateRequest) -> dict[str, Any]:
    guard_calls = payload.examples * payload.guards
    input_cost = guard_calls * payload.avg_input_tokens * payload.model_cost_per_1m_input / 1_000_000
    output_cost = guard_calls * payload.avg_output_tokens * payload.model_cost_per_1m_output / 1_000_000
    worker_cost = max(0.25, guard_calls * 0.00003)
    storage_cost = max(0.05, payload.examples * payload.guards * 0.000002)
    exhaustive_pair_cells = payload.guards * max(0, payload.guards - 1) // 2
    estimated_cass_measurement_fraction = min(0.5, max(0.04, 12 / max(1, exhaustive_pair_cells)))
    cass_measurement_cost = (input_cost + output_cost + worker_cost) * estimated_cass_measurement_fraction
    total = input_cost + output_cost + worker_cost + storage_cost
    return {
        "guard_calls": guard_calls,
        "candidate_stacks": payload.candidate_stacks,
        "estimated_full_eval_usd": round(total, 4),
        "estimated_cass_incremental_usd": round(cass_measurement_cost, 4),
        "estimated_savings_usd": round(max(0.0, total - cass_measurement_cost), 4),
        "breakdown": {
            "input_tokens_usd": round(input_cost, 4),
            "output_tokens_usd": round(output_cost, 4),
            "worker_usd": round(worker_cost, 4),
            "storage_usd": round(storage_cost, 4),
        },
    }


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
