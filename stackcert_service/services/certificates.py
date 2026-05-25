from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.schemas import CertificateIssueRequest, CertificateSignoffCreate
from stackcert_service.services import artifacts
from stackcert_service.services import demo_project
from stackcert_service.services import pilot_runs

_issued_certificates: dict[str, dict[str, Any]] = {}
_signoffs: dict[str, list[dict[str, Any]]] = {}

BLOCKING_CERTIFICATE_STATUSES = {"draft", "expired", "revoked", "failed", "negative"}


def _now() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def issue_certificate(run_id: str, payload: CertificateIssueRequest, lambda_cost: float = 5.0) -> dict[str, Any]:
    if not payload.acknowledge_limitations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Issuing a certificate requires acknowledgement of scope and limitations",
        )
    readiness = evidence_readiness(run_id, lambda_cost)
    if not readiness["can_issue"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Evidence is not ready to issue",
                "blockers": readiness["blockers"],
                "warnings": readiness["warnings"],
            },
        )
    certificate = _build_issued_certificate(run_id, payload, lambda_cost)
    certificate = _attach_evidence_packet(certificate, run_id, lambda_cost, readiness)
    existing = get_certificate(certificate["certificate_id"])
    if existing:
        return existing
    store = _persistent_store()
    if store:
        try:
            return store.issue_certificate(certificate["project_id"], certificate)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    artifacts.store_certificate_artifacts(certificate)
    _issued_certificates[certificate["certificate_id"]] = certificate
    _signoffs.setdefault(certificate["certificate_id"], [])
    return certificate


