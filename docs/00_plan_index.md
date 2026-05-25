# StackCert Production Plan Index

Last updated: 2026-05-25

This directory is the living implementation plan for turning the CASS prototype
into a production-ready StackCert company product.

## Current Decision

Build StackCert as a full-stack SaaS/workbench with:

- React + Vite + TypeScript for the public site and authenticated app.
- FastAPI for product APIs and CASS engine orchestration.
- Supabase Postgres, Auth, and Storage from the beginning.
- Cloud Run API and worker services for economical horizontal scale.
- GitHub Actions for test, security, migration, preview, and release workflows.

The product should remain light in day-to-day development, but the architecture
must be able to support real customer throughput, long-running evaluations,
private data, audit trails, and tenant isolation.

## Design References

Two design bundles are preserved:

- `design_reference/claude_design_project/`: earlier dashboard-only design.
- `design_reference/claude_design_project_v2/`: latest landing page plus app
  design. Treat this as the primary reference unless the user says otherwise.

Latest primary files:

- `design_reference/claude_design_project_v2/Landing.html`
- `design_reference/claude_design_project_v2/StackCert.html`
- `design_reference/claude_design_project_v2/ui-landing.jsx`
- `design_reference/claude_design_project_v2/ui-core.jsx`
- `design_reference/claude_design_project_v2/ui-shell.jsx`
- `design_reference/claude_design_project_v2/ui-overview.jsx`
- `design_reference/claude_design_project_v2/ui-ranking.jsx`
- `design_reference/claude_design_project_v2/ui-corr.jsx`
- `design_reference/claude_design_project_v2/ui-planner.jsx`
- `design_reference/claude_design_project_v2/ui-cert.jsx`
- `design_reference/claude_design_project_v2/ui-drift.jsx`

## Planning Docs

- `01_user_and_product_plan.md`: users, workflows, and product thesis.
- `02_stack_and_architecture_plan.md`: production stack and system design.
- `03_ui_implementation_inventory.md`: landing and app UI inventory.
- `04_phased_development_plan.md`: iterative implementation plan.
- `05_database_auth_security_plan.md`: schema, auth, RLS, and security.
- `06_testing_ci_cd_plan.md`: test strategy and GitHub Actions plan.
- `07_models_benchmarks_custom_tests_plan.md`: model, benchmark, and custom
  behavior workflows.
- `08_cost_and_future_integrations_plan.md`: cost modeling and integration
  roadmap.
- `09_agent_deployment_research_and_integration_plan.md`: how current agent
  deployments work and where StackCert should integrate.
- `10_certificate_scope_and_risk_positioning.md`: release-evidence scope,
  disclaimers, and risk-positioning rules.
- `11_local_dev_and_release_runbook.md`: local API/web/Supabase setup and
  release gates.
- `12_supabase_free_tier_deployment.md`: current hosted free-tier demo deploy,
  Auth/API/static hosting commands, smoke test, and limitations.
- `13_production_hosting_setup.md`: recommended Cloudflare Pages, Supabase,
  Cloud Run, and GitHub Actions production setup checklist.
- `14_product_language_guide.md`: current public/demo vocabulary and copy rules.
- `15_current_state_and_next_steps.md`: concise current implementation status,
  known boundaries, verification baseline, and next engineering priorities.
- `16_pilot_ready_release_evidence_plan.md`: imported pilot-readiness
  implementation plan focused on release evidence and integrations.
- `17_pilot_ready_plan_review.md`: feasibility review of that imported plan
  against the current codebase and hosted deployment state.
- `18_pilot_ready_execution_plan.md`: the current executable roadmap distilled
  from the imported plan, feasibility review, and implementation state.
- `19_route_access_matrix.md`: service route access contract for app users,
  machine tokens, object scopes, demo exceptions, and audit events.

## Current Hosted Demo

The playable hosted demo is deployed at:

```text
https://stackcert-staging.savikk129.workers.dev/auth/sign-in
```

It uses Cloudflare Workers static assets for the web app, Supabase Auth, and the
Cloud Run FastAPI/CASS service. GitHub Pages plus the Supabase Edge Function
remain available as fallback/demo-preview infrastructure. See
`13_production_hosting_setup.md` and `15_current_state_and_next_steps.md` for
the current deployment and verification details.

## Current Build State

The implementation is past planning. The working app now includes:

- React/Vite public and authenticated app screens.
- FastAPI service around the Python CASS core.
- Supabase-backed persistence for pilot runs and supporting records.
- Uploaded-output pilot flow through scoped release evidence.
- Deterministic, REST, and model-judge worker evaluation paths that persist
  `worker_evaluation` evidence runs.
- Separate Cloud Run worker job `stackcert-worker`, smoke-tested against the
  hosted staging API.
- Idempotent worker output/usage persistence and connector price-card/token
  accounting for provider-backed runs.
- Workspace admin dashboard for worker health, spend, connector-secret posture,
  dead-letter review, retry/cancel controls, and audit activity.
- Service-layer tenancy/RBAC, audit events, immutable issued evidence packet
  snapshots, private evidence artifacts, readiness gates, and artifact hash
  verification.
- MCP endpoints for release-evidence status, theory cards, measurement
  recommendations, cost ledgers, integration guides, and deployment-review
  prompts, with Supabase user auth and MCP-only machine bearer tokens.
- Import hardening for field-mapped JSONL/CSV examples, source fingerprints,
  and trace-import previews from LangSmith/Langfuse/OpenTelemetry-style JSONL.
- GitLab/Circle/generic release-gate integration examples, release-context
  hashes in evidence, and workspace budget/provider runtime controls.

Milestones 1 and 2 are implemented, and most of Milestone 3 is now live in
staging: service-layer tenancy/RBAC, membership-aware lists, route
authorization, audit events, immutable evidence semantics, private artifact
handling, export verification, readiness diagnostics, managed connector-secret
refs, retry/dead-letter controls, lease renewal, an independent Cloud Run
worker job, and a workspace admin operations dashboard. The current priority is
the remaining production hardening slice: persisted budget policy UI,
reviewed trace-import commits, signed deployment webhooks, and operations
setup. See
`15_current_state_and_next_steps.md`,
`18_pilot_ready_execution_plan.md`, and `19_route_access_matrix.md`.

## Test Cadence

Every implementation slice should end with a small verification pass:

- Backend/core edits: run Python unit tests and targeted API tests.
- Database migrations: run migration apply/reset and RLS policy tests.
- Frontend edits: run TypeScript, lint, unit/component tests, and build.
- Workflow changes: run Playwright e2e against local Supabase/API/web.
- Release candidates: run the full CI matrix, security scans, migration checks,
  smoke tests, and at least one golden release-evidence replay.

The current core smoke test remains:

```bash
cd stackcert_product
python3 -m unittest discover -s tests -p 'test_*.py' -v
```
