from __future__ import annotations

import base64
import hashlib
import html
import io
import json
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.db.supabase import SupabasePersistenceError, configured_supabase_store
from stackcert_service.services import certificates, demo_project, pilot_runs, projects


RENDERER_VERSION = "stackcert.report.v2"
_report_versions: dict[str, list[dict[str, Any]]] = {}


def list_for_run(run_id: str, *, lambda_cost: float = 5.0) -> list[dict[str, Any]]:
    ensure_version(run_id, lambda_cost=lambda_cost)
    store = _persistent_store()
    if store and hasattr(store, "list_report_versions_for_run"):
        try:
            return store.list_report_versions_for_run(run_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return sorted(list(_report_versions.get(run_id, [])), key=lambda item: int(item["version"]), reverse=True)


def get_version(report_version_id: str) -> dict[str, Any] | None:
    store = _persistent_store()
    if store and hasattr(store, "get_report_version"):
        try:
            return store.get_report_version(report_version_id)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    for versions in _report_versions.values():
        for version in versions:
            if version["id"] == report_version_id:
                return version
    return None


def ensure_version(report_id: str, *, lambda_cost: float = 5.0, created_by: str | None = None) -> dict[str, Any]:
    payload = _report_payload(report_id, lambda_cost)
    workspace_id = str(payload.get("workspace_id") or "")
    project_id = str(payload.get("project_id") or "")
    run_id = str(payload.get("run_id") or report_id)
    certificate_id = payload.get("certificate_id") or payload.get("id")
    report_doc = _structured_report(payload)
    markdown = _markdown(report_doc)
    html_doc = _html(report_doc)
    content_hash = _hash({"payload": report_doc, "markdown": markdown, "html": html_doc})
    release_context_hash = _hash(payload.get("release_context") or (payload.get("summary") or {}).get("release_context") or {})

    existing = _find_existing(run_id, content_hash)
    if existing:
        return existing
    current = _existing_versions(run_id)
    version_number = max([int(item.get("version") or 0) for item in current] or [0]) + 1
    now = datetime.now(UTC).replace(microsecond=0).isoformat()
    report_version = {
        "id": f"reportv_{hashlib.sha256(f'{run_id}:{content_hash}'.encode('utf-8')).hexdigest()[:16]}",
        "workspace_id": workspace_id,
        "project_id": project_id,
        "run_id": run_id,
        "certificate_id": certificate_id,
        "version": version_number,
        "content_hash": content_hash,
        "release_context_hash": release_context_hash,
        "renderer_version": RENDERER_VERSION,
        "payload": report_doc,
        "markdown": markdown,
        "html": html_doc,
        "artifact_refs": [],
        "created_by": created_by,
        "created_at": now,
    }
    store = _persistent_store()
    if store and hasattr(store, "create_report_version"):
        try:
            return store.create_report_version(report_version)
        except SupabasePersistenceError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    _report_versions.setdefault(run_id, []).insert(0, report_version)
    return report_version


def export(report_id: str, export_format: str, *, lambda_cost: float = 5.0, created_by: str | None = None) -> dict[str, Any]:
    version = get_version(report_id) or ensure_version(report_id, lambda_cost=lambda_cost, created_by=created_by)
    export_format = export_format if export_format in {"markdown", "json", "pdf"} else "markdown"
    if export_format == "json":
        content = json.dumps(version["payload"], indent=2, sort_keys=True)
        content_type = "application/json"
        encoding = "utf-8"
    elif export_format == "pdf":
        content = base64.b64encode(_pdf_bytes(version["payload"])).decode("ascii")
        content_type = "application/pdf"
        encoding = "base64"
    else:
        content = version["markdown"]
        content_type = "text/markdown"
        encoding = "utf-8"
    return {
        "report_id": version["id"],
        "run_id": version["run_id"],
        "certificate_id": version.get("certificate_id"),
        "format": export_format,
        "content_type": content_type,
        "filename": f"{_safe_filename(version['run_id'])}_report_v{version['version']}.{_extension(export_format)}",
        "version": version["version"],
        "report_version_id": version["id"],
        "content_hash": version["content_hash"],
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "encoding": encoding,
        "content": content,
        "summary": {
            "status": version["payload"].get("status"),
            "recommended_label": version["payload"].get("recommendation", {}).get("selected"),
            "run_id": version["run_id"],
            "limitations": len(version["payload"].get("limitations") or []),
        },
    }


def clear_report_versions() -> None:
    _report_versions.clear()


def _report_payload(report_id: str, lambda_cost: float) -> dict[str, Any]:
    issued = certificates.get_certificate(report_id)
    if issued:
        project = projects.get_project(str(issued["project_id"])) or {}
        return {
            **issued,
            "workspace_id": project.get("workspace_id"),
            "report_kind": "issued_certificate",
            "markdown": issued.get("markdown") or issued.get("evidence_markdown"),
        }
    if report_id == settings.demo_run_id:
        project = demo_project.project()
        return {**demo_project.certificate_payload(lambda_cost), "project_id": project["id"], "workspace_id": project["workspace_id"], "report_kind": "run_certificate"}
    if pilot_runs.has_run(report_id):
        run = pilot_runs.run_summary(report_id)
        return {**pilot_runs.certificate_payload(report_id, lambda_cost), "project_id": run["project_id"], "workspace_id": run["workspace_id"], "report_kind": "run_certificate"}
    version = get_version(report_id)
    if version:
        return version["payload"]
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")


def _structured_report(payload: dict[str, Any]) -> dict[str, Any]:
    selected = payload.get("selected_stack_label") or payload.get("certified_label") or payload.get("recommended_label")
    return {
        "title": "StackCert Release Report",
        "report_kind": payload.get("report_kind") or "release_report",
        "status": payload.get("status_compact") or payload.get("status") or "unknown",
        "run_id": payload.get("run_id"),
        "certificate_id": payload.get("certificate_id") or payload.get("id"),
        "generated_at": payload.get("generated_at") or payload.get("issued_at") or datetime.now(UTC).replace(microsecond=0).isoformat(),
        "recommendation": {
            "selected": selected,
            "recommended": payload.get("recommended_label") or selected,
        },
        "scope": payload.get("scope") or "Hosted pilot safety-check comparison.",
        "executive_summary": [
            "This report supports one scoped release decision for one LLM app, one example mix, and one set of safety options.",
            "It is not a universal safety, legal-compliance, or future-performance guarantee.",
        ],
        "assumptions": payload.get("assumptions") or {},
        "release_context": payload.get("release_context") or (payload.get("summary") or {}).get("release_context") or {},
        "limitations": payload.get("limitations") or [],
        "retest_triggers": payload.get("recertification_triggers") or payload.get("retest_triggers") or [],
        "raw_config": {
            "renderer_version": RENDERER_VERSION,
            "content_source": payload.get("report_kind") or "run_certificate",
        },
    }


def _markdown(doc: dict[str, Any]) -> str:
    lines = [
        f"# {doc['title']}",
        "",
        f"- Report version source: `{doc.get('run_id') or doc.get('certificate_id') or 'unknown'}`",
        f"- Status: `{doc['status']}`",
        f"- Selected option: {doc['recommendation'].get('selected') or 'Not selected'}",
        f"- Generated: {doc['generated_at']}",
        "",
        "## Executive summary",
        *[f"- {item}" for item in doc["executive_summary"]],
        "",
        "## Scope",
        str(doc["scope"]),
        "",
        "## Assumptions",
    ]
    assumptions = doc.get("assumptions") or {}
    lines.extend([f"- {key}: {value}" for key, value in assumptions.items()] or ["- No assumptions recorded."])
    lines.extend(["", "## Release context"])
    context = doc.get("release_context") or {}
    lines.extend([f"- {key}: {value}" for key, value in context.items()] or ["- No release context recorded."])
    lines.extend(["", "## Limitations"])
    lines.extend([f"- {item}" for item in doc.get("limitations") or []] or ["- No limitations were recorded."])
    lines.extend(["", "## Retest triggers"])
    lines.extend([f"- {item}" for item in doc.get("retest_triggers") or []] or ["- Retest on model, prompt, policy, tool, retrieval, safety-option, or traffic changes."])
    return "\n".join(lines) + "\n"


def _html(doc: dict[str, Any]) -> str:
    markdown = _markdown(doc)
    paragraphs = []
    for line in markdown.splitlines():
        if line.startswith("# "):
            paragraphs.append(f"<h1>{html.escape(line[2:])}</h1>")
        elif line.startswith("## "):
            paragraphs.append(f"<h2>{html.escape(line[3:])}</h2>")
        elif line.startswith("- "):
            paragraphs.append(f"<p class='bullet'>{html.escape(line[2:])}</p>")
        elif line.strip():
            paragraphs.append(f"<p>{html.escape(line)}</p>")
    return "<!doctype html><html><head><meta charset='utf-8'><title>StackCert Release Report</title></head><body>" + "".join(paragraphs) + "</body></html>"


def _pdf_bytes(doc: dict[str, Any]) -> bytes:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except Exception:
        return _fallback_pdf_bytes(doc)
    buffer = io.BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=letter, title="StackCert Release Report")
    styles = getSampleStyleSheet()
    story = [Paragraph(html.escape(doc["title"]), styles["Title"]), Spacer(1, 12)]
    for line in _markdown(doc).splitlines()[1:]:
        if not line.strip():
            story.append(Spacer(1, 8))
        elif line.startswith("## "):
            story.append(Paragraph(html.escape(line[3:]), styles["Heading2"]))
        elif line.startswith("- "):
            story.append(Paragraph("• " + html.escape(line[2:]), styles["BodyText"]))
        else:
            story.append(Paragraph(html.escape(line), styles["BodyText"]))
    pdf.build(story)
    return buffer.getvalue()


