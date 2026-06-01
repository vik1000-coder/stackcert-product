from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.services import benchmark_imports
from stackcert_service.services import certificates
from stackcert_service.services import demo_project
from stackcert_service.services import guard_connectors
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects


FIRST_EVIDENCE_STAGE_COUNT = 5


def project_pilot_readiness(project_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    suites = _benchmark_suites(project_id, lambda_cost)
    connectors = guard_connectors.list_connectors(project_id, lambda_cost)
    runs = _project_runs(project_id, lambda_cost)
    latest_run = runs[0] if runs else None
    latest_readiness = _evidence_readiness(latest_run, lambda_cost)

    examples = _suite_example_count(suites)
    suite_cells = _suite_cell_count(suites)
    connector_count = len([item for item in connectors if str(item.get("status") or "") != "draft"])
    run_guard_count = int((latest_run or {}).get("guards") or 0)
    safety_option_count = max(connector_count, run_guard_count)
    completed_run = bool(latest_run and str(latest_run.get("status") or "") in {"complete", "completed", "succeeded"})
    evidence_can_issue = bool(latest_readiness and latest_readiness.get("can_issue"))

    stages = [
        _stage(
            "project",
            "Create the app record",
            "complete",
            "The workspace and LLM app are in StackCert.",
            "Open app setup",
            "setup",
            {"workspace_id": project["workspace_id"], "project_name": project["name"]},
            counts_as_progress=True,
        ),
        _stage(
            "example_suite",
            "Load app examples",
            "complete" if examples else "active",
            "Commit representative normal and risky examples before comparing safety options.",
            "Import examples",
            "setup#import-examples",
            {"suites": len(suites), "examples": examples, "cells": suite_cells},
            counts_as_progress=True,
        ),
        _stage(
            "safety_options",
            "Define safety options",
            "complete" if safety_option_count >= 2 else ("active" if examples else "blocked"),
            "Register connectors or upload outputs for at least two safety checks.",
            "Add safety options",
            "setup#safety-options",
            {"configured_options": safety_option_count, "connector_records": connector_count},
            blockers=[] if examples else ["Load examples first so options can be evaluated against the same suite."],
            counts_as_progress=True,
        ),
        _stage(
            "evidence_run",
            "Create the first test run",
            "complete" if completed_run else ("active" if examples and safety_option_count >= 2 else "blocked"),
            "Run deterministic, uploaded-output, REST, or model-judge checks to produce comparable outputs.",
            "Run or upload outputs",
            "setup#run-evidence",
            {
                "latest_run_id": (latest_run or {}).get("id"),
                "latest_run_status": (latest_run or {}).get("status"),
                "outputs": int((latest_run or {}).get("outputs") or 0),
            },
            blockers=[] if examples and safety_option_count >= 2 else ["Load examples and define at least two safety options first."],
            counts_as_progress=True,
        ),
        _stage(
            "evidence_review",
            "Review scoped release report",
            "complete" if evidence_can_issue else ("active" if completed_run else "blocked"),
            "Inspect readiness checks, limitations, and the recommendation before using it in a release decision.",
            "Open release report",
            "certificate",
            {
                "run_id": (latest_run or {}).get("id"),
                "certificate_id": (latest_run or {}).get("certificate_id"),
                "certificate_status": (latest_run or {}).get("certificate_status"),
                "readiness_status": (latest_readiness or {}).get("status"),
                "blockers": (latest_readiness or {}).get("blockers", []),
                "warnings": (latest_readiness or {}).get("warnings", []),
            },
            blockers=[item["message"] for item in (latest_readiness or {}).get("blockers", [])],
            counts_as_progress=True,
        ),
        _stage(
            "deployment_gate",
            "Wire a release gate",
            "active" if evidence_can_issue else "blocked",
            "Use the release-gate endpoint from CI or an agent workflow to verify report status and context before deployment.",
            "Open gate templates",
            "/docs",
            {
                "endpoint": f"/api/projects/{project_id}/release-gates/evaluate",
                "requires_machine_token": True,
                "context_fields": ["model_id", "model_version", "prompt_hash", "policy_hash", "benchmark_suite_id"],
            },
            blockers=[] if evidence_can_issue else ["Review the scoped release report first; gates should not run on incomplete reports."],
            counts_as_progress=False,
        ),
    ]

    completed_required = sum(1 for item in stages if item["counts_as_progress"] and item["status"] == "complete")
    next_stage = next((item for item in stages if item["status"] != "complete"), stages[-1])
    status_value = _readiness_status(completed_required, next_stage)
    return {
        "project_id": project_id,
        "workspace_id": project["workspace_id"],
        "status": status_value,
        "progress": {
            "completed": completed_required,
            "total": FIRST_EVIDENCE_STAGE_COUNT,
            "percent": round(completed_required / FIRST_EVIDENCE_STAGE_COUNT, 2),
        },
        "next_step": {
            key: value
            for key, value in next_stage.items()
            if key in {"id", "label", "status", "description", "action_label", "action_href", "blockers"}
        },
        "stages": stages,
        "summary": {
            "project_name": project["name"],
            "setup_status": project.get("setup_status"),
            "suites": len(suites),
            "examples": examples,
            "suite_cells": suite_cells,
            "safety_options": safety_option_count,
            "connector_records": connector_count,
            "runs": len(runs),
            "latest_run_id": (latest_run or {}).get("id"),
            "latest_certificate_status": (latest_run or {}).get("certificate_status"),
        },
        "trust_boundary": {
            "not_a_guarantee": True,
            "plain_language": "A StackCert release report can reduce release risk for this app and this test scope; it cannot guarantee broad model safety.",
            "can_claim": [
                "The configured safety options were compared on the committed app example mix.",
                "The recommendation reflects measured outputs, overlap checks, release goal weighting, and configured costs.",
                "Release gates can check report status and release-context fields before deployment.",
            ],
            "cannot_claim": [
                "That the model is safe in every setting.",
                "That untested prompts, tools, policies, retrieval changes, or traffic shifts are covered.",
                "That representative examples are complete without human review from the app owner.",
            ],
            "recertification_required_on": [
                "model_change",
                "prompt_or_policy_change",
                "safety_option_version_change",
                "tool_or_retrieval_config_change",
                "traffic_mix_drift",
                "new_attack_family",
            ],
        },
    }


def _benchmark_suites(project_id: str, lambda_cost: float) -> list[dict[str, Any]]:
    committed = benchmark_imports.list_committed_suites(project_id)
    if project_id != settings.demo_project_id:
        return committed
    seeded = demo_project.benchmark_suites(lambda_cost)["suites"]
    return committed + seeded


def _project_runs(project_id: str, lambda_cost: float) -> list[dict[str, Any]]:
    runs = pilot_runs.list_project_runs(project_id)
    if project_id != settings.demo_project_id:
        return runs
    demo_run = demo_project.run_summary(lambda_cost)
    persisted_runs = [run for run in runs if run["id"] != demo_run["id"]]
    return persisted_runs + [demo_run]


def _evidence_readiness(latest_run: dict[str, Any] | None, lambda_cost: float) -> dict[str, Any] | None:
    if not latest_run:
        return None
    try:
        return certificates.evidence_readiness(str(latest_run["id"]), lambda_cost)
    except HTTPException:
        return None


def _suite_example_count(suites: list[dict[str, Any]]) -> int:
    return sum(int(cell.get("examples") or 0) for suite in suites for cell in suite.get("cells", []))


def _suite_cell_count(suites: list[dict[str, Any]]) -> int:
    return sum(len(suite.get("cells", [])) for suite in suites)


def _stage(
    stage_id: str,
    label: str,
    status_value: str,
    description: str,
    action_label: str,
    action_href: str,
    details: dict[str, Any],
    *,
    blockers: list[str] | None = None,
    counts_as_progress: bool,
) -> dict[str, Any]:
    return {
        "id": stage_id,
        "label": label,
        "status": status_value,
        "description": description,
        "action_label": action_label,
        "action_href": action_href,
        "details": details,
        "blockers": blockers or [],
        "counts_as_progress": counts_as_progress,
    }


def _readiness_status(completed_required: int, next_stage: dict[str, Any]) -> str:
    if completed_required >= FIRST_EVIDENCE_STAGE_COUNT:
        return "ready_for_release_gate"
    if next_stage["id"] == "example_suite":
        return "needs_examples"
    if next_stage["id"] == "safety_options":
        return "needs_safety_options"
    if next_stage["id"] == "evidence_run":
        return "needs_evidence_run"
    if next_stage["id"] == "evidence_review":
        return "needs_evidence_review"
    return "in_progress"
