from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.security import access
from stackcert_service.security.auth import Principal
from stackcert_service.services import audit
from stackcert_service.services import budget_controls
from stackcert_service.services import demo_project
from stackcert_service.services import guard_connectors
from stackcert_service.services import jobs
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects
from stackcert_service.services import usage


def workspace_overview(workspace_id: str, principal: Principal) -> dict[str, Any]:
    workspace = _workspace_for_admin(workspace_id, principal)
    workspace_role = projects.membership_role(workspace_id, principal) or workspace.get("role") or "viewer"
    project_rows = [project for project in projects.list_projects(principal) if project["workspace_id"] == workspace_id]
    project_summaries = []
    all_jobs: list[dict[str, Any]] = []
    provider_totals: dict[str, dict[str, Any]] = {}
    totals = Counter()
    actual_cost = 0.0
    estimated_cost = 0.0
    request_count = 0
    input_tokens = 0
    output_tokens = 0
    connector_count = 0
    missing_secret_count = 0
    issued_evidence_count = 0

    for project in project_rows:
        project_id = str(project["id"])
        project_jobs = jobs.list_jobs(project_id)
        project_runs = _project_runs(project_id)
        cost = usage.cost_summary(project_id)
        connectors = guard_connectors.list_connectors(project_id)
        job_counts = Counter(str(job.get("status") or "unknown") for job in project_jobs)
        dead_letters = sum(1 for job in project_jobs if job.get("dead_letter_reason"))
        missing_secrets = [_connector_summary(connector) for connector in connectors if _connector_missing_secret(connector)]
        latest_run = project_runs[0] if project_runs else None

        for job in project_jobs:
            all_jobs.append(
                {
                    **job,
                    "project_name": project["name"],
                    "project_slug": project.get("slug"),
                }
            )
        for provider in cost["by_provider"]:
            bucket = provider_totals.setdefault(
                provider["provider"],
                {
                    "provider": provider["provider"],
                    "events": 0,
                    "request_count": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "estimated_cost_usd": 0.0,
                    "actual_cost_usd": 0.0,
                },
            )
            bucket["events"] += int(provider.get("events") or 0)
            bucket["request_count"] += int(provider.get("request_count") or 0)
            bucket["input_tokens"] += int(provider.get("input_tokens") or 0)
            bucket["output_tokens"] += int(provider.get("output_tokens") or 0)
            bucket["estimated_cost_usd"] += float(provider.get("estimated_cost_usd") or 0)
            bucket["actual_cost_usd"] += float(provider.get("actual_cost_usd") or 0)

        summary = cost["summary"]
        actual_cost += float(summary.get("actual_cost_usd") or 0)
        estimated_cost += float(summary.get("estimated_cost_usd") or 0)
        request_count += int(summary.get("request_count") or 0)
        input_tokens += int(summary.get("input_tokens") or 0)
        output_tokens += int(summary.get("output_tokens") or 0)
        connector_count += len(connectors)
        missing_secret_count += len(missing_secrets)
        issued_evidence_count += sum(1 for run in project_runs if run.get("certificate_status") == "valid")
        totals.update(job_counts)

        project_summaries.append(
            {
                "project": project,
                "runs": {
                    "total": len(project_runs),
                    "latest_run_id": latest_run.get("id") if latest_run else None,
                    "latest_run_source": latest_run.get("source") if latest_run else None,
                    "latest_certificate_status": latest_run.get("certificate_status") if latest_run else "missing",
                    "latest_completed_at": latest_run.get("completed_at") if latest_run else None,
                },
                "jobs": {
                    "total": len(project_jobs),
                    "queued": job_counts.get("queued", 0),
                    "running": job_counts.get("running", 0),
                    "failed": job_counts.get("failed", 0),
                    "complete": job_counts.get("complete", 0) + job_counts.get("complete_with_errors", 0),
                    "canceled": job_counts.get("canceled", 0),
                    "dead_letters": dead_letters,
                    "latest_status": str(project_jobs[0].get("status")) if project_jobs else "none",
                },
                "usage": summary,
                "budget": budget_controls.project_budget_overview(project_id),
                "connectors": {
                    "total": len(connectors),
                    "active": sum(1 for connector in connectors if connector.get("status") not in {"draft", "disabled"}),
                    "missing_secrets": len(missing_secrets),
                    "missing_secret_connectors": missing_secrets[:6],
                },
            }
        )

    all_jobs.sort(key=lambda job: str(job.get("created_at") or ""), reverse=True)
    audit_events = audit.list_events(workspace_id=workspace_id, limit=60)
    worker_state = _worker_state(all_jobs)
    provider_health = _provider_health(all_jobs, provider_totals)
    dead_letters = [job for job in all_jobs if job.get("dead_letter_reason") or job.get("status") == "failed"]

    return {
        "workspace": workspace,
        "role": access.normalize_role(str(workspace_role)),
        "generated_at": _now(),
        "metrics": {
            "projects": len(project_rows),
            "runs": sum(project["runs"]["total"] for project in project_summaries),
            "issued_evidence": issued_evidence_count,
            "jobs": len(all_jobs),
            "queued_jobs": totals.get("queued", 0),
            "running_jobs": totals.get("running", 0),
            "failed_jobs": totals.get("failed", 0),
            "dead_letter_jobs": len(dead_letters),
            "connectors": connector_count,
            "missing_secret_connectors": missing_secret_count,
            "request_count": request_count,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost_usd": round(estimated_cost, 4),
            "actual_cost_usd": round(actual_cost, 4),
        },
        "worker": worker_state,
        "provider_health": provider_health,
        "usage": {
            "summary": {
                "actual_cost_usd": round(actual_cost, 4),
                "estimated_cost_usd": round(estimated_cost, 4),
                "request_count": request_count,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "currency": "USD",
            },
            "by_provider": [
                {
                    **bucket,
                    "estimated_cost_usd": round(float(bucket["estimated_cost_usd"]), 4),
                    "actual_cost_usd": round(float(bucket["actual_cost_usd"]), 4),
                }
                for bucket in sorted(provider_totals.values(), key=lambda item: float(item["actual_cost_usd"]), reverse=True)
            ],
        },
        "budget": budget_controls.workspace_budget_overview(workspace_id),
        "projects": project_summaries,
        "jobs": all_jobs[:50],
        "dead_letters": dead_letters[:25],
        "audit_events": audit_events[:50],
        "controls": {
            "can_run_worker": True,
            "can_retry_failed_jobs": True,
            "can_cancel_queued_jobs": True,
            "worker_scope": "workspace",
            "max_jobs_per_manual_run": 10,
        },
    }


