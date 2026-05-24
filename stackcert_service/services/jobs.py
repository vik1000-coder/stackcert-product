from __future__ import annotations

import ipaddress
import os
import re
import urllib.parse
import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status

from stackcert.data.schemas import BenchmarkExample, GuardOutput
from stackcert.eval.runner import EvaluationRunner
from stackcert.eval.sampling import sample_within_cells
from stackcert.guards.fake_adapter import DeterministicPolicyGuardAdapter
from stackcert.guards.rest_adapter import RESTGuardAdapter, RESTGuardAdapterError
from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import EvaluationJobCreate, MeasurementPlanCreate
from stackcert_service.services import benchmark_imports
from stackcert_service.services import demo_project
from stackcert_service.services import guard_connectors
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects
from stackcert_service.services import usage
from stackcert_service.services.display import guard_label, stack_label


_jobs: dict[str, dict[str, Any]] = {}
DEFAULT_MAX_JOB_ATTEMPTS = 3
DEFAULT_LEASE_SECONDS = 300
MAX_RETRY_DELAY_SECONDS = 300
RETRYABLE_ERROR_CLASSES = {"timeout", "rate_limited", "provider_unavailable", "worker_exception"}


def _now_dt() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def _now() -> str:
    return _now_dt().isoformat()


def _future(seconds: int) -> str:
    return (_now_dt() + timedelta(seconds=seconds)).isoformat()


def _store(job: dict[str, Any]) -> dict[str, Any]:
    store = _persistent_store()
    if store:
        try:
            return store.store_job(job)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _jobs[job["id"]] = job
    return job


def _update(job: dict[str, Any]) -> dict[str, Any]:
    job["updated_at"] = _now()
    store = _persistent_store()
    if store:
        try:
            return store.update_job(job)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _jobs[job["id"]] = job
    return job


def _reliability_fields() -> dict[str, Any]:
    return {
        "max_attempts": DEFAULT_MAX_JOB_ATTEMPTS,
        "lease_expires_at": None,
        "locked_by": None,
        "retry_after": None,
        "error": None,
        "error_class": None,
        "dead_letter_reason": None,
        "events": [
            {
                "at": _now(),
                "type": "queued",
                "message": "Job queued for worker execution.",
            }
        ],
    }


def _append_event(job: dict[str, Any], event_type: str, message: str, metadata: dict[str, Any] | None = None) -> None:
    events = list(job.get("events") or [])
    event: dict[str, Any] = {"at": _now(), "type": event_type, "message": message}
    if metadata:
        event["metadata"] = metadata
    events.append(event)
    job["events"] = events[-50:]


