# StackCert Product Prototype

This is an isolated product prototype for CASS Labs / StackCert. It is separate
from the research apparatus in the parent directory.

StackCert helps teams choose the right safety-check combinations for LLM apps.
The product compares rules, classifiers, model judges, stronger-model routes,
context policies, and other checks on examples from the application the team
actually cares about. The goal is safer, useful results at lower test cost,
with scoped release evidence instead of broad safety claims.

The current scope includes the CASS core under the hood, a product API, a React
LLM app safety workbench, Supabase schema/Auth/Storage foundations, CI checks,
worker-backed deterministic, REST, and model-judge evaluation runs, service
layer RBAC/audit controls, immutable evidence packet snapshots, private
evidence artifacts, idempotent worker evidence persistence, connector price
cards/token accounting, managed connector-secret references, lease renewal,
pilot setup coverage diagnostics, workspace admin operations, worker
queue/dead-letter UI, MCP and release-gate machine-token auth, and a hosted
Cloudflare/Supabase/Cloud Run staging demo. The onboarding flow now captures a
first-class pilot profile so setup can route new users to the right first
evidence task instead of treating every app as the same generic setup.
The core engine includes:

- data schemas and JSONL/CSV import;
- safety-check adapters and offline evaluation runner;
- exact K=2 serial combination scoring;
- comparison logic for release evidence;
- targeted test recommendations;
- Markdown and JSON evidence export;
- immutable issued evidence packets with private artifact hashes;
- unit tests for core evidence behavior.

The product direction is now a production-oriented full-stack app:

- public landing page that explains safety options and why combinations matter;
- guided onboarding that creates a workspace, project, and persistent pilot
  profile with role, evidence source, risk concerns, CASS objective, budget
  posture, and release-gate intent;
- authenticated StackCert workbench for app-specific recommendations;
- FastAPI service around the Python CASS core;
- authenticated MCP endpoints for release-evidence status, theory cards, and
  agent deployment reviews;
- deterministic, REST, and model-judge provider-style worker execution for real
  project benchmark suites, with budget checks, usage events, backend-only
  connector secrets, idempotent writes, connector price cards, provider token
  accounting, and persisted CASS evidence runs;
- uploaded-output pilot setup with JSONL/CSV templates, pre-run coverage
  diagnostics, malformed-output errors, and UI gating before evidence creation;
- first-user pilot readiness guidance that shows the path from project setup to
  examples, safety options, evidence run, review, and release-gate wiring;
- operator-facing job health and an admin dashboard with spend, throughput,
  connector-secret posture, worker health, dead-letter review, audit trail,
  retry/cancel controls, persisted workspace/project budget policies, and
  manual worker passes;
- release-gate REST API for CI/deploy systems, returning `pass`, `warn`, or
  `block` with evidence packet ids, retest triggers, and scoped assumptions;
- service-layer workspace/project/run/evidence authorization, audit events, and
  membership-filtered project data;
- private issued-evidence JSON/Markdown artifacts with SHA-256 verification and
  short-lived signed URL generation, export history, immutable packet badges,
  and retest-trigger explanations;
- Supabase Postgres/Auth/Storage;
- Cloud Run API and worker services;
- GitHub Actions CI/CD plus Cloudflare Workers static-assets hosting.

For the current implementation state and next priorities, start with
`docs/15_current_state_and_next_steps.md`; for the concise deployed release
status, use `docs/20_current_release_status.md`; for the executable build
queue, use `docs/18_pilot_ready_execution_plan.md`.

## Hosted Demo

The current hosted demo is live at:

```text
https://stackcert-staging.savikk129.workers.dev/auth/sign-in
```

Demo login:

```text
Email: demo@stackcert.dev
Password: stackcert-demo
```

This hosted version uses Cloudflare Workers static assets for the web app,
Supabase Auth, and the Cloud Run FastAPI/CASS service as the API runtime.
Cloudflare now also proxies same-origin `/api/*` and `/api/mcp` requests to
Cloud Run, so the browser, REST smoke tests, and MCP clients can use the
Cloudflare URL as the app and API base. GitHub Pages remains configured as a
temporary fallback static deployment. See `docs/13_production_hosting_setup.md`.

Current hosted API base:

```text
https://stackcert-api-oaw2bwdgyq-uc.a.run.app
```

Current Cloud Run API revision: `stackcert-api-00017-vmj`, serving the image
deployed from commit `932ac14` with the packaged 2,000-example CASS demo
artifacts available inside the API image. Staging is capped at min instances
`0`, max instances `3`, and concurrency `40`.

Current Cloud Run worker job:

```text
job: stackcert-worker
region: us-central1
image: us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:0b932c5-staging-202605250439-amd64
service account: stackcert-worker-runtime@project-e7840c42-f298-4bd9-bff.iam.gserviceaccount.com
tasks: 1
parallelism: 1
max retries: 0
timeout: 900s
```

The Supabase Edge Function remains a lightweight demo/API-preview layer for
comparison, but the Cloudflare-hosted app is now pointed at Cloud Run.

Current CI/CD:

- `ci` runs Python, frontend, and local Supabase migration checks on PRs and
  pushes to `main`, including a Cloudflare Worker dry-run package check.
- `deploy pages` publishes the fallback GitHub Pages build and runs smoke
  tests.
- `deploy cloudflare` runs after `ci` succeeds on `main`, deploys the
  Cloudflare Workers static app, and smokes Cloudflare same-origin API proxy +
  Supabase Auth plus authenticated hosted MCP release-evidence status and REST
  release-gate checks.

Recent hosted verification: Cloudflare `/api/health` returns Cloud Run JSON
instead of the SPA shell; authenticated deployment and MCP smoke tests pass
through the Cloudflare URL; browser QA passes sign-in, full demo overview,
admin budget controls, onboarding pilot creation, setup handoff, and 390px
mobile layouts.

