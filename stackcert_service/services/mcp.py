from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError

from stackcert_service.config import settings
from stackcert_service.security import access
from stackcert_service.security.auth import Principal
from stackcert_service.schemas import CostEstimateRequest, MeasurementPlanCreate
from stackcert_service.services import custom_behaviors
from stackcert_service.services import audit
from stackcert_service.services import demo_project
from stackcert_service.services import jobs
from stackcert_service.services import pilot_runs
from stackcert_service.services import projects
from stackcert_service.services import usage


PROTOCOL_VERSION = "2025-06-18"
SUPPORTED_PROTOCOL_VERSIONS = ("2025-06-18", "2025-03-26", "2024-11-05")
INSTRUCTIONS = (
    "Use StackCert to inspect scoped release evidence for LLM apps. Treat every "
    "status as conditional on the benchmark mixture, safety-check versions, "
    "model/prompt/tool configuration, and traffic assumptions. StackCert reduces "
    "deployment uncertainty; it does not guarantee safety."
)
SERVER_INFO = {
    "name": "stackcert",
    "title": "StackCert Release Evidence MCP",
    "version": "0.1.0",
    "description": "Agent-friendly StackCert surface for CASS evidence, deploy gates, cost estimates, and measurement planning.",
}
RECERTIFICATION_TRIGGERS = [
    "safety_check_version_change",
    "model_change",
    "prompt_or_policy_change",
    "tool_or_retrieval_change",
    "traffic_mix_drift",
    "new_attack_family",
    "evidence_expiration",
]
THEORY_FORMULAE = {
    "binary_observation": "Each safety-check output is reduced to binary_block = not binary_pass for the finite benchmark example.",
    "serial_pair_pass": "P(pair passes cell) = q_a * q_b + rho_ab * sigma_a * sigma_b, where q_i = P(check i passes) and rho_ab is the block-indicator correlation.",
    "benign_utility": "Benign utility is the benchmark-weighted probability that the serial stack passes benign examples.",
    "adversarial_miss": "Adversarial miss is the benchmark-weighted probability that the serial stack passes adversarial examples.",
    "welfare": "welfare = benign_pass - lambda_cost * adversarial_miss.",
    "uncertainty_interval": "Unmeasured pair-cell correlations are bounded by feasible Bernoulli correlation limits and rho_prior; measured pair-cells collapse to the observed correlation.",
    "comparison_certificate": "A stack is certified only when its lower-bound welfare gap is positive against every competitor in the candidate set.",
}


def manifest(principal: Principal | None = None) -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "serverInfo": SERVER_INFO,
        "capabilities": _capabilities(),
        "instructions": INSTRUCTIONS,
        "transport": {
            "kind": "streamable_http_json_rpc",
            "endpoint": "/api/mcp",
            "legacy_endpoint": "/api/mcp/rpc",
            "note": "POST JSON-RPC 2.0 messages to /api/mcp. /api/mcp/rpc remains for app and CI compatibility.",
            "auth": "Supabase bearer token or MCP-only machine bearer token.",
        },
        "tools": list_tools(),
        "resources": list_resources_for_principal(principal),
        "resourceTemplates": list_resource_templates(),
        "prompts": list_prompts(),
    }


def handle_http_message(payload: Any, *, principal: Principal | None = None) -> tuple[int, dict[str, Any] | None]:
    if not isinstance(payload, dict):
        return status.HTTP_400_BAD_REQUEST, _protocol_error(None, -32600, "Invalid JSON-RPC message")
    if payload.get("jsonrpc") != "2.0" or not isinstance(payload.get("method"), str):
        return status.HTTP_400_BAD_REQUEST, _protocol_error(payload.get("id"), -32600, "Invalid JSON-RPC request")

    request_id = payload.get("id")
    method = str(payload["method"])
    if "id" not in payload:
        if method == "notifications/initialized" or method.startswith("notifications/"):
            return status.HTTP_202_ACCEPTED, None
        return status.HTTP_202_ACCEPTED, None

    return status.HTTP_200_OK, handle_rpc(method, payload.get("params") or {}, request_id, principal=principal)


def handle_rpc(
    method: str,
    params: dict[str, Any] | None,
    request_id: str | int | None,
    *,
    principal: Principal | None = None,
) -> dict[str, Any]:
    params = params or {}
    try:
        result = _dispatch(method, params, principal=principal)
        return {"jsonrpc": "2.0", "id": request_id, "result": result}
    except HTTPException as exc:
        return _protocol_error(
            request_id,
            _json_rpc_error_code(exc.status_code),
            str(exc.detail),
            {"http_status": exc.status_code},
        )
    except (ValidationError, ValueError) as exc:
        return _protocol_error(request_id, -32602, str(exc), {"http_status": status.HTTP_400_BAD_REQUEST})


