from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, status

from stackcert_service.config import settings
from stackcert_service.schemas import CostEstimateRequest, MeasurementPlanCreate
from stackcert_service.services import custom_behaviors
from stackcert_service.services import demo_project
from stackcert_service.services import jobs
from stackcert_service.services import projects
from stackcert_service.services import usage


SERVER_INFO = {
    "name": "stackcert",
    "version": "0.1.0",
    "description": "Agent-friendly StackCert surface for CASS evidence, certificate gates, cost estimates, and measurement planning.",
}


def manifest() -> dict[str, Any]:
    return {
        "serverInfo": SERVER_INFO,
        "capabilities": {
            "tools": {"listChanged": False},
            "resources": {"subscribe": False, "listChanged": False},
            "prompts": {"listChanged": False},
        },
        "transport": {
            "kind": "http_json_rpc",
            "endpoint": "/api/mcp/rpc",
            "note": "This endpoint exposes MCP-style tools, resources, and prompts over authenticated JSON-RPC for app and CI integrations.",
        },
        "tools": list_tools(),
        "resources": list_resources(),
        "prompts": list_prompts(),
    }


def handle_rpc(method: str, params: dict[str, Any] | None, request_id: str | int | None) -> dict[str, Any]:
    params = params or {}
    try:
        result = _dispatch(method, params)
        return {"jsonrpc": "2.0", "id": request_id, "result": result}
    except HTTPException as exc:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": _json_rpc_error_code(exc.status_code),
                "message": str(exc.detail),
                "data": {"http_status": exc.status_code},
            },
        }


def list_tools() -> list[dict[str, Any]]:
    return [
        {
            "name": "list_projects",
            "description": "List StackCert projects visible to the caller.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
            "annotations": {"readOnlyHint": True, "destructiveHint": False},
        },
        {
            "name": "get_certificate_status",
            "description": "Return deploy-gate certificate status, scope, blocking reasons, and limitation flags for a project.",
            "inputSchema": {
                "type": "object",
                "required": ["project_id"],
                "properties": {
                    "project_id": {"type": "string"},
                    "lambda_cost": {"type": "number", "default": 5.0},
                },
                "additionalProperties": False,
            },
            "annotations": {"readOnlyHint": True, "destructiveHint": False},
        },
        {
            "name": "estimate_run_cost",
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
            "annotations": {"readOnlyHint": True, "destructiveHint": False},
        },
        {
            "name": "get_run_costs",
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
            "annotations": {"readOnlyHint": True, "destructiveHint": False},
        },
        {
            "name": "create_measurement_plan",
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
            "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False},
        },
    ]


