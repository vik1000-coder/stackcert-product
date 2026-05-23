# Agent Deployment Research And Integration Plan

Last updated: 2026-05-23

## Research Summary

Companies are deploying agent workflows through a mix of managed agent platforms,
code-first orchestration frameworks, and standard production infrastructure.

Current deployment patterns from primary docs:

- LangSmith Deployment positions itself as a workflow orchestration runtime for
  production agent workloads, including LangGraph, Google ADK, CrewAI, Strands,
  and other frameworks through wrapper APIs.
  Source: https://docs.langchain.com/langsmith/deployment
- OpenAI Agents SDK is for teams whose server owns orchestration, tools, state,
  approvals, MCP, and runtime behavior. The hosted Agent Builder path is separate.
  Source: https://developers.openai.com/api/docs/guides/agents
- OpenAI Agents SDK guardrails run at different workflow boundaries: first agent
  input, final agent output, or each function-tool invocation.
  Source: https://openai.github.io/openai-agents-python/guardrails/
- Amazon Bedrock Agents uses models, APIs, knowledge bases, action groups,
  aliases, traces, and managed runtime behavior; Bedrock Guardrails can attach
  to model inference, agents, knowledge bases, and flows.
  Sources:
  - https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html
  - https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use.html
- Microsoft Foundry Agent Service emphasizes enterprise deployment concerns:
  distribution, integrated guardrails, network isolation, bring-your-own
  resources, endpoint integration, and A2A preview.
  Source: https://learn.microsoft.com/en-us/azure/foundry/agents/overview
- Google Gemini Enterprise Agent Platform / Agent Runtime emphasizes managed
  deployment, scaling, context/session management, agent identity, access,
  tracing, logging, monitoring, and support for LangChain, LangGraph, LlamaIndex,
  and custom agents.
  Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale
- CrewAI AMP provides managed deployment, REST API access, observability, tool
  repositories, webhook streaming, GitHub integration, low-code studio, and CLI
  deployment.
  Source: https://docs.crewai.com/en/enterprise/introduction
- MCP standardizes how AI applications discover and invoke tools, read resources,
  and use prompt templates.
  Source: https://modelcontextprotocol.io/docs/learn/server-concepts
- OpenTelemetry now has GenAI semantic conventions for model, agent, framework,
  MCP, and provider spans, though the conventions are still marked as
  development-stage.
  Source: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- Langfuse and similar observability platforms show the common production shape:
  traces, agent graphs, quality/cost/latency metrics, prompt versions, datasets,
  experiments, and custom eval scores.
  Source: https://langfuse.com/docs

## What This Means For StackCert

StackCert should not try to become the customer's agent runtime first.

The wedge is stronger if StackCert is the certification and risk-evidence layer
that plugs into whatever runtime the customer already uses.

Positioning:

- LangGraph/LangSmith, Bedrock, Azure Foundry, Google Agent Platform, CrewAI,
  custom FastAPI, and in-house runtimes are where agents run.
- StackCert is where guardrail stack choices are tested, compared, certified,
  monitored, and exported.

This lets us fit both adoption modes:

1. "Use the tools you already use, send traces/outputs to StackCert."
2. "Use StackCert's dashboard to run the same agent endpoint against benchmarks
   and custom behaviors."

## Integration Strategy

### Layer 1: Generic First

Build generic interfaces before deep vendor integrations:

- REST agent/guard adapter.
- Uploaded JSONL/CSV outputs.
- OpenAPI-described action/agent endpoints.
- Webhook receiver for run completion and drift events.
- OpenTelemetry/GenAI trace ingestion.
- CLI for CI and local certification runs.

This covers custom deployments, FastAPI apps, Kubernetes jobs, Cloud Run, Azure
Container Apps, and teams that do not want vendor lock-in.

### Layer 2: Popular Runtime Adapters

Add thin adapters where they reduce customer effort:

- LangGraph/LangSmith:
  - import datasets and traces;
  - callback/tracing adapter;
  - run benchmark suite against deployed graph endpoint;
  - map graph nodes/tools to StackCert cells and guard positions.
- OpenAI Agents SDK:
  - test harness around `Runner.run`;
  - adapters for input, output, and tool guardrails;
  - trace import when available;
  - optional StackCert guardrail function for preflight checks.
