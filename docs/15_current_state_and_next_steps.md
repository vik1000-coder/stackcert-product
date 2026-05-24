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
- Hosted demo using GitHub Pages for the static frontend and a Supabase Edge
  Function API for authenticated demo traffic.
- GitHub Actions workflows for CI and GitHub Pages deployment.
- CASS core with exact K<=2 serial safety-check combination scoring,
  comparison intervals, targeted measurement recommendations, and evidence
  export.
- Uploaded-output pilot path: users can create a project, commit an example
  suite, upload safety-check outputs, generate a CASS-backed recommendation,
  inspect rankings/overlap/measurements, and issue scoped release evidence.
- Supabase-backed persistence for custom behaviors, benchmark suites, guard
  connectors, jobs, usage events, issued evidence, signoffs, and uploaded-output
  pilot runs.
- Agent/MCP surface for release-evidence status, theory cards, measurement
  recommendations, cost ledgers, integration guides, and deployment-review
  prompts.

## Hosted Demo State

Current public app:

```text
https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in
```

Current hosted API:

```text
https://cgwiwmfzpektpyquiveg.supabase.co/functions/v1/stackcert-api
```

Current Cloud Run staging API:

```text
https://stackcert-api-oaw2bwdgyq-uc.a.run.app
```

The hosted demo is useful for product walkthroughs. It is not the final runtime:

- GitHub Pages serves the static web app.
- Supabase Auth handles sign-in/sign-up.
- Supabase Edge Function `stackcert-api` mirrors the product API enough for
  demos, including MCP discovery/RPC routes.
- The Edge Function remains a lightweight demo/API-preview layer, not the
  provider-grade Python CASS runtime.
- Cloud Run staging now runs the real FastAPI/CASS API with
  `STACKCERT_PERSISTENCE_BACKEND=supabase`.

## Current Verification Baseline

Latest local verification from the current working tree:

```text
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
  -> 11 tests passed

.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v
  -> 54 tests passed

cd web && npm run lint
  -> OK

cd web && npm test -- --run
  -> 4 tests passed

cd web && npm run build
  -> OK

deno check supabase/functions/stackcert-api/index.ts
  -> OK

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

- Supabase Edge Function `stackcert-api` redeployed after the MCP update.
- Hosted `GET /api/health` returns `200`.
- Hosted unauthenticated `GET /api/mcp/manifest` returns `401`, which confirms
  the app API auth gate is still active.
- Authenticated hosted MCP smoke still needs the smoke anon key available in
  the shell or CI secret.
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
- Latest ready revision is `stackcert-api-00002-xfx`.
- Staging caps are active: max scale `1`, min scale default `0`, CPU `1`,
  memory `512Mi`, timeout `60s`, concurrency `40`.
- Cloudflare Workers static-assets config is present at `web/wrangler.jsonc`
  for temporary frontend hosting from the `web` path.

## Important Boundaries

The current product is not yet production-ready for real customers.

Do not overstate the current release evidence. It is scoped to:

- the benchmark/example mixture;
- safety-check versions and thresholds;
- model, prompt, tool, retrieval, and traffic assumptions;
- K<=2 serial aggregation in the current CASS engine;
- the candidate stack set evaluated in the run.

The hosted Edge Function demo does not replace the Python FastAPI/worker path.
Provider-grade evaluation, retries, budgets, and durable artifact writes still
belong in the FastAPI plus Cloud Run worker architecture.

## What To Do Next

### 1. Commit And Push Current MCP/CASS Work

The current working tree contains uncommitted MCP, CASS theory-test, Edge
Function, and documentation updates. Commit and push these changes so GitHub
Actions can run against the same state described here.

After pushing, verify:

- CI passes.
- GitHub Pages deployment still passes.
- Hosted deployment smoke passes with `STACKCERT_SMOKE_SUPABASE_ANON_KEY`.

### 2. Route A Staging Frontend To Cloud Run

The FastAPI Cloud Run service is now deployed. The next deployment step is to
point a staging frontend at it instead of the Supabase Edge Function.

Build the frontend with:

```text
VITE_API_BASE_URL=<Cloud Run API or api-staging domain>
VITE_SUPABASE_URL=<staging Supabase URL>
VITE_SUPABASE_ANON_KEY=<staging publishable key>
```

Then smoke:

- sign in;
- create project;
- import/commit suite;
- upload safety-check outputs;
- inspect recommendation;
- read theory card through MCP;
- issue release evidence;
- reload and confirm persisted run state.

For the current Cloudflare Workers Builds UI, use:

```text
Path: web
Build command: npm ci && npm run build
Deploy command: npx wrangler deploy
```

### 3. Build The Real Provider Worker Path

The worker path is the most important product gap after Cloud Run API hosting.

Needed work:

- worker entrypoint;
- durable job claiming and lease renewal;
- provider retry/backoff/rate-limit policy;
- per-workspace budget caps;
- idempotent output writes;
- dead-letter handling;
- usage-event accounting;
- recompute evidence after outputs land.

Start with deterministic/fake providers in staging, then add one real REST
safety-check adapter.

### 4. Harden Auth, Tenancy, And Evidence Storage

Before real users:

- replace demo workspace assumptions with real membership/role checks;
- finish RLS tests for all exposed tables;
- keep service-role keys backend-only;
- store raw uploads/artifacts in private Storage or customer-hosted mode;
- make issued release evidence immutable;
- add audit events for evidence issue/signoff, connector changes, job runs, and
  MCP tool calls.

### 5. Validate MCP With Real Agent Clients

The MCP surface is now useful, but it needs client-level proof.

Next MCP tasks:

- run a real MCP client against `/api/mcp`;
- add authenticated hosted MCP smoke coverage in CI;
- add scoped API tokens or OAuth-style access for machine users;
- decide which tools are read-only by default and which require explicit human
  approval;
- add audit events for tool calls that queue work or affect release decisions.

### 6. Production Readiness Pass

After staging works end to end:

- create production Supabase project;
- configure production Auth URLs, email templates, and sender domain;
- configure Cloudflare Pages or equivalent production frontend hosting;
- add Sentry or equivalent error reporting;
- add uptime checks for frontend, `/api/health`, Auth, and release-evidence
  status;
- set GCP/Supabase/provider budget alerts;
- run backup/restore rehearsal;
- write legal/product terms for scoped evidence and no-guarantee positioning.

## Current Priority

The next engineering milestone should be:

```text
Cloud Run staging FastAPI + Supabase persistence + authenticated frontend smoke
```

The API half of that milestone is complete. The remaining half is a frontend
deployment pointed at the Cloud Run URL, followed by the authenticated
onboarding/import/upload/evidence smoke.