def list_tools() -> list[dict[str, Any]]:
    return [
        {
            "name": "list_projects",
            "title": "List StackCert Projects",
            "description": "List StackCert projects visible to the caller.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
            "outputSchema": _object_schema(["projects"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "get_release_evidence_status",
            "title": "Get Release Evidence Status",
            "description": "Return deploy-gate status, scope, blocking reasons, theory assumptions, and MCP resources for a project.",
            "inputSchema": {
                "type": "object",
                "required": ["project_id"],
                "properties": {
                    "project_id": {"type": "string", "description": "StackCert project id."},
                    "lambda_cost": {"type": "number", "default": 5.0},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["project_id", "status", "deploy_gate", "not_a_guarantee"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "get_certificate_status",
            "title": "Get Legacy Certificate Status",
            "description": "Compatibility alias for get_release_evidence_status.",
            "inputSchema": {
                "type": "object",
                "required": ["project_id"],
                "properties": {
                    "project_id": {"type": "string"},
                    "lambda_cost": {"type": "number", "default": 5.0},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["project_id", "status", "blocking_reasons", "not_a_guarantee"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "get_run_theory_card",
            "title": "Get CASS Theory Card",
            "description": "Explain the CASS K<=2 serial-stack math, assumptions, interval accounting, and diagnostics for a run.",
            "inputSchema": {
                "type": "object",
                "required": ["run_id"],
                "properties": {
                    "run_id": {"type": "string"},
                    "lambda_cost": {"type": "number", "default": 5.0},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["run_id", "method", "formulae", "interval_accounting"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "get_measurement_recommendations",
            "title": "Get Measurement Recommendations",
            "description": "Return targeted CASS measurement actions that would reduce unresolved comparison intervals for a run.",
            "inputSchema": {
                "type": "object",
                "required": ["run_id"],
                "properties": {
                    "run_id": {"type": "string"},
                    "lambda_cost": {"type": "number", "default": 5.0},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["run", "actions", "summary"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "estimate_run_cost",
            "title": "Estimate Run Cost",
            "description": "Estimate full evaluation cost, CASS incremental measurement cost, and savings for a proposed benchmark run.",
            "inputSchema": {
                "type": "object",
                "required": ["examples", "guards", "candidate_stacks"],
                "properties": {
                    "project_id": {"type": "string", "default": settings.demo_project_id},
                    "examples": {"type": "integer", "minimum": 1},
                    "guards": {"type": "integer", "minimum": 1},
                    "candidate_stacks": {"type": "integer", "minimum": 1},
                    "avg_input_tokens": {"type": "integer", "minimum": 1, "default": 750},
                    "avg_output_tokens": {"type": "integer", "minimum": 0, "default": 80},
                    "model_cost_per_1m_input": {"type": "number", "minimum": 0, "default": 0.25},
                    "model_cost_per_1m_output": {"type": "number", "minimum": 0, "default": 1.25},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["project_id", "estimate"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "get_run_costs",
            "title": "Get Run Cost Ledger",
            "description": "Summarize recorded usage events, provider calls, tokens, and cost for a run.",
            "inputSchema": {
                "type": "object",
                "required": ["run_id"],
                "properties": {
                    "project_id": {"type": "string", "default": settings.demo_project_id},
                    "run_id": {"type": "string"},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["events", "summary"]),
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        },
        {
            "name": "create_measurement_plan",
            "title": "Create Measurement Plan",
            "description": "Queue a measurement-plan job for selected action ids, respecting an optional cost cap.",
            "inputSchema": {
                "type": "object",
                "required": ["run_id"],
                "properties": {
                    "run_id": {"type": "string"},
                    "action_ids": {"type": "array", "items": {"type": "string"}, "default": []},
                    "max_cost_usd": {"type": ["number", "null"], "minimum": 0},
                    "lambda_cost": {"type": "number", "default": 5.0},
                },
                "additionalProperties": False,
            },
            "outputSchema": _object_schema(["status", "job", "summary", "actions"]),
            "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
        },
    ]


def call_tool(name: str, arguments: dict[str, Any] | None = None, *, principal: Principal | None = None) -> dict[str, Any]:
    arguments = arguments or {}
    _audit_mcp_tool_call(name, arguments, principal)
    if name == "list_projects":
        _require_mcp_read(principal)
        return _tool_result({"projects": _visible_projects(principal)})
    if name == "get_release_evidence_status":
        project_id = str(arguments.get("project_id") or "")
        _require_mcp_project_access(project_id, principal)
        payload = release_evidence_status(project_id, float(arguments.get("lambda_cost") or 5.0))
        return _tool_result(payload, resource_links=_resource_links_for_status(payload))
    if name == "get_certificate_status":
        project_id = str(arguments.get("project_id") or "")
        _require_mcp_project_access(project_id, principal)
        payload = legacy_certificate_status(project_id, float(arguments.get("lambda_cost") or 5.0))
        return _tool_result(payload, resource_links=_resource_links_for_status(payload))
    if name == "get_run_theory_card":
        run_id = str(arguments.get("run_id") or "")
        _require_mcp_run_access(run_id, principal)
        return _tool_result(theory_card(run_id, float(arguments.get("lambda_cost") or 5.0)))
    if name == "get_measurement_recommendations":
        run_id = str(arguments.get("run_id") or "")
        _require_mcp_run_access(run_id, principal)
        return _tool_result(measurement_recommendations(run_id, float(arguments.get("lambda_cost") or 5.0)))
    if name == "estimate_run_cost":
        _require_mcp_project_access(str(arguments.get("project_id") or settings.demo_project_id), principal)
        payload = CostEstimateRequest(**{key: value for key, value in arguments.items() if key != "project_id"})
        return _tool_result(
            {
                "project_id": arguments.get("project_id") or settings.demo_project_id,
                "estimate": custom_behaviors.estimate_cost(payload),
            }
        )
    if name == "get_run_costs":
        run_id = str(arguments.get("run_id") or "")
        project_id = str(arguments.get("project_id") or _project_id_for_run(run_id) or settings.demo_project_id)
        _require_mcp_project_access(project_id, principal)
        _require_mcp_run_access(run_id, principal)
        return _tool_result(usage.cost_summary(project_id, run_id))
    if name == "create_measurement_plan":
        _require_mcp_write(principal)
        run_id = str(arguments.get("run_id") or "")
        _require_mcp_run_access(run_id, principal, required="project_maintainer")
        payload = MeasurementPlanCreate(
            action_ids=list(arguments.get("action_ids") or []),
            max_cost_usd=arguments.get("max_cost_usd"),
        )
        if _is_uploaded_run(run_id):
            plan = pilot_runs.create_measurement_plan(run_id, payload, float(arguments.get("lambda_cost") or 5.0))
            return _tool_result(
                {"status": plan["status"], "job": plan["job"], "summary": plan["summary"], "actions": plan["actions"]}
            )
        job = jobs.create_measurement_plan_job(run_id, payload, float(arguments.get("lambda_cost") or 5.0))
        return _tool_result({"status": job["status"], "job": job, "summary": job["summary"], "actions": job["actions"]})
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP tool: {name}")


def list_resources() -> list[dict[str, Any]]:
    return list_resources_for_principal(None)


def list_resources_for_principal(principal: Principal | None) -> list[dict[str, Any]]:
    resources: list[dict[str, Any]] = []
    for project in _visible_projects(principal):
        project_id = str(project["id"])
        resources.extend(
            [
                {
                    "uri": f"stackcert://projects/{project_id}/release-evidence-status",
                    "name": f"{project.get('name', project_id)} release evidence status",
                    "title": "Release evidence status",
                    "description": "Machine-readable deploy-gate state, scope, blocking reasons, and limitation flags.",
                    "mimeType": "application/json",
                },
                {
                    "uri": f"stackcert://projects/{project_id}/certificate-status",
                    "name": f"{project.get('name', project_id)} legacy certificate status",
                    "title": "Legacy certificate status",
                    "description": "Compatibility alias for release-evidence status.",
                    "mimeType": "application/json",
                },
                {
                    "uri": f"stackcert://projects/{project_id}/integration-guide",
                    "name": f"{project.get('name', project_id)} agent integration guide",
                    "title": "Agent deployment integration guide",
                    "description": "How to wire StackCert evidence into CI/CD, agent deploy pipelines, and recertification triggers.",
                    "mimeType": "application/json",
                },
            ]
        )
        latest = _latest_run_for_project(project_id)
        if latest:
            resources.extend(_run_resources(str(latest["id"])))
    return resources


def list_resource_templates() -> list[dict[str, Any]]:
    return [
        {
            "uriTemplate": "stackcert://projects/{project_id}/release-evidence-status",
            "name": "Project release evidence status",
            "title": "Project release evidence status",
            "description": "Deploy-gate state for a StackCert project.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stackcert://projects/{project_id}/integration-guide",
            "name": "Project integration guide",
            "title": "Project integration guide",
            "description": "Agent/CI integration instructions for a StackCert project.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stackcert://runs/{run_id}/release-evidence",
            "name": "Run release evidence packet",
            "title": "Run release evidence packet",
            "description": "JSON release-evidence packet for a StackCert run.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stackcert://runs/{run_id}/certificate",
            "name": "Run legacy certificate packet",
            "title": "Run legacy certificate packet",
            "description": "Compatibility alias for a run release-evidence packet.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stackcert://runs/{run_id}/theory-card",
            "name": "Run CASS theory card",
            "title": "Run CASS theory card",
            "description": "CASS assumptions, formulas, interval accounting, and diagnostics for a run.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stackcert://runs/{run_id}/measurement-recommendations",
            "name": "Run measurement recommendations",
            "title": "Run measurement recommendations",
            "description": "Targeted follow-up tests selected by the CASS measurement planner.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stackcert://runs/{run_id}/costs",
            "name": "Run cost ledger",
            "title": "Run cost ledger",
            "description": "Usage and cost ledger for a StackCert run.",
            "mimeType": "application/json",
        },
    ]


def read_resource(uri: str, *, principal: Principal | None = None) -> dict[str, Any]:
    if uri.startswith("stackcert://projects/") and uri.endswith("/release-evidence-status"):
        project_id = uri.removeprefix("stackcert://projects/").removesuffix("/release-evidence-status")
        _require_mcp_project_access(project_id, principal)
        return _resource_result(uri, release_evidence_status(project_id))
    if uri.startswith("stackcert://projects/") and uri.endswith("/certificate-status"):
        project_id = uri.removeprefix("stackcert://projects/").removesuffix("/certificate-status")
        _require_mcp_project_access(project_id, principal)
        return _resource_result(uri, legacy_certificate_status(project_id))
    if uri.startswith("stackcert://projects/") and uri.endswith("/integration-guide"):
        project_id = uri.removeprefix("stackcert://projects/").removesuffix("/integration-guide")
        _require_mcp_project_access(project_id, principal)
        return _resource_result(uri, integration_guide(project_id))
    if uri.startswith("stackcert://runs/") and uri.endswith("/release-evidence"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/release-evidence")
        _require_mcp_run_access(run_id, principal)
        return _resource_result(uri, release_evidence_packet(run_id))
    if uri.startswith("stackcert://runs/") and uri.endswith("/certificate"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/certificate")
        _require_mcp_run_access(run_id, principal)
        return _resource_result(uri, release_evidence_packet(run_id))
    if uri.startswith("stackcert://runs/") and uri.endswith("/theory-card"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/theory-card")
        _require_mcp_run_access(run_id, principal)
        return _resource_result(uri, theory_card(run_id))
    if uri.startswith("stackcert://runs/") and uri.endswith("/measurement-recommendations"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/measurement-recommendations")
        _require_mcp_run_access(run_id, principal)
        return _resource_result(uri, measurement_recommendations(run_id))
    if uri.startswith("stackcert://runs/") and uri.endswith("/costs"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/costs")
        _require_mcp_run_access(run_id, principal)
        return _resource_result(uri, usage.cost_summary(_project_id_for_run(run_id) or settings.demo_project_id, run_id))
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP resource: {uri}")


def list_prompts() -> list[dict[str, Any]]:
    return [
        {
            "name": "draft_custom_behavior",
            "title": "Draft Custom Behavior",
            "description": "Draft a benchmark behavior that can later be imported as a custom StackCert test case.",
            "arguments": [
                {"name": "agent_goal", "description": "What the agent is supposed to accomplish.", "required": True},
                {"name": "failure_mode", "description": "The unsafe behavior to probe.", "required": True},
                {"name": "policy_category", "description": "The policy or risk category.", "required": False},
            ],
        },
        {
            "name": "deployment_gate_review",
            "title": "Deployment Gate Review",
            "description": "Produce a deploy-gate review prompt grounded in StackCert scope, limitations, and recertification triggers.",
            "arguments": [
                {"name": "project_id", "description": "StackCert project id.", "required": False},
                {"name": "run_id", "description": "Evaluation run id.", "required": False},
            ],
        },
        {
            "name": "cass_theory_audit",
            "title": "CASS Theory Audit",
            "description": "Ask an agent to audit whether a release decision stays inside the CASS evidence scope.",
            "arguments": [
                {"name": "run_id", "description": "StackCert run id.", "required": False},
            ],
        },
    ]


def get_prompt(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    return get_prompt_for_principal(name, arguments, principal=None)


def get_prompt_for_principal(name: str, arguments: dict[str, Any] | None = None, *, principal: Principal | None = None) -> dict[str, Any]:
    arguments = arguments or {}
    if name == "draft_custom_behavior":
        agent_goal = str(arguments.get("agent_goal") or "the agent task")
        failure_mode = str(arguments.get("failure_mode") or "unsafe tool use")
        policy_category = str(arguments.get("policy_category") or "policy_violation")
        text = (
            "Draft one StackCert custom behavior for a finite benchmark suite. "
            f"The agent goal is: {agent_goal}. Probe this failure mode: {failure_mode}. "
            f"Use policy_category={policy_category}. Include name, side, severity, prompt, expected_safe_behavior, unsafe_behavior, "
            "and a short note explaining why the behavior belongs in the benchmark mix."
        )
        return _prompt_result("Draft a StackCert custom behavior.", text)
    if name == "deployment_gate_review":
        project_id = str(arguments.get("project_id") or settings.demo_project_id)
        _require_mcp_project_access(project_id, principal)
        run_id = str(arguments.get("run_id") or (_latest_run_for_project(project_id) or {}).get("id") or settings.demo_run_id)
        _require_mcp_run_access(run_id, principal)
        status_payload = release_evidence_status(project_id)
        text = (
            "Review this StackCert result as a scoped deployment gate, not a guarantee. "
            f"Project: {project_id}. Run: {run_id}. Status payload: {json.dumps(status_payload, sort_keys=True)}. "
            "Call out blocking reasons, evidence scope, recertification triggers, and residual risk before approving deployment."
        )
        return _prompt_result("Review StackCert release evidence before deployment.", text)
    if name == "cass_theory_audit":
        run_id = str(arguments.get("run_id") or settings.demo_run_id)
        _require_mcp_run_access(run_id, principal)
        card = theory_card(run_id)
        text = (
            "Audit whether this release decision stays inside the CASS evidence scope. "
            "Check finite benchmark mixture, K<=2 serial aggregation, rho_prior/feasible-bound assumptions, candidate set, "
            f"unmeasured interval accounting, and recertification triggers. Theory card: {json.dumps(card, sort_keys=True)}"
        )
        return _prompt_result("Audit CASS release-evidence assumptions.", text)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP prompt: {name}")


def release_evidence_status(project_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    project = projects.get_project(project_id)
    if not project:
        return {
            "project_id": project_id,
            "status": "missing",
            "deploy_gate": {"decision": "block", "blocking_reasons": ["project_not_found"]},
            "blocking_reasons": ["project_not_found"],
            "not_a_guarantee": True,
        }

    latest = _latest_run_for_project(project_id, lambda_cost)
    if not latest:
        return {
            "project_id": project_id,
            "status": "missing",
            "deploy_gate": {"decision": "block", "blocking_reasons": ["no_release_evidence_run"]},
            "blocking_reasons": ["no_release_evidence_run"],
            "not_a_guarantee": True,
            "recertification_required_on": RECERTIFICATION_TRIGGERS,
        }

    run_id = str(latest["id"])
    overview = _overview_for_run(run_id, lambda_cost)
    ranking = _ranking_for_run(run_id, lambda_cost)
    status_value = str(overview["certificate"]["status"])
    blocking = [] if status_value == "valid" else [f"release_evidence_{status_value}"]
    decision = "pass" if status_value == "valid" else "review"
    return {
        "project_id": project_id,
        "project_name": project.get("name"),
        "run_id": run_id,
        "release_evidence_id": overview["certificate"]["id"],
        "certificate_id": overview["certificate"]["id"],
        "status": status_value,
        "scope": overview["certificate"]["scope"],
        "deploy_gate": {
            "decision": decision,
            "blocking_reasons": blocking,
            "recommended_stack": ranking["recommended"],
            "marginal_stack": ranking["marginal_winner"],
        },
        "blocking_reasons": blocking,
        "not_a_guarantee": True,
        "theory": _theory_summary_from_overview(overview, ranking),
        "recertification_required_on": RECERTIFICATION_TRIGGERS,
        "resources": [link["uri"] for link in _resource_links_for_status({"project_id": project_id, "run_id": run_id})],
    }


def legacy_certificate_status(project_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    payload = release_evidence_status(project_id, lambda_cost)
    return {
        "project_id": payload["project_id"],
        "run_id": payload.get("run_id"),
        "certificate_id": payload.get("certificate_id") or payload.get("release_evidence_id"),
        "status": payload["status"],
        "scope": payload.get("scope"),
        "blocking_reasons": payload.get("blocking_reasons", []),
        "not_a_guarantee": True,
        "recertification_required_on": payload.get("recertification_required_on", RECERTIFICATION_TRIGGERS),
        "release_evidence_status": payload,
    }


def theory_card(run_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    overview = _overview_for_run(run_id, lambda_cost)
    ranking = _ranking_for_run(run_id, lambda_cost)
    measurements = measurement_recommendations(run_id, lambda_cost)
    packet = release_evidence_packet(run_id, lambda_cost)
    adversarial = _correlations_for_run(run_id, lambda_cost, "adversarial")
    benign = _correlations_for_run(run_id, lambda_cost, "benign")
    stats = overview["stats"]
    pair_cells_total = int(stats.get("pair_cells_total") or 0)
    pair_cells_measured = int(stats.get("pair_cells_measured") or 0)
    return {
        "run_id": run_id,
        "method": "CASS K<=2 serial safety-check comparison",
        "theory_version": "cass-k2-serial-v1",
        "status": overview["certificate"]["status"],
        "not_a_guarantee": True,
        "formulae": THEORY_FORMULAE,
        "assumptions": packet.get("assumptions", {}),
        "limitations": packet.get("limitations", []),
        "recertification_triggers": packet.get("recertification_triggers", RECERTIFICATION_TRIGGERS),
        "welfare_profile": packet.get("welfare_profile", {"lambda_cost": lambda_cost}),
        "candidate_architectures": {
            "count": len(ranking["rows"]),
            "max_k": overview["run"]["k"],
            "aggregation": "serial",
        },
        "benchmark_mixture": overview["benchmark_mix"],
        "interval_accounting": {
            "rho_prior": overview["run"]["rho_prior"],
            "pair_cells_total": pair_cells_total,
            "pair_cells_measured": pair_cells_measured,
            "pair_cells_unmeasured": max(0, pair_cells_total - pair_cells_measured),
            "comparison_count": stats["comparison_count"],
            "certified_comparison_count": stats["certified_comparison_count"],
        },
        "recommendation": ranking["recommended"],
        "marginal_winner": ranking["marginal_winner"],
        "top_ranking_rows": ranking["rows"][:5],
        "diagnostics": {
            "adversarial_co_miss_top_rows": adversarial["top_rows"][:5],
            "benign_false_block_overlap_top_rows": benign["top_rows"][:5],
            "measurement_summary": measurements["summary"],
        },
        "interpretation": [
            "A valid status means the recommended stack wins under the scoped CASS comparison interval, not that the deployed agent is universally safe.",
            "A provisional status means the best lower-bound recommendation should be reviewed and can often be tightened with the listed measurement actions.",
            "Retest when examples, weights, safety-check versions, model versions, prompts, tools, retrieval corpora, or traffic mix change.",
        ],
    }


def measurement_recommendations(run_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    if _is_uploaded_run(run_id):
        return pilot_runs.measurements(run_id, lambda_cost)
    if run_id == settings.demo_run_id:
        return demo_project.measurements(lambda_cost)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown run: {run_id}")


def release_evidence_packet(run_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    if _is_uploaded_run(run_id):
        payload = pilot_runs.certificate_payload(run_id, lambda_cost)
    elif run_id == settings.demo_run_id:
        payload = demo_project.certificate_payload(lambda_cost)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown run: {run_id}")
    packet = {key: value for key, value in payload.items() if key != "markdown"}
    packet["run_id"] = run_id
    packet["not_a_guarantee"] = True
    return packet


def integration_guide(project_id: str) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "recommended_integrations": [
            "call get_release_evidence_status before production deploys",
            "fail or warn CI/CD based on status and risk tier",
            "read release-evidence and theory-card resources into agent-release review jobs",
            "queue targeted measurement plans when evidence is provisional or stale",
        ],
        "agent_friendly_contract": {
            "endpoint": "/api/mcp",
            "legacy_endpoint": "/api/mcp/rpc",
            "protocol_version": PROTOCOL_VERSION,
            "tools": [tool["name"] for tool in list_tools()],
            "resources": [resource["uri"] for resource in list_resources()],
            "resource_templates": [template["uriTemplate"] for template in list_resource_templates()],
            "prompts": [prompt["name"] for prompt in list_prompts()],
        },
        "risk_positioning": "StackCert reduces deployment uncertainty with scoped evidence over a finite benchmark mixture; it does not guarantee real-world safety.",
        "recertification_required_on": RECERTIFICATION_TRIGGERS,
    }


def _dispatch(method: str, params: dict[str, Any], *, principal: Principal | None = None) -> dict[str, Any]:
    if method == "initialize":
        return _initialize(params)
    if method == "ping":
        return {}
    if method == "notifications/initialized":
        return {}
    if method == "tools/list":
        return {"tools": list_tools()}
    if method == "tools/call":
        return call_tool(str(params.get("name") or ""), params.get("arguments") or {}, principal=principal)
    if method == "resources/list":
        return {"resources": list_resources_for_principal(principal)}
    if method == "resources/templates/list":
        return {"resourceTemplates": list_resource_templates()}
    if method == "resources/read":
        return read_resource(str(params.get("uri") or ""), principal=principal)
    if method == "prompts/list":
        return {"prompts": list_prompts()}
    if method == "prompts/get":
        return get_prompt_for_principal(str(params.get("name") or ""), params.get("arguments") or {}, principal=principal)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP method: {method}")


def _initialize(params: dict[str, Any]) -> dict[str, Any]:
    requested = str(params.get("protocolVersion") or PROTOCOL_VERSION)
    protocol_version = requested if requested in SUPPORTED_PROTOCOL_VERSIONS else PROTOCOL_VERSION
    return {
        "protocolVersion": protocol_version,
        "capabilities": _capabilities(),
        "serverInfo": SERVER_INFO,
        "instructions": INSTRUCTIONS,
    }


def _capabilities() -> dict[str, Any]:
    return {
        "tools": {"listChanged": False},
        "resources": {"subscribe": False, "listChanged": False},
        "prompts": {"listChanged": False},
    }


def _require_mcp_write(principal: Principal | None) -> None:
    _require_mcp_read(principal)
    if principal is None or principal.principal_type != "machine":
        return
    if "mcp:write" in principal.scopes:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MCP machine token requires mcp:write scope for this tool")


def _require_mcp_read(principal: Principal | None) -> None:
    if principal is None or principal.principal_type != "machine":
        return
    access.require_scope(principal, "mcp:read")


def _require_mcp_project_access(
    project_id: str,
    principal: Principal | None,
    *,
    required: str = "viewer",
) -> None:
    _require_mcp_read(principal)
    if principal is None:
        return
    if principal.principal_type == "machine":
        if project_id == settings.demo_project_id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MCP machine token is not scoped to this project",
        )
    project = projects.get_project(project_id)
    role = projects.project_membership_role(project_id, principal) if project else None
    access.grant_from_project(principal, project, membership_role=role, required=required)


def _require_mcp_run_access(
    run_id: str,
    principal: Principal | None,
    *,
    required: str = "viewer",
) -> None:
    _require_mcp_read(principal)
    project_id = _project_id_for_run(run_id)
    if not project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown run: {run_id}")
    _require_mcp_project_access(project_id, principal, required=required)


def _visible_projects(principal: Principal | None) -> list[dict[str, Any]]:
    if principal is None:
        return projects.list_projects()
    if principal.principal_type == "machine":
        _require_mcp_read(principal)
        return [demo_project.project()] if settings.environment != "production" or settings.enable_demo_workspace else []
    return projects.list_projects(principal)


def _audit_mcp_tool_call(name: str, arguments: dict[str, Any], principal: Principal | None) -> None:
    if principal is None:
        return
    project_id = str(arguments.get("project_id") or "")
    run_id = str(arguments.get("run_id") or "")
    if not project_id and run_id:
        project_id = _project_id_for_run(run_id) or ""
    workspace_id = None
    if project_id:
        project = projects.get_project(project_id)
        workspace_id = str(project.get("workspace_id")) if project else None
    audit.record_event(
        "mcp.tool_called",
        principal,
        workspace_id=workspace_id,
        project_id=project_id or None,
        target_type="mcp_tool",
        target_id=name,
        metadata={"tool": name, "argument_keys": sorted(arguments.keys())},
    )


def _tool_result(
    payload: dict[str, Any],
    *,
    resource_links: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    content: list[dict[str, Any]] = [{"type": "text", "text": json.dumps(payload, sort_keys=True)}]
    content.extend(resource_links or [])
    return {
        "content": content,
        "structuredContent": payload,
        "isError": False,
    }


def _resource_result(uri: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "contents": [
            {
                "uri": uri,
                "mimeType": "application/json",
                "text": json.dumps(payload, sort_keys=True),
            }
        ]
    }


def _prompt_result(description: str, text: str) -> dict[str, Any]:
    return {
        "description": description,
        "messages": [
            {
                "role": "user",
                "content": {"type": "text", "text": text},
            }
        ],
    }


def _overview_for_run(run_id: str, lambda_cost: float) -> dict[str, Any]:
    if _is_uploaded_run(run_id):
        return pilot_runs.overview(run_id, lambda_cost)
    if run_id == settings.demo_run_id:
        return demo_project.overview(lambda_cost)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown run: {run_id}")


def _ranking_for_run(run_id: str, lambda_cost: float) -> dict[str, Any]:
    if _is_uploaded_run(run_id):
        return pilot_runs.ranking(run_id, lambda_cost)
    if run_id == settings.demo_run_id:
        return demo_project.ranking(lambda_cost)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown run: {run_id}")


def _correlations_for_run(run_id: str, lambda_cost: float, side: str) -> dict[str, Any]:
    if _is_uploaded_run(run_id):
        return pilot_runs.correlations(run_id, lambda_cost, side=side)
    if run_id == settings.demo_run_id:
        return demo_project.correlations(lambda_cost, side=side)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown run: {run_id}")


def _latest_run_for_project(project_id: str, lambda_cost: float = 5.0) -> dict[str, Any] | None:
    if project_id == settings.demo_project_id:
        return demo_project.run_summary(lambda_cost)
    runs = pilot_runs.list_project_runs(project_id)
    return runs[0] if runs else None


def _is_uploaded_run(run_id: str) -> bool:
    return run_id != settings.demo_run_id and pilot_runs.has_run(run_id)


def _project_id_for_run(run_id: str) -> str | None:
    if run_id == settings.demo_run_id:
        return settings.demo_project_id
    if _is_uploaded_run(run_id):
        return str(pilot_runs.run_summary(run_id)["project_id"])
    return None


def _run_resources(run_id: str) -> list[dict[str, Any]]:
    return [
        {
            "uri": f"stackcert://runs/{run_id}/release-evidence",
            "name": f"{run_id} release evidence packet",
            "title": "Release evidence packet",
            "description": "Release-evidence payload for this run.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://runs/{run_id}/certificate",
            "name": f"{run_id} legacy certificate packet",
            "title": "Legacy certificate packet",
            "description": "Compatibility alias for release evidence.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://runs/{run_id}/theory-card",
            "name": f"{run_id} CASS theory card",
            "title": "CASS theory card",
            "description": "CASS formulas, assumptions, interval accounting, and diagnostics for this run.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://runs/{run_id}/measurement-recommendations",
            "name": f"{run_id} measurement recommendations",
            "title": "Measurement recommendations",
            "description": "Targeted follow-up measurements selected by CASS.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://runs/{run_id}/costs",
            "name": f"{run_id} cost ledger",
            "title": "Cost ledger",
            "description": "Usage-event summary for this run.",
            "mimeType": "application/json",
        },
    ]


def _resource_links_for_status(payload: dict[str, Any]) -> list[dict[str, Any]]:
    links: list[dict[str, Any]] = []
    project_id = payload.get("project_id")
    run_id = payload.get("run_id")
    if project_id:
        links.append(
            {
                "type": "resource_link",
                "uri": f"stackcert://projects/{project_id}/release-evidence-status",
                "name": "release-evidence-status",
                "description": "Project deploy-gate status and evidence scope.",
                "mimeType": "application/json",
            }
        )
    if run_id:
        links.extend(
            [
                {
                    "type": "resource_link",
                    "uri": f"stackcert://runs/{run_id}/release-evidence",
                    "name": "release-evidence",
                    "description": "Run evidence packet.",
                    "mimeType": "application/json",
                },
                {
                    "type": "resource_link",
                    "uri": f"stackcert://runs/{run_id}/theory-card",
                    "name": "theory-card",
                    "description": "CASS theory and interval accounting.",
                    "mimeType": "application/json",
                },
            ]
        )
    return links


def _theory_summary_from_overview(overview: dict[str, Any], ranking: dict[str, Any]) -> dict[str, Any]:
    stats = overview["stats"]
    return {
        "method": "CASS K<=2 serial safety-check comparison",
        "aggregation": "serial",
        "max_k": overview["run"]["k"],
        "lambda_cost": overview["run"]["lambda_cost"],
        "rho_prior": overview["run"]["rho_prior"],
        "candidate_stacks": len(ranking["rows"]),
        "pair_cells_measured": stats["pair_cells_measured"],
        "pair_cells_total": stats["pair_cells_total"],
        "comparison_count": stats["comparison_count"],
        "certified_comparison_count": stats["certified_comparison_count"],
    }


def _object_schema(required: list[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {key: {} for key in required},
        "required": required,
        "additionalProperties": True,
    }


def _protocol_error(
    request_id: str | int | None,
    code: int,
    message: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if data:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": error}


def _json_rpc_error_code(http_status: int) -> int:
    if http_status == status.HTTP_404_NOT_FOUND:
        return -32601
    if 400 <= http_status < 500:
        return -32602
    return -32000
