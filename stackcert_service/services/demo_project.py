from __future__ import annotations

import csv
import json
import os
from dataclasses import asdict, replace
from functools import lru_cache
from io import StringIO
from pathlib import Path
from threading import RLock
from typing import Any

from fastapi import HTTPException, status

from stackcert.cass.methodology import cass_methodology, cass_scope_text
from stackcert.cass.moments import pair_key
from stackcert.cass.old_cass import OldCassEngine as CassEngine
from stackcert.cass.scheduler import SchedulerResult, greedy_measurement_plan
from stackcert.cass.welfare import welfare_from_sides
from stackcert.data.importers import infer_guards_from_outputs, load_examples_jsonl, load_guard_outputs_jsonl
from stackcert.data.schemas import Architecture, PairStatistics, StackCertificate, WelfareProfile
from stackcert.reporting.json_export import certificate_to_dict
from stackcert.reporting.markdown import render_certificate_markdown
from stackcert_service.config import settings
from stackcert_service.services.display import GUARD_TYPES, compact_status, guard_label, stack_label


USD_PER_AGENT_CELL = 120.0
FIXTURE_EXAMPLES_PATH = settings.product_root / "demo_data" / "examples_fixture.jsonl"
FIXTURE_OUTPUTS_PATH = settings.product_root / "demo_data" / "outputs_fixture.jsonl"
FIXTURE_WEIGHTS_PATH = settings.product_root / "demo_data" / "weights_fixture.json"
PACKAGED_EXAMPLES_PATH = settings.product_root / "demo_data" / "examples_real_main_2000.jsonl"
PACKAGED_OUTPUTS_PATH = settings.product_root / "demo_data" / "real_main_2000_8agent_outputs.jsonl"
PACKAGED_WEIGHTS_PATH = settings.product_root / "demo_data" / "cass_real.json"
_demo_bundle_locks_guard = RLock()
_demo_bundle_locks: dict[float, RLock] = {}


def _demo_artifact_paths() -> tuple[Path, Path, Path | None, str]:
    env_configured = "STACKCERT_DEMO_EXAMPLES" in os.environ or "STACKCERT_DEMO_OUTPUTS" in os.environ
    if settings.demo_examples_path.exists() and settings.demo_outputs_path.exists():
        weights_path: Path | None = settings.demo_weights_path if settings.demo_weights_path.exists() else None
        return settings.demo_examples_path, settings.demo_outputs_path, weights_path, "research"

    if env_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configured demo artifacts are unavailable. Check STACKCERT_DEMO_EXAMPLES and STACKCERT_DEMO_OUTPUTS.",
        )

    if PACKAGED_EXAMPLES_PATH.exists() and PACKAGED_OUTPUTS_PATH.exists():
        weights_path = PACKAGED_WEIGHTS_PATH if PACKAGED_WEIGHTS_PATH.exists() else None
        return PACKAGED_EXAMPLES_PATH, PACKAGED_OUTPUTS_PATH, weights_path, "research"

    if FIXTURE_EXAMPLES_PATH.exists() and FIXTURE_OUTPUTS_PATH.exists():
        weights_path = FIXTURE_WEIGHTS_PATH if FIXTURE_WEIGHTS_PATH.exists() else None
        return FIXTURE_EXAMPLES_PATH, FIXTURE_OUTPUTS_PATH, weights_path, "fixture"

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Demo artifacts are not available. Set STACKCERT_DEMO_EXAMPLES and STACKCERT_DEMO_OUTPUTS.",
    )


