# Route Access Matrix

Last updated: 2026-05-25

This is the Milestone 1 authorization contract for
`stackcert_service/main.py`. It turns the executable plan into concrete route
requirements before implementation.

Role names follow the existing Supabase enum:

- `owner`
- `admin`
- `platform`
- `security`
- `risk_reviewer`
- `viewer`

Role groups:

- `workspace_admin`: `owner`, `admin`
- `project_maintainer`: `owner`, `admin`, `platform`, `security`
- `evidence_issuer`: `owner`, `admin`, `security`
- `evidence_reviewer`: `owner`, `admin`, `security`, `risk_reviewer`
- `viewer`: any active workspace member

Machine scopes:

- `mcp:read`: read-only MCP tools and resources
- `mcp:write`: MCP tools that queue jobs or create plans
- `release_gate:read`: future release-gate status checks
- `worker:run`: worker-only job execution routes

The local demo principal may access the seeded demo workspace/project outside
production. Production must rely on Supabase Auth plus workspace membership
lookup.

## Public And Global Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | none | public | none |
| `GET` | `/api/integrations/agent-platforms` | authenticated global docs | authenticated user or machine read scope if exposed through MCP later | none |

## Workspace And Project Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/workspaces` | caller memberships | authenticated user; return only accessible workspaces | none |
| `POST` | `/api/workspaces` | new workspace | authenticated user; creator becomes `owner` | `workspace.created` |
| `GET` | `/api/projects` | caller memberships | authenticated user; return only accessible projects | none |
| `POST` | `/api/workspaces/{workspace_id}/projects` | workspace | `project_maintainer` on workspace | `project.created` |
| `GET` | `/api/projects/{project_id}` | project | `viewer` on project workspace | none |

## Project Setup And Connector Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/projects/{project_id}/benchmark-suites` | project | `viewer` | none |
| `POST` | `/api/projects/{project_id}/benchmark-suites/preview` | project | `project_maintainer` | none |
| `POST` | `/api/projects/{project_id}/benchmark-suites` | project | `project_maintainer` | `benchmark_suite.committed` |
| `GET` | `/api/projects/{project_id}/guards` | project | `viewer` | none |
| `GET` | `/api/projects/{project_id}/guard-connectors` | project | `viewer` | none |
| `POST` | `/api/projects/{project_id}/guard-connectors` | project | `project_maintainer` | `guard_connector.created` |
| `GET` | `/api/projects/{project_id}/custom-behaviors` | project | `viewer` | none |
| `POST` | `/api/projects/{project_id}/custom-behaviors` | project | `project_maintainer` | `custom_behavior.created` |
| `POST` | `/api/projects/{project_id}/costs/estimate` | project | `viewer` | none |

## Run, Evidence, And Analysis Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/projects/{project_id}/runs` | project | `viewer` | none |
| `POST` | `/api/projects/{project_id}/runs/uploaded-outputs` | project | `project_maintainer` | `evaluation_run.uploaded_outputs.created` |
| `GET` | `/api/runs/{run_id}` | run | `viewer` on run project | none |
| `GET` | `/api/runs/{run_id}/overview` | run | `viewer` on run project | none |
| `GET` | `/api/runs/{run_id}/ranking` | run | `viewer` on run project | none |
| `GET` | `/api/runs/{run_id}/ranking.csv` | run | `viewer` on run project | `evidence.exported` |
| `GET` | `/api/runs/{run_id}/correlations` | run | `viewer` on run project | none |
| `GET` | `/api/runs/{run_id}/measurements` | run | `viewer` on run project | none |
| `GET` | `/api/runs/{run_id}/costs` | run | `viewer` on run project | none |
| `POST` | `/api/runs/{run_id}/measurement-plans` | run | `project_maintainer` on run project | `measurement_plan.created` |
| `GET` | `/api/runs/{run_id}/certificate` | run | `viewer` on run project | none |
| `GET` | `/api/runs/{run_id}/certificate.json` | run | `viewer` on run project | `evidence.exported` |
| `GET` | `/api/runs/{run_id}/certificate.md` | run | `viewer` on run project | `evidence.exported` |
| `POST` | `/api/runs/{run_id}/certificate/issue` | run | `evidence_issuer` plus evidence-readiness gates | `evidence.issued` |
| `GET` | `/api/certificates/{certificate_id}` | certificate | `viewer` on certificate project | none |
| `POST` | `/api/certificates/{certificate_id}/signoffs` | certificate | `evidence_reviewer` | `evidence.signoff.created` |

## Job And Worker Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/projects/{project_id}/jobs` | project | `viewer` | none |
| `GET` | `/api/projects/{project_id}/usage-events` | project | `viewer` | none |
| `POST` | `/api/projects/{project_id}/evaluation-jobs` | project | `project_maintainer` | `evaluation_job.created` |
| `POST` | `/api/projects/{project_id}/workers/run-next` | project | `project_maintainer` or `worker:run` machine scope | `evaluation_job.run` |
| `GET` | `/api/jobs/{job_id}` | job | `viewer` on job project | none |
| `POST` | `/api/jobs/{job_id}/run` | job | `project_maintainer` or `worker:run` machine scope | `evaluation_job.run` |
| `POST` | `/api/jobs/{job_id}/retry` | job | `project_maintainer` | `evaluation_job.retry` |

## Project Drift Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/projects/{project_id}/certificate-status` | project | `viewer`; `release_gate:read` machine support planned | `release_gate.checked` once machine-token route exists |
| `GET` | `/api/projects/{project_id}/stacks` | project | `viewer` | none |
| `GET` | `/api/projects/{project_id}/drift` | project | `viewer` | none |
| `POST` | `/api/projects/{project_id}/recertify` | project | `project_maintainer` | `retest.queued` |

## MCP Routes

| Method | Route | Scope | Requirement | Audit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/mcp/manifest` | MCP manifest | Supabase user or MCP machine token with `mcp:read` | none |
| `POST` | `/api/mcp/rpc` | MCP JSON-RPC | `mcp:read`; write tools require `mcp:write` plus object access | `mcp.tool_called` for tool calls |
| `POST` | `/api/mcp` | MCP streamable HTTP | `mcp:read`; write tools require `mcp:write` plus object access | `mcp.tool_called` for tool calls |
| `GET` | `/api/mcp` | MCP SSE unsupported | authenticated MCP caller | none |

MCP methods must be checked by tool/resource target:

- `list_projects`: return only caller-visible projects.
- `get_release_evidence_status` / `get_certificate_status`: project `viewer`.
- `get_run_theory_card`, `get_measurement_recommendations`, `get_run_costs`:
  run `viewer`.
- `create_measurement_plan`: `mcp:write` plus run `project_maintainer`.
- `resources/list`: return only caller-visible resources.
- `resources/read`: target project/run `viewer`.
- `prompts/get`: target project/run `viewer` when ids are supplied.

## Demo Exceptions

Outside production, the implicit local demo principal may access:

- `ws_demo`
- `proj_acme_copilot`
- `real_main_2000`

This exception is only for local development and staging smoke tests. It must
not allow anonymous production access.

## Implementation Order

1. Add role/scope helpers.
2. Add local and Supabase membership lookup.
3. Filter workspace/project list routes.
4. Protect project-scoped writes.
5. Protect run/job/certificate routes.
6. Protect MCP tool/resource dispatch.
7. Add audit writer and wire mutation/export events.