def get_certificate(certificate_id: str) -> dict[str, Any] | None:
    store = _persistent_store()
    if store:
        try:
            return store.get_issued_certificate(certificate_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    certificate = _issued_certificates.get(certificate_id)
    if not certificate:
        return None
    return {**certificate, "signoffs": list(_signoffs.get(certificate_id, []))}


def get_certificate_for_run(run_id: str, workspace_id: str | None = None) -> dict[str, Any] | None:
    store = _persistent_store()
    if store:
        try:
            return store.get_issued_certificate_for_run(run_id, workspace_id=workspace_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    for certificate_id, certificate in _issued_certificates.items():
        if certificate.get("run_id") == run_id:
            return {**certificate, "signoffs": list(_signoffs.get(certificate_id, []))}
    return None


def create_signoff(certificate_id: str, payload: CertificateSignoffCreate) -> dict[str, Any]:
    certificate = get_certificate(certificate_id)
    if not certificate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issued certificate not found")
    signoff = {
        "id": f"signoff_{uuid.uuid4().hex[:12]}",
        "certificate_id": certificate_id,
        "signer_role": payload.signer_role,
        "decision": payload.decision,
        "comment": payload.comment or "",
        "created_at": _now().isoformat(),
    }
    store = _persistent_store()
    if store:
        try:
            return store.create_certificate_signoff(certificate_id, signoff)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _signoffs.setdefault(certificate_id, []).append(signoff)
    return signoff


def clear_certificates() -> None:
    _issued_certificates.clear()
    _signoffs.clear()
    artifacts.clear_artifacts()


def evidence_readiness(run_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    blockers: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    checks: list[dict[str, Any]] = []

    run = _run_summary_for_readiness(run_id, lambda_cost)
    if not run:
        blockers.append(_readiness_item("no_current_run", "No completed evidence run was found for this release."))
        checks.append(_readiness_check("current_run", "Current evidence run", "blocked", "Create or select an evidence run before issuing."))
        return _readiness_payload(run_id, blockers, warnings, checks)

    run_status = str(run.get("status") or "")
    if run_status not in {"complete", "completed", "succeeded"}:
        blockers.append(_readiness_item("run_not_complete", "The selected run has not completed.", {"status": run_status}))
        checks.append(_readiness_check("current_run", "Current evidence run", "blocked", f"Run status is {run_status or 'unknown'}."))
    else:
        checks.append(_readiness_check("current_run", "Current evidence run", "passed", "A completed run is available."))

    examples = int(run.get("examples") or 0)
    guards = int(run.get("guards") or 0)
    outputs = int(run.get("outputs") or 0)
    expected_outputs = examples * guards
    if examples <= 0:
        blockers.append(_readiness_item("no_examples", "The run has no examples in scope."))
    if guards < 2:
        blockers.append(_readiness_item("insufficient_safety_checks", "Evaluate at least two safety checks before issuing evidence."))
    if expected_outputs and outputs < expected_outputs:
        blockers.append(
            _readiness_item(
                "missing_safety_check_coverage",
                "Some example and safety-check outputs are missing.",
                {"expected_outputs": expected_outputs, "observed_outputs": outputs},
            )
        )
        checks.append(_readiness_check("output_coverage", "Output coverage", "blocked", f"{outputs} of {expected_outputs} outputs are present."))
    else:
        checks.append(_readiness_check("output_coverage", "Output coverage", "passed", f"{outputs} outputs cover the current run scope."))

    if run_id != settings.demo_run_id and not run.get("benchmark_suite_id"):
        blockers.append(_readiness_item("no_committed_suite", "The run is not tied to a committed benchmark suite."))
        checks.append(_readiness_check("benchmark_suite", "Benchmark suite", "blocked", "Commit a suite before issuing evidence."))
    else:
        checks.append(_readiness_check("benchmark_suite", "Benchmark suite", "passed", "The run references a benchmark suite."))

    payload = _certificate_payload_for_run(run_id, lambda_cost) if not any(item["code"] == "no_current_run" for item in blockers) else None
    certificate_status = str((payload or {}).get("status_compact") or run.get("certificate_status") or "unknown")
    if certificate_status in BLOCKING_CERTIFICATE_STATUSES:
        blockers.append(
            _readiness_item(
                "invalid_certificate_status",
                "The current CASS result is not valid enough to issue release evidence.",
                {"certificate_status": certificate_status},
            )
        )
        checks.append(_readiness_check("cass_status", "CASS status", "blocked", f"Current status is {certificate_status}."))
    elif certificate_status != "valid":
        warnings.append(
            _readiness_item(
                "provisional_evidence",
                "The packet can be issued, but it remains provisional until targeted measurements close the gap.",
                {"certificate_status": certificate_status},
            )
        )
        checks.append(_readiness_check("cass_status", "CASS status", "warning", f"Current status is {certificate_status}."))
    else:
        checks.append(_readiness_check("cass_status", "CASS status", "passed", "CASS found a valid selected combination."))

    measurement_actions = int(run.get("measurement_actions") or 0)
    if measurement_actions:
        warnings.append(
            _readiness_item(
                "recommended_followup_measurements",
                "StackCert has targeted follow-up measurements that may improve the recommendation.",
                {"measurement_actions": measurement_actions},
            )
        )
    checks.append(
        _readiness_check(
            "measurement_plan",
            "Follow-up measurements",
            "warning" if measurement_actions else "passed",
            f"{measurement_actions} targeted measurement actions are currently recommended.",
        )
    )

    checks.append(_readiness_check("scope_acknowledgement", "Scope acknowledgement", "passed", "Issuer acknowledgement is required on submit."))
    return _readiness_payload(run_id, blockers, warnings, checks)


def _build_issued_certificate(run_id: str, payload: CertificateIssueRequest, lambda_cost: float) -> dict[str, Any]:
    if run_id == settings.demo_run_id:
        return _build_demo_issued_certificate(run_id, payload, lambda_cost)
    if pilot_runs.has_run(run_id):
        return pilot_runs.issue_payload(run_id, payload.expires_in_days, reviewer_note=payload.reviewer_note)

    return _build_demo_issued_certificate(run_id, payload, lambda_cost)


def _build_demo_issued_certificate(run_id: str, payload: CertificateIssueRequest, lambda_cost: float) -> dict[str, Any]:
    cert_payload = demo_project.certificate_payload(lambda_cost)
    markdown = cert_payload["markdown"].replace(f"- Run ID: `{settings.demo_run_id}`", f"- Run ID: `{run_id}`")
    issued_at = _now()
    expires_at = issued_at + timedelta(days=payload.expires_in_days)
    selected_stack_label = cert_payload["certified_label"] or cert_payload["recommended_label"]
    scope = (
        f"project:{settings.demo_project_id} run:{run_id} "
        f"benchmark:CASS seeded benchmark mixture lambda:{lambda_cost:g}"
    )
    artifact = {
        "certificate_id": cert_payload["certificate_id"],
        "run_id": run_id,
        "status": cert_payload["status_compact"],
        "selected_stack_label": selected_stack_label,
        "scope": scope,
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "limitations": cert_payload["limitations"],
        "assumptions": cert_payload["assumptions"],
        "markdown": markdown,
    }
    artifact_hash = hashlib.sha256(json.dumps(artifact, sort_keys=True).encode("utf-8")).hexdigest()
    return {
        "id": cert_payload["certificate_id"],
        "certificate_id": cert_payload["certificate_id"],
        "project_id": settings.demo_project_id,
        "run_id": run_id,
        "status": cert_payload["status_compact"],
        "selected_stack_label": selected_stack_label,
        "scope": scope,
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "artifact_hash": artifact_hash,
        "limitations": cert_payload["limitations"],
        "summary": {
            "run_id": run_id,
            "recommended_label": cert_payload["recommended_label"],
            "certified_label": cert_payload["certified_label"],
            "lambda_cost": lambda_cost,
            "welfare_profile": cert_payload["assumptions"].get("welfare_profile"),
            "aggregation_rule": cert_payload["assumptions"].get("aggregation_rule"),
            "not_a_guarantee": True,
            "acknowledged_limitations": True,
            "reviewer_note": payload.reviewer_note or "",
        },
        "signoffs": [],
    }


def _attach_evidence_packet(
    certificate: dict[str, Any],
    run_id: str,
    lambda_cost: float,
    readiness: dict[str, Any],
) -> dict[str, Any]:
    evidence_payload = _certificate_payload_for_run(run_id, lambda_cost)
    issued_at = certificate["issued_at"]
    expires_at = certificate["expires_at"]
    packet = {
        "packet_version": "stackcert.evidence.v1",
        "certificate_id": certificate["certificate_id"],
        "project_id": certificate["project_id"],
        "run_id": certificate["run_id"],
        "status": certificate["status"],
        "selected_stack_label": certificate["selected_stack_label"],
        "scope": certificate["scope"],
        "issued_at": issued_at,
        "expires_at": expires_at,
        "artifact_hash_algorithm": "sha256",
        "not_a_guarantee": True,
        "summary": certificate["summary"],
        "recommendation": {
            "recommended_label": evidence_payload.get("recommended_label"),
            "certified_label": evidence_payload.get("certified_label"),
            "status": evidence_payload.get("status_compact"),
        },
        "release_context": evidence_payload.get("release_context") or {},
        "assumptions": evidence_payload.get("assumptions") or {},
        "limitations": certificate.get("limitations") or evidence_payload.get("limitations") or [],
        "retest_triggers": evidence_payload.get("recertification_triggers") or [],
        "readiness": {
            "status": readiness["status"],
            "warnings": readiness["warnings"],
            "checks": readiness["checks"],
        },
    }
    packet_json = json.dumps(packet, sort_keys=True, separators=(",", ":")).encode("utf-8")
    packet_hash = hashlib.sha256(packet_json).hexdigest()
    markdown = _issued_markdown(evidence_payload.get("markdown") or "", certificate, packet_hash)
    certificate["artifact_hash"] = packet_hash
    certificate["packet_snapshot"] = packet
    certificate["artifact_refs"] = []
    certificate["_artifact_payloads"] = [
        {
            "artifact_type": "issued_evidence_json",
            "content": packet_json,
            "content_type": "application/json",
            "extension": "json",
        },
        {
            "artifact_type": "issued_evidence_markdown",
            "content": markdown.encode("utf-8"),
            "content_type": "text/markdown",
            "extension": "md",
        },
    ]
    return certificate


def _issued_markdown(markdown: str, certificate: dict[str, Any], artifact_hash: str) -> str:
    metadata = "\n".join(
        [
            "",
            "## Issued Evidence Metadata",
            "",
            f"- Evidence ID: `{certificate['certificate_id']}`",
            f"- Run ID: `{certificate['run_id']}`",
            f"- Issued at: `{certificate['issued_at']}`",
            f"- Expires at: `{certificate['expires_at']}`",
            f"- Artifact SHA-256: `{artifact_hash}`",
            "- Scope note: This is app-specific release evidence, not a guarantee of safety or compliance.",
            "",
        ]
    )
    return markdown.rstrip() + "\n" + metadata


def _certificate_payload_for_run(run_id: str, lambda_cost: float) -> dict[str, Any]:
    if run_id == settings.demo_run_id:
        payload = demo_project.certificate_payload(lambda_cost)
        payload["run_id"] = run_id
        return payload
    if pilot_runs.has_run(run_id):
        return pilot_runs.certificate_payload(run_id, lambda_cost)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")


def _run_summary_for_readiness(run_id: str, lambda_cost: float) -> dict[str, Any] | None:
    if run_id == settings.demo_run_id:
        return demo_project.run_summary(lambda_cost)
    if pilot_runs.has_run(run_id):
        return pilot_runs.run_summary(run_id)
    return None


def _readiness_item(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"code": code, "message": message, "details": details or {}}


def _readiness_check(check_id: str, label: str, status_value: str, message: str) -> dict[str, str]:
    return {"id": check_id, "label": label, "status": status_value, "message": message}


def _readiness_payload(
    run_id: str,
    blockers: list[dict[str, Any]],
    warnings: list[dict[str, Any]],
    checks: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "status": "blocked" if blockers else ("warning" if warnings else "ready"),
        "can_issue": not blockers,
        "blockers": blockers,
        "warnings": warnings,
        "checks": checks,
    }


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