def list_jobs(project_id: str) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return store.list_jobs(project_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return sorted(
        [job for job in _jobs.values() if job["project_id"] == project_id],
        key=lambda job: job["created_at"],
        reverse=True,
    )


def get_job(job_id: str) -> dict[str, Any]:
    store = _persistent_store()
    if store:
        try:
            job = store.get_job(job_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        return job
    if job_id not in _jobs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _jobs[job_id]


def create_evaluation_job(project_id: str, payload: EvaluationJobCreate) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    suite_context: dict[str, Any] = {}
    if project_id == settings.demo_project_id:
        if payload.adapter_mode == "rest_guard":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="REST guard execution requires configured project connectors")
        engine, _, _ = demo_project.demo_bundle()
        requested_guard_ids = payload.guard_ids or list(engine.guard_ids[: min(4, len(engine.guard_ids))])
        unknown = sorted(set(requested_guard_ids).difference(engine.guard_ids))
        if unknown:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown guard ids: {', '.join(unknown)}")
        estimated_cost_usd = 0.0
    else:
        suite_bundle = benchmark_imports.get_committed_suite_bundle(project_id, payload.benchmark_suite_id)
        all_examples = pilot_runs._examples_from_suite(suite_bundle)
        sampled_examples = sample_within_cells(all_examples, per_cell=payload.examples_per_cell, seed=payload.seed)
        if not sampled_examples:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Benchmark suite has no runnable examples")
        configured_guard_ids = _project_guard_ids(project_id)
        requested_guard_ids = payload.guard_ids or configured_guard_ids[: min(20, len(configured_guard_ids))]
        unknown = sorted(set(requested_guard_ids).difference(configured_guard_ids))
        if unknown:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown guard ids: {', '.join(unknown)}")
        if len(requested_guard_ids) < 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Configure at least two active safety checks before running StackCert evaluation")
        if payload.adapter_mode == "rest_guard":
            _rest_guard_adapters(project_id, "preflight", requested_guard_ids)
        estimated_cost_usd = _estimate_project_evaluation_cost(project_id, requested_guard_ids, len(sampled_examples))
        if payload.max_cost_usd is not None and estimated_cost_usd > payload.max_cost_usd:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estimated worker run costs ${estimated_cost_usd:.4f}, above the ${payload.max_cost_usd:.4f} budget cap",
            )
        suite_context = {
            "source": "worker_evaluation",
            "benchmark_suite_id": suite_bundle["suite"]["id"],
            "benchmark_suite_name": suite_bundle["suite"]["name"],
            "sampled_example_ids": [example.example_id for example in sampled_examples],
            "sampled_examples": len(sampled_examples),
            "total_examples": len(all_examples),
            "lambda_cost": payload.lambda_cost,
            "rho_prior": payload.rho_prior,
            "max_k": payload.max_k,
            "estimated_cost_usd": estimated_cost_usd,
            "budget_cap_usd": payload.max_cost_usd,
        }

    run_id = f"eval_{uuid.uuid4().hex[:10]}"
    job = {
        "id": f"job_{uuid.uuid4().hex[:12]}",
        "type": "evaluation_run",
        "project_id": project_id,
        "run_id": run_id,
        "status": "queued",
        "created_at": _now(),
        "updated_at": _now(),
        "started_at": None,
        "completed_at": None,
        "attempts": 0,
        "progress": 0.0,
        "input": {
            "payload": payload.model_dump(),
            "requested_guard_ids": requested_guard_ids,
            **suite_context,
        },
        "summary": {
            "adapter_mode": payload.adapter_mode,
            "source": suite_context.get("source", "demo_fixture"),
            "benchmark_suite_id": suite_context.get("benchmark_suite_id"),
            "benchmark_suite_name": suite_context.get("benchmark_suite_name"),
            "examples": suite_context.get("sampled_examples", 0),
            "total_examples": suite_context.get("total_examples"),
            "guards": len(requested_guard_ids),
            "outputs": 0,
            "errors": 0,
            "estimated_cost_usd": estimated_cost_usd,
            "budget_cap_usd": payload.max_cost_usd,
        },
        "artifact_preview": [],
        "next_steps": [
            "Worker will execute selected guard/cell bundles with provider rate limits.",
            "Outputs will be written idempotently and the certificate recomputed.",
        ],
        **_reliability_fields(),
    }
    if payload.execution_mode == "queued":
        return _store(job)
    _store(job)
    return run_job(job["id"])


def run_next_job(project_id: str | None = None, worker_id: str | None = None) -> dict[str, Any]:
    now = _now_dt()
    runnable = [
        job
        for job in (list_jobs(project_id) if project_id else sorted(_all_jobs(), key=lambda item: item["created_at"]))
        if _job_is_runnable(job, now)
    ]
    if not runnable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No queued jobs found")
    runnable.sort(key=lambda item: (str(item.get("retry_after") or item.get("created_at") or ""), str(item.get("id") or "")))
    return run_job(runnable[0]["id"], worker_id=worker_id)


