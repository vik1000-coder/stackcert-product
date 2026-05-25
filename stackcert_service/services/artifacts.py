from __future__ import annotations

from hashlib import sha256
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store

_memory_artifacts: dict[str, dict[str, Any]] = {}


def store_certificate_artifacts(certificate: dict[str, Any]) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []
    payloads = certificate.pop("_artifact_payloads", [])
    for payload in payloads:
        body = payload["content"]
        object_path = f"certificates/{certificate['certificate_id']}/{payload['artifact_type']}.{payload['extension']}"
        ref = {
            "bucket": "certificates",
            "object_path": object_path,
            "artifact_type": payload["artifact_type"],
            "content_type": payload["content_type"],
            "byte_size": len(body),
            "sha256": sha256(body).hexdigest(),
            "metadata": {
                "certificate_id": certificate["certificate_id"],
                "run_id": certificate["run_id"],
                "project_id": certificate["project_id"],
            },
        }
        _memory_artifacts[_artifact_key(ref["bucket"], ref["object_path"])] = {
            "content": body,
            "ref": ref,
        }
        refs.append(ref)
    certificate["artifact_refs"] = refs
    certificate["artifacts"] = refs
    return refs


def list_certificate_artifacts(certificate_id: str) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store:
        try:
            return store.list_certificate_artifacts(certificate_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return [
        artifact["ref"]
        for artifact in _memory_artifacts.values()
        if artifact["ref"].get("metadata", {}).get("certificate_id") == certificate_id
    ]


def signed_url(certificate_id: str, artifact_type: str, expires_in_seconds: int = 300) -> dict[str, Any]:
    store = _persistent_store()
    if store:
        try:
            return store.create_certificate_artifact_signed_url(
                certificate_id,
                artifact_type,
                expires_in_seconds=expires_in_seconds,
            )
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    ref = _memory_artifact_ref(certificate_id, artifact_type)
    return {
        **ref,
        "signed_url": f"memory://{ref['bucket']}/{ref['object_path']}",
        "expires_in_seconds": expires_in_seconds,
    }


def verify(certificate_id: str, artifact_type: str) -> dict[str, Any]:
    store = _persistent_store()
    if store:
        try:
            return store.verify_certificate_artifact(certificate_id, artifact_type)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    ref = _memory_artifact_ref(certificate_id, artifact_type)
    artifact = _memory_artifacts[_artifact_key(ref["bucket"], ref["object_path"])]
    actual = sha256(artifact["content"]).hexdigest()
    return {
        **ref,
        "expected_sha256": ref["sha256"],
        "actual_sha256": actual,
        "verified": actual == ref["sha256"],
    }


def clear_artifacts() -> None:
    _memory_artifacts.clear()


def _memory_artifact_ref(certificate_id: str, artifact_type: str) -> dict[str, Any]:
    for artifact in _memory_artifacts.values():
        ref = artifact["ref"]
        metadata = ref.get("metadata", {})
        if metadata.get("certificate_id") == certificate_id and ref.get("artifact_type") == artifact_type:
            return ref
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence artifact not found")


def _artifact_key(bucket: str, object_path: str) -> str:
    return f"{bucket}/{object_path}"


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
