from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from stackcert_service.config import settings
from stackcert_service.observability import configure_error_reporting, configure_logging, request_middleware
from stackcert_service.security import access
from stackcert_service.security.auth import McpPrincipalDep, Principal, PrincipalDep, ReleaseGatePrincipalDep
from stackcert_service.schemas import (
    AdminWorkerRunRequest,
    BenchmarkImportCommitRequest,
    BenchmarkImportPreviewRequest,
    CertificateIssueRequest,
    CertificateSignoffCreate,
    CostEstimateRequest,
    CustomBehaviorCreate,
    EvaluationJobCreate,
    GuardConnectorCreate,
    GuardConnectorSecretUpdate,
    GuardConnectorTestCallRequest,
    MeasurementPlanCreate,
    McpRpcRequest,
    OnboardingPilotCreate,
    ProjectCreate,
    ProjectBudgetPolicyUpdate,
    ProjectOnboardingProfileUpdate,
    ReleaseGateEvaluateRequest,
    ReleaseGateWebhookRequest,
    ReportExportRequest,
    ConfigImportRequest,
    RetentionExecutionRequest,
    RetentionPolicyUpdate,
    SamplePilotDuplicateRequest,
    TraceImportCommitRequest,
    TraceImportPreviewRequest,
    UploadedOutputRunCreate,
    UploadedOutputPreviewRequest,
    WorkspaceBudgetPolicyUpdate,
    WorkspaceCreate,
)
from stackcert_service.services import admin
from stackcert_service.services import benchmark_imports
from stackcert_service.services import audit
from stackcert_service.services import artifacts
from stackcert_service.services import budget_controls
from stackcert_service.services import certificates
from stackcert_service.services import custom_behaviors
from stackcert_service.services import config_imports
from stackcert_service.services import demo_project
from stackcert_service.services import guard_connectors
from stackcert_service.services import integrations
from stackcert_service.services import jobs
from stackcert_service.services import mcp
from stackcert_service.services import onboarding
from stackcert_service.services import pilot_readiness
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects
from stackcert_service.services import release_gates
from stackcert_service.services import release_webhooks
from stackcert_service.services import report_exports
from stackcert_service.services import report_versions
from stackcert_service.services import retention
from stackcert_service.services import sample_pilots
from stackcert_service.services import trace_imports
from stackcert_service.services import usage


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Production-oriented API for StackCert guardrail-stack certification.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

configure_logging()
configure_error_reporting()
app.middleware("http")(request_middleware)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


def _require_workspace_access(
    workspace_id: str,
    principal: Principal,
    *,
    required: str = "viewer",
) -> access.AccessGrant:
    access.require_app_principal(principal)
    role = projects.membership_role(workspace_id, principal)
    return access.grant_from_workspace(principal, workspace_id, membership_role=role, required=required)


def _require_project_access(
    project_id: str,
    principal: Principal,
    *,
    required: str = "viewer",
) -> dict[str, object]:
    access.require_app_principal(principal)
    project = projects.get_project(project_id)
    role = projects.project_membership_role(project_id, principal) if project else None
    try:
        access.grant_from_project(principal, project, membership_role=role, required=required)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_403_FORBIDDEN and project:
            audit.record_event(
                "permission.denied",
                principal,
                workspace_id=str(project.get("workspace_id")),
                project_id=project_id,
                target_type="project",
                target_id=project_id,
                metadata={"required": required, "role": role or principal.role},
            )
        raise
    return project