def run_job(job_id: str, worker_id: str | None = None) -> dict[str, Any]:
    job = get_job(job_id)
    if job["type"] not in {"evaluation_run", "measurement_plan"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported executable job type: {job['type']}")
    if job["status"] not in {"queued", "running"}:
        return job
    worker_id = worker_id or f"worker_{uuid.uuid4().hex[:8]}"
    if job["status"] == "running" and not _job_lease_expired(job, _now_dt()):
        current_owner = job.get("locked_by") or "unknown worker"
        if current_owner != worker_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Job is leased by {current_owner}")
    job = _lease_job(job, worker_id)
    _update(job)

    try:
        if job["type"] == "evaluation_run":
            payload = EvaluationJobCreate(**job.get("input", {}).get("payload", {}))
            completed = _execute_evaluation_job(job, payload)
        else:
            completed = _execute_measurement_plan_job(job)
        completed = _mark_job_succeeded(completed, worker_id)
    except Exception as exc:
        completed = _handle_job_failure(job, exc)
    return _update(completed)


def retry_job(job_id: str) -> dict[str, Any]:
    job = get_job(job_id)
    if job["status"] == "running" and not _job_lease_expired(job, _now_dt()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot retry an actively leased job")
    job["status"] = "queued"
    job["started_at"] = None
    job["completed_at"] = None
    job["attempts"] = 0
    job["progress"] = 0.0
    job["locked_by"] = None
    job["lease_expires_at"] = None
    job["retry_after"] = None
    job["error"] = None
    job["error_class"] = None
    job["dead_letter_reason"] = None
    job["summary"] = {
        **job.get("summary", {}),
        "operator_retry": True,
    }
    job["next_steps"] = [
        "Worker will retry the job from the beginning.",
        "If the same provider or configuration error returns, review connector credentials, rate limits, and input payload.",
    ]
    _append_event(job, "manual_retry", "Operator requeued the job for another worker attempt.")
    return _update(job)


def _project_guard_ids(project_id: str) -> list[str]:
    return list(_project_connector_map(project_id).keys())


def _project_connector_map(project_id: str) -> dict[str, dict[str, Any]]:
    seen: set[str] = set()
    connectors: dict[str, dict[str, Any]] = {}
    for connector in guard_connectors.list_connectors(project_id):
        if connector.get("status") == "draft":
            continue
        guard_id = str(connector.get("guard_key") or connector.get("id") or "").strip()
        if guard_id and guard_id not in seen:
            seen.add(guard_id)
            connectors[guard_id] = connector
    return connectors


def _connector_thresholds(project_id: str) -> dict[str, float]:
    thresholds: dict[str, float] = {}
    for guard_id, connector in _project_connector_map(project_id).items():
        threshold = connector.get("threshold")
        thresholds[guard_id] = float(threshold) if threshold is not None else 0.5
    return thresholds


def _connector_unit_costs(project_id: str) -> dict[str, float]:
    costs: dict[str, float] = {}
    for guard_id, connector in _project_connector_map(project_id).items():
        costs[guard_id] = float(connector.get("unit_cost_usd") or 0.0002)
    return costs


def _rest_guard_adapters(project_id: str, run_id: str, guard_ids: list[str]) -> tuple[RESTGuardAdapter, ...]:
    connectors = _project_connector_map(project_id)
    adapters: list[RESTGuardAdapter] = []
    for guard_id in guard_ids:
        connector = connectors.get(guard_id)
        if not connector:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown guard id: {guard_id}")
        adapter_type = str(connector.get("adapter_type") or connector.get("guard_type") or connector.get("type") or "")
        if adapter_type != "rest_guard":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Guard {guard_id} is configured as {adapter_type or 'unknown'}, not rest_guard",
            )
        config = connector.get("config") or {}
        endpoint_url = str(config.get("endpoint_url") or "").strip()
        if not endpoint_url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Guard {guard_id} is missing endpoint_url")
        _validate_rest_guard_endpoint(endpoint_url, guard_id)
        threshold = connector.get("threshold")
        adapters.append(
            RESTGuardAdapter(
                guard_id=guard_id,
                endpoint_url=endpoint_url,
                run_id=run_id,
                timeout_sec=int(config.get("timeout_sec") or 30),
                threshold=float(threshold) if threshold is not None else 0.5,
                headers=_connector_auth_headers(guard_id, connector),
                metadata={
                    "source": "worker_evaluation",
                    "contract": "guard_adapter_v1",
                    "adapter": "rest_guard",
                    "vendor": connector.get("vendor"),
                    "version": connector.get("version"),
                },
                raise_on_error=True,
            )
        )
    return tuple(adapters)


def _connector_auth_headers(guard_id: str, connector: dict[str, Any]) -> dict[str, str]:
    config = connector.get("config") or {}
    header_name = str(config.get("auth_header_name") or "Authorization").strip() or "Authorization"
    if not bool(config.get("has_secret")):
        return {}
    secret = _guard_secret(guard_id, connector)
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guard {guard_id} requires a backend secret; set {_guard_secret_env_name(guard_id)} in the worker environment.",
        )
    return {header_name: secret}


def _guard_secret(guard_id: str, connector: dict[str, Any]) -> str | None:
    config = connector.get("config") or {}
    configured_env = str(config.get("secret_env_var") or "").strip()
    candidates = [configured_env] if configured_env else []
    candidates.append(_guard_secret_env_name(guard_id))
    secret_ref = str(config.get("secret_ref") or "").strip()
    if secret_ref.startswith("pending-vault://"):
        candidates.append(_guard_secret_env_name(secret_ref.removeprefix("pending-vault://")))
    for env_name in candidates:
        if not env_name:
            continue
        value = os.getenv(env_name)
        if value:
            return value
    return None


