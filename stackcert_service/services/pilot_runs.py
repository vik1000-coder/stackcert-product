from __future__ import annotations

import csv
import json
import uuid
from collections import Counter
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from io import StringIO
from typing import Any

from fastapi import HTTPException, status

from stackcert.cass.certificates import CassEngine
from stackcert.cass.moments import pair_key
from stackcert.cass.scheduler import SchedulerResult, greedy_measurement_plan
from stackcert.cass.welfare import welfare_from_sides
from stackcert.data.importers import infer_guards_from_outputs
from stackcert.data.schemas import Architecture, BenchmarkCell, BenchmarkExample, Guard, GuardOutput, PairStatistics, StackCertificate, WelfareProfile
from stackcert.reporting.json_export import certificate_to_dict
from stackcert.reporting.markdown import render_certificate_markdown
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import MeasurementPlanCreate, UploadedOutputRunCreate
from stackcert_service.services import benchmark_imports
from stackcert_service.services import guard_connectors
from stackcert_service.services import projects
from stackcert_service.services import usage
from stackcert_service.services.display import compact_status, guard_label, stack_label


USD_PER_AGENT_CELL = 18.0
_runs: dict[str, dict[str, Any]] = {}


def create_uploaded_output_run(project_id: str, payload: UploadedOutputRunCreate) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    suite_bundle = benchmark_imports.get_committed_suite_bundle(project_id, payload.benchmark_suite_id)
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    cells = _cells_from_suite(suite_bundle)
    examples = _examples_from_suite(suite_bundle)
    outputs = _parse_outputs(payload.content, payload.format, run_id=run_id)
    guards = _guards_from_outputs(project_id, outputs)

    if len(guards) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload outputs for at least two safety checks")

    try:
        engine = CassEngine(
            guards=guards,
            cells=cells,
            examples=examples,
            outputs=outputs,
            welfare_profile=WelfareProfile(
                name=f"lambda_{payload.lambda_cost:g}",
                lambda_cost=payload.lambda_cost,
                business_rationale="Pilot uploaded-output release evidence profile.",
            ),
            run_id=run_id,
            max_k=payload.max_k,
            rho_prior=payload.rho_prior,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    scheduled = greedy_measurement_plan(engine, budget_fraction=0.5)
    certificate = scheduled.final_engine.build_certificate(measurement_actions=scheduled.actions)
    now = _now()
    run = {
        "id": run_id,
        "project_id": project_id,
        "workspace_id": project["workspace_id"],
        "status": "complete",
        "name": payload.name or "Uploaded-output pilot run",
        "source": "uploaded_outputs",
        "benchmark_suite_id": suite_bundle["suite"]["id"],
        "benchmark_suite_name": suite_bundle["suite"]["name"],
        "created_at": now,
        "completed_at": now,
    }
    _runs[run_id] = {
        "run": run,
        "project": project,
        "suite": suite_bundle["suite"],
        "engine": scheduled.final_engine,
        "scheduled": scheduled,
        "certificate": certificate,
    }
    _persist_bundle(run_id)
    projects.set_project_setup_status(project_id, "evidence_ready")
    usage.record_usage_events(
        project_id,
        {
            "id": f"job_import_{run_id}",
            "run_id": run_id,
            "project_id": project_id,
            "type": "uploaded_outputs_import",
        },
        [
            {
                "provider": "uploaded_outputs",
                "model": "customer_supplied",
                "operation": "uploaded_outputs_import",
                "request_count": len(outputs),
                "input_tokens": 0,
                "output_tokens": 0,
                "estimated_cost_usd": 0.0,
                "actual_cost_usd": 0.0,
                "metadata": {
                    "benchmark_suite_id": suite_bundle["suite"]["id"],
                    "guards": len(guards),
                    "examples": len(examples),
                },
            }
        ],
    )
    return run_summary(run_id)


def create_worker_evaluation_run(
    project_id: str,
    *,
    run_id: str,
    suite_bundle: dict[str, Any],
    examples: list[BenchmarkExample],
    outputs: list[GuardOutput],
    lambda_cost: float = 5.0,
    rho_prior: float = 0.6,
    max_k: int = 2,
    name: str | None = None,
    job_id: str | None = None,
) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if len({output.guard_id for output in outputs}) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evaluate at least two safety checks to compare deployable combinations")

    cells = _cells_for_examples(_cells_from_suite(suite_bundle), examples)
    guards = _guards_from_outputs(project_id, outputs)
    try:
        engine = CassEngine(
            guards=guards,
            cells=cells,
            examples=examples,
            outputs=outputs,
            welfare_profile=WelfareProfile(
                name=f"lambda_{lambda_cost:g}",
                lambda_cost=lambda_cost,
                business_rationale="Worker-produced release evidence profile.",
            ),
            run_id=run_id,
            max_k=max_k,
            rho_prior=rho_prior,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    scheduled = greedy_measurement_plan(engine, budget_fraction=0.5)
    certificate = scheduled.final_engine.build_certificate(measurement_actions=scheduled.actions)
    now = _now()
    run = {
        "id": run_id,
        "project_id": project_id,
        "workspace_id": project["workspace_id"],
        "status": "complete",
        "name": name or "Worker evaluation run",
        "source": "worker_evaluation",
        "benchmark_suite_id": suite_bundle["suite"]["id"],
        "benchmark_suite_name": suite_bundle["suite"]["name"],
        "sampled_example_ids": [example.example_id for example in examples],
        "job_id": job_id,
        "created_at": now,
        "completed_at": now,
    }
    _runs[run_id] = {
        "run": run,
        "project": project,
        "suite": suite_bundle["suite"],
        "engine": scheduled.final_engine,
        "scheduled": scheduled,
        "certificate": certificate,
    }
    _persist_bundle(run_id)
    projects.set_project_setup_status(project_id, "evidence_ready")
    return run_summary(run_id)


def list_project_runs(project_id: str) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return store.list_pilot_runs(project_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return sorted(
        [run_summary(run_id) for run_id, bundle in _runs.items() if bundle["run"]["project_id"] == project_id],
        key=lambda row: row.get("created_at") or "",
        reverse=True,
    )


def has_run(run_id: str) -> bool:
    if run_id in _runs:
        return True
    store = _persistent_store()
    if store:
        try:
            return store.has_pilot_run(run_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return False


def run_summary(run_id: str) -> dict[str, Any]:
    bundle = _bundle(run_id)
    run = bundle["run"]
    engine: CassEngine = bundle["engine"]
    scheduled: SchedulerResult = bundle["scheduled"]
    certificate: StackCertificate = bundle["certificate"]
    return {
        "id": run["id"],
        "project_id": run["project_id"],
        "workspace_id": run["workspace_id"],
        "status": run["status"],
        "k": engine.max_k,
        "rho_prior": engine.rho_prior,
        "lambda_cost": engine.welfare_profile.lambda_cost,
        "examples": len(engine.examples),
        "guards": len(engine.guards),
        "candidate_stacks": len(engine.architectures),
        "benchmark_cells": len(engine.cells),
        "outputs": len(engine.outputs),
        "certificate_id": certificate.certificate_id,
        "certificate_status": compact_status(certificate.status),
        "measurement_actions": len(scheduled.actions),
        "benchmark_suite_id": run.get("benchmark_suite_id"),
        "benchmark_suite_name": run.get("benchmark_suite_name"),
        "created_at": run.get("created_at"),
        "completed_at": run.get("completed_at"),
        "source": run.get("source"),
    }


def overview(run_id: str, lambda_cost: float | None = None) -> dict[str, Any]:
    bundle = _maybe_reweighted_bundle(run_id, lambda_cost)
    engine: CassEngine = bundle["engine"]
    scheduled: SchedulerResult = bundle["scheduled"]
    certificate: StackCertificate = bundle["certificate"]
    ranking_payload = ranking(run_id, lambda_cost)
    recommended = ranking_payload["recommended"]
    marginal = ranking_payload["marginal_winner"]
    marginal_full = next(row["full_welfare"] for row in ranking_payload["rows"] if row["architecture_id"] == marginal["architecture_id"])
    comparisons = certificate.comparisons
    exhaustive_pair_cells = len(engine.all_pairs) * len(engine.cells)
    measured_pair_cells = sum(1 for interval in engine.pair_intervals.values() if interval.measured)
    planned_agent_cells = sum(action.cost_estimate for action in scheduled.actions)
    measurement_cost = planned_agent_cells * USD_PER_AGENT_CELL
    exhaustive_cost = len(engine.guards) * len(engine.cells) * USD_PER_AGENT_CELL
    return {
        "workspace": {"id": bundle["project"]["workspace_id"], "name": "Pilot workspace", "slug": "pilot", "role": "owner", "plan": "team"},
        "project": bundle["project"],
        "run": run_summary(run_id),
        "certificate": {
            "id": certificate.certificate_id,
            "status": compact_status(certificate.status),
            "raw_status": certificate.status,
            "generated_at": certificate.generated_at,
            "scope": "Uploaded-output pilot suite, candidate safety-check set, K=2 serial aggregation.",
            "limitations": list(certificate.limitations),
        },
        "recommended_stack": recommended,
        "marginal_stack": marginal,
        "stats": {
            "welfare": recommended["full_welfare"],
            "welfare_low": recommended["welfare_low"],
            "welfare_high": recommended["welfare_high"],
            "regret_avoided": recommended["full_welfare"] - marginal_full,
            "comparison_count": len(comparisons),
            "certified_comparison_count": sum(1 for comparison in comparisons if comparison.certified),
            "pair_cells_measured": measured_pair_cells,
            "pair_cells_total": exhaustive_pair_cells,
            "measurement_cost_usd": measurement_cost,
            "exhaustive_cost_usd": exhaustive_cost,
            "cost_avoided_usd": max(0.0, exhaustive_cost - measurement_cost),
        },
        "benchmark_mix": [
            {
                "cell_id": cell.cell_id,
                "side": cell.side,
                "source": cell.source,
                "weight": engine.cell_weights[cell.cell_id],
                "examples": cell.metadata.get("example_count", 0),
            }
            for cell in engine.cells
        ],
        "activity": [
            {"kind": "certificate", "message": "Release evidence generated from uploaded safety-check outputs.", "tone": "ok"},
            {"kind": "planner", "message": f"{len(scheduled.actions)} targeted tests remain available if reviewers want tighter intervals.", "tone": "neutral"},
            {"kind": "drift", "message": "Retest when examples, safety checks, prompts, tools, or traffic mix changes.", "tone": "warn"},
        ],
    }


def ranking(run_id: str, lambda_cost: float | None = None) -> dict[str, Any]:
    bundle = _maybe_reweighted_bundle(run_id, lambda_cost)
    engine: CassEngine = bundle["engine"]
    certificate: StackCertificate = bundle["certificate"]
    certified_ids = certificate.certified_architecture.guard_ids if certificate.certified_architecture else ()
    rows = []
    for estimate in sorted(engine.welfare_estimates(), key=lambda item: item.welfare_center, reverse=True):
        arch = estimate.architecture
        first = _first_order_welfare(engine, arch)
        status_value = "open"
        if certified_ids and arch.guard_ids == certified_ids:
            status_value = "certified"
        elif estimate.welfare_high < 0:
            status_value = "negative"
        rows.append(
            {
                "architecture_id": arch.architecture_id,
                "guard_ids": list(arch.guard_ids),
                "label": stack_label(arch.guard_ids),
                "size": arch.size,
                "first_order_welfare": first["welfare"],
                "full_welfare": estimate.welfare_center,
                "welfare_low": estimate.welfare_low,
                "welfare_high": estimate.welfare_high,
                "benign_pass": estimate.benign_pass_center,
                "adversarial_miss": estimate.adversarial_miss_center,
                "movement": estimate.welfare_center - first["welfare"],
                "status": status_value,
                "estimated_latency_ms": sum((guard.latency_ms or 80) for guard in _guards_for_arch(engine, arch)) + 25,
                "estimated_cost_usd_per_1k": round(sum((guard.unit_cost_usd or 0.0002) for guard in _guards_for_arch(engine, arch)) * 1000, 4),
            }
        )
    marginal = max(rows, key=lambda row: row["first_order_welfare"])
    return {
        "run": run_summary(run_id),
        "rows": rows,
        "marginal_winner": marginal,
        "recommended": next(row for row in rows if row["guard_ids"] == list(certificate.recommended_architecture.guard_ids)),
    }


def candidate_stacks(project_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    runs = list_project_runs(project_id)
    if not runs:
        return {"run": None, "stacks": []}
    payload = ranking(runs[0]["id"], lambda_cost)
    return {
        "run": payload["run"],
        "stacks": [
            {
                "architecture_id": row["architecture_id"],
                "guard_ids": row["guard_ids"],
                "label": row["label"],
                "size": row["size"],
                "status": row["status"],
                "estimated_latency_ms": row["estimated_latency_ms"],
                "estimated_cost_usd_per_1k": row["estimated_cost_usd_per_1k"],
            }
            for row in payload["rows"]
        ],
    }


def correlations(run_id: str, lambda_cost: float | None = None, side: str = "adversarial") -> dict[str, Any]:
    if side not in {"adversarial", "benign"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="side must be adversarial or benign")
    bundle = _maybe_reweighted_bundle(run_id, lambda_cost)
    engine: CassEngine = bundle["engine"]
    guard_ids = list(engine.guard_ids)
    matrix: list[list[float]] = []
    for a in guard_ids:
        row: list[float] = []
        for b in guard_ids:
            if a == b:
                row.append(1.0)
                continue
            pair = pair_key(a, b)
            values = [
                engine.cell_weights[cell.cell_id] * engine.pair_statistics[(pair, cell.cell_id)].correlation
                for cell in engine.cells
                if cell.side == side
            ]
            row.append(sum(values))
        matrix.append(row)
    details = [
        _pair_stat_row(stat, side=side)
        for (pair, cell_id), stat in engine.pair_statistics.items()
        if engine.cell_by_id[cell_id].side == side
    ]
    return {
        "run": run_summary(run_id),
        "side": side,
        "guards": [{"id": guard_id, "label": guard_label(guard_id)} for guard_id in guard_ids],
        "matrix": matrix,
        "top_rows": [_pair_stat_row(stat, side=side) for stat in engine.top_cofailure_rows(side=side, limit=12)],
        "details": sorted(details, key=lambda row: (row["metric"], row["correlation"]), reverse=True),
    }


def measurements(run_id: str, lambda_cost: float | None = None) -> dict[str, Any]:
    bundle = _maybe_reweighted_bundle(run_id, lambda_cost)
    engine: CassEngine = bundle["engine"]
    scheduled: SchedulerResult = bundle["scheduled"]
    actions = []
    for index, action in enumerate(scheduled.actions, start=1):
        actions.append(
            {
                "id": action.action_id,
                "priority": index,
                "action_type": action.action_type,
                "guard_ids": list(action.guard_ids),
                "label": stack_label(action.guard_ids),
                "cell_id": action.cell_id,
                "side": engine.cell_by_id[action.cell_id].side,
                "expected_radius_reduction": action.expected_radius_reduction,
                "cost_agent_cells": action.cost_estimate,
                "cost_usd": action.cost_estimate * USD_PER_AGENT_CELL,
                "eta_minutes": max(3, int(round(action.cost_estimate * 4))),
                "status": action.status,
            }
        )
    return {
        "run": run_summary(run_id),
        "actions": actions,
        "summary": {
            "action_count": len(actions),
            "selected_cost_usd": sum(row["cost_usd"] for row in actions),
            "selected_eta_minutes": sum(row["eta_minutes"] for row in actions),
            "total_expected_radius_reduction": sum(row["expected_radius_reduction"] for row in actions),
            "budget_fraction": 0.5,
        },
    }


def create_measurement_plan(run_id: str, payload: MeasurementPlanCreate, lambda_cost: float | None = None) -> dict[str, Any]:
    available = measurements(run_id, lambda_cost)["actions"]
    requested = set(payload.action_ids)
    actions = [action for action in available if not requested or action["id"] in requested]
    if payload.action_ids and not actions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No matching measurement actions")
    selected_cost = round(sum(float(action["cost_usd"]) for action in actions), 4)
    if payload.max_cost_usd is not None and selected_cost > payload.max_cost_usd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected measurement plan costs ${selected_cost:.2f}, above the ${payload.max_cost_usd:.2f} budget cap",
        )
    run = run_summary(run_id)
    now = _now()
    job = {
        "id": f"job_plan_{uuid.uuid4().hex[:12]}",
        "type": "measurement_plan",
        "project_id": run["project_id"],
        "run_id": run_id,
        "status": "queued",
        "created_at": now,
        "updated_at": now,
        "progress": 0.0,
        "summary": {
            "action_count": len(actions),
            "selected_cost_usd": selected_cost,
            "actual_cost_usd": 0.0,
            "selected_eta_minutes": sum(int(action["eta_minutes"]) for action in actions),
            "total_expected_radius_reduction": sum(float(action["expected_radius_reduction"]) for action in actions),
            "budget_cap_usd": payload.max_cost_usd,
        },
        "actions": actions,
        "artifact_preview": [],
        "next_steps": [
            "Run provider-backed measurement workers to tighten this evidence packet.",
            "Recompute the recommendation after new outputs land.",
        ],
    }
    return {
        "id": f"plan_{job['id']}",
        "job": job,
        "status": job["status"],
        "run_id": run_id,
        "summary": job["summary"],
        "actions": actions,
    }


def certificate_payload(run_id: str, lambda_cost: float | None = None) -> dict[str, Any]:
    bundle = _maybe_reweighted_bundle(run_id, lambda_cost)
    engine: CassEngine = bundle["engine"]
    certificate: StackCertificate = bundle["certificate"]
    data = certificate_to_dict(certificate)
    data["status_compact"] = compact_status(certificate.status)
    data["recommended_label"] = stack_label(certificate.recommended_architecture.guard_ids)
    data["certified_label"] = stack_label(certificate.certified_architecture.guard_ids) if certificate.certified_architecture else None
    data["markdown"] = render_certificate_markdown(certificate, engine=engine)
    return data


def certificate_markdown(run_id: str, lambda_cost: float | None = None) -> str:
    bundle = _maybe_reweighted_bundle(run_id, lambda_cost)
    return render_certificate_markdown(bundle["certificate"], engine=bundle["engine"])


def ranking_csv(run_id: str, lambda_cost: float | None = None) -> str:
    payload = ranking(run_id, lambda_cost)
    buffer = StringIO()
    fieldnames = [
        "architecture_id",
        "label",
        "size",
        "first_order_welfare",
        "full_welfare",
        "welfare_low",
        "welfare_high",
        "movement",
        "status",
        "estimated_latency_ms",
        "estimated_cost_usd_per_1k",
    ]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in payload["rows"]:
        writer.writerow({field: row[field] for field in fieldnames})
    return buffer.getvalue()


def drift(project_id: str) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    runs = list_project_runs(project_id)
    run = runs[0] if runs else None
    return {
        "project": project,
        "run": run,
        "signals": [
            {
                "id": "drift_uploaded_suite",
                "kind": "benchmark_suite",
                "severity": "warning",
                "title": "Example suite version watch",
                "description": "Retest if examples, weights, or policy categories change after evidence is issued.",
                "status": "armed" if run else "waiting",
            },
            {
                "id": "drift_guard_outputs",
                "kind": "safety_option_outputs",
                "severity": "warning",
                "title": "Safety-check output watch",
                "description": "Retest if a safety check, threshold, model judge prompt, or endpoint version changes.",
                "status": "armed" if run else "waiting",
            },
        ],
        "history": [
            {"id": f"history_{row['id']}", "status": row["certificate_status"], "run_id": row["id"], "summary": "Uploaded-output evidence run."}
            for row in runs[:5]
        ],
    }


def issue_payload(run_id: str, expires_in_days: int, reviewer_note: str | None = None) -> dict[str, Any]:
    payload = certificate_payload(run_id)
    issued_at = datetime.now(UTC).replace(microsecond=0)
    expires_at = issued_at + timedelta(days=expires_in_days)
    selected_stack_label = payload["certified_label"] or payload["recommended_label"]
    scope = f"project:{_bundle(run_id)['run']['project_id']} run:{run_id} suite:{_bundle(run_id)['suite']['name']}"
    artifact = {
        "certificate_id": payload["certificate_id"],
        "run_id": run_id,
        "status": payload["status_compact"],
        "selected_stack_label": selected_stack_label,
        "scope": scope,
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "limitations": payload["limitations"],
        "assumptions": payload["assumptions"],
        "markdown": payload["markdown"],
    }
    import hashlib

    artifact_hash = hashlib.sha256(json.dumps(artifact, sort_keys=True).encode("utf-8")).hexdigest()
    return {
        "id": payload["certificate_id"],
        "certificate_id": payload["certificate_id"],
        "project_id": _bundle(run_id)["run"]["project_id"],
        "run_id": run_id,
        "status": payload["status_compact"],
        "selected_stack_label": selected_stack_label,
        "scope": scope,
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "artifact_hash": artifact_hash,
        "limitations": payload["limitations"],
        "summary": {
            "run_id": run_id,
            "recommended_label": payload["recommended_label"],
            "certified_label": payload["certified_label"],
            "lambda_cost": payload["welfare_profile"]["lambda_cost"],
            "not_a_guarantee": True,
            "acknowledged_limitations": True,
            "reviewer_note": reviewer_note or "",
        },
        "signoffs": [],
    }


def clear_runs() -> None:
    _runs.clear()


def _persist_bundle(run_id: str) -> None:
    store = _persistent_store()
    if not store:
        return
    bundle = _bundle(run_id)
    try:
        store.store_pilot_run(
            bundle["run"]["project_id"],
            bundle["run"],
            run_summary(run_id),
            [_output_to_store_row(output) for output in bundle["engine"].outputs],
            measurements(run_id)["actions"],
            certificate_payload(run_id),
        )
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


def _load_persisted_bundle(run_id: str) -> None:
    store = _persistent_store()
    if not store:
        return
    try:
        source = store.get_pilot_run_source(run_id)
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not source:
        return
    _runs[run_id] = _bundle_from_source(source)


def _bundle_from_source(source: dict[str, Any]) -> dict[str, Any]:
    run = source["run"]
    suite_bundle = source["suite_bundle"]
    outputs = [_output_from_store_row(row) for row in source["outputs"]]
    examples = _examples_from_suite(suite_bundle)
    sampled_ids = set(run.get("sampled_example_ids") or [])
    if sampled_ids:
        examples = [example for example in examples if example.example_id in sampled_ids]
    cells = _cells_for_examples(_cells_from_suite(suite_bundle), examples)
    guards = _guards_from_outputs(run["project_id"], outputs)
    engine = CassEngine(
        guards=guards,
        cells=cells,
        examples=examples,
        outputs=outputs,
        welfare_profile=WelfareProfile(
            name=f"lambda_{float(run.get('lambda_cost') or 5.0):g}",
            lambda_cost=float(run.get("lambda_cost") or 5.0),
            business_rationale="Pilot uploaded-output release evidence profile.",
        ),
        run_id=run["id"],
        max_k=int(run.get("k") or 2),
        rho_prior=float(run.get("rho_prior") or 0.6),
    )
    scheduled = greedy_measurement_plan(engine, budget_fraction=0.5)
    return {
        "run": run,
        "project": source["project"],
        "suite": suite_bundle["suite"],
        "engine": scheduled.final_engine,
        "scheduled": scheduled,
        "certificate": scheduled.final_engine.build_certificate(measurement_actions=scheduled.actions),
    }


def _output_to_store_row(output: GuardOutput) -> dict[str, Any]:
    return {
        "run_id": output.run_id,
        "example_id": output.example_id,
        "guard_id": output.guard_id,
        "pass_probability": output.pass_probability,
        "block_probability": output.block_probability,
        "binary_pass": output.binary_pass,
        "raw_score": output.raw_score,
        "metadata": output.output_metadata,
        "error": output.error,
    }


def _output_from_store_row(row: dict[str, Any]) -> GuardOutput:
    return GuardOutput(
        run_id=row["run_id"],
        example_id=row["example_id"],
        guard_id=row["guard_id"],
        pass_probability=float(row["pass_probability"]),
        block_probability=float(row["block_probability"]),
        binary_pass=bool(row["binary_pass"]),
        raw_score=float(row["raw_score"]) if row.get("raw_score") is not None else None,
        output_metadata=row.get("metadata") or {},
        error=row.get("error"),
    )


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


def _bundle(run_id: str) -> dict[str, Any]:
    if run_id not in _runs:
        _load_persisted_bundle(run_id)
    if run_id not in _runs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return _runs[run_id]


def _maybe_reweighted_bundle(run_id: str, lambda_cost: float | None) -> dict[str, Any]:
    bundle = _bundle(run_id)
    if lambda_cost is None or abs(float(lambda_cost) - float(bundle["engine"].welfare_profile.lambda_cost)) < 1e-9:
        return bundle
    engine: CassEngine = bundle["engine"]
    reweighted = CassEngine(
        guards=engine.guards,
        cells=engine.cells,
        examples=engine.examples,
        outputs=engine.outputs,
        welfare_profile=replace(engine.welfare_profile, name=f"lambda_{float(lambda_cost):g}", lambda_cost=float(lambda_cost)),
        run_id=run_id,
        max_k=engine.max_k,
        rho_prior=engine.rho_prior,
        measured_pairs=set(engine.measured_pairs),
    )
    scheduled = greedy_measurement_plan(reweighted, budget_fraction=0.5)
    return {
        **bundle,
        "engine": scheduled.final_engine,
        "scheduled": scheduled,
        "certificate": scheduled.final_engine.build_certificate(measurement_actions=scheduled.actions),
    }


def _cells_from_suite(bundle: dict[str, Any]) -> list[BenchmarkCell]:
    return [
        BenchmarkCell(
            cell_id=cell["cell_id"],
            side=cell["side"],
            source=cell.get("source") or "custom_import",
            weight=float(cell.get("weight") or 1.0),
            policy_category=cell.get("policy_category"),
            metadata={"example_count": int(cell.get("examples") or 0), "suite_id": bundle["suite"]["id"]},
        )
        for cell in bundle["cells"]
    ]


def _cells_for_examples(cells: list[BenchmarkCell], examples: list[BenchmarkExample]) -> list[BenchmarkCell]:
    counts = Counter(example.cell_id for example in examples)
    return [
        replace(cell, metadata={**cell.metadata, "example_count": counts[cell.cell_id]})
        for cell in cells
        if counts.get(cell.cell_id, 0) > 0
    ]


def _examples_from_suite(bundle: dict[str, Any]) -> list[BenchmarkExample]:
    return [
        BenchmarkExample(
            example_id=example["external_id"],
            cell_id=example["cell_id"],
            prompt_hash=example["prompt_hash"],
            prompt_redacted=example.get("prompt_redacted"),
            metadata=example.get("metadata") or {},
        )
        for example in bundle["examples"]
    ]


def _guards_from_outputs(project_id: str, outputs: list[GuardOutput]) -> list[Guard]:
    inferred = {guard.guard_id: guard for guard in infer_guards_from_outputs(outputs, default_type="uploaded_outputs")}
    connectors = guard_connectors.list_connectors(project_id)
    by_key: dict[str, dict[str, Any]] = {}
    for connector in connectors:
        by_key[str(connector.get("guard_key") or connector.get("id"))] = connector
        by_key[str(connector.get("id"))] = connector
    guards: list[Guard] = []
    for guard_id, guard in sorted(inferred.items()):
        connector = by_key.get(guard_id)
        if connector:
            guards.append(
                Guard(
                    guard_id=guard_id,
                    name=str(connector.get("display_name") or connector.get("label") or guard_id),
                    version=str(connector.get("version") or "uploaded"),
                    guard_type=str(connector.get("guard_type") or connector.get("type") or "uploaded_outputs"),
                    vendor=connector.get("vendor"),
                    threshold=connector.get("threshold"),
                    latency_ms=float(connector.get("latency_ms") or 80),
                    unit_cost_usd=float(connector.get("unit_cost_usd") or 0.0002),
                    metadata={"source": "uploaded_outputs"},
                )
            )
        else:
            guards.append(replace(guard, guard_type="uploaded_outputs", latency_ms=80, unit_cost_usd=0.0002))
    return guards


def _parse_outputs(content: str, requested_format: str, *, run_id: str) -> list[GuardOutput]:
    rows = _parse_rows(content, requested_format)
    outputs = [_output_from_row(row, run_id=run_id, index=index) for index, row in enumerate(rows, start=1)]
    if not outputs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded output file has no rows")
    return outputs


def _parse_rows(content: str, requested_format: str) -> list[dict[str, Any]]:
    resolved = requested_format
    stripped = content.strip()
    if requested_format == "auto":
        resolved = "jsonl" if stripped.startswith("{") else "csv"
    if resolved == "jsonl":
        rows: list[dict[str, Any]] = []
        for line_number, line in enumerate(stripped.splitlines(), start=1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Output JSONL line {line_number} is invalid: {exc.msg}") from exc
            if not isinstance(row, dict):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Output JSONL line {line_number} must be an object")
            rows.append(row)
        return rows
    reader = csv.DictReader(StringIO(stripped))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Output CSV is missing a header row")
    return [dict(row) for row in reader]


def _output_from_row(row: dict[str, Any], *, run_id: str, index: int) -> GuardOutput:
    example_id = str(row.get("example_id") or row.get("external_example_id") or "").strip()
    guard_id = str(row.get("guard_id") or row.get("guard_key") or row.get("agent_id") or "").strip()
    if not example_id or not guard_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Output row {index} must include example_id and guard_id")

    if row.get("binary_pass") is not None and str(row.get("binary_pass")).strip() != "":
        binary_pass = _bool(row["binary_pass"])
    elif row.get("block_decision") is not None and str(row.get("block_decision")).strip() != "":
        binary_pass = not _bool(row["block_decision"])
    elif row.get("binary_block") is not None and str(row.get("binary_block")).strip() != "":
        binary_pass = not _bool(row["binary_block"])
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Output row {index} must include binary_pass, binary_block, or block_decision")

    if row.get("block_probability") not in {None, ""}:
        block_probability = _probability(row["block_probability"], index=index, field="block_probability")
    elif row.get("block_score_raw") not in {None, ""}:
        block_probability = _probability(row["block_score_raw"], index=index, field="block_score_raw")
    else:
        block_probability = 0.0 if binary_pass else 1.0
    pass_probability = _probability(row.get("pass_probability", 1.0 - block_probability), index=index, field="pass_probability")
    return GuardOutput(
        run_id=run_id,
        example_id=example_id,
        guard_id=guard_id,
        pass_probability=pass_probability,
        block_probability=block_probability,
        binary_pass=binary_pass,
        raw_score=float(row["raw_score"]) if row.get("raw_score") not in {None, ""} else None,
        output_metadata={key: value for key, value in row.items() if key not in {"raw_output"}},
        error=str(row["error"]) if row.get("error") else None,
    )


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "pass", "passed", "allow", "allowed"}:
        return True
    if normalized in {"0", "false", "no", "n", "fail", "failed", "block", "blocked"}:
        return False
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not parse boolean value: {value!r}")


def _probability(value: Any, *, index: int, field: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Output row {index} has invalid {field}") from exc
    return max(0.0, min(1.0, parsed))


def _first_order_welfare(engine: CassEngine, architecture: Architecture) -> dict[str, float]:
    benign = 0.0
    adversarial = 0.0
    for cell in engine.cells:
        pass_rate = engine.product_of_means(architecture, cell.cell_id)
        if cell.side == "benign":
            benign += engine.cell_weights[cell.cell_id] * pass_rate
        else:
            adversarial += engine.cell_weights[cell.cell_id] * pass_rate
    return {
        "welfare": welfare_from_sides(benign, adversarial, engine.welfare_profile.lambda_cost),
        "benign_pass": benign,
        "adversarial_miss": adversarial,
    }


def _guards_for_arch(engine: CassEngine, architecture: Architecture) -> list[Guard]:
    by_id = {guard.guard_id: guard for guard in engine.guards}
    return [by_id[guard_id] for guard_id in architecture.guard_ids]


def _pair_stat_row(stat: PairStatistics, *, side: str) -> dict[str, Any]:
    metric = stat.both_pass_rate if side == "adversarial" else stat.both_block_rate
    return {
        "cell_id": stat.cell_id,
        "guard_ids": [stat.guard_id_a, stat.guard_id_b],
        "label": stack_label((stat.guard_id_a, stat.guard_id_b)),
        "correlation": stat.correlation,
        "metric": metric,
        "metric_label": "co-miss rate" if side == "adversarial" else "false-block overlap",
        "both_pass_rate": stat.both_pass_rate,
        "both_block_rate": stat.both_block_rate,
        "disagreement_rate": stat.disagreement_rate,
        "n_examples": stat.n_examples,
    }


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()