def run_workspace_worker_once(
    workspace_id: str,
    principal: Principal,
    *,
    worker_id: str | None = None,
    max_jobs: int = 1,
    lease_seconds: int = jobs.DEFAULT_LEASE_SECONDS,
) -> dict[str, Any]:
    _workspace_for_admin(workspace_id, principal)
    project_rows = [project for project in projects.list_projects(principal) if project["workspace_id"] == workspace_id]
    worker_id = worker_id or f"admin:{principal.user_id}"
    max_jobs = max(1, min(int(max_jobs), 10))
    processed = []

    for _ in range(max_jobs):
        claimed = None
        for project in project_rows:
            try:
                claimed = jobs.run_next_job(str(project["id"]), worker_id=worker_id, lease_seconds=lease_seconds)
            except HTTPException as exc:
                if exc.status_code == status.HTTP_404_NOT_FOUND:
                    continue
                raise
            break
        if not claimed:
            break
        processed.append(
            {
                "job_id": claimed["id"],
                "project_id": claimed.get("project_id"),
                "run_id": claimed.get("run_id"),
                "status": claimed.get("status"),
                "summary": claimed.get("summary", {}),
            }
        )

    return {
        "workspace_id": workspace_id,
        "worker_id": worker_id,
        "processed": processed,
        "processed_count": len(processed),
    }


def _workspace_for_admin(workspace_id: str, principal: Principal) -> dict[str, Any]:
    workspace = next((item for item in projects.list_workspaces(principal) if item["id"] == workspace_id), None)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    role = projects.membership_role(workspace_id, principal) or workspace.get("role")
    access.require_role(str(role or "viewer"), "workspace_admin")
    return workspace


def _project_runs(project_id: str) -> list[dict[str, Any]]:
    if project_id == settings.demo_project_id:
        return [demo_project.run_summary()]
    return pilot_runs.list_project_runs(project_id)


def _worker_state(all_jobs: list[dict[str, Any]]) -> dict[str, Any]:
    queued = [job for job in all_jobs if job.get("status") == "queued"]
    running = [job for job in all_jobs if job.get("status") == "running"]
    stale_running = [job for job in running if _is_past(job.get("lease_expires_at"))]
    retry_jobs = [job for job in queued if job.get("retry_after")]
    return {
        "queue_depth": len(queued),
        "running": len(running),
        "failed": sum(1 for job in all_jobs if job.get("status") == "failed"),
        "dead_letters": sum(1 for job in all_jobs if job.get("dead_letter_reason")),
        "stale_running": len(stale_running),
        "oldest_queued_at": min((str(job.get("created_at")) for job in queued if job.get("created_at")), default=None),
        "next_retry_at": min((str(job.get("retry_after")) for job in retry_jobs if job.get("retry_after")), default=None),
        "recommended_action": _worker_recommendation(queued, running, stale_running),
    }


def _worker_recommendation(queued: list[dict[str, Any]], running: list[dict[str, Any]], stale_running: list[dict[str, Any]]) -> str:
    if stale_running:
        return "A running job lease has expired; run a worker pass or retry the job after checking provider state."
    if queued:
        return "Queued jobs are ready; run the Cloud Run worker job or trigger a manual worker pass."
    if running:
        return "A worker is active. Watch lease expiry, attempts, and provider errors before retrying."
    return "No runnable jobs. Create an evaluation or measurement plan when new evidence is needed."