def _guard_secret_env_name(guard_id: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", guard_id).strip("_").upper()
    return f"STACKCERT_GUARD_SECRET_{normalized}"


def _validate_rest_guard_endpoint(endpoint_url: str, guard_id: str) -> None:
    parsed = urllib.parse.urlparse(endpoint_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guard {guard_id} endpoint_url must be an HTTP(S) URL",
        )
    if settings.environment != "production":
        return
    if parsed.scheme != "https":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guard {guard_id} endpoint_url must use HTTPS in production",
        )
    hostname = parsed.hostname.strip().lower()
    blocked_hosts = {"localhost", "metadata", "metadata.google.internal"}
    if hostname in blocked_hosts or hostname.endswith(".local"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guard {guard_id} endpoint_url host is not allowed",
        )
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return
    if (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guard {guard_id} endpoint_url host is not allowed",
        )


def _estimate_project_evaluation_cost(project_id: str, guard_ids: list[str], example_count: int) -> float:
    costs = _connector_unit_costs(project_id)
    return round(sum(costs.get(guard_id, 0.0002) * example_count for guard_id in guard_ids), 4)


def _usage_events_from_evaluation(
    job: dict[str, Any],
    outputs: list[GuardOutput],
    examples: list[BenchmarkExample],
    guard_ids: list[str],
    adapter_mode: str,
) -> list[dict[str, Any]]:
    unit_costs = _connector_unit_costs(str(job["project_id"]))
    connectors = _project_connector_map(str(job["project_id"]))
    examples_by_id = {example.example_id: example for example in examples}
    events = []
    for guard_id in guard_ids:
        guard_outputs = [output for output in outputs if output.guard_id == guard_id]
        connector = connectors.get(guard_id) or {}
        request_count = len(guard_outputs)
        input_tokens = 0
        for output in guard_outputs:
            example = examples_by_id.get(output.example_id)
            input_tokens += max(1, len(str(example.prompt_redacted if example else "").split()))
        output_tokens = request_count * 24
        cost = round(request_count * unit_costs.get(guard_id, 0.0002), 4)
        events.append(
            {
                "id": f"use_{job['id']}_{guard_id}",
                "provider": connector.get("vendor")
                or ("rest_guard" if adapter_mode == "rest_guard" else "stackcert_worker"),
                "model": "rest_guard" if adapter_mode == "rest_guard" else "deterministic_policy_guard",
                "operation": "evaluation_guard_run",
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "request_count": request_count,
                "duration_ms": request_count * 75,
                "estimated_cost_usd": cost,
                "actual_cost_usd": cost,
                "metadata": {
                    "guard_id": guard_id,
                    "benchmark_suite_id": job.get("input", {}).get("benchmark_suite_id"),
                    "adapter_mode": adapter_mode,
                    "adapter_type": connector.get("adapter_type"),
                    "contract": "guard_adapter_v1",
                },
            }
        )
    return events


def _evaluation_adapter_next_step(adapter_mode: str) -> str:
    if adapter_mode == "rest_guard":
        return "Review provider latency, failures, and actual spend before using this run as deployment-gate evidence."
    return "Replace deterministic adapters with managed REST or model-judge providers before relying on the result for a real deployment gate."


def _measurement_context(run_id: str, lambda_cost: float) -> dict[str, Any]:
    if pilot_runs.has_run(run_id):
        run = pilot_runs.run_summary(run_id)
        return {
            "project_id": run["project_id"],
            "source": run.get("source") or "worker_evaluation",
            "measurements": pilot_runs.measurements(run_id, lambda_cost),
        }
    return {
        "project_id": settings.demo_project_id,
        "source": "demo_fixture",
        "measurements": demo_project.measurements(lambda_cost),
    }