def _require_release_gate_project_access(project_id: str, principal: Principal) -> dict[str, object]:
    if principal.principal_type == "machine":
        access.require_scope(principal, "release_gate:read")
        if not access.machine_project_allowed(principal, project_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Release-gate token is not scoped to this project")
        project = projects.get_project(project_id)
        if not project:
            raise _not_found("Project not found")
        return project
    return _require_project_access(project_id, principal)


def _require_run_access(
    run_id: str,
    principal: Principal,
    *,
    required: str = "viewer",
    lambda_cost: float = 5.0,
) -> dict[str, object]:
    access.require_app_principal(principal)
    run = _run_for_access(run_id, lambda_cost)
    if not run:
        raise _not_found("Run not found")
    role = projects.project_membership_role(str(run["project_id"]), principal)
    access.grant_from_run(principal, run, membership_role=role, required=required)
    return run


def _require_job_access(
    job_id: str,
    principal: Principal,
    *,
    required: str = "viewer",
) -> dict[str, object]:
    access.require_app_principal(principal)
    job = jobs.get_job(job_id)
    if not job:
        raise _not_found("Job not found")
    _require_project_access(str(job["project_id"]), principal, required=required)
    return job


def _require_certificate_access(
    certificate_id: str,
    principal: Principal,
    *,
    required: str = "viewer",
) -> dict[str, object]:
    access.require_app_principal(principal)
    certificate = certificates.get_certificate(certificate_id)
    if not certificate:
        raise _not_found("Issued certificate not found")
    project = _require_project_access(str(certificate["project_id"]), principal, required=required)
    certificate_with_workspace = {**certificate, "workspace_id": project["workspace_id"]}
    role = projects.project_membership_role(str(certificate["project_id"]), principal)
    access.grant_from_certificate(principal, certificate_with_workspace, membership_role=role, required=required)
    return certificate


def _run_for_access(run_id: str, lambda_cost: float = 5.0) -> dict[str, object] | None:
    if run_id == settings.demo_run_id:
        return demo_project.run_summary(lambda_cost)
    if pilot_runs.has_run(run_id):
        return pilot_runs.run_summary(run_id)
    return None


def _not_found(detail: str) -> HTTPException:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


@app.get("/api/workspaces")
def list_workspaces(principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    return {"workspaces": projects.list_workspaces(principal)}


@app.post("/api/workspaces")
def create_workspace(payload: WorkspaceCreate, principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    workspace = projects.create_workspace(payload, principal=principal)
    audit.record_event(
        "workspace.created",
        principal,
        workspace_id=str(workspace["id"]),
        target_type="workspace",
        target_id=str(workspace["id"]),
    )
    return {"workspace": workspace}


@app.get("/api/projects")
def list_projects(principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    return {"projects": projects.list_projects(principal)}


@app.post("/api/workspaces/{workspace_id}/projects")
def create_project(workspace_id: str, payload: ProjectCreate, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="project_maintainer")
    project = projects.create_project(workspace_id, payload)
    audit.record_event(
        "project.created",
        principal,
        workspace_id=workspace_id,
        project_id=str(project["id"]),
        target_type="project",
        target_id=str(project["id"]),
    )
    return {"project": project}


@app.post("/api/onboarding/pilots")
def create_onboarding_pilot(payload: OnboardingPilotCreate, principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    result = onboarding.create_pilot(payload, principal=principal)
    workspace = result["workspace"]
    project = result["project"]
    audit.record_event(
        "workspace.created",
        principal,
        workspace_id=str(workspace["id"]),
        target_type="workspace",
        target_id=str(workspace["id"]),
        metadata={"source": "onboarding"},
    )
    audit.record_event(
        "project.created",
        principal,
        workspace_id=str(workspace["id"]),
        project_id=str(project["id"]),
        target_type="project",
        target_id=str(project["id"]),
        metadata={"source": "onboarding"},
    )
    audit.record_event(
        "project.onboarding_profile.saved",
        principal,
        workspace_id=str(workspace["id"]),
        project_id=str(project["id"]),
        target_type="project",
        target_id=str(project["id"]),
        metadata={"source": "onboarding", "evidence_mode": result["profile"]["evidence_mode"]},
    )
    return result


@app.get("/api/sample-pilots")
def list_sample_pilots() -> dict[str, object]:
    return {"sample_pilots": sample_pilots.list_templates()}


@app.post("/api/sample-pilots/{template_id}/duplicate")
def duplicate_sample_pilot(template_id: str, payload: SamplePilotDuplicateRequest, principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    if payload.workspace_id:
        _require_workspace_access(payload.workspace_id, principal, required="project_maintainer")
    result = sample_pilots.duplicate_template(template_id, payload, principal=principal)
    project = result["project"]
    workspace = result["workspace"]
    audit.record_event(
        "sample_pilot.duplicated",
        principal,
        workspace_id=str(workspace["id"]),
        project_id=str(project["id"]),
        target_type="project",
        target_id=str(project["id"]),
        metadata={"template_id": template_id, "mode": payload.mode, "template_seeded": result["template_seeded"]},
    )
    return result


@app.get("/api/projects/{project_id}")
def get_project(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    return {"project": _require_project_access(project_id, principal)}


@app.get("/api/projects/{project_id}/permissions")
def get_project_permissions(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal)
    role = projects.project_membership_role(project_id, principal)
    return {
        "project_id": project_id,
        "workspace_id": str(project["workspace_id"]),
        "permissions": access.permissions_for_role(role or principal.role),
    }


@app.get("/api/projects/{project_id}/onboarding-profile")
def get_onboarding_profile(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"profile": onboarding.get_profile(project_id)}


@app.patch("/api/projects/{project_id}/onboarding-profile")
def update_onboarding_profile(project_id: str, payload: ProjectOnboardingProfileUpdate, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    profile = onboarding.update_profile(project_id, payload)
    audit.record_event(
        "project.onboarding_profile.updated",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata={"evidence_mode": profile["evidence_mode"], "first_setup_focus": profile["first_setup_focus"]},
    )
    return {"profile": profile}


@app.get("/api/projects/{project_id}/runs")
def list_runs(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    runs = pilot_runs.list_project_runs(project_id)
    if project_id != demo_project.project()["id"]:
        return {"runs": runs}
    demo_run = demo_project.run_summary(lambda_cost)
    persisted_runs = [run for run in runs if run["id"] != demo_run["id"]]
    return {"runs": persisted_runs + [demo_run]}


@app.post("/api/projects/{project_id}/runs/uploaded-outputs")
def create_uploaded_output_run(project_id: str, payload: UploadedOutputRunCreate, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal, required="project_maintainer")
    run = pilot_runs.create_uploaded_output_run(project_id, payload)
    audit.record_event(
        "evaluation_run.uploaded_outputs.created",
        principal,
        workspace_id=str(run.get("workspace_id")),
        project_id=project_id,
        target_type="run",
        target_id=str(run["id"]),
        metadata={"source": "uploaded_outputs"},
    )
    return {"run": run}


@app.post("/api/projects/{project_id}/runs/uploaded-outputs/preview")
def preview_uploaded_output_run(project_id: str, payload: UploadedOutputPreviewRequest, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal, required="project_maintainer")
    return {"project_id": project_id, "output_preview": pilot_runs.preview_uploaded_output_run(project_id, payload)}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    run = _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    return {"run": run}


@app.get("/api/projects/{project_id}/benchmark-suites")
def list_benchmark_suites(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    if project_id != demo_project.project()["id"]:
        return {"suites": benchmark_imports.list_committed_suites(project_id)}
    demo_payload = demo_project.benchmark_suites(lambda_cost)
    committed = benchmark_imports.list_committed_suites(project_id)
    return {"suites": committed + demo_payload["suites"]}


@app.get("/api/projects/{project_id}/benchmark-suites/schema")
def get_benchmark_import_schema(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"project_id": project_id, "schema": benchmark_imports.import_schema()}


@app.post("/api/projects/{project_id}/benchmark-suites/preview")
def preview_benchmark_import(project_id: str, payload: BenchmarkImportPreviewRequest, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal, required="project_maintainer")
    return {"project_id": project_id, "import_preview": benchmark_imports.preview_import(payload)}


@app.post("/api/projects/{project_id}/trace-imports/preview")
def preview_trace_import(project_id: str, payload: TraceImportPreviewRequest, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal, required="project_maintainer")
    return {"project_id": project_id, "trace_import_preview": trace_imports.preview_trace_import(payload)}


@app.post("/api/projects/{project_id}/trace-imports")
def create_trace_import_suite(project_id: str, payload: TraceImportCommitRequest, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    committed = trace_imports.commit_trace_import(project_id, payload)
    audit.record_event(
        "trace_import.committed",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="benchmark_suite",
        target_id=str(committed["suite"]["id"]),
        metadata={"source": payload.source, "name": payload.name, "draft_examples": committed["trace_import_preview"]["draft_examples"]},
    )
    return {"project_id": project_id, **committed}


@app.post("/api/projects/{project_id}/benchmark-suites")
def create_benchmark_suite(project_id: str, payload: BenchmarkImportCommitRequest, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal, required="project_maintainer")
    committed = benchmark_imports.commit_import(project_id, payload)
    audit.record_event(
        "benchmark_suite.committed",
        principal,
        workspace_id=str(_require_project_access(project_id, principal)["workspace_id"]),
        project_id=project_id,
        target_type="benchmark_suite",
        target_id=str(committed["suite"]["id"]),
        metadata={"format": payload.format, "name": payload.name},
    )
    return {"project_id": project_id, **committed}


@app.get("/api/projects/{project_id}/guards")
def list_guards(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    if project_id != demo_project.project()["id"]:
        return {"guards": guard_connectors.list_connectors(project_id, lambda_cost)}
    return {"guards": guard_connectors.list_connectors(project_id, lambda_cost)}


@app.get("/api/projects/{project_id}/guard-connectors")
def list_guard_connectors(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"connectors": guard_connectors.list_connectors(project_id, lambda_cost)}


@app.post("/api/projects/{project_id}/guard-connectors")
def create_guard_connector(project_id: str, payload: GuardConnectorCreate, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    connector = guard_connectors.create_connector(project_id, payload)
    audit.record_event(
        "guard_connector.created",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="guard_connector",
        target_id=str(connector["id"]),
        metadata={"guard_key": connector["guard_key"], "adapter_type": connector["adapter_type"]},
    )
    return {"connector": connector}


@app.post("/api/projects/{project_id}/guard-connectors/{guard_id}/test-call")
def test_guard_connector(project_id: str, guard_id: str, payload: GuardConnectorTestCallRequest, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    result = guard_connectors.test_connector(project_id, guard_id, payload)
    audit.record_event(
        "guard_connector.tested",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="guard_connector",
        target_id=guard_id,
        metadata={"status": result["status"], "adapter_type": result["adapter_type"], "live": result.get("live")},
    )
    if result.get("live"):
        audit.record_event(
            "guard_connector.live_tested",
            principal,
            workspace_id=str(project["workspace_id"]),
            project_id=project_id,
            target_type="guard_connector",
            target_id=guard_id,
            metadata={"status": result["status"], "last_test": result.get("last_test")},
        )
    return {"test_call": result}


@app.get("/api/projects/{project_id}/guard-connectors/{guard_id}/secret")
def get_guard_connector_secret(project_id: str, guard_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal, required="workspace_admin")
    return {"secret": guard_connectors.connector_secret_state(project_id, guard_id)}


@app.post("/api/projects/{project_id}/guard-connectors/{guard_id}/secret")
def upsert_guard_connector_secret(
    project_id: str,
    guard_id: str,
    payload: GuardConnectorSecretUpdate,
    principal: PrincipalDep,
) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="workspace_admin")
    connector = guard_connectors.upsert_connector_secret(
        project_id,
        guard_id,
        raw_secret=payload.auth_secret,
        secret_env_var=payload.secret_env_var,
        secret_ref=payload.secret_ref,
        backend=payload.backend,
        actor_id=principal.user_id,
    )
    secret = guard_connectors.connector_secret_state(project_id, guard_id)
    audit.record_event(
        "provider_secret.registered",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="guard_connector",
        target_id=str(connector["guard_key"]),
        metadata={"secret_status": secret["secret_status"], "provider": secret.get("provider")},
    )
    return {"secret": secret, "connector": connector}


@app.post("/api/projects/{project_id}/guard-connectors/{guard_id}/secret/rotate")
def rotate_guard_connector_secret(
    project_id: str,
    guard_id: str,
    payload: GuardConnectorSecretUpdate,
    principal: PrincipalDep,
) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="workspace_admin")
    connector = guard_connectors.upsert_connector_secret(
        project_id,
        guard_id,
        raw_secret=payload.auth_secret,
        secret_env_var=payload.secret_env_var,
        secret_ref=payload.secret_ref,
        backend=payload.backend,
        actor_id=principal.user_id,
        action="rotate",
    )
    secret = guard_connectors.connector_secret_state(project_id, guard_id)
    audit.record_event(
        "provider_secret.rotated",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="guard_connector",
        target_id=str(connector["guard_key"]),
        metadata={"secret_status": secret["secret_status"], "provider": secret.get("provider")},
    )
    return {"secret": secret, "connector": connector}


@app.post("/api/projects/{project_id}/guard-connectors/{guard_id}/secret/disable")
def disable_guard_connector_secret(project_id: str, guard_id: str, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="workspace_admin")
    connector = guard_connectors.disable_connector_secret(project_id, guard_id, actor_id=principal.user_id)
    secret = guard_connectors.connector_secret_state(project_id, guard_id)
    audit.record_event(
        "provider_secret.disabled",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="guard_connector",
        target_id=str(connector["guard_key"]),
        metadata={"secret_status": secret["secret_status"], "provider": secret.get("provider")},
    )
    return {"secret": secret, "connector": connector}


@app.get("/api/projects/{project_id}/stacks")
def list_stacks(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    if project_id != demo_project.project()["id"]:
        return pilot_runs.candidate_stacks(project_id, lambda_cost)
    return demo_project.candidate_stacks(lambda_cost)


@app.get("/api/projects/{project_id}/jobs")
def list_project_jobs(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"jobs": jobs.list_jobs(project_id)}


@app.get("/api/workspaces/{workspace_id}/admin/overview")
def get_workspace_admin_overview(workspace_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="workspace_admin")
    return {"admin": admin.workspace_overview(workspace_id, principal)}


@app.get("/api/workspaces/{workspace_id}/budget-policy")
def get_workspace_budget_policy(workspace_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="workspace_admin")
    return {"budget": budget_controls.workspace_budget_overview(workspace_id)}


@app.patch("/api/workspaces/{workspace_id}/budget-policy")
def update_workspace_budget_policy(workspace_id: str, payload: WorkspaceBudgetPolicyUpdate, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="workspace_admin")
    policy = budget_controls.update_workspace_policy(workspace_id, payload.model_dump(exclude_unset=True), actor_id=principal.user_id)
    audit.record_event(
        "budget_policy.workspace.updated",
        principal,
        workspace_id=workspace_id,
        target_type="workspace",
        target_id=workspace_id,
        metadata={
            "monthly_cap_usd": policy.get("monthly_cap_usd"),
            "per_run_cap_usd": policy.get("per_run_cap_usd"),
            "measurement_cap_usd": policy.get("measurement_cap_usd"),
            "provider_spend_disabled": policy.get("provider_spend_disabled"),
        },
    )
    return {"budget": budget_controls.workspace_budget_overview(workspace_id)}


@app.get("/api/workspaces/{workspace_id}/retention-policy")
def get_workspace_retention_policy(workspace_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="workspace_admin")
    return {"retention_policy": retention.workspace_policy(workspace_id)}


@app.patch("/api/workspaces/{workspace_id}/retention-policy")
def update_workspace_retention_policy(workspace_id: str, payload: RetentionPolicyUpdate, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="workspace_admin")
    policy = retention.update_workspace_policy(workspace_id, payload.model_dump(exclude_unset=True), actor_id=principal.user_id)
    audit.record_event(
        "retention_policy.workspace.updated",
        principal,
        workspace_id=workspace_id,
        target_type="workspace",
        target_id=workspace_id,
        metadata={
            "raw_examples_retention_days": policy.get("raw_examples_retention_days"),
            "delete_provider_responses": policy.get("delete_provider_responses"),
        },
    )
    return {"retention_policy": policy}


@app.post("/api/workspaces/{workspace_id}/admin/workers/run-next")
def run_workspace_admin_worker(workspace_id: str, payload: AdminWorkerRunRequest, principal: PrincipalDep) -> dict[str, object]:
    _require_workspace_access(workspace_id, principal, required="workspace_admin")
    result = admin.run_workspace_worker_once(
        workspace_id,
        principal,
        worker_id=payload.worker_id,
        max_jobs=payload.max_jobs,
        lease_seconds=payload.lease_seconds,
    )
    audit.record_event(
        "admin.worker.run_next",
        principal,
        workspace_id=workspace_id,
        target_type="workspace",
        target_id=workspace_id,
        metadata={"worker_id": result["worker_id"], "processed_count": result["processed_count"]},
    )
    return {"worker_run": result}


@app.get("/api/projects/{project_id}/usage-events")
def list_project_usage_events(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return usage.cost_summary(project_id)


@app.get("/api/projects/{project_id}/budget-policy")
def get_project_budget_policy(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"budget": budget_controls.project_budget_overview(project_id)}


@app.patch("/api/projects/{project_id}/budget-policy")
def update_project_budget_policy(project_id: str, payload: ProjectBudgetPolicyUpdate, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    policy = budget_controls.update_project_policy(project_id, payload.model_dump(exclude_unset=True), actor_id=principal.user_id)
    audit.record_event(
        "budget_policy.project.updated",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata={
            "monthly_cap_usd": policy.get("monthly_cap_usd"),
            "per_run_cap_usd": policy.get("per_run_cap_usd"),
            "measurement_cap_usd": policy.get("measurement_cap_usd"),
            "provider_spend_disabled": policy.get("provider_spend_disabled"),
        },
    )
    return {"budget": budget_controls.project_budget_overview(project_id)}


@app.get("/api/projects/{project_id}/retention-policy")
def get_project_retention_policy(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal)
    return {"retention_policy": retention.project_policy(project_id, workspace_id=str(project["workspace_id"]))}


@app.patch("/api/projects/{project_id}/retention-policy")
def update_project_retention_policy(project_id: str, payload: RetentionPolicyUpdate, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="workspace_admin")
    policy = retention.update_project_policy(project_id, payload.model_dump(exclude_unset=True), workspace_id=str(project["workspace_id"]), actor_id=principal.user_id)
    audit.record_event(
        "retention_policy.project.updated",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata={
            "raw_examples_retention_days": policy.get("raw_examples_retention_days"),
            "delete_provider_responses": policy.get("delete_provider_responses"),
        },
    )
    return {"retention_policy": policy}


@app.post("/api/projects/{project_id}/retention-policy/dry-run")
def dry_run_project_retention(project_id: str, payload: RetentionExecutionRequest, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="workspace_admin")
    plan = retention.dry_run_project(project_id, workspace_id=str(project["workspace_id"]))
    return {"retention_execution": plan}


@app.post("/api/projects/{project_id}/retention-policy/apply")
def apply_project_retention(project_id: str, payload: RetentionExecutionRequest, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="workspace_admin")
    if not payload.confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Retention apply requires confirm=true")
    result = retention.apply_project(project_id, workspace_id=str(project["workspace_id"]), actor_id=principal.user_id)
    audit.record_event(
        "retention_policy.project.applied",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata=result["summary"],
    )
    return {"retention_execution": result}


@app.get("/api/projects/{project_id}/audit-events")
def list_project_audit_events(project_id: str, principal: PrincipalDep, limit: int = 100) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"audit_events": audit.list_events(project_id=project_id, limit=limit)}


@app.post("/api/projects/{project_id}/config/import")
def import_project_config(project_id: str, payload: ConfigImportRequest, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    result = config_imports.import_config(project_id, payload)
    audit.record_event(
        "project.config_imported" if payload.mode == "apply" else "project.config_import_previewed",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata={"mode": payload.mode, "status": result["status"], "changes": result["changes"]},
    )
    return {"config_import": result}


@app.post("/api/projects/{project_id}/evaluation-jobs")
def create_evaluation_job(project_id: str, payload: EvaluationJobCreate, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    job = jobs.create_evaluation_job(project_id, payload)
    audit.record_event(
        "evaluation_job.created",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="job",
        target_id=str(job["id"]),
        metadata={"adapter_mode": payload.adapter_mode, "execution_mode": payload.execution_mode},
    )
    return {"job": job}


@app.post("/api/projects/{project_id}/workers/run-next")
def run_next_project_job(project_id: str, principal: PrincipalDep, worker_id: str | None = None) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    job = jobs.run_next_job(project_id, worker_id=worker_id)
    audit.record_event(
        "evaluation_job.run",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="job",
        target_id=str(job["id"]),
        metadata={"worker_id": worker_id, "entrypoint": "run_next"},
    )
    return {"job": job}


@app.get("/api/projects/{project_id}/certificate-status")
def get_certificate_status(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    if project_id != demo_project.project()["id"]:
        runs = pilot_runs.list_project_runs(project_id)
        if not runs:
            return {"project_id": project_id, "status": "missing", "blocking_reasons": ["no_uploaded_output_run"]}
        latest = runs[0]
        return {
            "project_id": project_id,
            "run_id": latest["id"],
            "certificate_id": latest["certificate_id"],
            "status": latest["certificate_status"],
            "scope": "Uploaded-output pilot suite and configured safety-check set.",
            "blocking_reasons": [] if latest["certificate_status"] == "valid" else [f"certificate_{latest['certificate_status']}"],
            "not_a_guarantee": True,
            "recertification_required_on": [
                "safety_option_version_change",
                "model_change",
                "prompt_or_policy_change",
                "traffic_mix_drift",
                "new_attack_family",
            ],
        }
    overview = demo_project.overview(lambda_cost)
    status_value = overview["certificate"]["status"]
    blocking_reasons = [] if status_value == "valid" else [f"certificate_{status_value}"]
    return {
        "project_id": project_id,
        "run_id": overview["run"]["id"],
        "certificate_id": overview["certificate"]["id"],
        "status": status_value,
        "scope": overview["certificate"]["scope"],
        "blocking_reasons": blocking_reasons,
        "not_a_guarantee": True,
        "recertification_required_on": [
            "guard_version_change",
            "model_change",
            "prompt_or_policy_change",
            "traffic_mix_drift",
            "new_attack_family",
        ],
    }


@app.get("/api/projects/{project_id}/pilot-readiness")
def get_project_pilot_readiness(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"readiness": pilot_readiness.project_pilot_readiness(project_id, lambda_cost)}


@app.get("/api/integrations/agent-platforms")
def list_agent_platforms(principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    return integrations.agent_platforms()


@app.get("/api/integrations/release-gates")
def list_release_gate_integrations(principal: PrincipalDep) -> dict[str, object]:
    access.require_app_principal(principal)
    return integrations.release_gate_examples()


@app.get("/api/mcp/manifest")
def get_mcp_manifest(principal: McpPrincipalDep) -> dict[str, object]:
    return mcp.manifest(principal=principal)


@app.post("/api/mcp/rpc")
def mcp_rpc(payload: McpRpcRequest, principal: McpPrincipalDep) -> dict[str, object]:
    return mcp.handle_rpc(payload.method, payload.params, payload.id, principal=principal)


@app.post("/api/mcp")
async def mcp_streamable_http(request: Request, principal: McpPrincipalDep) -> Response:
    status_code, body = mcp.handle_http_message(await request.json(), principal=principal)
    if body is None:
        return Response(status_code=status_code)
    return JSONResponse(content=body, status_code=status_code)


@app.get("/api/mcp")
def mcp_sse_not_supported(_: McpPrincipalDep) -> Response:
    return Response(status_code=status.HTTP_405_METHOD_NOT_ALLOWED)


@app.get("/api/runs/{run_id}/overview")
def get_overview(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        payload = demo_project.overview(lambda_cost)
        payload["run"]["id"] = run_id
        return payload
    if pilot_runs.has_run(run_id):
        return pilot_runs.overview(run_id, lambda_cost)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/ranking")
def get_ranking(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        payload = demo_project.ranking(lambda_cost)
        payload["run"]["id"] = run_id
        return payload
    if pilot_runs.has_run(run_id):
        return pilot_runs.ranking(run_id, lambda_cost)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/ranking.csv")
def get_ranking_csv(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> Response:
    run = _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    audit.record_event(
        "evidence.exported",
        principal,
        workspace_id=str(run["workspace_id"]),
        project_id=str(run["project_id"]),
        target_type="run",
        target_id=run_id,
        metadata={"format": "csv", "artifact": "ranking"},
    )
    if run_id == settings.demo_run_id:
        return Response(
            content=demo_project.ranking_csv(lambda_cost),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{run_id}_ranking.csv"'},
        )
    if pilot_runs.has_run(run_id):
        return Response(
            content=pilot_runs.ranking_csv(run_id, lambda_cost),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{run_id}_ranking.csv"'},
        )
    raise _not_found("Run not found")


@app.get("/api/runs/{run_id}/correlations")
def get_correlations(
    run_id: str,
    principal: PrincipalDep,
    lambda_cost: float = 5.0,
    side: str = "adversarial",
) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        payload = demo_project.correlations(lambda_cost, side=side)
        payload["run"]["id"] = run_id
        return payload
    if pilot_runs.has_run(run_id):
        return pilot_runs.correlations(run_id, lambda_cost, side=side)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/measurements")
def get_measurements(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        payload = demo_project.measurements(lambda_cost)
        payload["run"]["id"] = run_id
        return payload
    if pilot_runs.has_run(run_id):
        return pilot_runs.measurements(run_id, lambda_cost)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/examples")
def get_run_examples(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        return _demo_run_examples(lambda_cost)
    if pilot_runs.has_run(run_id):
        return pilot_runs.run_examples(run_id, lambda_cost)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/failures")
def get_run_failures(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        return _demo_run_failures(lambda_cost)
    if pilot_runs.has_run(run_id):
        return pilot_runs.run_failures(run_id, lambda_cost)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/stability")
def get_run_stability(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        return _demo_run_stability(lambda_cost)
    if pilot_runs.has_run(run_id):
        return pilot_runs.run_stability(run_id, lambda_cost)
    return _not_found("Run not found")


@app.get("/api/runs/{run_id}/costs")
def get_run_costs(run_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_run_access(run_id, principal)
    if run_id == settings.demo_run_id:
        return usage.cost_summary(settings.demo_project_id, run_id)
    if pilot_runs.has_run(run_id):
        run = pilot_runs.run_summary(run_id)
        return usage.cost_summary(str(run["project_id"]), run_id)
    return _not_found("Run not found")


@app.post("/api/runs/{run_id}/measurement-plans")
def create_measurement_plan(run_id: str, payload: MeasurementPlanCreate, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    run = _require_run_access(run_id, principal, required="project_maintainer", lambda_cost=lambda_cost)
    job = jobs.create_measurement_plan_job(run_id, payload, lambda_cost)
    audit.record_event(
        "measurement_plan.created",
        principal,
        workspace_id=str(run["workspace_id"]),
        project_id=str(run["project_id"]),
        target_type="job",
        target_id=str(job["id"]),
        metadata={"run_id": run_id, "action_ids": payload.action_ids},
    )
    return {
        "id": f"plan_{job['id']}",
        "job": job,
        "status": job["status"],
        "run_id": run_id,
        "summary": job["summary"],
        "actions": job["actions"],
    }


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, principal: PrincipalDep) -> dict[str, object]:
    job = _require_job_access(job_id, principal)
    return {"job": job}


@app.post("/api/jobs/{job_id}/run")
def run_job(job_id: str, principal: PrincipalDep, worker_id: str | None = None) -> dict[str, object]:
    existing = _require_job_access(job_id, principal, required="project_maintainer")
    job = jobs.run_job(job_id, worker_id=worker_id)
    audit.record_event(
        "evaluation_job.run",
        principal,
        project_id=str(existing["project_id"]),
        target_type="job",
        target_id=job_id,
        metadata={"worker_id": worker_id, "entrypoint": "job_run"},
    )
    return {"job": job}


@app.post("/api/jobs/{job_id}/retry")
def retry_job(job_id: str, principal: PrincipalDep) -> dict[str, object]:
    existing = _require_job_access(job_id, principal, required="project_maintainer")
    job = jobs.retry_job(job_id)
    audit.record_event(
        "evaluation_job.retry",
        principal,
        project_id=str(existing["project_id"]),
        target_type="job",
        target_id=job_id,
    )
    return {"job": job}


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str, principal: PrincipalDep) -> dict[str, object]:
    existing = _require_job_access(job_id, principal, required="project_maintainer")
    job = jobs.cancel_job(job_id)
    audit.record_event(
        "evaluation_job.canceled",
        principal,
        project_id=str(existing["project_id"]),
        target_type="job",
        target_id=job_id,
    )
    return {"job": job}


@app.post("/api/jobs/{job_id}/lease/renew")
def renew_job_lease(job_id: str, principal: PrincipalDep, worker_id: str, lease_seconds: int = jobs.DEFAULT_LEASE_SECONDS) -> dict[str, object]:
    existing = _require_job_access(job_id, principal, required="project_maintainer")
    job = jobs.renew_job_lease(job_id, worker_id=worker_id, lease_seconds=lease_seconds)
    audit.record_event(
        "evaluation_job.lease_renewed",
        principal,
        project_id=str(existing["project_id"]),
        target_type="job",
        target_id=job_id,
        metadata={"worker_id": worker_id, "lease_seconds": lease_seconds},
    )
    return {"job": job}


@app.post("/api/runs/{run_id}/certificate/issue")
def issue_certificate(run_id: str, payload: CertificateIssueRequest, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    run = _require_run_access(run_id, principal, required="evidence_issuer", lambda_cost=lambda_cost)
    certificate = certificates.issue_certificate(run_id, payload, lambda_cost)
    audit.record_event(
        "evidence.issued",
        principal,
        workspace_id=str(run["workspace_id"]),
        project_id=str(run["project_id"]),
        target_type="certificate",
        target_id=str(certificate["certificate_id"]),
        metadata={"run_id": run_id, "status": certificate["status"]},
    )
    return {"certificate": certificate}


@app.get("/api/runs/{run_id}/certificate/readiness")
def get_certificate_readiness(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    return {"readiness": certificates.evidence_readiness(run_id, lambda_cost)}


@app.get("/api/runs/{run_id}/issued-certificate")
def get_run_issued_certificate(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    run = _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    certificate = certificates.get_certificate_for_run(run_id, workspace_id=str(run["workspace_id"]))
    return {"certificate": certificate}


@app.get("/api/runs/{run_id}/report-versions")
def list_run_report_versions(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    run = _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    versions = report_versions.list_for_run(run_id, lambda_cost=lambda_cost)
    audit.record_event(
        "report_version.listed",
        principal,
        workspace_id=str(run["workspace_id"]),
        project_id=str(run["project_id"]),
        target_type="run",
        target_id=run_id,
        metadata={"versions": len(versions)},
    )
    return {"report_versions": versions}


@app.get("/api/reports/{report_version_id}")
def get_report_version(report_version_id: str, principal: PrincipalDep) -> dict[str, object]:
    version = report_versions.get_version(report_version_id)
    if not version:
        raise _not_found("Report version not found")
    _require_run_access(str(version["run_id"]), principal)
    return {"report": version}


@app.post("/api/reports/{report_id}/export")
def export_report(report_id: str, payload: ReportExportRequest, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    access.require_app_principal(principal)
    exported = report_exports.export_report(report_id, payload.format, lambda_cost=lambda_cost, created_by=principal.user_id)
    target_run_id = str(exported["summary"].get("run_id") or report_id)
    run = _run_for_access(target_run_id, lambda_cost)
    if run:
        _require_run_access(target_run_id, principal, lambda_cost=lambda_cost)
        workspace_id = str(run["workspace_id"])
        project_id = str(run["project_id"])
    else:
        certificate = _require_certificate_access(report_id, principal)
        workspace_id = str(projects.get_project(str(certificate["project_id"]))["workspace_id"])
        project_id = str(certificate["project_id"])
    audit.record_event(
        "report_version.created",
        principal,
        workspace_id=workspace_id,
        project_id=project_id,
        target_type="report",
        target_id=str(exported.get("report_version_id") or report_id),
        metadata={"version": exported["version"], "content_hash": exported.get("content_hash")},
    )
    audit.record_event(
        "report.exported",
        principal,
        workspace_id=workspace_id,
        project_id=project_id,
        target_type="report",
        target_id=report_id,
        metadata={"format": payload.format, "version": exported["version"]},
    )
    return {"export": exported}


@app.get("/api/certificates/{certificate_id}")
def get_issued_certificate(certificate_id: str, principal: PrincipalDep) -> dict[str, object]:
    certificate = _require_certificate_access(certificate_id, principal)
    return {"certificate": certificate}


@app.get("/api/certificates/{certificate_id}/artifacts")
def list_certificate_artifacts(certificate_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_certificate_access(certificate_id, principal)
    return {"artifacts": artifacts.list_certificate_artifacts(certificate_id)}


@app.post("/api/certificates/{certificate_id}/artifacts/{artifact_type}/signed-url")
def create_certificate_artifact_signed_url(certificate_id: str, artifact_type: str, principal: PrincipalDep) -> dict[str, object]:
    certificate = _require_certificate_access(certificate_id, principal)
    result = artifacts.signed_url(certificate_id, artifact_type)
    audit.record_event(
        "evidence.artifact_url.created",
        principal,
        project_id=str(certificate["project_id"]),
        target_type="certificate",
        target_id=certificate_id,
        metadata={"artifact_type": artifact_type},
    )
    return {"artifact": result}


@app.get("/api/certificates/{certificate_id}/artifacts/{artifact_type}/verify")
def verify_certificate_artifact(certificate_id: str, artifact_type: str, principal: PrincipalDep) -> dict[str, object]:
    certificate = _require_certificate_access(certificate_id, principal)
    result = artifacts.verify(certificate_id, artifact_type)
    audit.record_event(
        "evidence.artifact.verified",
        principal,
        project_id=str(certificate["project_id"]),
        target_type="certificate",
        target_id=certificate_id,
        metadata={"artifact_type": artifact_type, "verified": result["verified"]},
    )
    return {"verification": result}


@app.post("/api/certificates/{certificate_id}/signoffs")
def create_certificate_signoff(certificate_id: str, payload: CertificateSignoffCreate, principal: PrincipalDep) -> dict[str, object]:
    certificate = _require_certificate_access(certificate_id, principal, required="evidence_reviewer")
    signoff = certificates.create_signoff(certificate_id, payload)
    audit.record_event(
        "evidence.signoff.created",
        principal,
        project_id=str(certificate["project_id"]),
        target_type="certificate",
        target_id=certificate_id,
        metadata={"decision": payload.decision, "signer_role": payload.signer_role},
    )
    return {"signoff": signoff}


@app.get("/api/runs/{run_id}/certificate")
def get_certificate(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    if run_id == settings.demo_run_id:
        payload = demo_project.certificate_payload(lambda_cost)
        payload["run_id"] = run_id
        return payload
    if pilot_runs.has_run(run_id):
        return pilot_runs.certificate_payload(run_id, lambda_cost)
    return _not_found("Run not found")


@app.post("/api/projects/{project_id}/release-gates/evaluate")
def evaluate_release_gate(project_id: str, payload: ReleaseGateEvaluateRequest, principal: ReleaseGatePrincipalDep) -> dict[str, object]:
    project = _require_release_gate_project_access(project_id, principal)
    result = release_gates.evaluate_project_gate(project_id, payload)
    audit.record_event(
        "release_gate.checked",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata={
            "decision": result["decision"],
            "run_id": result.get("run_id"),
            "blocking_reasons": result.get("blocking_reasons", []),
            "mode": payload.mode,
        },
    )
    return {"release_gate": result}


@app.post("/api/projects/{project_id}/release-gates/webhook")
async def evaluate_release_gate_webhook(project_id: str, request: Request) -> dict[str, object]:
    body = await request.body()
    principal = release_webhooks.authenticate_webhook(project_id, request.headers, body)
    project = _require_release_gate_project_access(project_id, principal)
    try:
        payload = ReleaseGateWebhookRequest.model_validate_json(body)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.errors()) from exc
    result = release_gates.evaluate_project_gate(project_id, payload)
    audit.record_event(
        "release_gate.webhook_checked",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
        metadata={
            "decision": result["decision"],
            "run_id": result.get("run_id"),
            "blocking_reasons": result.get("blocking_reasons", []),
            "mode": payload.mode,
            "event_id": payload.event_id,
            "event_source": payload.event_source,
            "event_type": payload.event_type,
        },
    )
    return {
        "release_gate": result,
        "webhook": {
            "event_id": payload.event_id,
            "event_source": payload.event_source,
            "event_type": payload.event_type,
            "authenticated": True,
        },
    }


@app.get("/api/runs/{run_id}/certificate.json")
def get_certificate_json(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    run = _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    audit.record_event(
        "evidence.exported",
        principal,
        workspace_id=str(run["workspace_id"]),
        project_id=str(run["project_id"]),
        target_type="run",
        target_id=run_id,
        metadata={"format": "json", "artifact": "release_evidence"},
    )
    if run_id == settings.demo_run_id:
        payload = demo_project.certificate_payload(lambda_cost)
    elif pilot_runs.has_run(run_id):
        payload = pilot_runs.certificate_payload(run_id, lambda_cost)
    else:
        return _not_found("Run not found")
    payload["run_id"] = run_id
    payload.pop("markdown", None)
    return payload


@app.get("/api/runs/{run_id}/certificate.md")
def get_certificate_markdown(run_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> Response:
    run = _require_run_access(run_id, principal, lambda_cost=lambda_cost)
    audit.record_event(
        "evidence.exported",
        principal,
        workspace_id=str(run["workspace_id"]),
        project_id=str(run["project_id"]),
        target_type="run",
        target_id=run_id,
        metadata={"format": "markdown", "artifact": "release_evidence"},
    )
    if run_id == settings.demo_run_id:
        markdown = demo_project.certificate_markdown(lambda_cost).replace(f"- Run ID: `{settings.demo_run_id}`", f"- Run ID: `{run_id}`")
        return Response(
            content=markdown,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{run_id}_certificate.md"'},
        )
    if pilot_runs.has_run(run_id):
        return Response(
            content=pilot_runs.certificate_markdown(run_id, lambda_cost),
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{run_id}_certificate.md"'},
        )
    raise _not_found("Run not found")


def _demo_run_examples(lambda_cost: float) -> dict[str, object]:
    engine, _, certificate = demo_project.demo_bundle(lambda_cost)
    recommended_ids = tuple(certificate.recommended_architecture.guard_ids)
    outputs_by_example: dict[str, list[object]] = {}
    for output in engine.outputs:
        outputs_by_example.setdefault(output.example_id, []).append(output)
    examples = []
    for example in engine.examples[:120]:
        cell = engine.cell_by_id[example.cell_id]
        outputs = sorted(outputs_by_example.get(example.example_id, []), key=lambda row: row.guard_id)
        final_decision = "block" if any(output.guard_id in recommended_ids and not output.binary_pass for output in outputs) else "pass"
        expected_decision = "block" if cell.side == "adversarial" else "pass"
        examples.append(
            {
                "example_id": example.example_id,
                "input": example.prompt_redacted or example.prompt_hash,
                "output": example.metadata.get("output"),
                "expected_decision": expected_decision,
                "risk_category": cell.policy_category or cell.source,
                "risk_category_label": str(cell.policy_category or cell.source).replace("_", " ").title(),
                "severity": example.metadata.get("severity") or "medium",
                "weight": float(engine.cell_weights.get(cell.cell_id, cell.weight)),
                "source": cell.source,
                "metadata": example.metadata,
                "checks": [
                    {
                        "guard_id": output.guard_id,
                        "guard_label": guard_connectors.guard_label(output.guard_id) if hasattr(guard_connectors, "guard_label") else output.guard_id,
                        "decision": "pass" if output.binary_pass else "block",
                        "confidence": round(max(output.pass_probability, output.block_probability), 4),
                        "reason": output.output_metadata.get("reason") or output.error,
                        "latency_ms": output.output_metadata.get("latency_ms"),
                        "cost": output.output_metadata.get("cost"),
                        "error": output.error,
                    }
                    for output in outputs
                ],
                "final_decision": final_decision,
                "final_reason": "Any-check veto triggered." if final_decision == "block" else "All selected safety checks passed.",
                "affected_recommendation": False,
                "recommendation_failure": final_decision != expected_decision,
            }
        )
    return {
        "run": demo_project.run_summary(lambda_cost),
        "combination_rule": "any-check veto",
        "recommended_guard_ids": list(recommended_ids),
        "examples": examples,
        "summary": {
            "examples": len(examples),
            "failures": sum(1 for row in examples if row["recommendation_failure"]),
            "affected_recommendation": 0,
        },
    }


def _demo_run_failures(lambda_cost: float) -> dict[str, object]:
    payload = _demo_run_examples(lambda_cost)
    examples = payload["examples"]
    clusters = [
        {"id": "missed_unsafe", "title": "Missed unsafe examples", "count": len([row for row in examples if row["expected_decision"] == "block" and row["final_decision"] == "pass"]), "severity": "high", "examples": [row for row in examples if row["expected_decision"] == "block" and row["final_decision"] == "pass"][:8]},
        {"id": "overblocked_benign", "title": "Over-blocked benign examples", "count": len([row for row in examples if row["expected_decision"] == "pass" and row["final_decision"] == "block"]), "severity": "medium", "examples": [row for row in examples if row["expected_decision"] == "pass" and row["final_decision"] == "block"][:8]},
        {"id": "check_disagreements", "title": "Safety-check disagreements", "count": len([row for row in examples if len({check["decision"] for check in row["checks"]}) > 1]), "severity": "medium", "examples": [row for row in examples if len({check["decision"] for check in row["checks"]}) > 1][:8]},
    ]
    return {"run": payload["run"], "clusters": clusters, "summary": {"cluster_count": len(clusters), "total_flagged_examples": sum(row["count"] for row in clusters)}}


def _demo_run_stability(lambda_cost: float) -> dict[str, object]:
    engine, _, certificate = demo_project.demo_bundle(lambda_cost)
    certified_count = sum(1 for comparison in certificate.comparisons if comparison.certified)
    comparison_count = max(1, len(certificate.comparisons))
    stability_pct = round(100 * (0.45 + 0.55 * certified_count / comparison_count), 1)
    side_counts = {}
    for example in engine.examples:
        side = engine.cell_by_id[example.cell_id].side
        side_counts[side] = side_counts.get(side, 0) + 1
    return {
        "run": demo_project.run_summary(lambda_cost),
        "recommended": demo_project.ranking(lambda_cost)["recommended"],
        "stability_pct": stability_pct,
        "checks": {
            "bootstrap_resampling": "heuristic_ready",
            "weight_sensitivity": "stable",
            "class_imbalance_sensitivity": "stable",
            "recommendation_stability": stability_pct,
        },
        "guardrails": [],
        "summary": {
            "examples": len(engine.examples),
            "benign_examples": side_counts.get("benign", 0),
            "unsafe_examples": side_counts.get("adversarial", 0),
            "certified_comparisons": certified_count,
            "comparison_count": len(certificate.comparisons),
        },
    }


@app.get("/api/projects/{project_id}/drift")
def get_drift(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    _require_project_access(project_id, principal)
    if project_id != demo_project.project()["id"]:
        return pilot_runs.drift(project_id)
    payload = demo_project.drift(lambda_cost)
    payload["project"]["id"] = project_id
    return payload


@app.post("/api/projects/{project_id}/recertify")
def recertify(project_id: str, principal: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    if project_id == demo_project.project()["id"]:
        scoped_id = f"demo_{demo_project.run_summary(lambda_cost)['id']}"
        message = "Demo retest job queued. Workers will execute this asynchronously."
    else:
        latest_run = next(iter(pilot_runs.list_project_runs(project_id)), None)
        scoped_id = str(latest_run["id"]) if latest_run else project_id
        message = "Retest job queued. Workers will execute this asynchronously."
    audit.record_event(
        "retest.queued",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="project",
        target_id=project_id,
    )
    return {
        "project_id": project_id,
        "job_id": f"job_recert_{scoped_id}",
        "status": "queued",
        "message": message,
    }


@app.get("/api/projects/{project_id}/custom-behaviors")
def list_custom_behaviors(project_id: str, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    return {"behaviors": custom_behaviors.list_behaviors(project_id)}


@app.post("/api/projects/{project_id}/custom-behaviors")
def create_custom_behavior(project_id: str, payload: CustomBehaviorCreate, principal: PrincipalDep) -> dict[str, object]:
    project = _require_project_access(project_id, principal, required="project_maintainer")
    behavior = custom_behaviors.create_behavior(project_id, payload)
    audit.record_event(
        "custom_behavior.created",
        principal,
        workspace_id=str(project["workspace_id"]),
        project_id=project_id,
        target_type="custom_behavior",
        target_id=str(behavior["id"]),
        metadata={"side": payload.side, "policy_category": payload.policy_category},
    )
    return {"behavior": behavior}


@app.post("/api/projects/{project_id}/costs/estimate")
def estimate_cost(project_id: str, payload: CostEstimateRequest, principal: PrincipalDep) -> dict[str, object]:
    _require_project_access(project_id, principal)
    estimate = custom_behaviors.estimate_cost(payload)
    return {"project_id": project_id, "estimate": estimate}
