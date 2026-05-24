from __future__ import annotations

from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from stackcert_service.config import settings
from stackcert_service.observability import configure_logging, request_middleware
from stackcert_service.security.auth import PrincipalDep
from stackcert_service.schemas import (
    BenchmarkImportCommitRequest,
    BenchmarkImportPreviewRequest,
    CertificateIssueRequest,
    CertificateSignoffCreate,
    CostEstimateRequest,
    CustomBehaviorCreate,
    EvaluationJobCreate,
    GuardConnectorCreate,
    MeasurementPlanCreate,
    McpRpcRequest,
    ProjectCreate,
    UploadedOutputRunCreate,
    WorkspaceCreate,
)
from stackcert_service.services import benchmark_imports
from stackcert_service.services import certificates
from stackcert_service.services import custom_behaviors
from stackcert_service.services import demo_project
from stackcert_service.services import guard_connectors
from stackcert_service.services import integrations
from stackcert_service.services import jobs
from stackcert_service.services import mcp
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects
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
app.middleware("http")(request_middleware)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/workspaces")
def list_workspaces(_: PrincipalDep) -> dict[str, object]:
    return {"workspaces": projects.list_workspaces()}


@app.post("/api/workspaces")
def create_workspace(payload: WorkspaceCreate, _: PrincipalDep) -> dict[str, object]:
    return {"workspace": projects.create_workspace(payload)}


@app.get("/api/projects")
def list_projects(_: PrincipalDep) -> dict[str, object]:
    return {"projects": projects.list_projects()}


@app.post("/api/workspaces/{workspace_id}/projects")
def create_project(workspace_id: str, payload: ProjectCreate, _: PrincipalDep) -> dict[str, object]:
    return {"project": projects.create_project(workspace_id, payload)}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str, _: PrincipalDep) -> dict[str, object]:
    return {"project": projects.get_project(project_id)}