def _parse_time(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _job_is_runnable(job: dict[str, Any], now: datetime) -> bool:
    if job.get("status") == "queued":
        retry_after = _parse_time(job.get("retry_after"))
        return retry_after is None or retry_after <= now
    if job.get("status") == "running":
        lease_expires_at = _parse_time(job.get("lease_expires_at"))
        return lease_expires_at is not None and lease_expires_at <= now
    return False


def _job_lease_expired(job: dict[str, Any], now: datetime) -> bool:
    lease_expires_at = _parse_time(job.get("lease_expires_at"))
    return lease_expires_at is not None and lease_expires_at <= now


def _lease_job(job: dict[str, Any], worker_id: str) -> dict[str, Any]:
    attempts = int(job.get("attempts") or 0) + 1
    lease_expires_at = _future(DEFAULT_LEASE_SECONDS)
    job["status"] = "running"
    job["started_at"] = job.get("started_at") or _now()
    job["attempts"] = attempts
    job["progress"] = 0.25
    job["locked_by"] = worker_id
    job["lease_expires_at"] = lease_expires_at
    job["retry_after"] = None
    _append_event(
        job,
        "leased",
        f"Worker {worker_id} claimed attempt {attempts}.",
        {"attempt": attempts, "lease_expires_at": lease_expires_at},
    )
    return job


def _mark_job_succeeded(job: dict[str, Any], worker_id: str) -> dict[str, Any]:
    job["locked_by"] = None
    job["lease_expires_at"] = None
    job["retry_after"] = None
    job["error"] = None
    job["error_class"] = None
    job["dead_letter_reason"] = None
    _append_event(job, "succeeded", f"Worker {worker_id} completed the job.", {"status": job.get("status")})
    return job


def _handle_job_failure(job: dict[str, Any], exc: Exception) -> dict[str, Any]:
    error_class = _classify_job_error(exc)
    error_detail = _error_detail(exc)
    attempts = int(job.get("attempts") or 0)
    max_attempts = int(job.get("max_attempts") or DEFAULT_MAX_JOB_ATTEMPTS)
    can_retry = error_class in RETRYABLE_ERROR_CLASSES and attempts < max_attempts

    job["error"] = error_detail
    job["error_class"] = error_class
    job["locked_by"] = None
    job["lease_expires_at"] = None
    job["summary"] = {
        **job.get("summary", {}),
        "last_error_class": error_class,
        "last_error": error_detail,
        "attempts": attempts,
        "max_attempts": max_attempts,
    }

    if can_retry:
        delay_seconds = _retry_delay_seconds(attempts)
        retry_after = _future(delay_seconds)
        job["status"] = "queued"
        job["progress"] = 0.0
        job["completed_at"] = None
        job["retry_after"] = retry_after
        job["dead_letter_reason"] = None
        job["summary"] = {
            **job["summary"],
            "retry_after": retry_after,
            "retry_delay_seconds": delay_seconds,
        }
        job["next_steps"] = [
            f"Transient {error_class} failure detected; worker will retry after {delay_seconds} seconds.",
            "If retries continue, check provider status, rate limits, adapter timeout budgets, and request volume.",
        ]
        _append_event(
            job,
            "retry_scheduled",
            f"{error_class} failure scheduled for retry.",
            {"attempt": attempts, "retry_after": retry_after, "error": error_detail},
        )
        return job

    job["status"] = "failed"
    job["progress"] = 1.0
    job["completed_at"] = _now()
    job["retry_after"] = None
    job["dead_letter_reason"] = error_class
    job["next_steps"] = [
        "Job moved to the dead-letter queue after exhausting retries or hitting a nonretryable error.",
        "Review the error details, provider credentials, benchmark payload, and guard configuration before retrying.",
    ]
    _append_event(
        job,
        "dead_lettered",
        f"Job failed with {error_class}.",
        {"attempt": attempts, "max_attempts": max_attempts, "error": error_detail},
    )
    return job


def _retry_delay_seconds(attempts: int) -> int:
    return min(MAX_RETRY_DELAY_SECONDS, 30 * (2 ** max(0, attempts - 1)))


def _classify_job_error(exc: Exception) -> str:
    if isinstance(exc, RESTGuardAdapterError):
        return exc.error_class
    if isinstance(exc, HTTPException):
        if exc.status_code in {status.HTTP_408_REQUEST_TIMEOUT, status.HTTP_504_GATEWAY_TIMEOUT}:
            return "timeout"
        if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            return "rate_limited"
        if exc.status_code in {
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            status.HTTP_502_BAD_GATEWAY,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        }:
            return "provider_unavailable"
        if exc.status_code in {
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        }:
            return "invalid_configuration"
        return "http_error"
    return "worker_exception"


def _error_detail(exc: Exception) -> str:
    if isinstance(exc, RESTGuardAdapterError):
        return str(exc)
    if isinstance(exc, HTTPException):
        return str(exc.detail)
    return f"{type(exc).__name__}: {exc}"


def _raise_provider_failure(failure_mode: str | None) -> None:
    if failure_mode == "provider_timeout":
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Provider timeout while evaluating guard adapter.")
    if failure_mode == "provider_rate_limited":
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Provider rate limit exceeded while evaluating guard adapter.")
    if failure_mode == "invalid_configuration":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid guard adapter configuration.")


def _execute_evaluation_job(job: dict[str, Any], payload: EvaluationJobCreate) -> dict[str, Any]:
    if job.get("input", {}).get("source") == "worker_evaluation":
        return _execute_project_evaluation_job(job, payload)
    return _execute_demo_evaluation_job(job, payload)


def _execute_demo_evaluation_job(job: dict[str, Any], payload: EvaluationJobCreate) -> dict[str, Any]:
    engine, _, _ = demo_project.demo_bundle()
    _raise_provider_failure(payload.failure_mode)
    requested_guard_ids = job.get("input", {}).get("requested_guard_ids") or payload.guard_ids or list(engine.guard_ids[: min(4, len(engine.guard_ids))])
    unknown = sorted(set(requested_guard_ids).difference(engine.guard_ids))
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown guard ids: {', '.join(unknown)}")

    examples = sample_within_cells(engine.examples, per_cell=payload.examples_per_cell, seed=payload.seed)
    if payload.adapter_mode == "uploaded_outputs":
        outputs = [output for output in engine.outputs if output.guard_id in requested_guard_ids and output.example_id in {ex.example_id for ex in examples}]
    else:
        adapters = tuple(
            DeterministicPolicyGuardAdapter(
                guard_id=guard_id,
                run_id=job["run_id"],
                metadata={"source": "local_fixture", "contract": "guard_adapter_v1"},
            )
            for guard_id in requested_guard_ids
        )
        outputs = EvaluationRunner(adapters).run(examples)

    blocked = sum(1 for output in outputs if not output.binary_pass)
    errors = sum(1 for output in outputs if output.error)
    by_guard = Counter(output.guard_id for output in outputs)
    by_cell = Counter(example.cell_id for example in examples)
    preview = [
        {
            "example_id": output.example_id,
            "guard_id": output.guard_id,
            "guard_label": guard_label(output.guard_id),
            "binary_pass": output.binary_pass,
            "block_probability": output.block_probability,
            "error": output.error,
        }
        for output in outputs[:12]
    ]
    job["status"] = "complete" if errors == 0 else "complete_with_errors"
    job["completed_at"] = _now()
    job["progress"] = 1.0
    job["summary"] = {
        "adapter_mode": payload.adapter_mode,
        "examples": len(examples),
        "guards": len(requested_guard_ids),
        "outputs": len(outputs),
        "blocked_outputs": blocked,
        "pass_rate": round((len(outputs) - blocked) / len(outputs), 4) if outputs else 0.0,
        "errors": errors,
        "cells": dict(sorted(by_cell.items())),
        "outputs_by_guard": dict(sorted(by_guard.items())),
    }
    job["artifact_preview"] = preview
    job["next_steps"] = [
        "Persist full outputs to Supabase Storage and guard_outputs for large customer suites.",
        "Recompute CASS certificate after approved outputs land.",
    ]
    return job


def _execute_project_evaluation_job(job: dict[str, Any], payload: EvaluationJobCreate) -> dict[str, Any]:
    project_id = str(job["project_id"])
    job_input = job.get("input", {})
    if payload.adapter_mode == "uploaded_outputs":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use the uploaded-output run flow for precomputed outputs")
    _raise_provider_failure(payload.failure_mode)

    suite_bundle = benchmark_imports.get_committed_suite_bundle(project_id, job_input.get("benchmark_suite_id") or payload.benchmark_suite_id)
    all_examples = pilot_runs._examples_from_suite(suite_bundle)
    sampled_ids = set(job_input.get("sampled_example_ids") or [])
    examples = [example for example in all_examples if example.example_id in sampled_ids] if sampled_ids else sample_within_cells(all_examples, per_cell=payload.examples_per_cell, seed=payload.seed)
    if not examples:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Benchmark suite has no runnable examples")

    requested_guard_ids = job_input.get("requested_guard_ids") or payload.guard_ids or _project_guard_ids(project_id)
    configured_guard_ids = _project_guard_ids(project_id)
    unknown = sorted(set(requested_guard_ids).difference(configured_guard_ids))
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown guard ids: {', '.join(unknown)}")
    if len(requested_guard_ids) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Configure at least two active safety checks before running StackCert evaluation")

    estimated_cost = _estimate_project_evaluation_cost(project_id, requested_guard_ids, len(examples))
    budget_cap = payload.max_cost_usd if payload.max_cost_usd is not None else job_input.get("budget_cap_usd")
    if budget_cap is not None and estimated_cost > float(budget_cap):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estimated worker run costs ${estimated_cost:.4f}, above the ${float(budget_cap):.4f} budget cap",
        )

    if payload.adapter_mode == "rest_guard":
        adapters = _rest_guard_adapters(project_id, str(job["run_id"]), requested_guard_ids)
    else:
        thresholds = _connector_thresholds(project_id)
        adapters = tuple(
            DeterministicPolicyGuardAdapter(
                guard_id=guard_id,
                run_id=job["run_id"],
                threshold=thresholds.get(guard_id) or 0.5,
                metadata={"source": "worker_evaluation", "contract": "guard_adapter_v1"},
            )
            for guard_id in requested_guard_ids
        )
    outputs = EvaluationRunner(adapters).run(examples)
    blocked = sum(1 for output in outputs if not output.binary_pass)
    errors = sum(1 for output in outputs if output.error)
    by_guard = Counter(output.guard_id for output in outputs)
    by_cell = Counter(example.cell_id for example in examples)
    run = pilot_runs.create_worker_evaluation_run(
        project_id,
        run_id=str(job["run_id"]),
        suite_bundle=suite_bundle,
        examples=examples,
        outputs=outputs,
        lambda_cost=payload.lambda_cost,
        rho_prior=payload.rho_prior,
        max_k=payload.max_k,
        name=f"{suite_bundle['suite']['name']} worker evaluation",
        job_id=str(job["id"]),
    )
    recorded_events = usage.record_usage_events(project_id, job, _usage_events_from_evaluation(job, outputs, examples, requested_guard_ids, payload.adapter_mode))
    actual_cost = round(sum(float(event.get("actual_cost_usd") or 0) for event in recorded_events), 4)
    preview = [
        {
            "example_id": output.example_id,
            "guard_id": output.guard_id,
            "guard_label": guard_label(output.guard_id),
            "binary_pass": output.binary_pass,
            "block_probability": output.block_probability,
            "error": output.error,
        }
        for output in outputs[:12]
    ]
    job["status"] = "complete" if errors == 0 else "complete_with_errors"
    job["completed_at"] = _now()
    job["progress"] = 1.0
    job["summary"] = {
        "source": "worker_evaluation",
        "adapter_mode": payload.adapter_mode,
        "benchmark_suite_id": suite_bundle["suite"]["id"],
        "benchmark_suite_name": suite_bundle["suite"]["name"],
        "examples": len(examples),
        "total_examples": len(all_examples),
        "guards": len(requested_guard_ids),
        "outputs": len(outputs),
        "blocked_outputs": blocked,
        "pass_rate": round((len(outputs) - blocked) / len(outputs), 4) if outputs else 0.0,
        "errors": errors,
        "cells": dict(sorted(by_cell.items())),
        "outputs_by_guard": dict(sorted(by_guard.items())),
        "run_id": run["id"],
        "certificate_id": run.get("certificate_id"),
        "certificate_status": run.get("certificate_status"),
        "measurement_actions": run.get("measurement_actions"),
        "estimated_cost_usd": estimated_cost,
        "actual_cost_usd": actual_cost,
        "usage_event_count": len(recorded_events),
        "budget_cap_usd": budget_cap,
    }
    job["artifact_preview"] = preview
    job["next_steps"] = [
        "Review the recommendation, overlap analysis, and remaining measurement plan for this evidence run.",
        _evaluation_adapter_next_step(payload.adapter_mode),
        "Issue release evidence only after acknowledging scope and limitations; StackCert mitigates risk, it does not guarantee safety.",
    ]
    return job


