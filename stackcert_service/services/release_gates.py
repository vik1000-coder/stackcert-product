from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.schemas import ReleaseGateEvaluateRequest
from stackcert_service.services import guard_connectors
from stackcert_service.services import mcp
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects


STATUS_RANK = {
    "valid": 3,
    "certified_winner": 3,
    "provisional": 2,
    "needs_measurement": 1,
    "missing": 0,
    "expired": 0,
    "revoked": 0,
    "failed": 0,
}


def evaluate_project_gate(project_id: str, payload: ReleaseGateEvaluateRequest) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        return _blocked(project_id, payload, ["project_not_found"])

    evidence = _evidence_context(project_id, payload)
    blocking_reasons = _hard_evidence_blockers(evidence)
    warnings: list[str] = []

    actual_rank = STATUS_RANK.get(str(evidence["status"]), 0)
    required_rank = STATUS_RANK.get(payload.required_status, STATUS_RANK["valid"])
    if actual_rank < required_rank:
        blocking_reasons.append(f"release_evidence_{evidence['status']}_does_not_meet_required_{payload.required_status}")

    project_environment = str(project.get("environment") or "")
    if payload.environment and project_environment and payload.environment != project_environment:
        blocking_reasons.append(f"environment_mismatch:evidence_project_{project_environment}:deployment_{payload.environment}")

    if payload.changed_since_evidence:
        blocking_reasons.extend(f"retest_required:{_reason_key(item)}" for item in payload.changed_since_evidence)

    version_blockers = _guard_version_blockers(project_id, payload.guard_connector_versions)
    blocking_reasons.extend(version_blockers)

    benchmark_blockers = _benchmark_blockers(evidence, payload)
    blocking_reasons.extend(benchmark_blockers)

    context_blockers, context_warnings = _release_context_findings(evidence, payload)
    blocking_reasons.extend(context_blockers)
    warnings.extend(context_warnings)

    if any([payload.model_id, payload.model_version, payload.prompt_hash, payload.policy_hash]) and not (evidence.get("release_context") or {}):
        warnings.append("model_prompt_policy_context_recorded_as_assumption_not_verified_against_packet")

    blocking_reasons = _dedupe(blocking_reasons)
    warnings = _dedupe(warnings)
    if blocking_reasons:
        decision = "warn" if payload.mode == "warn" and actual_rank > 0 else "block"
    elif warnings:
        decision = "warn"
    else:
        decision = "pass"

    return {
        "project_id": project_id,
        "project_name": project.get("name"),
        "decision": decision,
        "ok": decision == "pass" or payload.mode == "warn",
        "mode": payload.mode,
        "status": evidence["status"],
        "required_status": payload.required_status,
        "run_id": evidence.get("run_id"),
        "release_evidence_id": evidence.get("release_evidence_id"),
        "certificate_id": evidence.get("certificate_id") or evidence.get("release_evidence_id"),
        "evidence_packet_id": evidence.get("certificate_id") or evidence.get("release_evidence_id"),
        "blocking_reasons": blocking_reasons,
        "warnings": warnings,
        "required_retest_triggers": evidence.get("recertification_required_on") or mcp.RECERTIFICATION_TRIGGERS,
        "assumptions": {
            "not_a_guarantee": True,
            "scope": evidence.get("scope"),
            "cass_scope": "finite benchmark mixture, configured safety-check versions, K<=2 serial CASS comparison",
            "context_binding": _context_binding_assumptions(payload),
            "release_context": {
                "environment": payload.environment,
                "model_id": payload.model_id,
                "model_version": payload.model_version,
                "prompt_hash": payload.prompt_hash,
                "policy_hash": payload.policy_hash,
                "benchmark_suite_id": payload.benchmark_suite_id,
                "benchmark_suite_version": payload.benchmark_suite_version,
                "deployment_ref": payload.deployment_ref,
                "commit_sha": payload.commit_sha,
            },
        },
        "resources": evidence.get("resources") or [],
    }


def _evidence_context(project_id: str, payload: ReleaseGateEvaluateRequest) -> dict[str, Any]:
    if payload.run_id:
        run_project_id = _project_id_for_run(payload.run_id)
        if run_project_id != project_id:
            return {
                "project_id": project_id,
                "run_id": payload.run_id,
                "status": "missing",
                "blocking_reasons": ["run_not_found_for_project"],
                "recertification_required_on": mcp.RECERTIFICATION_TRIGGERS,
            }
        try:
            packet = mcp.release_evidence_packet(payload.run_id, payload.lambda_cost)
        except HTTPException as exc:
            if exc.status_code == status.HTTP_404_NOT_FOUND:
                return {
                    "project_id": project_id,
                    "run_id": payload.run_id,
                    "status": "missing",
                    "blocking_reasons": ["run_not_found"],
                    "recertification_required_on": mcp.RECERTIFICATION_TRIGGERS,
                }
            raise
        return {
            "project_id": project_id,
            "run_id": payload.run_id,
            "release_evidence_id": packet.get("certificate_id"),
            "certificate_id": packet.get("certificate_id"),
            "status": _status_from_packet(packet),
            "scope": ((packet.get("assumptions") or {}).get("certificate_scope") or "finite benchmark mixture"),
            "blocking_reasons": [] if STATUS_RANK.get(_status_from_packet(packet), 0) >= STATUS_RANK["valid"] else [f"release_evidence_{_status_from_packet(packet)}"],
            "recertification_required_on": packet.get("recertification_triggers") or mcp.RECERTIFICATION_TRIGGERS,
            "resources": [f"stackcert://runs/{payload.run_id}/release-evidence"],
            "run_summary": _run_summary(payload.run_id),
            "release_context": packet.get("release_context") or ((packet.get("assumptions") or {}).get("release_context") or {}),
        }

    status_payload = mcp.release_evidence_status(project_id, payload.lambda_cost)
    return {
        **status_payload,
        "run_summary": _run_summary(str(status_payload.get("run_id") or "")),
        "release_context": status_payload.get("release_context") or {},
    }