@app.get("/api/projects/{project_id}/runs")
def list_runs(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if project_id != demo_project.project()["id"]:
        return {"runs": pilot_runs.list_project_runs(project_id)}
    return {"runs": [demo_project.run_summary(lambda_cost)]}


@app.post("/api/projects/{project_id}/runs/uploaded-outputs")
def create_uploaded_output_run(project_id: str, payload: UploadedOutputRunCreate, _: PrincipalDep) -> dict[str, object]:
    return {"run": pilot_runs.create_uploaded_output_run(project_id, payload)}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        return {"run": pilot_runs.run_summary(run_id)}
    run = demo_project.run_summary(lambda_cost)
    if run_id != run["id"]:
        return {"run": None}
    return {"run": run}


@app.get("/api/projects/{project_id}/benchmark-suites")
def list_benchmark_suites(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if project_id != demo_project.project()["id"]:
        return {"suites": benchmark_imports.list_committed_suites(project_id)}
    demo_payload = demo_project.benchmark_suites(lambda_cost)
    committed = benchmark_imports.list_committed_suites(project_id)
    return {"suites": committed + demo_payload["suites"]}


@app.post("/api/projects/{project_id}/benchmark-suites/preview")
def preview_benchmark_import(project_id: str, payload: BenchmarkImportPreviewRequest, _: PrincipalDep) -> dict[str, object]:
    if not projects.get_project(project_id):
        return {"project_id": project_id, "status": "invalid", "issues": [{"severity": "error", "code": "project_not_found", "message": "Project not found"}]}
    return {"project_id": project_id, "import_preview": benchmark_imports.preview_import(payload)}


@app.post("/api/projects/{project_id}/benchmark-suites")
def create_benchmark_suite(project_id: str, payload: BenchmarkImportCommitRequest, _: PrincipalDep) -> dict[str, object]:
    if not projects.get_project(project_id):
        return {"project_id": project_id, "status": "invalid", "issues": [{"severity": "error", "code": "project_not_found", "message": "Project not found"}]}
    committed = benchmark_imports.commit_import(project_id, payload)
    return {"project_id": project_id, **committed}


@app.get("/api/projects/{project_id}/guards")
def list_guards(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if project_id != demo_project.project()["id"]:
        return {"guards": guard_connectors.list_connectors(project_id, lambda_cost)}
    return {"guards": guard_connectors.list_connectors(project_id, lambda_cost)}


@app.get("/api/projects/{project_id}/guard-connectors")
def list_guard_connectors(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    return {"connectors": guard_connectors.list_connectors(project_id, lambda_cost)}


@app.post("/api/projects/{project_id}/guard-connectors")
def create_guard_connector(project_id: str, payload: GuardConnectorCreate, _: PrincipalDep) -> dict[str, object]:
    return {"connector": guard_connectors.create_connector(project_id, payload)}


@app.get("/api/projects/{project_id}/stacks")
def list_stacks(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if project_id != demo_project.project()["id"]:
        return pilot_runs.candidate_stacks(project_id, lambda_cost)
    return demo_project.candidate_stacks(lambda_cost)


@app.get("/api/projects/{project_id}/jobs")
def list_project_jobs(project_id: str, _: PrincipalDep) -> dict[str, object]:
    return {"jobs": jobs.list_jobs(project_id)}


@app.get("/api/projects/{project_id}/usage-events")
def list_project_usage_events(project_id: str, _: PrincipalDep) -> dict[str, object]:
    return usage.cost_summary(project_id)


@app.post("/api/projects/{project_id}/evaluation-jobs")
def create_evaluation_job(project_id: str, payload: EvaluationJobCreate, _: PrincipalDep) -> dict[str, object]:
    return {"job": jobs.create_evaluation_job(project_id, payload)}


@app.post("/api/projects/{project_id}/workers/run-next")
def run_next_project_job(project_id: str, _: PrincipalDep, worker_id: str | None = None) -> dict[str, object]:
    return {"job": jobs.run_next_job(project_id, worker_id=worker_id)}


@app.get("/api/projects/{project_id}/certificate-status")
def get_certificate_status(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
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


@app.get("/api/integrations/agent-platforms")
def list_agent_platforms(_: PrincipalDep) -> dict[str, object]:
    return integrations.agent_platforms()


@app.get("/api/mcp/manifest")
def get_mcp_manifest(_: PrincipalDep) -> dict[str, object]:
    return mcp.manifest()


@app.post("/api/mcp/rpc")
def mcp_rpc(payload: McpRpcRequest, _: PrincipalDep) -> dict[str, object]:
    return mcp.handle_rpc(payload.method, payload.params, payload.id)


@app.post("/api/mcp")
async def mcp_streamable_http(request: Request, _: PrincipalDep) -> Response:
    status_code, body = mcp.handle_http_message(await request.json())
    if body is None:
        return Response(status_code=status_code)
    return JSONResponse(content=body, status_code=status_code)


@app.get("/api/mcp")
def mcp_sse_not_supported(_: PrincipalDep) -> Response:
    return Response(status_code=status.HTTP_405_METHOD_NOT_ALLOWED)


@app.get("/api/runs/{run_id}/overview")
def get_overview(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        return pilot_runs.overview(run_id, lambda_cost)
    payload = demo_project.overview(lambda_cost)
    payload["run"]["id"] = run_id
    return payload


@app.get("/api/runs/{run_id}/ranking")
def get_ranking(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        return pilot_runs.ranking(run_id, lambda_cost)
    payload = demo_project.ranking(lambda_cost)
    payload["run"]["id"] = run_id
    return payload


@app.get("/api/runs/{run_id}/ranking.csv")
def get_ranking_csv(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> Response:
    if pilot_runs.has_run(run_id):
        return Response(
            content=pilot_runs.ranking_csv(run_id, lambda_cost),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{run_id}_ranking.csv"'},
        )
    return Response(
        content=demo_project.ranking_csv(lambda_cost),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{run_id}_ranking.csv"'},
    )


@app.get("/api/runs/{run_id}/correlations")
def get_correlations(
    run_id: str,
    _: PrincipalDep,
    lambda_cost: float = 5.0,
    side: str = "adversarial",
) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        return pilot_runs.correlations(run_id, lambda_cost, side=side)
    payload = demo_project.correlations(lambda_cost, side=side)
    payload["run"]["id"] = run_id
    return payload


@app.get("/api/runs/{run_id}/measurements")
def get_measurements(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        return pilot_runs.measurements(run_id, lambda_cost)
    payload = demo_project.measurements(lambda_cost)
    payload["run"]["id"] = run_id
    return payload


@app.get("/api/runs/{run_id}/costs")
def get_run_costs(run_id: str, _: PrincipalDep) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        run = pilot_runs.run_summary(run_id)
        return usage.cost_summary(str(run["project_id"]), run_id)
    return usage.cost_summary(settings.demo_project_id, run_id)


@app.post("/api/runs/{run_id}/measurement-plans")
def create_measurement_plan(run_id: str, payload: MeasurementPlanCreate, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    job = jobs.create_measurement_plan_job(run_id, payload, lambda_cost)
    return {
        "id": f"plan_{job['id']}",
        "job": job,
        "status": job["status"],
        "run_id": run_id,
        "summary": job["summary"],
        "actions": job["actions"],
    }


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, _: PrincipalDep) -> dict[str, object]:
    return {"job": jobs.get_job(job_id)}


@app.post("/api/jobs/{job_id}/run")
def run_job(job_id: str, _: PrincipalDep, worker_id: str | None = None) -> dict[str, object]:
    return {"job": jobs.run_job(job_id, worker_id=worker_id)}


@app.post("/api/jobs/{job_id}/retry")
def retry_job(job_id: str, _: PrincipalDep) -> dict[str, object]:
    return {"job": jobs.retry_job(job_id)}


@app.post("/api/runs/{run_id}/certificate/issue")
def issue_certificate(run_id: str, payload: CertificateIssueRequest, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    return {"certificate": certificates.issue_certificate(run_id, payload, lambda_cost)}


@app.get("/api/certificates/{certificate_id}")
def get_issued_certificate(certificate_id: str, _: PrincipalDep) -> dict[str, object]:
    return {"certificate": certificates.get_certificate(certificate_id)}


@app.post("/api/certificates/{certificate_id}/signoffs")
def create_certificate_signoff(certificate_id: str, payload: CertificateSignoffCreate, _: PrincipalDep) -> dict[str, object]:
    return {"signoff": certificates.create_signoff(certificate_id, payload)}


@app.get("/api/runs/{run_id}/certificate")
def get_certificate(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        return pilot_runs.certificate_payload(run_id, lambda_cost)
    payload = demo_project.certificate_payload(lambda_cost)
    payload["run_id"] = run_id
    return payload


@app.get("/api/runs/{run_id}/certificate.json")
def get_certificate_json(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if pilot_runs.has_run(run_id):
        payload = pilot_runs.certificate_payload(run_id, lambda_cost)
        payload.pop("markdown", None)
        return payload
    payload = demo_project.certificate_payload(lambda_cost)
    payload["run_id"] = run_id
    payload.pop("markdown", None)
    return payload


@app.get("/api/runs/{run_id}/certificate.md")
def get_certificate_markdown(run_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> Response:
    if pilot_runs.has_run(run_id):
        return Response(
            content=pilot_runs.certificate_markdown(run_id, lambda_cost),
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{run_id}_certificate.md"'},
        )
    markdown = demo_project.certificate_markdown(lambda_cost).replace(f"- Run ID: `{settings.demo_run_id}`", f"- Run ID: `{run_id}`")
    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{run_id}_certificate.md"'},
    )


@app.get("/api/projects/{project_id}/drift")
def get_drift(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    if project_id != demo_project.project()["id"]:
        return pilot_runs.drift(project_id)
    payload = demo_project.drift(lambda_cost)
    payload["project"]["id"] = project_id
    return payload


@app.post("/api/projects/{project_id}/recertify")
def recertify(project_id: str, _: PrincipalDep, lambda_cost: float = 5.0) -> dict[str, object]:
    return {
        "project_id": project_id,
        "job_id": f"job_recert_{demo_project.run_summary(lambda_cost)['id']}",
        "status": "queued",
        "message": "Demo recertification job queued. Production workers will execute this asynchronously.",
    }


@app.get("/api/projects/{project_id}/custom-behaviors")
def list_custom_behaviors(project_id: str, _: PrincipalDep) -> dict[str, object]:
    return {"behaviors": custom_behaviors.list_behaviors(project_id)}


@app.post("/api/projects/{project_id}/custom-behaviors")
def create_custom_behavior(project_id: str, payload: CustomBehaviorCreate, _: PrincipalDep) -> dict[str, object]:
    return {"behavior": custom_behaviors.create_behavior(project_id, payload)}


@app.post("/api/projects/{project_id}/costs/estimate")
def estimate_cost(project_id: str, payload: CostEstimateRequest, _: PrincipalDep) -> dict[str, object]:
    estimate = custom_behaviors.estimate_cost(payload)
    return {"project_id": project_id, "estimate": estimate}