def call_tool(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    arguments = arguments or {}
    if name == "list_projects":
        return _tool_result({"projects": projects.list_projects()})
    if name == "get_certificate_status":
        project_id = str(arguments.get("project_id") or "")
        return _tool_result(certificate_status(project_id, float(arguments.get("lambda_cost") or 5.0)))
    if name == "estimate_run_cost":
        payload = CostEstimateRequest(**{key: value for key, value in arguments.items() if key != "project_id"})
        return _tool_result(
            {
                "project_id": arguments.get("project_id") or settings.demo_project_id,
                "estimate": custom_behaviors.estimate_cost(payload),
            }
        )
    if name == "get_run_costs":
        project_id = str(arguments.get("project_id") or settings.demo_project_id)
        run_id = str(arguments.get("run_id") or "")
        return _tool_result(usage.cost_summary(project_id, run_id))
    if name == "create_measurement_plan":
        run_id = str(arguments.get("run_id") or "")
        payload = MeasurementPlanCreate(
            action_ids=list(arguments.get("action_ids") or []),
            max_cost_usd=arguments.get("max_cost_usd"),
        )
        job = jobs.create_measurement_plan_job(run_id, payload, float(arguments.get("lambda_cost") or 5.0))
        return _tool_result({"status": job["status"], "job": job, "summary": job["summary"], "actions": job["actions"]})
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP tool: {name}")


def list_resources() -> list[dict[str, Any]]:
    project_id = settings.demo_project_id
    run_id = settings.demo_run_id
    return [
        {
            "uri": f"stackcert://projects/{project_id}/certificate-status",
            "name": "Demo project certificate status",
            "description": "Machine-readable deploy-gate state, scope, blocking reasons, and limitation flags.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://projects/{project_id}/integration-guide",
            "name": "Agent deployment integration guide",
            "description": "How to wire StackCert evidence into CI/CD, agent deploy pipelines, and recertification triggers.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://runs/{run_id}/certificate",
            "name": "Demo run certificate packet",
            "description": "Certificate payload for the seeded demo run.",
            "mimeType": "application/json",
        },
        {
            "uri": f"stackcert://runs/{run_id}/costs",
            "name": "Demo run cost ledger",
            "description": "Usage-event summary for the seeded demo run.",
            "mimeType": "application/json",
        },
    ]


def read_resource(uri: str) -> dict[str, Any]:
    if uri.startswith("stackcert://projects/") and uri.endswith("/certificate-status"):
        project_id = uri.removeprefix("stackcert://projects/").removesuffix("/certificate-status")
        return _resource_result(uri, certificate_status(project_id))
    if uri.startswith("stackcert://projects/") and uri.endswith("/integration-guide"):
        project_id = uri.removeprefix("stackcert://projects/").removesuffix("/integration-guide")
        return _resource_result(uri, integration_guide(project_id))
    if uri.startswith("stackcert://runs/") and uri.endswith("/certificate"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/certificate")
        payload = demo_project.certificate_payload()
        payload["run_id"] = run_id
        payload.pop("markdown", None)
        return _resource_result(uri, payload)
    if uri.startswith("stackcert://runs/") and uri.endswith("/costs"):
        run_id = uri.removeprefix("stackcert://runs/").removesuffix("/costs")
        return _resource_result(uri, usage.cost_summary(settings.demo_project_id, run_id))
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP resource: {uri}")


def list_prompts() -> list[dict[str, Any]]:
    return [
        {
            "name": "draft_custom_behavior",
            "description": "Draft a benchmark behavior that can later be imported as a custom StackCert test case.",
            "arguments": [
                {"name": "agent_goal", "description": "What the agent is supposed to accomplish.", "required": True},
                {"name": "failure_mode", "description": "The unsafe behavior to probe.", "required": True},
                {"name": "policy_category", "description": "The policy or risk category.", "required": False},
            ],
        },
        {
            "name": "deployment_gate_review",
            "description": "Produce a deploy-gate review prompt grounded in StackCert scope, limitations, and recertification triggers.",
            "arguments": [
                {"name": "project_id", "description": "StackCert project id.", "required": False},
                {"name": "run_id", "description": "Evaluation run id.", "required": False},
            ],
        },
    ]


def get_prompt(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
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
        return _prompt_result(name, text)
    if name == "deployment_gate_review":
        project_id = str(arguments.get("project_id") or settings.demo_project_id)
        run_id = str(arguments.get("run_id") or settings.demo_run_id)
        status_payload = certificate_status(project_id)
        text = (
            "Review this StackCert result as a scoped deployment gate, not a guarantee. "
            f"Project: {project_id}. Run: {run_id}. Status payload: {json.dumps(status_payload, sort_keys=True)}. "
            "Call out blocking reasons, evidence scope, recertification triggers, and any residual risk before approving deployment."
        )
        return _prompt_result(name, text)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP prompt: {name}")


def certificate_status(project_id: str, lambda_cost: float = 5.0) -> dict[str, Any]:
    if project_id != demo_project.project()["id"]:
        return {"project_id": project_id, "status": "missing", "blocking_reasons": ["project_not_found"]}
    overview = demo_project.overview(lambda_cost)
    status_value = overview["certificate"]["status"]
    return {
        "project_id": project_id,
        "run_id": overview["run"]["id"],
        "certificate_id": overview["certificate"]["id"],
        "status": status_value,
        "scope": overview["certificate"]["scope"],
        "blocking_reasons": [] if status_value == "valid" else [f"certificate_{status_value}"],
        "not_a_guarantee": True,
        "recertification_required_on": [
            "guard_version_change",
            "model_change",
            "prompt_or_policy_change",
            "traffic_mix_drift",
            "new_attack_family",
        ],
    }


def integration_guide(project_id: str) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "recommended_integrations": [
            "call get_certificate_status before production deploys",
            "fail or warn CI/CD based on status and risk tier",
            "read certificate resources into agent-release review jobs",
            "queue targeted measurement plans when the certificate is provisional or stale",
        ],
        "agent_friendly_contract": {
            "tools": [tool["name"] for tool in list_tools()],
            "resources": [resource["uri"] for resource in list_resources()],
            "prompts": [prompt["name"] for prompt in list_prompts()],
        },
        "risk_positioning": "StackCert reduces deployment uncertainty with scoped evidence over a finite benchmark mixture; it does not guarantee real-world safety.",
        "recertification_required_on": [
            "guard_version_change",
            "model_change",
            "prompt_or_policy_change",
            "traffic_mix_drift",
            "new_attack_family",
        ],
    }


def _dispatch(method: str, params: dict[str, Any]) -> dict[str, Any]:
    if method == "initialize":
        return {
            "protocolVersion": "2025-03-26",
            "capabilities": manifest()["capabilities"],
            "serverInfo": SERVER_INFO,
        }
    if method == "ping":
        return {}
    if method == "tools/list":
        return {"tools": list_tools()}
    if method == "tools/call":
        return call_tool(str(params.get("name") or ""), params.get("arguments") or {})
    if method == "resources/list":
        return {"resources": list_resources()}
    if method == "resources/read":
        return read_resource(str(params.get("uri") or ""))
    if method == "prompts/list":
        return {"prompts": list_prompts()}
    if method == "prompts/get":
        return get_prompt(str(params.get("name") or ""), params.get("arguments") or {})
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown MCP method: {method}")


def _tool_result(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "content": [{"type": "text", "text": json.dumps(payload, sort_keys=True)}],
        "structuredContent": payload,
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


def _prompt_result(name: str, text: str) -> dict[str, Any]:
    return {
        "description": name,
        "messages": [
            {
                "role": "user",
                "content": {"type": "text", "text": text},
            }
        ],
    }


def _json_rpc_error_code(http_status: int) -> int:
    if http_status == status.HTTP_404_NOT_FOUND:
        return -32601
    if 400 <= http_status < 500:
        return -32602
    return -32000
