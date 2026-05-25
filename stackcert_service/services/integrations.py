from __future__ import annotations

from typing import Any


def agent_platforms() -> dict[str, list[dict[str, Any]]]:
    return {
        "platforms": [
            {
                "id": "generic_rest",
                "name": "Generic REST or OpenAPI agent endpoint",
                "status": "foundation",
                "integration_mode": "invoke_endpoint_or_import_outputs",
                "current_support": ["uploaded_outputs", "cost_estimate", "certificate_status"],
                "planned_support": ["signed_webhooks", "opentelemetry_trace_import", "ci_cli"],
                "source_url": None,
            },
            {
                "id": "openai_agents_sdk",
                "name": "OpenAI Agents SDK",
                "status": "planned_adapter",
                "integration_mode": "trace_import_and_guardrail_harness",
                "current_support": ["certificate_status"],
                "planned_support": ["input_guardrail_tests", "output_guardrail_tests", "tool_guardrail_tests", "trace_import"],
                "source_url": "https://openai.github.io/openai-agents-python/tracing/",
            },
            {
                "id": "langgraph_langsmith",
                "name": "LangGraph / LangSmith",
                "status": "planned_adapter",
                "integration_mode": "deployed_graph_endpoint_and_trace_import",
                "current_support": ["certificate_status"],
                "planned_support": ["dataset_import", "trace_import", "graph_node_mapping", "deployment_gate"],
                "source_url": "https://docs.langchain.com/oss/python/langgraph/workflows-agents",
            },
            {
                "id": "aws_bedrock_agents",
                "name": "Amazon Bedrock Agents",
                "status": "planned_adapter",
                "integration_mode": "agent_alias_invoke_and_trace_import",
                "current_support": ["certificate_status"],
                "planned_support": ["agent_alias_tests", "action_group_mapping", "bedrock_guardrail_variants"],
                "source_url": "https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html",
            },
            {
                "id": "google_vertex_agent_builder",
                "name": "Google Vertex AI Agent Builder",
                "status": "planned_adapter",
                "integration_mode": "agent_runtime_endpoint_and_cloud_trace_import",
                "current_support": ["certificate_status"],
                "planned_support": ["runtime_endpoint_tests", "identity_drift_signals", "trace_import"],
                "source_url": "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-builder/overview",
            },
            {
                "id": "crewai",
                "name": "CrewAI",
                "status": "planned_adapter",
                "integration_mode": "deployed_crew_rest_endpoint_and_webhooks",
                "current_support": ["certificate_status"],
                "planned_support": ["crew_endpoint_tests", "webhook_ingest", "tool_level_cells"],
                "source_url": "https://docs.crewai.com/en/enterprise/introduction",
            },
        ]
    }


def release_gate_examples(api_url: str = "$STACKCERT_API_URL", project_id: str = "$STACKCERT_PROJECT_ID") -> dict[str, Any]:
    command = (
        "python scripts/certificate_gate.py --release-gate "
        f"--api-url {api_url} --project-id {project_id} "
        "--token \"$STACKCERT_API_TOKEN\" --environment production --required-status valid"
    )
    return {
        "contract": {
            "endpoint": f"{api_url.rstrip('/')}/api/projects/{project_id}/release-gates/evaluate",
            "method": "POST",
            "auth": "Bearer token scoped to release_gate:read for the target project",
            "fails_closed": True,
            "decision_values": ["pass", "warn", "block"],
        },
        "github_actions": {
            "script": "scripts/certificate_gate.py --release-gate",
            "workflow": ".github/workflows/certificate-gate.yml",
        },
        "gitlab_ci": {
            "file": "integrations/release-gates/gitlab-ci.yml",
            "snippet": (
                "stackcert_release_gate:\n"
                "  image: python:3.12-slim\n"
                "  script:\n"
                "    - pip install stackcert\n"
                f"    - {command}\n"
            ),
        },
        "circleci": {
            "file": "integrations/release-gates/circleci-config.yml",
            "snippet": (
                "jobs:\n"
                "  stackcert_release_gate:\n"
                "    docker:\n"
                "      - image: cimg/python:3.12\n"
                "    steps:\n"
                "      - checkout\n"
                f"      - run: {command}\n"
            ),
        },
        "generic_webhook": {
            "file": "integrations/release-gates/generic-webhook-request.json",
            "payload_fields": [
                "environment",
                "model_id",
                "model_version",
                "prompt_hash",
                "policy_hash",
                "guard_connector_versions",
                "benchmark_suite_id",
                "benchmark_suite_version",
                "run_id",
                "deployment_ref",
                "commit_sha",
                "changed_since_evidence",
                "mode",
            ],
        },
    }