- Bedrock Agents:
  - invoke deployed agent aliases;
  - import/parse traces;
  - evaluate Bedrock Guardrail variants and custom guardrail stacks;
  - support knowledge-base and flow guardrail positions.
- Azure Foundry Agent Service:
  - invoke agent endpoints;
  - import trace/evaluation artifacts;
  - later support A2A-style status/query paths if customers use it.
- Google Agent Platform:
  - invoke agent runtime endpoints;
  - import Cloud Trace/Logging artifacts;
  - track agent identity and version changes as drift signals.
- CrewAI:
  - call deployed crew REST endpoints;
  - consume webhook streaming or trace/log exports;
  - evaluate crew-level and tool-level guardrail positions.
- Langfuse/observability:
  - import traces and datasets;
  - push StackCert scores/certificate status back as custom scores.

### Layer 3: Pipeline Gates

Add deployment gates once certificates are reliable:

- GitHub Action: fail/warn if certificate is expired, provisional, revoked, or
  missing for a deployment target.
- Generic webhook: deployment system asks StackCert for certificate status.
- CLI:

```bash
stackcert certify --project acme-copilot --suite prod-risk-v4
stackcert status --deployment prod --require valid
```

Pipeline output should be machine-readable:

```json
{
  "status": "valid",
  "certificate_id": "cert_...",
  "scope": "project:acme-copilot environment:prod",
  "expires_at": "2026-06-24T00:00:00Z",
  "blocking_reasons": []
}
```

## Agent-Friendly StackCert Service

StackCert should be agent-friendly but carefully scoped.

Agent-facing interfaces:

- Stable OpenAPI schema.
- Idempotent job creation.
- Pollable job status.
- Webhooks for completion/drift/certificate status.
- CLI for CI and local agents.
- Optional MCP server later.

Candidate agent/MCP tools:

- `list_projects`
- `get_certificate_status`
- `create_benchmark_suite`
- `add_custom_behavior`
- `estimate_run_cost`
- `create_certification_run`
- `get_run_status`
- `get_measurement_recommendations`
- `export_certificate`

Safety defaults for agent access:

- Read-only by default.
- Separate scopes for writes.
- Human approval for expensive runs, exports, signoffs, or destructive actions.
- Workspace budgets enforced server-side.
- Full audit logs.
- No raw prompt/resource exposure unless project data mode permits it.
- Avoid local stdio MCP as a production default; prefer remote HTTP with auth,
  scoped permissions, and rate limits.

## How CASS Maps To Agent Workflows

CASS remains the theory we should lean on.

For agentic systems, a "guardrail stack" is not only two content filters at the
edge. It can include:

- input guardrails;
- output guardrails;
- tool-call guardrails;
- retrieval guardrails;
- policy/routing guards;
- approval gates;
- model judges;
- action-specific constraints.

Each candidate architecture can be represented as a stack over workflow
boundaries. Benchmark cells become behavior families:

- prompt injection;
- jailbreak;
- unsafe content;
- data exfiltration;
- tool misuse;
- over-delegation;
- unauthorized action;
- hallucinated business process;
- benign refusal/false block;
- latency/cost-sensitive paths.

CASS is useful because agent systems compose many fallible controls. Marginal
guard scores do not tell the user whether two controls fail on the same
examples. Pair-cell measurements and CASS scheduling give us:

- the actual co-failure map;
- a better stack ranking;
- a way to spend measurement budget only where it changes the decision;
- a conditional certificate over a defined candidate set and benchmark mixture.

## Product Implication

The app should support two customer flows:

### Bring Your Own Runtime

The customer already runs agents in LangGraph, Bedrock, Azure, Google, CrewAI,
OpenAI Agents SDK, or custom infra.

StackCert should:

- connect to deployed endpoints or import traces;
- run selected benchmarks and custom behaviors;
- compare guardrail configurations;
- issue certificates and pipeline gates.

### Run From StackCert

The customer uses StackCert's dashboard/service to:

- define benchmarks and custom behaviors;
- configure guards and models;
- execute evaluation jobs;
- produce evidence.

This is valuable for pilots and smaller teams. Enterprise customers will often
prefer the bring-your-own-runtime model.