def create_measurement_plan_job(run_id: str, payload: MeasurementPlanCreate, lambda_cost: float = 5.0) -> dict[str, Any]:
    measurement_context = _measurement_context(run_id, lambda_cost)
    measurements = measurement_context["measurements"]
    requested = set(payload.action_ids)
    actions = [
        action
        for action in measurements["actions"]
        if not requested or action["id"] in requested
    ]
    if payload.action_ids and not actions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No matching measurement actions")
    selected_cost = round(sum(action["cost_usd"] for action in actions), 4)
    if payload.max_cost_usd is not None and selected_cost > payload.max_cost_usd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected measurement plan costs ${selected_cost:.2f}, above the ${payload.max_cost_usd:.2f} budget cap",
        )

    job = {
        "id": f"job_{uuid.uuid4().hex[:12]}",
        "type": "measurement_plan",
        "project_id": measurement_context["project_id"],
        "run_id": run_id,
        "status": "queued",
        "created_at": _now(),
        "updated_at": _now(),
        "started_at": None,
        "completed_at": None,
        "attempts": 0,
        "progress": 0.0,
        "input": {
            "payload": payload.model_dump(),
            "lambda_cost": lambda_cost,
            "source": measurement_context["source"],
            "requested_action_ids": [action["id"] for action in actions],
        },
        "summary": {
            "action_count": len(actions),
            "selected_cost_usd": selected_cost,
            "actual_cost_usd": 0.0,
            "selected_eta_minutes": sum(action["eta_minutes"] for action in actions),
            "total_expected_radius_reduction": sum(action["expected_radius_reduction"] for action in actions),
            "bundles": [stack_label(action["guard_ids"]) for action in actions],
            "budget_cap_usd": payload.max_cost_usd,
            "usage_event_count": 0,
            "provider_calls": 0,
        },
        "actions": actions,
        "usage_preview": [],
        "next_steps": [
            "Worker will execute selected guard/cell bundles with provider rate limits.",
            "Outputs will be written idempotently and the certificate recomputed.",
        ],
        **_reliability_fields(),
    }
    return _store(job)