## Product App Planning

The original dashboard UI handoff bundle is copied into:

```text
design_reference/claude_design_project/
```

The latest landing-page-plus-app UI handoff bundle is copied into:

```text
design_reference/claude_design_project_v2/
```

Planning docs for turning this into a production-ready application live in:

- `docs/00_plan_index.md`
- `docs/01_user_and_product_plan.md`
- `docs/02_stack_and_architecture_plan.md`
- `docs/03_ui_implementation_inventory.md`
- `docs/04_phased_development_plan.md`
- `docs/05_database_auth_security_plan.md`
- `docs/06_testing_ci_cd_plan.md`
- `docs/07_models_benchmarks_custom_tests_plan.md`
- `docs/08_cost_and_future_integrations_plan.md`
- `docs/09_agent_deployment_research_and_integration_plan.md`
- `docs/10_certificate_scope_and_risk_positioning.md`
- `docs/11_local_dev_and_release_runbook.md`
- `docs/12_supabase_free_tier_deployment.md`
- `docs/13_production_hosting_setup.md`
- `docs/14_product_language_guide.md`
- `docs/15_current_state_and_next_steps.md`
- `docs/16_pilot_ready_release_evidence_plan.md`
- `docs/17_pilot_ready_plan_review.md`
- `docs/18_pilot_ready_execution_plan.md`
- `docs/19_route_access_matrix.md`

Initial GitHub Actions workflow drafts live in:

- `.github/workflows/ci.yml`
- `.github/workflows/certificate-gate.yml`
- `.github/workflows/security.yml`
- `.github/workflows/nightly.yml`
- `.github/workflows/deploy-pages.yml`
- `.github/workflows/deploy-cloudflare.yml`

Cloud Run staging helpers live in:

- `scripts/gcloud_budget_setup.py`
- `scripts/gcloud_cost_preflight.py`
- `scripts/cloud_run_secrets.py`
- `scripts/cloud_run_api_smoke.py`
- `scripts/cloud_run_worker_smoke.py`
- `scripts/mcp_client_smoke.py`
- `scripts/hash_mcp_machine_token.py`

Run the cost preflight before any GCP deployment. It is read-only and should
pass before enabling APIs or creating Cloud Run resources:

```bash
python scripts/gcloud_cost_preflight.py \
  --project-id "$GCP_PROJECT_ID" \
  --region "${GCP_REGION:-us-central1}" \
  --gcloud "${GCLOUD_BIN:-gcloud}"
```

The current staging budget is `StackCert staging $50` on
`project-e7840c42-f298-4bd9-bff`, scoped to gross Google Cloud usage before
free-trial credits are applied.

Cloudflare temporary frontend hosting can use Workers Builds from the repo root
with:

```text
Path: /
Build command: npm ci && npm run build
Deploy command: npx wrangler deploy
```

The root `package.json` installs/builds the `web` package with its own lockfile,
and the root `wrangler.jsonc` deploys `web/dist` as Workers static assets plus
the `/api/*` Worker proxy.

## Local App

Run the API:

```bash
cd stackcert_product
python -m pip install -e .
python -m uvicorn stackcert_service.main:app --host 127.0.0.1 --port 8000 --reload
```

Run the web app:

```bash
cd stackcert_product/web
npm ci
npm run dev -- --port 5173
```

The API uses the real CASS research artifacts when present and falls back to
`demo_data/` for clean clones and CI. See
`docs/11_local_dev_and_release_runbook.md` for Supabase, container, and release
gates.

The API keeps demo state in memory unless Supabase persistence is configured.
Set `SUPABASE_URL`, backend-only `SUPABASE_SECRET_KEY`, and
`STACKCERT_PERSISTENCE_BACKEND=supabase` to persist custom behavior drafts and
managed job records.

Data loading now supports:

- JSONL/CSV example-suite preview and commit.
- Field mapping for source exports with different column names.
- Source and normalized SHA-256 fingerprints.
- Trace-import preview for LangSmith, Langfuse, OpenTelemetry, and generic
  JSONL traces through `/api/projects/{project_id}/trace-imports/preview`.

Release gates now have examples for GitHub Actions, GitLab CI, CircleCI, and
generic webhook callers. See `docs/20_release_gate_integrations.md` and
`integrations/release-gates/`.

First-pilot readiness is available at
`/api/projects/{project_id}/pilot-readiness` and is shown in the setup and
overview screens. It is deliberately scoped: the response explains what the
evidence can claim, what it cannot claim, and when retesting is required.

Onboarding state is available at `/api/onboarding/pilots` for atomic pilot
creation and `/api/projects/{project_id}/onboarding-profile` for project-scoped
profile reads/updates. The profile is stored in Supabase through
`project_onboarding_profiles` with workspace-member RLS and explicit grants for
new-project Data API exposure.

For MCP-only machine callers, generate a token hash with
`scripts/hash_mcp_machine_token.py`, then set
`STACKCERT_MCP_MACHINE_TOKEN_HASHES` and
`STACKCERT_MCP_MACHINE_TOKEN_SCOPES` on the API runtime. These tokens only work
on `/api/mcp` and `/api/mcp/rpc`; app routes still require Supabase Auth.

## Quick Smoke Test

```bash
cd stackcert_product
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 examples/paper_demo.py \
  --examples ../data/processed/examples_real_main_2000.jsonl \
  --outputs ../data/outputs/real_main_2000_8agent_outputs.jsonl \
  --weights-json ../configs/cass_real.json \
  --lambda-cost 5 \
  --budget-fraction 0.5 \
  --markdown-out /tmp/stackcert_release_evidence.md
```