def _load_cells_examples_outputs(lambda_cost: float) -> tuple[CassEngine, SchedulerResult, StackCertificate]:
    examples_path, outputs_path, weights_path, source_kind = _demo_artifact_paths()
    cells, examples = load_examples_jsonl(examples_path, retain_prompt_text=False)
    if weights_path:
        config = json.loads(weights_path.read_text(encoding="utf-8"))
        weights = config.get("benchmark_weights", {})
        cells = [replace(cell, weight=float(weights.get(cell.cell_id, cell.weight))) for cell in cells]
    cells = [replace(cell, metadata={**cell.metadata, "artifact_source": source_kind}) for cell in cells]
    outputs = load_guard_outputs_jsonl(outputs_path, run_id=settings.demo_run_id)
    guards = [
        replace(guard, name=guard_label(guard.guard_id), guard_type=GUARD_TYPES.get(guard.guard_id, guard.guard_type))
        for guard in infer_guards_from_outputs(outputs)
    ]
    profile = WelfareProfile(
        name=f"lambda_{lambda_cost:g}",
        lambda_cost=lambda_cost,
        business_rationale="High-safety launch profile for guardrail-stack certification.",
    )
    engine = CassEngine(
        guards=guards,
        cells=cells,
        examples=examples,
        outputs=outputs,
        welfare_profile=profile,
        run_id=settings.demo_run_id,
        rho_prior=0.6,
    )
    scheduled = greedy_measurement_plan(engine, budget_fraction=0.5)
    certificate = scheduled.final_engine.build_certificate(measurement_actions=scheduled.actions)
    return scheduled.final_engine, scheduled, certificate


@lru_cache(maxsize=8)
def _cached_demo_bundle(lambda_cost: float = 5.0) -> tuple[CassEngine, SchedulerResult, StackCertificate]:
    return _load_cells_examples_outputs(float(lambda_cost))


def _demo_bundle_lock(lambda_cost: float) -> RLock:
    with _demo_bundle_locks_guard:
        return _demo_bundle_locks.setdefault(lambda_cost, RLock())


def demo_bundle(lambda_cost: float = 5.0) -> tuple[CassEngine, SchedulerResult, StackCertificate]:
    key = float(lambda_cost)
    with _demo_bundle_lock(key):
        return _cached_demo_bundle(key)


def _clear_demo_bundle_cache() -> None:
    with _demo_bundle_locks_guard:
        _demo_bundle_locks.clear()
    _cached_demo_bundle.cache_clear()


demo_bundle.cache_clear = _clear_demo_bundle_cache  # type: ignore[attr-defined]
demo_bundle.cache_info = _cached_demo_bundle.cache_info  # type: ignore[attr-defined]


def workspace() -> dict[str, Any]:
    return {
        "id": settings.demo_workspace_id,
        "name": "StackCert Labs Demo",
        "slug": "demo",
        "role": "owner",
        "plan": "team",
    }


def project() -> dict[str, Any]:
    return {
        "id": settings.demo_project_id,
        "workspace_id": settings.demo_workspace_id,
        "slug": "acme-copilot",
        "name": "Acme Copilot",
        "environment": "production",
        "risk_tier": "high",
        "data_mode": "redacted_snippets",
        "description": "Seeded guardrail-stack certification run over the CASS 2,000-example benchmark mixture.",
    }