def _fallback_pdf_bytes(doc: dict[str, Any]) -> bytes:
    text = f"StackCert Release Report\\nStatus: {doc.get('status')}\\nRun: {doc.get('run_id')}\\nSelected: {doc.get('recommendation', {}).get('selected')}"
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    body = f"BT /F1 12 Tf 72 740 Td ({escaped}) Tj ET"
    objects = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
        "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        f"5 0 obj << /Length {len(body)} >> stream\n{body}\nendstream endobj",
    ]
    return ("%PDF-1.4\n" + "\n".join(objects) + "\ntrailer << /Root 1 0 R >>\n%%EOF\n").encode("utf-8")


def _existing_versions(run_id: str) -> list[dict[str, Any]]:
    store = _persistent_store()
    if store and hasattr(store, "list_report_versions_for_run"):
        return store.list_report_versions_for_run(run_id)
    return list(_report_versions.get(run_id, []))


def _find_existing(run_id: str, content_hash: str) -> dict[str, Any] | None:
    for version in _existing_versions(run_id):
        if version.get("content_hash") == content_hash:
            return version
    return None


def _hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _safe_filename(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in str(value))[:120]


def _extension(export_format: str) -> str:
    return {"markdown": "md", "json": "json", "pdf": "pdf"}[export_format]


def _persistent_store():
    try:
        return configured_supabase_store()
    except SupabasePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
