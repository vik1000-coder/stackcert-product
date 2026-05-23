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
from stackcert_service.services import demo_project

_issued_certificates: dict[str, dict[str, Any]] = {}
_signoffs: dict[str, list[dict[str, Any]]] = {}


def _now() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def issue_certificate(run_id: str, payload: CertificateIssueRequest, lambda_cost: float = 5.0) -> dict[str, Any]:
    if not payload.acknowledge_limitations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Issuing a certificate requires acknowledgement of scope and limitations",
        )
    certificate = _build_issued_certificate(run_id, payload, lambda_cost)
    existing = get_certificate(certificate["certificate_id"])
    if existing:
        return existing
    store = _persistent_store()
    if store:
        try:
            return store.issue_certificate(settings.demo_project_id, certificate)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
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


def _build_issued_certificate(run_id: str, payload: CertificateIssueRequest, lambda_cost: float) -> dict[str, Any]:
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


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
