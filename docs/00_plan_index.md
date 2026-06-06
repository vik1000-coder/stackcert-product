# StackCert Production Plan Index

Last updated: 2026-06-05

This directory is the living implementation plan for turning the StackCert CASS method
into a production-ready StackCert company product.

## Current Decision

Build StackCert as a design-partner pilot product first, then expand toward a
full-stack SaaS/workbench. The v1 sellable path is uploaded-output first:
customers bring one LLM app, representative examples, and safety-check outputs;
StackCert compares the combinations they could ship and produces a scoped
release report plus optional release-gate checks.

The target architecture remains:

- React + Vite + TypeScript for the public site and authenticated app.
- FastAPI for product APIs and CASS/old_cass evidence orchestration.
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
- `20_current_release_status.md`: concise deployed status, current commit,
  Cloudflare/Cloud Run URLs, latest verification, and remaining production
  work.
- `21_design_partner_pilot_checklist.md`: operational checklist and evidence
  gate for using StackCert with real design-partner data.
- `22_workflow_integration_guide.md`: release-gate and webhook integration
  contract for GitHub/GitLab/CircleCI/generic deploy systems.
- `23_design_partner_sales_pack.md`: buyer-facing pilot offer, inclusions,
  exclusions, procurement FAQ, and success criteria.
- `24_cass_v2_methodology.md`: current CASS naming contract, old_cass audit
  layer, and public/reporting claim boundary.
- `25_launch_readiness_artifacts.md`: Auth email setup, customer data terms,
  first-pilot execution, adapter intake, and provider-throttling evidence
  templates for launch.

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
- Uploaded-output-first setup UX with pilot file templates, stable ID contract,
  output coverage preview, release-context fields, and report/gate handoff.
- Hosted-pilot hardening for design partners: self-serve safe sample pilot
  duplication into private projects, template-seeded evidence warnings, recent
  live connector-test gates for REST/model-judge worker runs, durable report
  versions, Markdown/JSON/PDF report exports, project capability reporting,
  retention dry-run/apply, and minimum YAML config import.
- Public `/proof` page with Grok 4.3 comparison, local-combination proof pack,
  fail-closed voting rule, task-specific benchmark slices, redacted
  input/output examples, cost simulator, and honest fallback language.
- Public pilot-readiness, procurement, support, integrations, sitemap, and
  `llms.txt` updates for design-partner discoverability and buyer review.
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
- Project permissions expose buyer-facing Admin/Editor/Reviewer/Viewer
  capabilities; the app disables issue/signoff/export/configuration controls
  with explanatory copy when the current role cannot perform the action.

Milestones 1 and 2 are implemented, and most of Milestones 3-5 are now live in
staging: service-layer tenancy/RBAC, membership-aware lists, route
authorization, audit events, immutable evidence semantics, private artifact
handling, export verification, readiness diagnostics, managed connector-secret
refs, retry/dead-letter controls, lease renewal, an independent Cloud Run
worker job, workspace admin operations, uploaded-output setup polish, signed
deployment webhooks, provider-health/admin surfaces, proof positioning, and
design-partner public pages. The 2026-06-05 production-readiness pass also
verified authenticated hosted smokes, uploaded-output pilot smoke, signed
webhook smoke, Cloud Run worker smoke, Cloudflare security headers,
non-Sentry ops evidence, Google Cloud uptime checks/log alerts, alert
notification routing, Supabase schema/full Storage-metadata restore rehearsal,
and frontend route code splitting. The current priority is external launch
readiness: production Supabase Auth sender/templates, signed design-partner
pilot terms, the first real uploaded-output pilot, a customer-specific
release-gate adapter, and provider throttling observation under real managed-run
traffic. See
`15_current_state_and_next_steps.md`,
`18_pilot_ready_execution_plan.md`,
`19_route_access_matrix.md`, and `20_current_release_status.md`.

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

The latest design-partner hardening gate is:

```bash
cd stackcert_product
npm --prefix web run typecheck
npm --prefix web test -- --run
npm --prefix web run build
uv run python -m unittest discover -s tests_service -p 'test_*.py' -v
uv run python scripts/deployment_smoke.py \
  --web-url https://stackcert-staging.savikk129.workers.dev \
  --api-url https://stackcert-staging.savikk129.workers.dev
uv run python scripts/cloud_run_api_smoke.py \
  --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
```
