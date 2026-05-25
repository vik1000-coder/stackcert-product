from __future__ import annotations

import uuid
from dataclasses import dataclass
from hashlib import sha256
from typing import Any

import httpx

from stackcert_service.config import settings
from stackcert_service.services import pricing


class SupabasePersistenceError(RuntimeError):
    """Raised when the server-side Supabase persistence layer is unavailable."""


EVIDENCE_RUN_SOURCES = {"uploaded_outputs", "worker_evaluation"}


def configured_supabase_store() -> SupabaseStore | None:
    mode = settings.persistence_backend.lower()
    if mode == "memory":
        return None
    if mode not in {"auto", "supabase"}:
        raise SupabasePersistenceError("STACKCERT_PERSISTENCE_BACKEND must be one of: auto, memory, supabase")
    if settings.supabase_url and settings.supabase_secret_key:
        return SupabaseStore(
            supabase_url=settings.supabase_url,
            secret_key=settings.supabase_secret_key,
        )
    if mode == "supabase":
        raise SupabasePersistenceError("Supabase persistence requires SUPABASE_URL and SUPABASE_SECRET_KEY")
    return None


@dataclass(frozen=True)
class SupabaseStore:
    supabase_url: str
    secret_key: str
    timeout_seconds: float = 10.0
    transport: httpx.BaseTransport | None = None

    def list_workspaces(self) -> list[dict[str, Any]]:
        rows = self._request(
            "GET",
            "workspaces",
            params={"select": "*", "order": "created_at.desc"},
        )
        return [self._workspace_from_row(row) for row in rows]

    def list_workspaces_for_user(self, user_id: str) -> list[dict[str, Any]]:
        memberships = self.list_workspace_memberships_for_user(user_id)
        workspace_ids = [row["workspace_id"] for row in memberships]
        if not workspace_ids:
            return []
        rows = self._request(
            "GET",
            "workspaces",
            params={
                "id": f"in.({','.join(workspace_ids)})",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        roles_by_workspace = {row["workspace_id"]: row["role"] for row in memberships}
        return [
            {**self._workspace_from_row(row), "role": roles_by_workspace.get(str(row["id"]), "viewer")}
            for row in rows
        ]

    def create_workspace(self, workspace: dict[str, Any], owner_user_id: str | None = None) -> dict[str, Any]:
        rows = self._request(
            "POST",
            "workspaces",
            json={
                "name": workspace["name"],
                "slug": workspace["slug"],
                "plan": workspace["plan"],
            },
            prefer="return=representation",
        )
        created = self._workspace_from_row(rows[0])
        if owner_user_id and _is_uuid(owner_user_id):
            self._request(
                "POST",
                "workspace_memberships",
                json={
                    "workspace_id": created["id"],
                    "user_id": owner_user_id,
                    "role": "owner",
                    "status": "active",
                },
                prefer="return=minimal",
            )
        return created

    def list_projects(self) -> list[dict[str, Any]]:
        rows = self._request(
            "GET",
            "projects",
            params={"select": "*", "order": "created_at.desc"},
        )
        return [self._project_from_row(row) for row in rows]

    def list_projects_for_user(self, user_id: str) -> list[dict[str, Any]]:
        memberships = self.list_workspace_memberships_for_user(user_id)
        workspace_ids = [row["workspace_id"] for row in memberships]
        if not workspace_ids:
            return []
        rows = self._request(
            "GET",
            "projects",
            params={
                "workspace_id": f"in.({','.join(workspace_ids)})",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        return [self._project_from_row(row) for row in rows]

    def list_workspace_memberships_for_user(self, user_id: str) -> list[dict[str, Any]]:
        if not _is_uuid(user_id):
            return []
        rows = self._request(
            "GET",
            "workspace_memberships",
            params={
                "user_id": f"eq.{user_id}",
                "status": "eq.active",
                "select": "workspace_id,role,status",
            },
        )
        return [
            {"workspace_id": str(row["workspace_id"]), "role": str(row["role"]), "status": row.get("status") or "active"}
            for row in rows
        ]

    def get_workspace_membership_role(self, workspace_id: str, user_id: str) -> str | None:
        if workspace_id == settings.demo_workspace_id:
            workspace_id = settings.demo_workspace_db_id
        if not _is_uuid(workspace_id) or not _is_uuid(user_id):
            return None
        rows = self._request(
            "GET",
            "workspace_memberships",
            params={
                "workspace_id": f"eq.{workspace_id}",
                "user_id": f"eq.{user_id}",
                "status": "eq.active",
                "select": "role",
                "limit": "1",
            },
        )
        return str(rows[0]["role"]) if rows else None

    def get_project_membership_role(self, project_id: str, user_id: str) -> str | None:
        workspace_db_id, _ = self._resolve_project(project_id)
        return self.get_workspace_membership_role(workspace_db_id, user_id)

    def create_project(self, workspace_id: str, project: dict[str, Any]) -> dict[str, Any]:
        workspace_db_id = self._resolve_workspace(workspace_id)
        rows = self._request(
            "POST",
            "projects",
            json={
                "workspace_id": workspace_db_id,
                "name": project["name"],
                "slug": project["slug"],
                "environment": project["environment"],
                "risk_tier": project["risk_tier"],
                "data_mode": project["data_mode"],
                "description": project["description"],
                "setup_status": project.get("setup_status") or "needs_benchmark_suite",
            },
            prefer="return=representation",
        )
        return self._project_from_row(rows[0])

    def update_project_setup_status(self, project_id: str, setup_status: str) -> None:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        self._request(
            "PATCH",
            "projects",
            params={"workspace_id": f"eq.{workspace_db_id}", "id": f"eq.{project_db_id}"},
            json={"setup_status": setup_status},
            prefer="return=minimal",
        )

    def list_benchmark_suites(self, project_id: str) -> list[dict[str, Any]]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        suites = self._request(
            "GET",
            "benchmark_suites",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "source": "eq.custom_import",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        return [self._benchmark_suite_from_row(row, project_id) for row in suites]

    def get_benchmark_suite_bundle(self, project_id: str, suite_id: str | None = None) -> dict[str, Any]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        params = {
            "workspace_id": f"eq.{workspace_db_id}",
            "project_id": f"eq.{project_db_id}",
            "source": "eq.custom_import",
            "select": "*",
            "order": "created_at.desc",
            "limit": "1",
        }
        if suite_id:
            params.pop("limit")
            params.pop("order")
            params["id"] = f"eq.{suite_id}"
        suites = self._request("GET", "benchmark_suites", params=params)
        if not suites:
            raise SupabasePersistenceError("Benchmark suite not found" if suite_id else "Create a benchmark suite before uploading outputs")

        suite = suites[0]
        cell_rows = self._request(
            "GET",
            "benchmark_cells",
            params={"suite_id": f"eq.{suite['id']}", "select": "*", "order": "cell_key.asc"},
        )
        cell_keys_by_id = {str(row["id"]): row["cell_key"] for row in cell_rows}
        example_rows = self._request(
            "GET",
            "examples",
            params={"suite_id": f"eq.{suite['id']}", "select": "*", "order": "external_id.asc"},
        )
        return {
            "suite": {
                "id": str(suite["id"]),
                "project_id": project_id,
                "name": suite["name"],
                "version": suite["version"],
                "status": suite["status"],
                "source": suite["source"],
                "description": "",
                "license": suite.get("license"),
                "created_at": suite.get("created_at"),
                "artifact": None,
            },
            "cells": [
                {
                    "cell_id": row["cell_key"],
                    "cell_key": row["cell_key"],
                    "side": row["side"],
                    "source": row["source"],
                    "policy_category": row.get("policy_category"),
                    "severity": row.get("severity"),
                    "weight": float(row["weight"]),
                    "description": row.get("description") or "",
                    "examples": sum(1 for example in example_rows if str(example["cell_id"]) == str(row["id"])),
                }
                for row in cell_rows
            ],
            "examples": [
                {
                    "external_id": row["external_id"],
                    "cell_id": cell_keys_by_id.get(str(row["cell_id"]), str(row["cell_id"])),
                    "prompt_hash": row["prompt_hash"],
                    "prompt_redacted": row.get("prompt_redacted"),
                    "metadata": row.get("metadata") or {},
                }
                for row in example_rows
            ],
            "source_content": "",
            "source_format": "jsonl",
            "preview": {
                "format": "jsonl",
                "status": "valid",
                "rows_seen": len(example_rows),
                "valid_rows": len(example_rows),
                "issues": [],
                "summary": {"warnings": 0, "errors": 0},
                "preview": [],
            },
        }

    def create_benchmark_suite(self, project_id: str, bundle: dict[str, Any]) -> dict[str, Any]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        suite = bundle["suite"]
        suite_rows = self._request(
            "POST",
            "benchmark_suites",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "name": suite["name"],
                "version": suite["version"],
                "source": "custom_import",
                "license": suite.get("license"),
                "status": suite["status"],
            },
            prefer="return=representation",
        )
        suite_row = suite_rows[0]
        suite_db_id = suite_row["id"]
        cell_rows = self._request(
            "POST",
            "benchmark_cells",
            json=[
                {
                    "workspace_id": workspace_db_id,
                    "suite_id": suite_db_id,
                    "cell_key": cell["cell_key"],
                    "side": cell["side"],
                    "source": cell["source"],
                    "policy_category": cell["policy_category"],
                    "severity": cell["severity"],
                    "weight": cell["weight"],
                    "description": cell["description"],
                }
                for cell in bundle["cells"]
            ],
            prefer="return=representation",
        )
        cell_ids_by_external = {
            bundle["cells"][index]["cell_id"]: row["id"]
            for index, row in enumerate(cell_rows)
        }
        self._request(
            "POST",
            "examples",
            json=[
                {
                    "workspace_id": workspace_db_id,
                    "suite_id": suite_db_id,
                    "cell_id": cell_ids_by_external[example["cell_id"]],
                    "external_id": example["external_id"],
                    "prompt_hash": example["prompt_hash"],
                    "prompt_redacted": example["prompt_redacted"],
                    "metadata": example["metadata"],
                }
                for example in bundle["examples"]
            ],
            prefer="return=minimal",
        )
        artifact = self._store_import_artifact(
            workspace_db_id=workspace_db_id,
            project_db_id=project_db_id,
            suite_db_id=suite_db_id,
            source_content=bundle["source_content"],
            source_format=bundle["source_format"],
        )
        return {
            "id": suite_db_id,
            "db_id": suite_db_id,
            "project_id": project_id,
            "name": suite_row["name"],
            "version": suite_row["version"],
            "status": suite_row["status"],
            "source": suite_row["source"],
            "description": suite.get("description") or "",
            "license": suite_row.get("license"),
            "created_at": suite_row.get("created_at"),
            "artifact": artifact,
            "cells": [
                {
                    "cell_id": bundle["cells"][index]["cell_id"],
                    "side": row["side"],
                    "source": row["source"],
                    "policy_category": row.get("policy_category"),
                    "weight": float(row["weight"]),
                    "examples": bundle["cells"][index]["examples"],
                }
                for index, row in enumerate(cell_rows)
            ],
        }

    def list_guard_connectors(self, project_id: str) -> list[dict[str, Any]]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        definitions = self._request(
            "GET",
            "guard_definitions",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        connectors: list[dict[str, Any]] = []
        for definition in definitions:
            versions = self._request(
                "GET",
                "guard_versions",
                params={
                    "guard_id": f"eq.{definition['id']}",
                    "select": "*",
                    "order": "created_at.desc",
                    "limit": "1",
                },
            )
            connectors.append(self._guard_connector_from_rows(definition, versions[0] if versions else None, project_id))
        return connectors

    def create_guard_connector(self, project_id: str, connector: dict[str, Any]) -> dict[str, Any]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        definition_rows = self._request(
            "POST",
            "guard_definitions",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "guard_key": connector["guard_key"],
                "display_name": connector["display_name"],
                "guard_type": connector["guard_type"],
                "vendor": connector["vendor"],
            },
            prefer="return=representation",
        )
        definition = definition_rows[0]
        version_rows = self._request(
            "POST",
            "guard_versions",
            json={
                "workspace_id": workspace_db_id,
                "guard_id": definition["id"],
                "version": connector["version"],
                "threshold": connector["threshold"],
                "adapter_type": connector["adapter_type"],
                "config": connector["config"],
                "status": "active",
            },
            prefer="return=representation",
        )
        return self._guard_connector_from_rows(definition, version_rows[0], project_id)

    def list_custom_behaviors(self, project_id: str) -> list[dict[str, Any]]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        rows = self._request(
            "GET",
            "custom_behaviors",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        return [self._custom_behavior_from_row(row, project_id) for row in rows]

    def create_custom_behavior(self, project_id: str, behavior: dict[str, Any]) -> dict[str, Any]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        rows = self._request(
            "POST",
            "custom_behaviors",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "external_behavior_id": behavior["id"],
                "name": behavior["name"],
                "description": behavior["description"],
                "side": behavior["side"],
                "policy_category": behavior["policy_category"],
                "severity": behavior["severity"],
                "prompt_hash": behavior["prompt_hash"],
                "prompt_redacted": behavior["prompt_redacted"],
                "expected_safe_behavior": behavior["expected_safe_behavior"],
                "unsafe_behavior": behavior["unsafe_behavior"],
                "status": behavior["status"],
                "version": behavior["version"],
                "validation": behavior["validation"],
                "metadata": {
                    "api_project_id": project_id,
                    "data_handling": "redacted_prompt_only",
                },
            },
            prefer="return=representation",
        )
        return self._custom_behavior_from_row(rows[0], project_id)

    def list_jobs(self, project_id: str) -> list[dict[str, Any]]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        rows = self._request(
            "GET",
            "jobs",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        return [self._job_from_row(row, project_id) for row in rows]

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "jobs",
            params={
                "external_job_id": f"eq.{job_id}",
                "select": "*",
                "limit": "1",
            },
        )
        if not rows:
            return None
        project_id = rows[0].get("result", {}).get("project_id") or settings.demo_project_id
        return self._job_from_row(rows[0], str(project_id))

    def store_job(self, job: dict[str, Any]) -> dict[str, Any]:
        workspace_db_id, project_db_id = self._resolve_project(str(job["project_id"]))
        self._request(
            "POST",
            "jobs",
            params={"on_conflict": "workspace_id,external_job_id"},
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "external_job_id": job["id"],
                "external_run_id": job.get("run_id"),
                "kind": job["type"],
                "status": _job_status_to_db(str(job["status"])),
                "input": job.get("input")
                or {
                    "api_project_id": job["project_id"],
                    "api_run_id": job.get("run_id"),
                    "job_type": job["type"],
                },
                "result": job,
                "error": job.get("error"),
                "attempts": job.get("attempts", 0),
                "started_at": job.get("started_at"),
                "completed_at": job.get("completed_at") if str(job.get("status", "")).startswith("complete") or job.get("status") in {"failed", "canceled"} else None,
            },
            prefer="resolution=merge-duplicates,return=minimal",
        )
        return job

    def update_job(self, job: dict[str, Any]) -> dict[str, Any]:
        self._request(
            "PATCH",
            "jobs",
            params={"external_job_id": f"eq.{job['id']}"},
            json={
                "external_run_id": job.get("run_id"),
                "status": _job_status_to_db(str(job["status"])),
                "input": job.get("input", {}),
                "result": job,
                "error": job.get("error"),
                "attempts": job.get("attempts", 1),
                "started_at": job.get("started_at"),
                "completed_at": job.get("completed_at") if str(job.get("status", "")).startswith("complete") or job.get("status") in {"failed", "canceled"} else None,
            },
            prefer="return=minimal",
        )
        return job

    def record_usage_events(self, project_id: str, job: dict[str, Any], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not events:
            return []
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        job_db_id = self._resolve_job_db_id(str(job["id"]))
        run_db_id = self._resolve_evaluation_run_db_id(workspace_db_id, str(job.get("run_id"))) if job.get("run_id") else None
        self._request(
            "POST",
            "usage_events",
            params={"on_conflict": "workspace_id,external_event_id"},
            json=[
                {
                    "workspace_id": workspace_db_id,
                    "project_id": project_db_id,
                    "run_id": run_db_id,
                    "job_id": job_db_id,
                    "provider": event.get("provider"),
                    "model": event.get("model"),
                    "operation": event["operation"],
                    "input_tokens": event.get("input_tokens") or 0,
                    "output_tokens": event.get("output_tokens") or 0,
                    "request_count": event.get("request_count") or 0,
                    "duration_ms": event.get("duration_ms"),
                    "estimated_cost_usd": event.get("estimated_cost_usd") or 0,
                    "actual_cost_usd": event.get("actual_cost_usd"),
                    "currency": event.get("currency") or "USD",
                    "external_event_id": event.get("id"),
                    "metadata": event.get("metadata") or {},
                }
                for event in events
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
        return events

    def list_usage_events(self, project_id: str, run_id: str | None = None) -> list[dict[str, Any]]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        rows = self._request(
            "GET",
            "usage_events",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        events = [self._usage_event_from_row(row, project_id) for row in rows]
        if run_id:
            events = [event for event in events if event.get("run_id") == run_id]
        return events

    def list_pilot_runs(self, project_id: str) -> list[dict[str, Any]]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        rows = self._request(
            "GET",
            "evaluation_runs",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        summaries = [
            self._pilot_run_summary_from_row(row, project_id)
            for row in rows
            if (row.get("summary") or {}).get("source") in EVIDENCE_RUN_SOURCES
        ]
        return summaries

    def get_pilot_run_source(self, run_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "evaluation_runs",
            params={
                "external_run_id": f"eq.{run_id}",
                "select": "*",
                "limit": "1",
            },
        )
        if not rows:
            return None
        run_row = rows[0]
        summary = run_row.get("summary") or {}
        if summary.get("source") not in EVIDENCE_RUN_SOURCES:
            return None
        project_id = settings.demo_project_id if str(run_row["project_id"]) == settings.demo_project_db_id else str(run_row["project_id"])
        project = self._project_by_db_id(str(run_row["project_id"]))
        suite_bundle = self.get_benchmark_suite_bundle(project_id, str(run_row["benchmark_suite_id"]) if run_row.get("benchmark_suite_id") else None)
        output_rows = self._request(
            "GET",
            "guard_outputs",
            params={
                "run_id": f"eq.{run_row['id']}",
                "select": "*",
                "order": "created_at.asc",
            },
        )
        return {
            "run": self._pilot_run_from_row(run_row, project_id),
            "project": project,
            "suite_bundle": suite_bundle,
            "outputs": [self._pilot_output_from_row(row, run_id) for row in output_rows],
        }

    def has_pilot_run(self, run_id: str) -> bool:
        rows = self._request(
            "GET",
            "evaluation_runs",
            params={
                "external_run_id": f"eq.{run_id}",
                "select": "id,summary",
                "limit": "1",
            },
        )
        return bool(rows and (rows[0].get("summary") or {}).get("source") in EVIDENCE_RUN_SOURCES)

    def store_pilot_run(
        self,
        project_id: str,
        run: dict[str, Any],
        run_summary: dict[str, Any],
        outputs: list[dict[str, Any]],
        measurement_actions: list[dict[str, Any]],
        certificate: dict[str, Any],
    ) -> dict[str, Any]:
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        suite_db_id = str(run["benchmark_suite_id"])
        existing = self._request(
            "GET",
            "evaluation_runs",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "external_run_id": f"eq.{run['id']}",
                "select": "id",
                "limit": "1",
            },
        )
        source = run.get("source") or run_summary.get("source") or "uploaded_outputs"
        summary = {
            **run_summary,
            "source": source,
            "name": run.get("name") or ("Worker evaluation run" if source == "worker_evaluation" else "Uploaded-output pilot run"),
            "benchmark_suite_id": suite_db_id,
            "benchmark_suite_name": run.get("benchmark_suite_name"),
            "sampled_example_ids": run.get("sampled_example_ids") or [],
            "job_id": run.get("job_id"),
            "certificate": certificate,
        }
        payload = {
            "workspace_id": workspace_db_id,
            "project_id": project_db_id,
            "benchmark_suite_id": suite_db_id,
            "external_run_id": run["id"],
            "status": "succeeded",
            "lambda_cost": run_summary["lambda_cost"],
            "rho_prior": run_summary["rho_prior"],
            "k": run_summary["k"],
            "summary": summary,
            "started_at": run.get("created_at"),
            "completed_at": run.get("completed_at"),
        }
        if existing:
            run_db_id = str(existing[0]["id"])
            self._request(
                "PATCH",
                "evaluation_runs",
                params={"id": f"eq.{run_db_id}"},
                json=payload,
                prefer="return=minimal",
            )
        else:
            created = self._request(
                "POST",
                "evaluation_runs",
                json=payload,
                prefer="return=representation",
            )
            run_db_id = str(created[0]["id"])

        if source == "worker_evaluation":
            self._upsert_pilot_outputs(
                workspace_db_id=workspace_db_id,
                run_db_id=run_db_id,
                suite_db_id=suite_db_id,
                outputs=outputs,
            )
            self._upsert_measurement_recommendations(
                workspace_db_id=workspace_db_id,
                run_db_id=run_db_id,
                actions=measurement_actions,
            )
        else:
            self._replace_pilot_outputs(
                workspace_db_id=workspace_db_id,
                run_db_id=run_db_id,
                suite_db_id=suite_db_id,
                outputs=outputs,
            )
            self._replace_measurement_recommendations(
                workspace_db_id=workspace_db_id,
                run_db_id=run_db_id,
                actions=measurement_actions,
            )
        return run_summary

    def get_issued_certificate(self, certificate_id: str) -> dict[str, Any] | None:
        rows = self._certificate_rows(certificate_id)
        if not rows:
            return None
        return self._certificate_from_row(rows[0])

    def get_issued_certificate_for_run(self, run_id: str, *, workspace_id: str | None = None) -> dict[str, Any] | None:
        params = {
            "external_run_id": f"eq.{run_id}",
            "select": "id,workspace_id",
            "limit": "1",
        }
        if workspace_id:
            params["workspace_id"] = f"eq.{_api_workspace_to_db_id(workspace_id)}"
        run_rows = self._request("GET", "evaluation_runs", params=params)
        if not run_rows:
            return None
        certificate_rows = self._request(
            "GET",
            "certificates",
            params={
                "run_id": f"eq.{run_rows[0]['id']}",
                "select": "*",
                "order": "issued_at.desc.nullslast,created_at.desc",
                "limit": "1",
            },
        )
        if not certificate_rows:
            return None
        return self._certificate_from_row(certificate_rows[0])

    def issue_certificate(self, project_id: str, certificate: dict[str, Any]) -> dict[str, Any]:
        existing = self.get_issued_certificate(str(certificate["certificate_id"]))
        if existing:
            return existing
        workspace_db_id, project_db_id = self._resolve_project(project_id)
        run_db_id = self._resolve_or_create_evaluation_run(
            workspace_db_id=workspace_db_id,
            project_db_id=project_db_id,
            certificate=certificate,
        )
        artifact_payloads = list(certificate.get("_artifact_payloads") or [])
        artifact_refs = self._certificate_artifact_refs(
            workspace_db_id=workspace_db_id,
            certificate=certificate,
            artifact_payloads=artifact_payloads,
        )
        for payload, ref in zip(artifact_payloads, artifact_refs, strict=False):
            self._upload_storage_object(
                bucket=ref["bucket"],
                object_path=ref["object_path"],
                content=payload["content"],
                content_type=payload["content_type"],
            )
        rows = self._request(
            "POST",
            "certificates",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "run_id": run_db_id,
                "certificate_key": certificate["certificate_id"],
                "status": certificate["status"],
                "selected_stack_label": certificate["selected_stack_label"],
                "scope": certificate["scope"],
                "issued_at": certificate["issued_at"],
                "expires_at": certificate["expires_at"],
                "artifact_hash": certificate["artifact_hash"],
                "summary": certificate["summary"],
                "limitations": certificate["limitations"],
                "packet_snapshot": certificate.get("packet_snapshot") or {},
                "artifact_refs": artifact_refs,
            },
            prefer="return=representation",
        )
        for ref in artifact_refs:
            self._record_artifact_metadata(
                workspace_db_id=workspace_db_id,
                project_db_id=project_db_id,
                run_db_id=run_db_id,
                certificate_db_id=str(rows[0]["id"]),
                ref=ref,
            )
        return self._certificate_from_row(rows[0])

    def create_certificate_signoff(self, certificate_id: str, signoff: dict[str, Any]) -> dict[str, Any]:
        rows = self._certificate_rows(certificate_id)
        if not rows:
            raise SupabasePersistenceError(f"Certificate not found: {certificate_id}")
        certificate = rows[0]
        signoff_rows = self._request(
            "POST",
            "certificate_signoffs",
            json={
                "workspace_id": certificate["workspace_id"],
                "certificate_id": certificate["id"],
                "signer_role": signoff["signer_role"],
                "decision": signoff["decision"],
                "comment": signoff.get("comment") or "",
            },
            prefer="return=representation",
        )
        return self._certificate_signoff_from_row(signoff_rows[0], certificate_id)

    def record_audit_event(self, event: dict[str, Any]) -> dict[str, Any]:
        workspace_db_id = _api_workspace_to_db_id(event.get("workspace_id"))
        project_db_id = None
        if event.get("project_id"):
            workspace_db_id, project_db_id = self._resolve_project(str(event["project_id"]))
        target_id = str(event["target_id"]) if _is_uuid(event.get("target_id")) else None
        metadata = {
            **(event.get("metadata") or {}),
            "api_workspace_id": event.get("workspace_id"),
            "api_project_id": event.get("project_id"),
            "external_target_id": event.get("target_id"),
            "actor": event.get("actor"),
            "actor_type": event.get("actor_type"),
        }
        rows = self._request(
            "POST",
            "audit_events",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "actor_user_id": event.get("actor_user_id") if _is_uuid(event.get("actor_user_id")) else None,
                "action": event["action"],
                "target_type": event.get("target_type"),
                "target_id": target_id,
                "metadata": metadata,
            },
            prefer="return=representation",
        )
        return {**event, "db_id": rows[0].get("id") if rows else None}

    def list_certificate_artifacts(self, certificate_id: str) -> list[dict[str, Any]]:
        rows = self._certificate_rows(certificate_id)
        if not rows:
            raise SupabasePersistenceError(f"Certificate not found: {certificate_id}")
        refs = rows[0].get("artifact_refs") or []
        if refs:
            return refs
        artifact_rows = self._request(
            "GET",
            "artifact_objects",
            params={
                "certificate_id": f"eq.{rows[0]['id']}",
                "select": "bucket,object_path,artifact_type,byte_size,content_type,sha256,metadata",
                "order": "created_at.asc",
            },
        )
        return [self._artifact_ref_from_row(row) for row in artifact_rows]

    def create_certificate_artifact_signed_url(
        self,
        certificate_id: str,
        artifact_type: str,
        *,
        expires_in_seconds: int = 300,
    ) -> dict[str, Any]:
        ref = self._certificate_artifact_ref(certificate_id, artifact_type)
        sign_url = f"{self.supabase_url.rstrip('/')}/storage/v1/object/sign/{ref['bucket']}/{ref['object_path']}"
        response = self._send(
            "POST",
            sign_url,
            json={"expiresIn": expires_in_seconds},
            headers=self._headers(),
        )
        if response.status_code >= 400:
            raise SupabasePersistenceError(f"Supabase storage signed URL returned HTTP {response.status_code}: {response.text[:240]}")
        body = response.json()
        signed_url = body.get("signedURL") or body.get("signedUrl") or body.get("url")
        if not signed_url:
            raise SupabasePersistenceError("Supabase storage signed URL response did not include a URL")
        if signed_url.startswith("/"):
            signed_url = f"{self.supabase_url.rstrip('/')}/storage/v1{signed_url}"
        return {**ref, "signed_url": signed_url, "expires_in_seconds": expires_in_seconds}

    def verify_certificate_artifact(self, certificate_id: str, artifact_type: str) -> dict[str, Any]:
        ref = self._certificate_artifact_ref(certificate_id, artifact_type)
        download_url = f"{self.supabase_url.rstrip('/')}/storage/v1/object/{ref['bucket']}/{ref['object_path']}"
        response = self._send("GET", download_url, headers=self._headers(content_type="application/octet-stream"))
        if response.status_code >= 400:
            raise SupabasePersistenceError(f"Supabase storage download returned HTTP {response.status_code}: {response.text[:240]}")
        actual = sha256(response.content).hexdigest()
        return {
            **ref,
            "expected_sha256": ref.get("sha256"),
            "actual_sha256": actual,
            "verified": actual == ref.get("sha256"),
        }

    def _replace_pilot_outputs(
        self,
        *,
        workspace_db_id: str,
        run_db_id: str,
        suite_db_id: str,
        outputs: list[dict[str, Any]],
    ) -> None:
        self._request(
            "DELETE",
            "guard_outputs",
            params={"workspace_id": f"eq.{workspace_db_id}", "run_id": f"eq.{run_db_id}"},
            prefer="return=minimal",
        )
        if not outputs:
            return
        self._write_pilot_outputs(
            workspace_db_id=workspace_db_id,
            run_db_id=run_db_id,
            suite_db_id=suite_db_id,
            outputs=outputs,
            prefer="return=minimal",
        )

    def _upsert_pilot_outputs(
        self,
        *,
        workspace_db_id: str,
        run_db_id: str,
        suite_db_id: str,
        outputs: list[dict[str, Any]],
    ) -> None:
        self._write_pilot_outputs(
            workspace_db_id=workspace_db_id,
            run_db_id=run_db_id,
            suite_db_id=suite_db_id,
            outputs=outputs,
            prefer="resolution=merge-duplicates,return=minimal",
            params={"on_conflict": "run_id,guard_key,external_example_id"},
        )

    def _write_pilot_outputs(
        self,
        *,
        workspace_db_id: str,
        run_db_id: str,
        suite_db_id: str,
        outputs: list[dict[str, Any]],
        prefer: str,
        params: dict[str, str] | None = None,
    ) -> None:
        if not outputs:
            return
        example_ids = self._example_db_ids_by_external(suite_db_id)
        guard_version_ids = self._guard_version_ids_by_key(workspace_db_id)
        self._request(
            "POST",
            "guard_outputs",
            params=params,
            json=[
                {
                    "workspace_id": workspace_db_id,
                    "run_id": run_db_id,
                    "example_id": example_ids.get(output["example_id"]),
                    "guard_version_id": guard_version_ids.get(output["guard_id"]),
                    "external_example_id": output["example_id"],
                    "guard_key": output["guard_id"],
                    "pass_probability": output["pass_probability"],
                    "block_probability": output["block_probability"],
                    "binary_pass": output["binary_pass"],
                    "error": output.get("error"),
                    "metadata": output.get("metadata") or {},
                }
                for output in outputs
            ],
            prefer=prefer,
        )

    def _replace_measurement_recommendations(
        self,
        *,
        workspace_db_id: str,
        run_db_id: str,
        actions: list[dict[str, Any]],
    ) -> None:
        self._request(
            "DELETE",
            "measurement_recommendations",
            params={"workspace_id": f"eq.{workspace_db_id}", "run_id": f"eq.{run_db_id}"},
            prefer="return=minimal",
        )
        if not actions:
            return
        self._write_measurement_recommendations(
            workspace_db_id=workspace_db_id,
            run_db_id=run_db_id,
            actions=actions,
            prefer="return=minimal",
        )

    def _upsert_measurement_recommendations(
        self,
        *,
        workspace_db_id: str,
        run_db_id: str,
        actions: list[dict[str, Any]],
    ) -> None:
        self._write_measurement_recommendations(
            workspace_db_id=workspace_db_id,
            run_db_id=run_db_id,
            actions=actions,
            prefer="resolution=merge-duplicates,return=minimal",
            params={"on_conflict": "run_id,action_key"},
        )

    def _write_measurement_recommendations(
        self,
        *,
        workspace_db_id: str,
        run_db_id: str,
        actions: list[dict[str, Any]],
        prefer: str,
        params: dict[str, str] | None = None,
    ) -> None:
        if not actions:
            return
        self._request(
            "POST",
            "measurement_recommendations",
            params=params,
            json=[
                {
                    "workspace_id": workspace_db_id,
                    "run_id": run_db_id,
                    "action_key": action["id"],
                    "guard_keys": action["guard_ids"],
                    "cell_key": action["cell_id"],
                    "expected_radius_reduction": action["expected_radius_reduction"],
                    "cost_estimate_usd": action["cost_usd"],
                    "eta_minutes": action["eta_minutes"],
                    "status": action["status"],
                }
                for action in actions
            ],
            prefer=prefer,
        )

    def _example_db_ids_by_external(self, suite_db_id: str) -> dict[str, str]:
        rows = self._request(
            "GET",
            "examples",
            params={"suite_id": f"eq.{suite_db_id}", "select": "id,external_id"},
        )
        return {str(row["external_id"]): str(row["id"]) for row in rows}

    def _guard_version_ids_by_key(self, workspace_db_id: str) -> dict[str, str]:
        rows = self._request(
            "GET",
            "guard_definitions",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "select": "id,guard_key,guard_versions(id,created_at)",
            },
        )
        mapping: dict[str, str] = {}
        for row in rows:
            versions = row.get("guard_versions") or []
            if versions:
                latest = sorted(versions, key=lambda item: item.get("created_at") or "", reverse=True)[0]
                mapping[str(row["guard_key"])] = str(latest["id"])
        return mapping

    def _resolve_project(self, project_id: str) -> tuple[str, str]:
        if project_id == settings.demo_project_id:
            return settings.demo_workspace_db_id, settings.demo_project_db_id
        try:
            uuid.UUID(project_id)
        except ValueError as exc:
            raise SupabasePersistenceError(f"Project not found: {project_id}") from exc
        rows = self._request(
            "GET",
            "projects",
            params={"id": f"eq.{project_id}", "select": "id,workspace_id", "limit": "1"},
        )
        if not rows:
            raise SupabasePersistenceError(f"Project not found: {project_id}")
        return str(rows[0]["workspace_id"]), str(rows[0]["id"])

    def _resolve_workspace(self, workspace_id: str) -> str:
        if workspace_id == settings.demo_workspace_id:
            return settings.demo_workspace_db_id
        try:
            uuid.UUID(workspace_id)
        except ValueError as exc:
            raise SupabasePersistenceError(f"Workspace not found: {workspace_id}") from exc
        rows = self._request(
            "GET",
            "workspaces",
            params={"id": f"eq.{workspace_id}", "select": "id", "limit": "1"},
        )
        if not rows:
            raise SupabasePersistenceError(f"Workspace not found: {workspace_id}")
        return str(rows[0]["id"])

    def _resolve_job_db_id(self, job_id: str) -> str | None:
        rows = self._request(
            "GET",
            "jobs",
            params={"external_job_id": f"eq.{job_id}", "select": "id", "limit": "1"},
        )
        return str(rows[0]["id"]) if rows else None

    def _resolve_evaluation_run_db_id(self, workspace_db_id: str, run_id: str) -> str | None:
        rows = self._request(
            "GET",
            "evaluation_runs",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "external_run_id": f"eq.{run_id}",
                "select": "id",
                "limit": "1",
            },
        )
        return str(rows[0]["id"]) if rows else None

    def _certificate_rows(self, certificate_id: str) -> list[dict[str, Any]]:
        return self._request(
            "GET",
            "certificates",
            params={"certificate_key": f"eq.{certificate_id}", "select": "*", "limit": "1"},
        )

    def _resolve_or_create_evaluation_run(
        self,
        *,
        workspace_db_id: str,
        project_db_id: str,
        certificate: dict[str, Any],
    ) -> str:
        rows = self._request(
            "GET",
            "evaluation_runs",
            params={
                "workspace_id": f"eq.{workspace_db_id}",
                "project_id": f"eq.{project_db_id}",
                "external_run_id": f"eq.{certificate['run_id']}",
                "select": "id",
                "limit": "1",
            },
        )
        if rows:
            return str(rows[0]["id"])
        created = self._request(
            "POST",
            "evaluation_runs",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "external_run_id": certificate["run_id"],
                "status": "succeeded",
                "lambda_cost": certificate.get("summary", {}).get("lambda_cost") or 5.0,
                "summary": {
                    "source": "certificate_issue",
                    "certificate_id": certificate["certificate_id"],
                    "selected_stack_label": certificate["selected_stack_label"],
                },
                "completed_at": certificate.get("issued_at"),
            },
            prefer="return=representation",
        )
        return str(created[0]["id"])

    def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json: Any | None = None,
        prefer: str | None = None,
    ) -> Any:
        url = f"{self.supabase_url.rstrip('/')}/rest/v1/{table}"
        response = self._send(method, url, params=params, json=json, headers=self._headers(prefer=prefer))
        if response.status_code >= 400:
            raise SupabasePersistenceError(f"Supabase {table} request returned HTTP {response.status_code}: {response.text[:240]}")
        if response.status_code == 204 or not response.content:
            return []
        return response.json()

    def _store_import_artifact(
        self,
        *,
        workspace_db_id: str,
        project_db_id: str,
        suite_db_id: str,
        source_content: str,
        source_format: str,
    ) -> dict[str, Any]:
        content_type = "application/jsonl" if source_format == "jsonl" else "text/csv"
        extension = "jsonl" if source_format == "jsonl" else "csv"
        object_path = f"{workspace_db_id}/benchmark-suites/{suite_db_id}/source.{extension}"
        body = source_content.encode("utf-8")
        upload_url = f"{self.supabase_url.rstrip('/')}/storage/v1/object/uploads/{object_path}"
        response = self._send(
            "POST",
            upload_url,
            content=body,
            headers=self._headers(content_type=content_type),
        )
        if response.status_code >= 400:
            raise SupabasePersistenceError(f"Supabase storage upload returned HTTP {response.status_code}: {response.text[:240]}")
        digest = sha256(body).hexdigest()
        self._request(
            "POST",
            "artifact_objects",
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "bucket": "uploads",
                "object_path": object_path,
                "artifact_type": "benchmark_import_source",
                "byte_size": len(body),
                "content_type": content_type,
                "sha256": digest,
            },
            prefer="return=minimal",
        )
        return {
            "bucket": "uploads",
            "object_path": object_path,
            "content_type": content_type,
            "byte_size": len(body),
            "sha256": digest,
        }

    def _certificate_artifact_refs(
        self,
        *,
        workspace_db_id: str,
        certificate: dict[str, Any],
        artifact_payloads: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        refs: list[dict[str, Any]] = []
        for payload in artifact_payloads:
            body = payload["content"]
            artifact_type = payload["artifact_type"]
            object_path = f"{workspace_db_id}/certificates/{certificate['certificate_id']}/{artifact_type}.{payload['extension']}"
            refs.append(
                {
                    "bucket": "certificates",
                    "object_path": object_path,
                    "artifact_type": artifact_type,
                    "content_type": payload["content_type"],
                    "byte_size": len(body),
                    "sha256": sha256(body).hexdigest(),
                    "metadata": {
                        "certificate_id": certificate["certificate_id"],
                        "run_id": certificate["run_id"],
                        "project_id": certificate["project_id"],
                    },
                }
            )
        return refs

    def _upload_storage_object(self, *, bucket: str, object_path: str, content: bytes, content_type: str) -> None:
        upload_url = f"{self.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path}"
        headers = self._headers(content_type=content_type)
        headers["x-upsert"] = "false"
        response = self._send("POST", upload_url, content=content, headers=headers)
        if response.status_code >= 400:
            raise SupabasePersistenceError(f"Supabase storage upload returned HTTP {response.status_code}: {response.text[:240]}")

    def _record_artifact_metadata(
        self,
        *,
        workspace_db_id: str,
        project_db_id: str,
        run_db_id: str,
        certificate_db_id: str,
        ref: dict[str, Any],
    ) -> None:
        self._request(
            "POST",
            "artifact_objects",
            params={"on_conflict": "bucket,object_path"},
            json={
                "workspace_id": workspace_db_id,
                "project_id": project_db_id,
                "run_id": run_db_id,
                "certificate_id": certificate_db_id,
                "bucket": ref["bucket"],
                "object_path": ref["object_path"],
                "artifact_type": ref["artifact_type"],
                "byte_size": ref["byte_size"],
                "content_type": ref["content_type"],
                "sha256": ref["sha256"],
                "metadata": ref.get("metadata") or {},
            },
            prefer="resolution=merge-duplicates,return=minimal",
        )

    def _certificate_artifact_ref(self, certificate_id: str, artifact_type: str) -> dict[str, Any]:
        for ref in self.list_certificate_artifacts(certificate_id):
            if ref.get("artifact_type") == artifact_type:
                return ref
        raise SupabasePersistenceError(f"Certificate artifact not found: {artifact_type}")

    @staticmethod
    def _artifact_ref_from_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "bucket": row["bucket"],
            "object_path": row["object_path"],
            "artifact_type": row["artifact_type"],
            "content_type": row.get("content_type"),
            "byte_size": row.get("byte_size"),
            "sha256": row.get("sha256"),
            "metadata": row.get("metadata") or {},
        }

    def _headers(self, *, prefer: str | None = None, content_type: str = "application/json") -> dict[str, str]:
        headers = {
            "apikey": self.secret_key,
            "Content-Type": content_type,
        }
        if not self.secret_key.startswith("sb_"):
            headers["Authorization"] = f"Bearer {self.secret_key}"
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _send(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        try:
            with httpx.Client(timeout=self.timeout_seconds, transport=self.transport) as client:
                return client.request(method, url, **kwargs)
        except httpx.HTTPError as exc:
            raise SupabasePersistenceError("Supabase request failed") from exc

    def _benchmark_suite_from_row(self, row: dict[str, Any], project_id: str) -> dict[str, Any]:
        cells = self._request(
            "GET",
            "benchmark_cells",
            params={
                "suite_id": f"eq.{row['id']}",
                "select": "*",
                "order": "cell_key.asc",
            },
        )
        example_counts = self._request(
            "GET",
            "examples",
            params={
                "suite_id": f"eq.{row['id']}",
                "select": "cell_id",
            },
        )
        counts: dict[str, int] = {}
        for example in example_counts:
            counts[str(example["cell_id"])] = counts.get(str(example["cell_id"]), 0) + 1
        artifacts = self._request(
            "GET",
            "artifact_objects",
            params={
                "artifact_type": "eq.benchmark_import_source",
                "object_path": f"like.*{row['id']}*",
                "select": "bucket,object_path,content_type,byte_size,sha256",
                "limit": "1",
            },
        )
        return {
            "id": row["id"],
            "project_id": project_id,
            "name": row["name"],
            "version": row["version"],
            "status": row["status"],
            "source": row["source"],
            "license": row.get("license"),
            "created_at": row.get("created_at"),
            "artifact": artifacts[0] if artifacts else None,
            "cells": [
                {
                    "cell_id": cell["cell_key"],
                    "side": cell["side"],
                    "source": cell["source"],
                    "policy_category": cell.get("policy_category"),
                    "weight": float(cell["weight"]),
                    "examples": counts.get(str(cell["id"]), 0),
                }
                for cell in cells
            ],
        }

    def _project_by_db_id(self, project_db_id: str) -> dict[str, Any]:
        rows = self._request(
            "GET",
            "projects",
            params={"id": f"eq.{project_db_id}", "select": "*", "limit": "1"},
        )
        if not rows:
            raise SupabasePersistenceError(f"Project not found: {project_db_id}")
        return self._project_from_row(rows[0])

    @staticmethod
    def _pilot_run_from_row(row: dict[str, Any], project_id: str) -> dict[str, Any]:
        summary = row.get("summary") or {}
        workspace_id = settings.demo_workspace_id if str(row["workspace_id"]) == settings.demo_workspace_db_id else str(row["workspace_id"])
        source = summary.get("source") or "uploaded_outputs"
        return {
            "id": row.get("external_run_id") or row["id"],
            "project_id": project_id,
            "workspace_id": workspace_id,
            "status": _job_status_from_db(row.get("status") or "succeeded"),
            "name": summary.get("name") or ("Worker evaluation run" if source == "worker_evaluation" else "Uploaded-output pilot run"),
            "source": source,
            "benchmark_suite_id": str(row["benchmark_suite_id"]) if row.get("benchmark_suite_id") else summary.get("benchmark_suite_id"),
            "benchmark_suite_name": summary.get("benchmark_suite_name") or "Imported benchmark suite",
            "lambda_cost": float(summary.get("lambda_cost") or row.get("lambda_cost") or 5.0),
            "rho_prior": float(summary.get("rho_prior") or row.get("rho_prior") or 0.6),
            "k": int(summary.get("k") or row.get("k") or 2),
            "sampled_example_ids": summary.get("sampled_example_ids") or [],
            "job_id": summary.get("job_id"),
            "created_at": row.get("created_at"),
            "completed_at": row.get("completed_at"),
        }

    def _pilot_run_summary_from_row(self, row: dict[str, Any], project_id: str) -> dict[str, Any]:
        summary = row.get("summary") or {}
        run = self._pilot_run_from_row(row, project_id)
        return {
            "id": run["id"],
            "project_id": project_id,
            "workspace_id": run["workspace_id"],
            "status": run["status"],
            "k": int(summary.get("k") or row.get("k") or 2),
            "rho_prior": float(summary.get("rho_prior") or row.get("rho_prior") or 0.6),
            "lambda_cost": float(summary.get("lambda_cost") or row.get("lambda_cost") or 5.0),
            "examples": int(summary.get("examples") or 0),
            "guards": int(summary.get("guards") or 0),
            "candidate_stacks": int(summary.get("candidate_stacks") or 0),
            "benchmark_cells": int(summary.get("benchmark_cells") or 0),
            "outputs": int(summary.get("outputs") or 0),
            "certificate_id": summary.get("certificate_id") or f"evidence_{run['id']}",
            "certificate_status": summary.get("certificate_status") or "provisional",
            "measurement_actions": int(summary.get("measurement_actions") or 0),
            "benchmark_suite_id": str(row["benchmark_suite_id"]) if row.get("benchmark_suite_id") else summary.get("benchmark_suite_id"),
            "benchmark_suite_name": summary.get("benchmark_suite_name"),
            "created_at": row.get("created_at"),
            "completed_at": row.get("completed_at"),
            "source": summary.get("source") or "uploaded_outputs",
        }

    @staticmethod
    def _pilot_output_from_row(row: dict[str, Any], run_id: str) -> dict[str, Any]:
        return {
            "run_id": run_id,
            "example_id": row["external_example_id"],
            "guard_id": row["guard_key"],
            "pass_probability": float(row.get("pass_probability") or 0),
            "block_probability": float(row.get("block_probability") or 0),
            "binary_pass": bool(row.get("binary_pass")),
            "raw_score": row.get("raw_score"),
            "metadata": row.get("metadata") or {},
            "error": row.get("error"),
        }

    @staticmethod
    def _workspace_from_row(row: dict[str, Any]) -> dict[str, Any]:
        row_id = str(row["id"])
        return {
            "id": settings.demo_workspace_id if row_id == settings.demo_workspace_db_id else row_id,
            "name": row["name"],
            "slug": row["slug"],
            "role": "owner",
            "plan": row.get("plan") or "starter",
            "created_at": row.get("created_at"),
        }

    @staticmethod
    def _project_from_row(row: dict[str, Any]) -> dict[str, Any]:
        row_id = str(row["id"])
        workspace_id = str(row["workspace_id"])
        return {
            "id": settings.demo_project_id if row_id == settings.demo_project_db_id else row_id,
            "workspace_id": settings.demo_workspace_id if workspace_id == settings.demo_workspace_db_id else workspace_id,
            "slug": row["slug"],
            "name": row["name"],
            "environment": row["environment"],
            "risk_tier": row["risk_tier"],
            "data_mode": row["data_mode"],
            "description": row.get("description") or "",
            "setup_status": row.get("setup_status") or ("ready_for_setup" if row_id != settings.demo_project_db_id else "demo_seeded"),
            "created_at": row.get("created_at"),
        }

    @staticmethod
    def _guard_connector_from_rows(definition: dict[str, Any], version: dict[str, Any] | None, project_id: str) -> dict[str, Any]:
        config = version.get("config") if version else {}
        price_card = pricing.connector_price_card({"config": config, "unit_cost_usd": config.get("unit_cost_usd")})
        return {
            "id": definition["id"],
            "project_id": project_id,
            "guard_key": definition["guard_key"],
            "label": definition["display_name"],
            "display_name": definition["display_name"],
            "name": definition["display_name"],
            "type": definition["guard_type"],
            "guard_type": definition["guard_type"],
            "vendor": definition.get("vendor") or "custom",
            "version": version.get("version") if version else "unversioned",
            "adapter_type": version.get("adapter_type") if version else "uploaded_outputs",
            "threshold": version.get("threshold") if version else None,
            "status": version.get("status") if version else "draft",
            "latency_ms": 100,
            "unit_cost_usd": price_card["request_price_usd"],
            "created_at": definition.get("created_at"),
            "config": config,
            "price_card": price_card,
            "redaction": {
                "auth_secret_stored": bool(config.get("has_secret")),
                "auth_secret_visible": False,
            },
        }

    @staticmethod
    def _custom_behavior_from_row(row: dict[str, Any], project_id: str) -> dict[str, Any]:
        return {
            "id": row.get("external_behavior_id") or row["id"],
            "project_id": project_id,
            "name": row["name"],
            "description": row.get("description") or "",
            "side": row["side"],
            "policy_category": row.get("policy_category") or "custom",
            "severity": row.get("severity") or "medium",
            "prompt_hash": row["prompt_hash"],
            "prompt_redacted": row.get("prompt_redacted") or "",
            "expected_safe_behavior": row.get("expected_safe_behavior") or "",
            "unsafe_behavior": row.get("unsafe_behavior") or "",
            "status": row.get("status") or "draft",
            "version": row.get("version") or "draft-v1",
            "created_at": row.get("created_at"),
            "validation": row.get("validation") or {"complete": False, "issues": [], "notes": []},
        }

    @staticmethod
    def _usage_event_from_row(row: dict[str, Any], project_id: str) -> dict[str, Any]:
        metadata = row.get("metadata") or {}
        return {
            "id": str(row.get("external_event_id") or row["id"]),
            "workspace_id": settings.demo_workspace_id if str(row["workspace_id"]) == settings.demo_workspace_db_id else str(row["workspace_id"]),
            "project_id": metadata.get("api_project_id") or project_id,
            "run_id": metadata.get("api_run_id"),
            "job_id": metadata.get("api_job_id") or (str(row["job_id"]) if row.get("job_id") else None),
            "provider": row.get("provider"),
            "model": row.get("model"),
            "operation": row["operation"],
            "input_tokens": int(row.get("input_tokens") or 0),
            "output_tokens": int(row.get("output_tokens") or 0),
            "request_count": int(row.get("request_count") or 0),
            "duration_ms": int(row["duration_ms"]) if row.get("duration_ms") is not None else None,
            "estimated_cost_usd": float(row.get("estimated_cost_usd") or 0),
            "actual_cost_usd": float(row.get("actual_cost_usd") or row.get("estimated_cost_usd") or 0),
            "currency": row.get("currency") or "USD",
            "metadata": metadata,
            "created_at": row.get("created_at"),
        }

    @staticmethod
    def _certificate_signoff_from_row(row: dict[str, Any], certificate_id: str) -> dict[str, Any]:
        return {
            "id": str(row["id"]),
            "certificate_id": certificate_id,
            "signer_role": row["signer_role"],
            "decision": row["decision"],
            "comment": row.get("comment") or "",
            "created_at": row.get("created_at"),
        }

    def _certificate_from_row(self, row: dict[str, Any]) -> dict[str, Any]:
        signoff_rows = self._request(
            "GET",
            "certificate_signoffs",
            params={
                "certificate_id": f"eq.{row['id']}",
                "select": "*",
                "order": "created_at.desc",
            },
        )
        certificate_id = row["certificate_key"]
        return {
            "id": certificate_id,
            "certificate_id": certificate_id,
            "project_id": settings.demo_project_id if str(row["project_id"]) == settings.demo_project_db_id else str(row["project_id"]),
            "run_id": (row.get("summary") or {}).get("run_id") or settings.demo_run_id,
            "status": row["status"],
            "selected_stack_label": row["selected_stack_label"],
            "scope": row["scope"],
            "issued_at": row.get("issued_at"),
            "expires_at": row.get("expires_at"),
            "artifact_hash": row.get("artifact_hash"),
            "limitations": row.get("limitations") or [],
            "summary": row.get("summary") or {},
            "packet_snapshot": row.get("packet_snapshot") or {},
            "artifact_refs": row.get("artifact_refs") or [],
            "artifacts": row.get("artifact_refs") or [],
            "signoffs": [self._certificate_signoff_from_row(signoff, certificate_id) for signoff in signoff_rows],
        }

    @staticmethod
    def _job_from_row(row: dict[str, Any], project_id: str) -> dict[str, Any]:
        result = row.get("result") or {}
        if result:
            return {
                **result,
                "id": row.get("external_job_id") or result.get("id"),
                "project_id": result.get("project_id") or project_id,
                "created_at": result.get("created_at") or row.get("created_at"),
                "updated_at": result.get("updated_at") or row.get("updated_at"),
            }
        return {
            "id": row.get("external_job_id") or row["id"],
            "type": row["kind"],
            "project_id": project_id,
            "run_id": row.get("external_run_id"),
            "status": _job_status_from_db(row["status"]),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "progress": 0.0,
            "summary": {},
            "next_steps": [],
        }


def _job_status_to_db(status: str) -> str:
    return {
        "complete": "succeeded",
        "complete_with_errors": "succeeded",
        "queued": "queued",
        "running": "running",
        "failed": "failed",
        "canceled": "canceled",
    }.get(status, "queued")


def _is_uuid(value: str | None) -> bool:
    if not value:
        return False
    try:
        uuid.UUID(str(value))
    except ValueError:
        return False
    return True


def _api_workspace_to_db_id(workspace_id: str | None) -> str | None:
    if workspace_id == settings.demo_workspace_id:
        return settings.demo_workspace_db_id
    return workspace_id if _is_uuid(workspace_id) else None


def _job_status_from_db(status: str) -> str:
    return {
        "succeeded": "complete",
        "queued": "queued",
        "running": "running",
        "failed": "failed",
        "canceled": "canceled",
    }.get(status, status)