def _execute_measurement_plan_job(job: dict[str, Any]) -> dict[str, Any]:
    actions = job.get("actions") or []
    if not actions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Measurement plan has no actions to execute")

    usage_events = [_usage_event_from_action(job, action) for action in actions]
    recorded_events = usage.record_usage_events(str(job["project_id"]), job, usage_events)
    actual_cost = round(sum(float(event.get("actual_cost_usd") or 0) for event in recorded_events), 4)
    estimated_cost = round(sum(float(action["cost_usd"]) for action in actions), 4)
    completed_actions = [
        {
            **action,
            "status": "complete",
            "actual_cost_usd": round(float(action["cost_usd"]), 4),
            "usage_event_id": recorded_events[index]["id"] if index < len(recorded_events) else None,
        }
        for index, action in enumerate(actions)
    ]

    job["status"] = "complete"
    job["completed_at"] = _now()
    job["progress"] = 1.0
    job["actions"] = completed_actions
    job["summary"] = {
        **job.get("summary", {}),
        "action_count": len(completed_actions),
        "completed_actions": len(completed_actions),
        "selected_cost_usd": estimated_cost,
        "actual_cost_usd": actual_cost,
        "usage_event_count": len(recorded_events),
        "provider_calls": sum(int(event.get("request_count") or 0) for event in recorded_events),
        "budget_status": "within_cap",
    }
    job["usage_preview"] = recorded_events[:8]
    job["next_steps"] = [
        "Recompute the CASS certificate after these measurements land in the run output table.",
        "Review actual spend against the selected plan before queueing additional measurements.",
    ]
    return job


def _usage_event_from_action(job: dict[str, Any], action: dict[str, Any]) -> dict[str, Any]:
    guard_count = max(1, len(action.get("guard_ids") or []))
    request_count = max(1, int(round(float(action.get("cost_agent_cells") or 1) * guard_count)))
    return {
        "id": f"use_{job['id']}_{action['id']}",
        "provider": "stackcert_worker",
        "model": "deterministic_measurement_adapter",
        "operation": "measurement_action",
        "input_tokens": request_count * 750,
        "output_tokens": request_count * 80,
        "request_count": request_count,
        "duration_ms": int(action.get("eta_minutes") or 0) * 60_000,
        "estimated_cost_usd": float(action["cost_usd"]),
        "actual_cost_usd": float(action["cost_usd"]),
        "metadata": {
            "action_id": action["id"],
            "action_type": action.get("action_type"),
            "cell_id": action.get("cell_id"),
            "side": action.get("side"),
            "guard_ids": action.get("guard_ids") or [],
            "label": action.get("label"),
        },
    }


def clear_jobs() -> None:
    _jobs.clear()
    usage.clear_usage_events()


def _all_jobs() -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        # The current worker scope is project-oriented; use demo project until
        # workspace-scoped job leasing is added.
        return store.list_jobs(settings.demo_project_id)
    return list(_jobs.values())


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
