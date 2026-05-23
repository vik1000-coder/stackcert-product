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