def _provider_health(all_jobs: list[dict[str, Any]], provider_totals: dict[str, dict[str, Any]]) -> dict[str, Any]:
    providers: dict[str, dict[str, Any]] = {
        provider: {
            "provider": provider,
            "status": "healthy",
            "events": int(bucket.get("events") or 0),
            "request_count": int(bucket.get("request_count") or 0),
            "actual_cost_usd": round(float(bucket.get("actual_cost_usd") or 0), 4),
            "retry_count": 0,
            "rate_limit_failures": 0,
            "timeout_failures": 0,
            "failed_jobs": 0,
            "dead_letter_count": 0,
            "running_jobs": 0,
            "latest_error_class": None,
            "latest_error": None,
            "latest_event_at": None,
        }
        for provider, bucket in provider_totals.items()
    }

    for job in all_jobs:
        provider = _job_provider(job)
        if not provider:
            continue
        bucket = providers.setdefault(
            provider,
            {
                "provider": provider,
                "status": "healthy",
                "events": 0,
                "request_count": 0,
                "actual_cost_usd": 0.0,
                "retry_count": 0,
                "rate_limit_failures": 0,
                "timeout_failures": 0,
                "failed_jobs": 0,
                "dead_letter_count": 0,
                "running_jobs": 0,
                "latest_error_class": None,
                "latest_error": None,
                "latest_event_at": None,
            },
        )
        events = job.get("events") or []
        bucket["retry_count"] += sum(1 for event in events if str(event.get("type") or "") == "retry_scheduled")
        if job.get("status") == "running":
            bucket["running_jobs"] += 1
        if job.get("status") == "failed":
            bucket["failed_jobs"] += 1
        if job.get("dead_letter_reason"):
            bucket["dead_letter_count"] += 1
        error_class = str(job.get("error_class") or (job.get("summary") or {}).get("last_error_class") or "")
        if error_class == "rate_limited":
            bucket["rate_limit_failures"] += 1
        if error_class == "timeout":
            bucket["timeout_failures"] += 1
        if error_class:
            bucket["latest_error_class"] = error_class
            bucket["latest_error"] = _redact_error(str(job.get("error") or (job.get("summary") or {}).get("last_error") or ""))
            bucket["latest_event_at"] = job.get("updated_at") or job.get("completed_at") or job.get("created_at")

    rows = []
    for bucket in providers.values():
        if bucket["dead_letter_count"] or bucket["failed_jobs"]:
            bucket["status"] = "dead_letter"
        elif bucket["rate_limit_failures"] or bucket["timeout_failures"] or bucket["retry_count"]:
            bucket["status"] = "retrying"
        elif bucket["running_jobs"]:
            bucket["status"] = "running"
        else:
            bucket["status"] = "healthy"
        rows.append(bucket)

    rows.sort(key=lambda item: (item["status"] != "dead_letter", item["status"] != "retrying", str(item["provider"])))
    status_value = "idle" if not rows else "attention" if any(row["status"] in {"dead_letter", "retrying"} for row in rows) else "healthy"
    return {
        "status": status_value,
        "providers": rows,
        "summary": {
            "providers": len(rows),
            "retry_count": sum(int(row["retry_count"]) for row in rows),
            "rate_limit_failures": sum(int(row["rate_limit_failures"]) for row in rows),
            "timeout_failures": sum(int(row["timeout_failures"]) for row in rows),
            "dead_letter_count": sum(int(row["dead_letter_count"]) for row in rows),
            "actual_cost_usd": round(sum(float(row["actual_cost_usd"]) for row in rows), 4),
        },
    }


def _job_provider(job: dict[str, Any]) -> str | None:
    summary = job.get("summary") or {}
    payload = ((job.get("input") or {}).get("payload") or {})
    adapter_mode = str(summary.get("adapter_mode") or payload.get("adapter_mode") or "")
    if adapter_mode in {"rest_guard", "model_judge"}:
        return adapter_mode
    if job.get("error_class") in {"rate_limited", "timeout", "provider_unavailable"}:
        return adapter_mode or "provider_runtime"
    return None


def _redact_error(value: str) -> str:
    for marker in ("Bearer ", "sk-"):
        if marker in value:
            return value.split(marker, 1)[0] + marker + "[redacted]"
    return value[:420]


def _connector_missing_secret(connector: dict[str, Any]) -> bool:
    adapter_type = str(connector.get("adapter_type") or connector.get("guard_type") or "")
    if adapter_type not in {"rest_guard", "model_judge"}:
        return False
    redaction = connector.get("redaction") or {}
    config = connector.get("config") or {}
    return not bool(redaction.get("auth_secret_stored") or config.get("has_secret") or config.get("secret_ref"))


def _connector_summary(connector: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": connector.get("id"),
        "guard_key": connector.get("guard_key") or connector.get("id"),
        "label": connector.get("label") or connector.get("display_name") or connector.get("guard_key"),
        "adapter_type": connector.get("adapter_type") or connector.get("guard_type"),
        "vendor": connector.get("vendor"),
        "status": connector.get("status"),
    }


def _is_past(value: Any) -> bool:
    parsed = _parse_time(value)
    return parsed is not None and parsed <= datetime.now(UTC)


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


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()