def _guard_version_blockers(project_id: str, expected_versions: dict[str, str]) -> list[str]:
    if not expected_versions:
        return []
    connectors = {
        str(connector.get("guard_key") or connector.get("id")): connector
        for connector in guard_connectors.list_connectors(project_id)
    }
    blockers = []
    for guard_key, expected_version in sorted(expected_versions.items()):
        connector = connectors.get(guard_key)
        if not connector:
            blockers.append(f"guard_connector_missing:{guard_key}")
            continue
        actual_version = str(connector.get("version") or "")
        if actual_version != str(expected_version):
            blockers.append(f"guard_connector_version_mismatch:{guard_key}:expected_{expected_version}:actual_{actual_version}")
    return blockers


def _benchmark_blockers(evidence: dict[str, Any], payload: ReleaseGateEvaluateRequest) -> list[str]:
    if not payload.benchmark_suite_id:
        return []
    run_summary = evidence.get("run_summary") or {}
    evidence_suite_id = run_summary.get("benchmark_suite_id") or (run_summary.get("summary") or {}).get("benchmark_suite_id")
    if evidence_suite_id and str(evidence_suite_id) != payload.benchmark_suite_id:
        return [f"benchmark_suite_mismatch:expected_{payload.benchmark_suite_id}:evidence_{evidence_suite_id}"]
    return []


def _release_context_findings(evidence: dict[str, Any], payload: ReleaseGateEvaluateRequest) -> tuple[list[str], list[str]]:
    context = evidence.get("release_context") or {}
    expected = {
        "model_id": payload.model_id,
        "model_version": payload.model_version,
        "prompt_hash": payload.prompt_hash,
        "policy_hash": payload.policy_hash,
        "benchmark_suite_id": payload.benchmark_suite_id,
        "benchmark_suite_version": payload.benchmark_suite_version,
    }
    blockers: list[str] = []
    warnings: list[str] = []
    for key, expected_value in expected.items():
        if not expected_value:
            continue
        actual_value = context.get(key)
        if actual_value is None:
            warnings.append(f"release_context_missing:{key}")
            continue
        if str(actual_value) != str(expected_value):
            blockers.append(f"release_context_mismatch:{key}:expected_{expected_value}:evidence_{actual_value}")
    return blockers, warnings


def _project_id_for_run(run_id: str) -> str | None:
    if not run_id:
        return None
    if run_id == settings.demo_run_id:
        return settings.demo_project_id
    if pilot_runs.has_run(run_id):
        return str(pilot_runs.run_summary(run_id).get("project_id"))
    return None


def _run_summary(run_id: str) -> dict[str, Any]:
    if not run_id:
        return {}
    if run_id == settings.demo_run_id:
        return {"project_id": settings.demo_project_id, "id": settings.demo_run_id}
    if pilot_runs.has_run(run_id):
        return pilot_runs.run_summary(run_id)
    return {}


def _status_from_packet(packet: dict[str, Any]) -> str:
    status_value = str(packet.get("status_compact") or packet.get("status") or "missing")
    if status_value in {"valid", "provisional", "needs_measurement", "missing", "expired", "revoked", "failed"}:
        return status_value
    if status_value == "certified_winner":
        return "valid"
    if status_value.startswith("certified"):
        return "valid"
    return status_value


def _context_binding_assumptions(payload: ReleaseGateEvaluateRequest) -> dict[str, Any]:
    return {
        "guard_connector_versions_checked": bool(payload.guard_connector_versions),
        "benchmark_suite_checked": bool(payload.benchmark_suite_id),
        "model_prompt_policy_checked": bool(any([payload.model_id, payload.model_version, payload.prompt_hash, payload.policy_hash])),
        "model_prompt_policy_note": "Release gates compare supplied model/prompt/policy identifiers when the evidence packet includes matching release-context fields; missing fields warn and mismatches block.",
        "explicit_run_requested": bool(payload.run_id),
    }


def _hard_evidence_blockers(evidence: dict[str, Any]) -> list[str]:
    hard_prefixes = ("project_not_found", "no_release_evidence_run", "run_not_found")
    return [
        reason
        for reason in list(evidence.get("blocking_reasons") or [])
        if any(str(reason).startswith(prefix) for prefix in hard_prefixes)
    ]


def _blocked(project_id: str, payload: ReleaseGateEvaluateRequest, reasons: list[str]) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "decision": "warn" if payload.mode == "warn" else "block",
        "ok": payload.mode == "warn",
        "mode": payload.mode,
        "status": "missing",
        "required_status": payload.required_status,
        "run_id": payload.run_id,
        "release_evidence_id": None,
        "certificate_id": None,
        "evidence_packet_id": None,
        "blocking_reasons": reasons,
        "warnings": [],
        "required_retest_triggers": mcp.RECERTIFICATION_TRIGGERS,
        "assumptions": {"not_a_guarantee": True},
        "resources": [],
    }


def _reason_key(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "_" for character in value).strip("_") or "change"


def _dedupe(values: list[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped
