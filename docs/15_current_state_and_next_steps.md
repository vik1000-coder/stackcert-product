# Current State And Next Steps

Last updated: 2026-05-24

This document is the short operational view of the product. The older planning
docs still matter, but this page should be the first place to check when
deciding what to build next.

## Current Working State

StackCert is now a usable prototype with a real product shape:

- React + Vite web app with public landing pages, auth routes, onboarding,
  project setup, overview, options compared, overlap analysis, test plan and
  cost, release evidence, and drift views.
- FastAPI service around the Python CASS engine.
- Supabase schema, Auth integration, RLS smoke coverage, and remote free-tier
  migration history.
- Hosted staging demo using Cloudflare Workers static assets for the frontend,
  Supabase Auth, and the Cloud Run FastAPI/CASS service for authenticated API
  traffic.
- GitHub Actions workflows for CI, fallback GitHub Pages deployment, and
  Cloudflare Workers staging deployment after CI succeeds.
- CASS core with exact K<=2 serial safety-check combination scoring,
  comparison intervals, targeted measurement recommendations, and evidence
  export.
- Uploaded-output pilot path: users can create a project, commit an example
  suite, upload safety-check outputs, generate a CASS-backed recommendation,
  inspect rankings/overlap/measurements, and issue scoped release evidence.
- Managed worker path: users can configure REST safety-check and model-judge
  connectors, enqueue provider-style evaluation jobs against a committed suite,
  enforce a run budget cap, and persist the resulting CASS evidence run.
- Supabase-backed persistence for custom behaviors, benchmark suites, guard
  connectors, jobs, usage events, issued evidence, signoffs, and uploaded-output
  pilot runs.
- Agent/MCP surface for release-evidence status, theory cards, measurement
  recommendations, cost ledgers, integration guides, and deployment-review
  prompts.

## Hosted Demo State

Current public app:

```text
https://stackcert-staging.savikk129.workers.dev/auth/sign-in
```

Current hosted API:

```text
https://stackcert-api-oaw2bwdgyq-uc.a.run.app
```

Fallback GitHub Pages app:

```text
https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in
```

The hosted demo is useful for product walkthroughs. It is still staging:

- Cloudflare Workers serves the static web app.
- Supabase Auth handles sign-in/sign-up.
- Supabase Edge Function `stackcert-api` mirrors the product API enough for
  fallback demos, including MCP discovery/RPC routes.
- The Edge Function remains a lightweight demo/API-preview layer, not the
  provider-grade Python CASS runtime.
- Cloud Run staging now runs the real FastAPI/CASS API with
  `STACKCERT_PERSISTENCE_BACKEND=supabase` and allows the Cloudflare staging
  origin in CORS.

## Current Verification Baseline

Latest local verification from the current working tree:

```text
uv run python -m py_compile stackcert/guards/model_judge_adapter.py stackcert/guards/rest_adapter.py stackcert_service/services/provider_secrets.py stackcert_service/services/guard_connectors.py stackcert_service/services/jobs.py stackcert_service/schemas.py scripts/mcp_client_smoke.py scripts/deployment_smoke.py scripts/cloud_run_api_smoke.py
  -> OK

uv run python -m unittest discover -s tests_service
  -> 60 tests passed

uv run python -m unittest discover -s tests
  -> 17 tests passed

uv run python scripts/mcp_client_smoke.py --api-url http://127.0.0.1:18081
  -> mcp client smoke OK

npm --prefix web run typecheck -- --pretty false
  -> OK

npm --prefix web test -- --run
  -> 6 tests passed

npm --prefix web run build
  -> OK

npm run build
  -> OK
```

Recent deployment verification from the hosted staging stack:

```text
docker build -f Dockerfile.api -t stackcert-api:cloudrun-prep .
docker run ... stackcert-api:cloudrun-prep
.venv/bin/python scripts/cloud_run_api_smoke.py --api-url http://127.0.0.1:18080
  -> OK

.venv/bin/python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> OK

Authenticated Cloud Run smoke with Supabase demo user
  -> OK

.venv/bin/python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1
  -> OK
```

Latest hosted verification:

- Supabase remote migration history matches local migrations:
  `20260523151421`, `20260523192827`, `20260524023733`.
- Cloudflare Workers static app is live at
  `https://stackcert-staging.savikk129.workers.dev`.
- Cloudflare deployment list shows the latest `stackcert-staging` deployment
  was created by the GitHub `deploy cloudflare` workflow.
- Cloud Run `GET /api/health` returns `200`.
- Cloud Run unauthenticated API calls return `401`/`403` as expected.
- Authenticated deployment smoke against Cloudflare + Cloud Run + Supabase Auth
  returns `deployment smoke OK`; the smoke script now also initializes the
  hosted MCP endpoint and calls `get_release_evidence_status` with an
  authenticated Supabase session.
- Latest GitHub Actions runs are green for `ci`, fallback `deploy pages`, and
  `deploy cloudflare`.
- GitHub repository secrets/variables now include `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, Cloud Run `VITE_API_BASE_URL`, Supabase URL, the
  browser-safe Supabase key, and the smoke-test user credentials.
- Cloud Run staging prep now includes `.gcloudignore`,
  `scripts/gcloud_cost_preflight.py`, `scripts/cloud_run_secrets.py`, and
  `scripts/cloud_run_api_smoke.py`.
- GCP billing check on 2026-05-24 found billing disabled for `creatorconsulting`
  and `friendlychat-8ed89`, and billing enabled for
  `project-e7840c42-f298-4bd9-bff`.
- A `StackCert staging $10` monthly budget now exists for
  `project-e7840c42-f298-4bd9-bff`, scoped to gross usage before free-trial
  credits. Alerts are configured at 50%, 90%, 100%, and forecasted 100%.
- The Cloud Run cost preflight now passes for
  `project-e7840c42-f298-4bd9-bff` in `us-central1`.
- Cloud Run service `stackcert-api` is deployed at
  `https://stackcert-api-oaw2bwdgyq-uc.a.run.app`.
- Latest ready revision is `stackcert-api-00004-qv9`, deployed from commit
  `c761a3f`.
- Staging caps are active: max scale `1`, min scale default `0`, CPU `1`,
  memory `512Mi`, timeout `60s`, concurrency `40`.
- The current Cloud Run revision passes `scripts/cloud_run_api_smoke.py` and
  authenticated `scripts/mcp_client_smoke.py` against the hosted `/api/mcp`
  endpoint with the official Python MCP SDK.
- Cloudflare Workers static-assets config is present at root `wrangler.jsonc`.
  GitHub Actions `deploy-cloudflare.yml` is now the preferred auditable
  Cloudflare CD path. Cloudflare Workers Builds is still configured externally,
  but the current scoped token can deploy/list Workers and returns `403` for
  Workers Builds API introspection; add Workers Builds read/config permissions
  if we want automated build-log polling.

## Important Boundaries

The current product is not yet production-ready for real customers, but the
worker path has moved past demo-only execution.

Do not overstate the current release evidence. It is scoped to:

- the benchmark/example mixture;
- safety-check versions and thresholds;
- model, prompt, tool, retrieval, and traffic assumptions;
- K<=2 serial aggregation in the current CASS engine;
- the candidate stack set evaluated in the run.

The hosted Edge Function demo does not replace the Python FastAPI/worker path.
Provider-grade evaluation, retries, budgets, and durable artifact writes belong
in the FastAPI plus Cloud Run worker architecture.

Current worker status:

- queued evaluation jobs can target a real project benchmark suite;
- deterministic provider-style adapters execute configured safety-check
  connectors for cheap dry runs;
- REST safety-check adapters execute configured connector endpoints through the
  worker contract using redacted prompts, connector thresholds, backend-only
  environment secrets, and retry/dead-letter classification for HTTP timeout,
  rate-limit, provider, and configuration failures;
- model-judge adapters execute OpenAI-compatible, Ollama-style, or direct-JSON
  judge endpoints using the same worker contract and persisted CASS evidence
  path;
- connector secrets now resolve through a backend-only provider-secret resolver:
  local development can use process-memory secrets for fake providers, while
  production connector configs point workers at explicit environment-secret
  refs such as `STACKCERT_GUARD_SECRET_<GUARD_KEY>`;
- jobs enforce a run-level budget cap before execution;
- worker outputs create a persisted `worker_evaluation` evidence run;
- CASS recommendation, overlap, measurement-plan, cost, and release-evidence
  pages can read that worker-produced run;
- usage events are recorded per evaluated safety check;
- retry, lease, dead-letter, manual retry, and run-next worker APIs remain in
  place from the earlier worker hardening slice.

## What To Do Next

### 1. Harden The Provider Worker Path

The worker path now has deterministic, REST, and model-judge adapter execution.
The next gap is making that path comfortable for real design partners who
already have provider endpoints and CI gates.

Needed work:

- provider-specific retry/backoff/rate-limit policy by connector;
- idempotent output writes across worker retries and duplicate claims;
- managed Secret Manager/Vault storage instead of the current
  env-ref plus local-memory resolver;
- connector-level price cards and provider-specific token accounting;
- lease renewal for long-running jobs;
- per-workspace and per-run budget caps backed by database policy;
- dead-letter review UI;
- Cloud Run worker deployment or scheduled Cloud Run Job using
  `scripts/worker_once.py`;
- recompute evidence after targeted measurement outputs land, not only after
  initial evaluation runs.

Keep deterministic mode for CI/onboarding, but make REST and model-judge modes
the primary design-partner integration paths.

### 2. Harden Auth, Tenancy, And Evidence Storage

Before real users:

- replace demo workspace assumptions with real membership/role checks;
- finish RLS tests for all exposed tables;
- keep service-role keys backend-only;
- store raw uploads/artifacts in private Storage or customer-hosted mode;
- make issued release evidence immutable;
- add audit events for evidence issue/signoff, connector changes, job runs, and
  MCP tool calls.

### 3. Validate MCP With Real Agent Clients

The MCP surface now has client-level proof through
`scripts/mcp_client_smoke.py`, which uses the official Python MCP SDK against
`/api/mcp`.

Next MCP tasks:

- add scoped API tokens or OAuth-style access for machine users;
- add MCP client compatibility checks for at least one desktop/agent runtime
  beyond the Python SDK;
- decide which tools are read-only by default and which require explicit human
  approval;
- add audit events for tool calls that queue work or affect release decisions.

### 4. Production Readiness Pass

After staging works end to end:

- create production Supabase project;
- configure production Auth URLs, email templates, and sender domain;
- configure production Cloudflare frontend hosting and custom domains;
- add Sentry or equivalent error reporting;
- add uptime checks for frontend, `/api/health`, Auth, and release-evidence
  status;
- set GCP/Supabase/provider budget alerts;
- run backup/restore rehearsal;
- write legal/product terms for scoped evidence and no-guarantee positioning.

## Current Priority

The next engineering milestone should be:

```text
Connector price cards + idempotent worker output writes + machine auth for MCP
```

The staging hosting milestone is complete: Supabase, Cloud Run, Cloudflare, and
GitHub CI/CD are wired and smoke-tested. The worker can now move a pilot team
from uploaded outputs to deterministic, REST, or model-judge managed runs. The
next value milestone is making provider execution resilient and auditable enough
for design partners.