def benchmark_suites(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, _, _ = demo_bundle(lambda_cost)
    source_kind = str(engine.cells[0].metadata.get("artifact_source", "research")) if engine.cells else "research"
    return {
        "suites": [
            {
                "id": "suite_cass_seeded_demo",
                "project_id": settings.demo_project_id,
                "name": "CASS seeded benchmark mixture",
                "version": settings.demo_run_id if source_kind == "research" else "fixture_v1",
                "status": "validated",
                "source": source_kind,
                "cells": [
                    {
                        "cell_id": cell.cell_id,
                        "side": cell.side,
                        "source": cell.source,
                        "policy_category": cell.policy_category,
                        "weight": engine.cell_weights[cell.cell_id],
                        "examples": cell.metadata.get("example_count", 0),
                    }
                    for cell in engine.cells
                ],
            }
        ]
    }


def guard_registry(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, _, _ = demo_bundle(lambda_cost)
    return {
        "guards": [
            {
                "id": guard.guard_id,
                "label": guard_label(guard.guard_id),
                "name": guard.name,
                "type": guard.guard_type,
                "version": guard.version,
                "latency_ms": guard.latency_ms or 85,
                "unit_cost_usd": guard.unit_cost_usd or 0.0002,
                "status": "available",
            }
            for guard in engine.guards
        ]
    }


def candidate_stacks(lambda_cost: float = 5.0) -> dict[str, Any]:
    payload = ranking(lambda_cost)
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


def run_summary(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, scheduled, certificate = demo_bundle(lambda_cost)
    return {
        "id": settings.demo_run_id,
        "project_id": settings.demo_project_id,
        "workspace_id": settings.demo_workspace_id,
        "status": "complete",
        "k": 2,
        "rho_prior": engine.rho_prior,
        "lambda_cost": lambda_cost,
        "examples": len(engine.examples),
        "guards": len(engine.guards),
        "candidate_stacks": len(engine.architectures),
        "benchmark_cells": len(engine.cells),
        "outputs": len(engine.outputs),
        "certificate_id": certificate.certificate_id,
        "certificate_status": compact_status(certificate.status),
        "measurement_actions": len(scheduled.actions),
        "methodology": cass_methodology(max_k=engine.max_k, rho_prior=engine.rho_prior),
    }


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


def ranking(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, _, certificate = demo_bundle(lambda_cost)
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
                "estimated_latency_ms": 85 * arch.size + 25,
                "estimated_cost_usd_per_1k": round(0.18 * arch.size + (0.05 if arch.size == 2 else 0.0), 4),
            }
        )
    marginal = max(rows, key=lambda row: row["first_order_welfare"])
    return {
        "run": run_summary(lambda_cost),
        "rows": rows,
        "marginal_winner": marginal,
        "recommended": next(row for row in rows if row["guard_ids"] == list(certificate.recommended_architecture.guard_ids)),
    }


def overview(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, scheduled, certificate = demo_bundle(lambda_cost)
    ranking_payload = ranking(lambda_cost)
    recommended = ranking_payload["recommended"]
    marginal = ranking_payload["marginal_winner"]
    regret_avoided = recommended["full_welfare"] - next(
        row["full_welfare"] for row in ranking_payload["rows"] if row["architecture_id"] == marginal["architecture_id"]
    )
    comparisons = certificate.comparisons
    certified_comparisons = sum(1 for comparison in comparisons if comparison.certified)
    exhaustive_pair_cells = len(engine.all_pairs) * len(engine.cells)
    measured_pair_cells = sum(1 for interval in engine.pair_intervals.values() if interval.measured)
    planned_agent_cells = sum(action.cost_estimate for action in scheduled.actions)
    measurement_cost = planned_agent_cells * USD_PER_AGENT_CELL
    exhaustive_cost = len(engine.guards) * len(engine.cells) * USD_PER_AGENT_CELL
    return {
        "workspace": workspace(),
        "project": project(),
        "run": run_summary(lambda_cost),
        "certificate": {
            "id": certificate.certificate_id,
            "status": compact_status(certificate.status),
            "raw_status": certificate.status,
            "generated_at": certificate.generated_at,
            "scope": cass_scope_text(evidence_source="demo"),
            "limitations": list(certificate.limitations),
        },
        "recommended_stack": recommended,
        "marginal_stack": marginal,
        "stats": {
            "welfare": recommended["full_welfare"],
            "welfare_low": recommended["welfare_low"],
            "welfare_high": recommended["welfare_high"],
            "regret_avoided": regret_avoided,
            "comparison_count": len(comparisons),
            "certified_comparison_count": certified_comparisons,
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
            {"kind": "certificate", "message": "CASS evidence generated; old_cass interval layer recorded for audit.", "tone": "ok"},
            {
                "kind": "planner",
                "message": f"{len(scheduled.actions)} measurement actions selected by bundle-greedy planner.",
                "tone": "neutral",
            },
            {"kind": "drift", "message": "Certificate will require recertification on guard/model/prompt drift.", "tone": "warn"},
        ],
    }


def correlations(lambda_cost: float = 5.0, side: str = "adversarial") -> dict[str, Any]:
    engine, _, _ = demo_bundle(lambda_cost)
    if side not in {"adversarial", "benign"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="side must be adversarial or benign")

    guard_ids = list(engine.guard_ids)
    matrix: list[list[float]] = []
    for a in guard_ids:
        row: list[float] = []
        for b in guard_ids:
            if a == b:
                row.append(1.0)
                continue
            pair = pair_key(a, b)
            values = []
            for cell in engine.cells:
                if cell.side != side:
                    continue
                stats = engine.pair_statistics[(pair, cell.cell_id)]
                values.append(engine.cell_weights[cell.cell_id] * stats.correlation)
            row.append(sum(values))
        matrix.append(row)

    top_rows = []
    for stat in engine.top_cofailure_rows(side=side, limit=12):
        top_rows.append(_pair_stat_row(stat, side=side))

    details = []
    for (pair, cell_id), stat in engine.pair_statistics.items():
        cell = engine.cell_by_id[cell_id]
        if cell.side == side:
            details.append(_pair_stat_row(stat, side=side))
    return {
        "run": run_summary(lambda_cost),
        "side": side,
        "guards": [{"id": guard_id, "label": guard_label(guard_id)} for guard_id in guard_ids],
        "matrix": matrix,
        "top_rows": top_rows,
        "details": sorted(details, key=lambda row: (row["metric"], row["correlation"]), reverse=True),
    }


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


def measurements(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, scheduled, _ = demo_bundle(lambda_cost)
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
    selected_cost = sum(row["cost_usd"] for row in actions)
    return {
        "run": run_summary(lambda_cost),
        "actions": actions,
        "summary": {
            "action_count": len(actions),
            "selected_cost_usd": selected_cost,
            "selected_eta_minutes": sum(row["eta_minutes"] for row in actions),
            "total_expected_radius_reduction": sum(row["expected_radius_reduction"] for row in actions),
            "budget_fraction": 0.5,
        },
    }


def certificate_payload(lambda_cost: float = 5.0) -> dict[str, Any]:
    engine, _, certificate = demo_bundle(lambda_cost)
    data = certificate_to_dict(certificate)
    data["status_compact"] = compact_status(certificate.status)
    data["recommended_label"] = stack_label(certificate.recommended_architecture.guard_ids)
    data["certified_label"] = (
        stack_label(certificate.certified_architecture.guard_ids) if certificate.certified_architecture else None
    )
    data["markdown"] = render_certificate_markdown(certificate, engine=engine)
    return data


def certificate_markdown(lambda_cost: float = 5.0) -> str:
    engine, _, certificate = demo_bundle(lambda_cost)
    return render_certificate_markdown(certificate, engine=engine)


def ranking_csv(lambda_cost: float = 5.0) -> str:
    payload = ranking(lambda_cost)
    buffer = StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
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
        ],
    )
    writer.writeheader()
    for row in payload["rows"]:
        writer.writerow({field: row[field] for field in writer.fieldnames})
    return buffer.getvalue()


def drift(lambda_cost: float = 5.0) -> dict[str, Any]:
    run = run_summary(lambda_cost)
    return {
        "project": project(),
        "run": run,
        "signals": [
            {
                "id": "drift_guard_version",
                "kind": "guard_version",
                "severity": "warning",
                "title": "Guard version watch",
                "description": "Recertify when guard model, policy prompt, threshold, or endpoint version changes.",
                "status": "armed",
            },
            {
                "id": "drift_traffic_mix",
                "kind": "traffic_mix",
                "severity": "warning",
                "title": "Traffic mixture watch",
                "description": "Recertify when production traffic diverges from the certified benchmark mixture.",
                "status": "armed",
            },
            {
                "id": "drift_attack_family",
                "kind": "attack_family",
                "severity": "critical",
                "title": "New attack family",
                "description": "A new benchmark cell or incident class should invalidate stale certificates.",
                "status": "armed",
            },
        ],
        "history": [
            {
                "id": "recert_demo_001",
                "status": run["certificate_status"],
                "run_id": run["id"],
                "summary": "Seeded demo run generated from the sample evidence matrix with old_cass audit accounting.",
            }
        ],
    }
