# Current State And Next Steps

Last updated: 2026-06-05

This document is the short operational view of the product. The older planning
docs still matter, but this page should be the first place to check when
deciding what to build next.

The detailed executable roadmap is now
`18_pilot_ready_execution_plan.md`. This page summarizes the current baseline;
the execution plan owns the ordered implementation queue.

For the shortest live-system snapshot, including current deployed revisions,
CI status, and the latest verification commands, see
`20_current_release_status.md`.

## 2026-06-05 Operations And Hosted-Smoke Update

The latest readiness pass closed the main repo-owned blockers for a staged
design-partner pilot. The product is still not cleared for broad real customer
data, but the previous missing smoke/evidence items are now verified.

What changed in this pass:

- Cloudflare Workers now applies static security headers to asset responses:
  CSP, HSTS, frame denial, referrer policy, permissions policy, and MIME
  sniffing protection.
- The staging Cloud Run API was redeployed as revision
  `stackcert-api-00023-rvx` with project-scoped signed release-gate webhook
  secret configuration.
- Frontend routes are code-split; the previous Vite production bundle warning
  is gone and the main JS chunk is about 285 kB.
- Mobile setup anchor scrolling now accounts for the sticky header.
- Demo bundle cold-cache fills are serialized per lambda cost to avoid
  duplicated expensive first-load work under concurrent requests.
- Google Cloud uptime checks are configured for direct Cloud Run `/api/health`
  and Cloudflare same-origin `/api/health`.
- Google Cloud log-based metrics and alert policies are configured for API 5xx,
  worker dead letters, provider failures, and release-gate errors.
- Google Cloud alert policies route to notification channel
  `projects/project-e7840c42-f298-4bd9-bff/notificationChannels/12163037838207638915`.
- Supabase schema restore rehearsal completed against a disposable local
  Postgres target, with evidence recorded in
  `artifacts/design-partner-ops-evidence.json`.
- Repeatable full restore rehearsal tooling now restores `public,private,storage`
  plus Storage metadata into disposable Postgres and verifies table, bucket,
  object, and artifact metadata counts.

Latest verification from this pass:

```text
uv run python -m unittest discover -s tests_service -p 'test_*.py' -v
  -> 139 tests passed

uv run python -m unittest discover -s tests -p 'test_*.py' -v
  -> 19 tests passed

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run
  -> 52 tests passed

npm run build
  -> OK; route chunks split and the previous >500 kB Vite warning is gone.

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev
  -> deployment smoke OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted>
  -> deployment smoke OK, including authenticated /api/projects and MCP checks

uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted>
  -> mcp client smoke OK

uv run python scripts/hosted_uploaded_output_pilot_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted>
  -> hosted uploaded-output pilot smoke OK:
     project=84749071-5221-4df8-8cea-bbf47d3184c0 run=run_a1d690445ed5

uv run python scripts/release_gate_webhook_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --project-id proj_acme_copilot
  -> release-gate webhook smoke OK: decision=pass

uv run python scripts/cloud_run_worker_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted> --project-id project-e7840c42-f298-4bd9-bff --region us-central1
  -> cloud run worker smoke OK: job_46bc4f7b2749 complete

uv run python scripts/design_partner_ops_check.py --evidence-json artifacts/design-partner-ops-evidence.json --strict
  -> status ready
```

Still required before real customer data:

- Execute one real design-partner uploaded-output pilot under signed terms.
- Configure production-grade Supabase Auth custom sender domain/SMTP and
  reviewed invite/password lifecycle templates.
- Build the first customer-specific release-gate adapter on top of the signed
  generic webhook.
- Observe provider throttling/retry behavior under real managed-provider
  traffic.

## 2026-06-02 Hosted-Pilot Hardening Update

The current branch now covers the next hosted design-partner pilot slice. The
goal of this pass was to make a buyer-visible private pilot credible without
migrating away from Vite, FastAPI, Supabase, and Cloudflare.

What changed in this pass:

- Added safe sample pilot templates for customer support, internal assistant,
  and agentic workflows, plus duplication into a private workspace/project.
- Duplicated samples now create template examples, safety options, onboarding
  profile data, and optional `template_seeded` uploaded-output evidence. The
  workbench and release report warn that this evidence is fixture data that must
  be replaced before buyer release claims.
- Extended connector validation so REST/model-judge checks run an explicit
  live test call, store redacted `last_test` metadata, and gate worker-backed
  runs unless selected connectors have a passing live test from the last seven
  days. Uploaded-output checks remain contract/file validated.
- Added durable report versions with immutable payload/hash metadata and
  Markdown, JSON, and styled PDF exports from the same structured report
  document.
- Added project permissions/capabilities and surfaced disabled UI states for
  report issuance, signoff, exports, connector changes, and retention/secrets.
- Added retention execution dry-run/apply endpoints and admin UI preview for
  expiring raw examples, deleting provider responses, and keeping redacted
  snippets/aggregates.
- Added minimum YAML config import preview/apply for pilot profile fields,
  safety options, examples references, decision mappings, combination rules,
  and release context.

Latest local verification from this pass:

```text
uv run python -m compileall stackcert_service
  -> OK

uv run python -m unittest tests_service.test_api_demo -v
  -> 59 tests passed

uv run python -m unittest tests_service.test_sellable_ready_controls -v
  -> 4 tests passed

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run src/App.test.tsx src/FirstPilotClarity.test.tsx src/WorkflowPolish.test.tsx
  -> 48 tests passed

Playwright CLI QA:
  landing sample duplication -> private pilot overview -> template evidence
  warning -> release report -> PDF export -> setup config preview -> admin
  retention preview -> 390px setup mobile overflow check
  -> OK; no browser console warnings/errors; no horizontal overflow.
```

Deployment results from this pass:

```text
supabase db push --linked --yes
  -> applied 20260602143000_sellable_ready_pilot_controls.sql
  -> applied 20260602162000_report_versions_and_hardening.sql

Cloud Run API
  -> deployed image b0b5219-staging-202606021930-amd64
  -> revision stackcert-api-00020-7qm serving 100% traffic

npm run deploy
  -> Cloudflare Worker stackcert-staging deployed as version
     c9e4c39a-c20b-4635-baee-4a7bdfcfe0a0 before the docs-refresh redeploy

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> cloud run api smoke OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev
  -> deployment smoke OK
```

## 2026-06-01 Design-Partner Hardening Update

This earlier pushed/deployed hardening pass was commit `eafbd2d`
(`Harden design-partner pilot readiness`) on
`codex/design-partner-deployability-discovery`. It was manually deployed at
the time to Cloudflare staging as Worker version
`80f1b282-fac3-469a-b8c6-e2856cc24f90`.

What changed in this pass:

- Sentry was intentionally skipped. Operations readiness now uses a non-Sentry
  evidence gate in `scripts/design_partner_ops_check.py`.
- The private pilot path is now uploaded-output first: matching example/output
  templates, stable ID contract, output coverage preview, release-context
  fields, run creation, and recommendation/report/gate next steps are above the
  advanced connector/worker controls.
- `/proof` now has a buyer-readable cost simulator, explicit honest-fallback
  language, task-specific benchmark slices, redacted example input/output
  summaries, and a clear explanation of the fail-closed voting rule.
- Public docs/pages now include pilot readiness, procurement, support,
  workflow integrations, sitemap, and `llms.txt` updates for the
  design-partner launch posture.
- New docs:
  - `21_design_partner_pilot_checklist.md`
  - `22_workflow_integration_guide.md`
  - `23_design_partner_sales_pack.md`

Latest verification from that pass:

```text
npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run
  -> 40 tests passed

uv run python -m unittest discover -s tests_service -p 'test_*.py' -v
  -> 131 tests passed

npm --prefix web run build
  -> OK, with the historical Vite >500 kB chunk warning

npm run deploy
  -> Cloudflare staging deployed

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev
  -> deployment smoke OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> cloud run api smoke OK
```

Playwright QA covered local desktop/mobile `/proof`, `/pilot-readiness`,
`/integrations`, `/procurement`, `/support`, and
`/app/ws_demo/proj_acme_copilot/setup`; it also covered hosted desktop/mobile
for the public proof/readiness/integration/procurement/support pages. The
setup-page ordering bug was checked and fixed: uploaded-output work now renders
before advanced connectors/workers.

Those previously unverified hosted authenticated smokes were rerun on
2026-06-05 with Supabase smoke credentials exported and now pass. See the
2026-06-05 update above and `20_current_release_status.md` for the exact
commands and outcomes.

## Current Working State

StackCert is now a usable prototype with a real product shape:

- React + Vite web app with public landing pages, auth routes, onboarding,
  project setup, overview, options compared, overlap analysis, test plan and
  cost, release evidence, and drift views.
- Onboarding is now a guided first-evidence-packet builder. It saves a local
  draft through sign-in, creates workspace/project/profile records atomically
  through `/api/onboarding/pilots`, stores the project pilot profile in
  Supabase, and routes the user to the setup section that matches their first
  evidence source.
- FastAPI service around the Python CASS method metadata and old_cass evidence engine.
- Supabase schema, Auth integration, RLS smoke coverage, and remote free-tier
  migration history.
- Hosted staging demo using Cloudflare Workers static assets for the frontend,
  Supabase Auth, and the Cloud Run FastAPI/CASS service for authenticated API
  traffic.
- GitHub Actions workflows for CI, fallback GitHub Pages deployment, and
  Cloudflare Workers staging deployment after CI succeeds.
- CASS product surfaces now expose `cass-v2-atom-correlation-search`; the
  retained `old_cass-k2-serial-interval-v1` engine supplies exact K<=2 serial
  safety-check combination scoring, comparison intervals, targeted measurement
  recommendations, and evidence export.
- Uploaded-output pilot path: users can create a project, commit an example
  suite, upload safety-check outputs, generate a CASS-backed recommendation,
  inspect rankings/overlap/measurements, and issue scoped release evidence.
- Setup now presents that uploaded-output path as the production v1 path before
  advanced managed connectors/workers. It includes matching pilot file
  templates, output coverage checks, release-context fields, and clear
  recommendation/report/gate handoff copy.
- Managed worker path: users can configure REST safety-check and model-judge
  connectors, enqueue provider-style evaluation jobs against a committed suite,
  enforce a run budget cap, and persist the resulting CASS evidence run.
- Managed provider-secret surface: connector secrets can be registered,
  rotated, disabled, and inspected through redacted APIs. The backend stores
  only references and metadata, supports local memory/env refs plus Google
  Secret Manager refs for Cloud Run, and audits register/rotate/disable/use.
- Worker lease renewal is available for long-running jobs, and
  `scripts/worker_once.py` can claim one or more jobs across all projects when
  using the Supabase service-role backend.
- Release-gate API for CI/deploy systems:
  `POST /api/projects/{project_id}/release-gates/evaluate` returns
  `pass`/`warn`/`block`, blocking reasons, evidence packet id, retest
  triggers, and machine-readable assumptions. It supports Supabase user auth or
  release-gate-only machine tokens scoped separately from MCP tokens.
- Signed release-gate webhook:
  `POST /api/projects/{project_id}/release-gates/webhook` wraps the same
  evaluator for deployment systems that can send HMAC-signed JSON with
  timestamp replay protection in production.
- Worker-produced evidence writes are idempotent across retries: jobs, guard
  outputs, measurement recommendations, and usage events now have stable
  conflict keys instead of duplicate-prone append behavior.
- Connector price cards are captured at setup and propagated through run
  estimates, provider token accounting, and usage ledgers.
- Supabase-backed persistence for custom behaviors, benchmark suites, guard
  connectors, jobs, usage events, issued evidence, signoffs, and uploaded-output
  pilot runs, plus project onboarding profiles with workspace-member RLS.
- Service-layer tenancy/RBAC now protects workspace, project, setup, run,
  evidence, job, usage, drift, and MCP surfaces in addition to Supabase RLS.
  Workspace/project lists are membership-filtered, cross-tenant object access is
  denied, and sensitive mutations write audit events.
- Issued evidence now has backend readiness gates, immutable packet snapshots,
  private JSON/Markdown artifact records, SHA-256 verification, and authorized
  signed URL generation. The release-evidence UI shows readiness blockers,
  warnings, artifact hashes, and verification/download controls after issue.
- Agent/MCP surface for release-evidence status, theory cards, measurement
  recommendations, cost ledgers, integration guides, and deployment-review
  prompts. MCP can authenticate with Supabase bearer tokens or MCP-only machine
  bearer tokens scoped to `mcp:read` / `mcp:write`; MCP machine tokens can now
  be project-scoped through `STACKCERT_MCP_MACHINE_TOKEN_PROJECTS`.

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
- Cloudflare Workers proxies same-origin `/api/*` and `/api/mcp` traffic to
  Cloud Run, so hosted browser and MCP clients can use
  `https://stackcert-staging.savikk129.workers.dev` as both web and API base.
- Supabase Auth handles sign-in/sign-up.
- Supabase Edge Function `stackcert-api` mirrors the product API enough for
  fallback demos, including MCP discovery/RPC routes.
- The Edge Function remains a lightweight demo/API-preview layer, not the
  provider-grade Python CASS runtime.
- Cloud Run staging now runs the real FastAPI/CASS API with
  `STACKCERT_PERSISTENCE_BACKEND=supabase`, explicitly enables the seeded demo
  workspace for staging smoke users, and allows the Cloudflare staging origin
  in CORS.
- The latest manual deploy updated both the Cloudflare static frontend/Worker
  and the Cloud Run API image. See `20_current_release_status.md` for the
  current Worker version, Cloud Run revision, and image tag.

## Current Verification Baseline

The newest exact verification baseline is in `20_current_release_status.md`.
Older command logs below are retained as historical evidence for prior
milestones and may include earlier test counts or Cloud Run revision IDs.

Latest local verification from the current working tree:

```text
uv run python -m py_compile stackcert_service/schemas.py stackcert_service/services/onboarding.py stackcert_service/db/supabase.py stackcert_service/main.py
  -> OK

uv run python -m unittest tests_service.test_access_control
  -> 10 tests passed

uv run python -m unittest discover -s tests_service
  -> 104 tests passed

uv run python -m unittest discover -s tests
  -> 17 tests passed

uv run python scripts/mcp_client_smoke.py --api-url http://127.0.0.1:18082 --bearer-token <mcp-machine-token>
  -> mcp client smoke OK

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run
  -> 6 tests passed

npm --prefix web run build
  -> OK

npm run build
  -> OK

git diff --check
  -> OK

supabase db push --linked --dry-run
  -> would apply 20260525021244_immutable_evidence_artifacts.sql

supabase db push --linked --yes
  -> applied 20260525021244_immutable_evidence_artifacts.sql

supabase migration list --linked
  -> local and remote include 20260525021244

supabase db advisors --linked --type all --level warn --fail-on error
  -> OK exit; existing warning that Supabase Auth leaked-password protection is disabled

Browser responsive smoke against local API/web
  -> onboarding rendered at desktop and 390px mobile widths; wizard advanced to
     review; creating a model-judge pilot landed on setup#safety-options with
     the tailored onboarding handoff and no browser console errors.

supabase db lint --local --schema public --level error --fail-on error
  -> no schema errors found

supabase db push --local --dry-run
  -> would include 20260525142950_add_project_onboarding_profiles.sql along
     with locally unapplied prior migrations

supabase db push --linked --dry-run before applying the migration
  -> would apply 20260525001842_worker_idempotency_and_usage_keys.sql

supabase db push --linked --yes
  -> applied 20260525001842_worker_idempotency_and_usage_keys.sql

supabase migration list
  -> local and remote include 20260525001842

supabase db advisors --linked --type all --level warn --fail-on error
  -> OK exit; existing warning that Supabase Auth leaked-password protection is disabled
```

Recent deployment verification from the hosted staging stack:

```text
uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1
  -> OK

docker buildx build --platform linux/amd64 -f Dockerfile.api ...
gcloud run deploy stackcert-api ...
uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> OK

gcloud run jobs deploy stackcert-worker ...
uv run python scripts/cloud_run_worker_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --project-id project-e7840c42-f298-4bd9-bff
  -> OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

Hosted authenticated uploaded-output preview smoke
  -> created a temporary Supabase project/suite and returned coverage=1.0
```

Historical hosted verification retained from earlier milestones:

- Supabase remote migration history matches local migrations:
  `20260523151421`, `20260523192827`, `20260524023733`, `20260525001842`,
  `20260525021244`.
- Cloudflare Workers static app is live at
  `https://stackcert-staging.savikk129.workers.dev`.
- Cloudflare deployment list at that point showed the `stackcert-staging`
  deployment was created by the GitHub `deploy cloudflare` workflow.
- Cloud Run `GET /api/health` returns `200`.
- Cloud Run unauthenticated API calls return `401`/`403` as expected.
- Authenticated deployment smoke against Cloudflare + Cloud Run + Supabase Auth
  returns `deployment smoke OK`; the smoke script now also initializes the
  hosted MCP endpoint and calls `get_release_evidence_status` with an
  authenticated Supabase session.
- Recent GitHub Actions runs are green for `ci`, fallback `deploy pages`, and
  `deploy cloudflare` on commit `6ad91c3`. The `ci` run included Python
  service/core tests, frontend checks, and Supabase migration checks; the
  Cloudflare deploy run built the static app, deployed it, and passed the
  deployed smoke test.
- GitHub repository secrets/variables now include `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, Cloud Run `VITE_API_BASE_URL`, Supabase URL, the
  browser-safe Supabase key, and the smoke-test user credentials.
- Cloud Run staging prep now includes `.gcloudignore`,
  `scripts/gcloud_cost_preflight.py`, `scripts/cloud_run_secrets.py`, and
  `scripts/cloud_run_api_smoke.py`.
- GCP billing check on 2026-05-24 found billing disabled for `creatorconsulting`
  and `friendlychat-8ed89`, and billing enabled for
  `project-e7840c42-f298-4bd9-bff`.
- A `StackCert staging $50` monthly budget now exists for
  `project-e7840c42-f298-4bd9-bff`, scoped to gross usage before free-trial
  credits. Alerts are configured at 50%, 90%, 100%, and forecasted 100%.
- The Cloud Run cost preflight now passes for
  `project-e7840c42-f298-4bd9-bff` in `us-central1`.
- Cloud Run service `stackcert-api` is deployed at
  `https://stackcert-api-oaw2bwdgyq-uc.a.run.app`.
- Ready Cloud Run API revision at that point was `stackcert-api-00017-vmj`,
  serving the image deployed from commit `932ac14` with the staging cap raised
  to max instances `3` and min instances kept at `0`.
- Image from that milestone:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:932ac14-staging-202605251701-amd64`.
- Cloud Run worker job `stackcert-worker` is deployed in `us-central1` from
  the same image with service account
  `stackcert-worker-runtime@project-e7840c42-f298-4bd9-bff.iam.gserviceaccount.com`,
  one task, parallelism `1`, max retries `0`, and task timeout `900s`.
- The worker execution `stackcert-worker-vps7b` completed successfully in
  `1m37.1s`; `scripts/cloud_run_worker_smoke.py` queued a demo
  deterministic job and verified it completed through the API.
- The linked Supabase staging project now has the idempotent demo seed rows
  from `supabase/seed.sql`, which are required for demo jobs to satisfy FK
  constraints in persisted `jobs` rows.
- Cloud Run staging explicitly sets `STACKCERT_ENABLE_DEMO_WORKSPACE=true` so
  the public demo user can see the seeded walkthrough while real production
  deployments can leave that flag unset.
- Staging caps are active: max scale `3`, min scale default `0`, CPU `1`,
  memory `512Mi`, timeout `60s`, concurrency `40`.
- The linked Supabase staging project includes
  `20260525142950_add_project_onboarding_profiles.sql`, so hosted onboarding
  can create workspace/project/profile records end to end.
- The API image now includes the packaged 2,000-example / 8-safety-option CASS
  demo artifacts under `demo_data/`, so Cloud Run no longer falls back to the
  compact clean-clone fixture.
- That Cloud Run revision passed unauthenticated and authenticated
  `scripts/cloud_run_api_smoke.py`, authenticated `scripts/mcp_client_smoke.py`
  against the hosted `/api/mcp` endpoint with the official Python MCP SDK, and
  full `scripts/deployment_smoke.py` against Cloudflare same-origin API +
  Supabase Auth. The smoke scripts now also call
  `/api/projects/proj_acme_copilot/release-gates/evaluate` and assert the
  response carries scoped non-guarantee assumptions.
- Hosted browser QA passes sign-in, same-origin API usage, full 2,000-example
  demo overview, admin budget controls, onboarding pilot creation, setup
  handoff, and mobile layouts without console/server errors.
- The hosted Milestone 5 uploaded-output preview endpoint was smoke-tested with
  a temporary authenticated Supabase project and committed custom suite; the
  preview returned `coverage=1.0` before run creation.
- Milestone 3/4 push verification for commit `e2ff7a2` is green:
  - `ci` run `26382004865` -> success;
  - fallback `deploy pages` run `26382004853` -> success;
  - `deploy cloudflare` run `26382070724` -> success.
- Milestone 5 push verification for commit `043e012` is green:
  - `ci` run `26382569136` -> success;
  - fallback `deploy pages` run `26382569147` -> success;
  - `deploy cloudflare` run `26382632288` -> success.
- Worker/admin rollout push verification for commit `6ad91c3` is green:
  - `ci` run `26383846278` -> success;
  - fallback `deploy pages` run `26383846277` -> success;
  - `deploy cloudflare` run `26383928733` -> success.
- Cloudflare Workers static-assets config is present at root `wrangler.jsonc`.
  GitHub Actions `deploy-cloudflare.yml` is now the preferred auditable
  Cloudflare CD path. Cloudflare Workers Builds is still configured externally,
  but the current scoped token can deploy/list Workers and returns `403` for
  Workers Builds API introspection; add Workers Builds read/config permissions
  if we want automated build-log polling.

## Important Boundaries

The current product is not yet production-ready for real customers, but the
worker path has moved past demo-only execution and the app now has a real
service-layer trust boundary for design-partner pilots.

Do not overstate the current release evidence. It is scoped to:

- the benchmark/example mixture;
- safety-check versions and thresholds;
- model, prompt, tool, retrieval, and traffic assumptions;
- K<=2 serial aggregation in the current old_cass evidence engine;
- the candidate stack set evaluated in the run.
- the explicit CASS/old_cass methodology boundary shown in the report.

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
- worker-produced outputs and measurement recommendations are upserted by
  stable run/guard/example and run/action keys, so retrying the same job does
  not duplicate evidence rows;
- connector secrets now resolve through a backend-only provider-secret resolver:
  local development can use process-memory secrets for fake providers, while
  production connector configs point workers at explicit environment-secret
  refs such as `STACKCERT_GUARD_SECRET_<GUARD_KEY>` or Google Secret Manager
  refs such as
  `gcp-secret://projects/{project}/secrets/{secret}/versions/latest`;
- connector secret APIs register, rotate, disable, and report redacted secret
  metadata without returning provider secret values;
- connector price cards now support per-request, input-token, and output-token
  cost estimates, with provider-reported token usage used when REST/model-judge
  endpoints return it;
- jobs enforce a run-level budget cap before execution;
- workspace and project budget policies are now first-class persisted records
  with RLS-backed Supabase tables, service-layer enforcement, and admin UI
  controls for monthly, per-run, measurement, hard-stop, and provider-spend
  settings;
- worker outputs create a persisted `worker_evaluation` evidence run;
- CASS recommendation, overlap, measurement-plan, cost, and release-evidence
  pages can read that worker-produced run;
- usage events are recorded per evaluated safety check with stable external
  event ids for retry-safe persistence;
- retry, lease, lease-renewal, dead-letter, manual retry, cancel, and run-next
  worker APIs are in place;
- the independent Cloud Run worker job is deployed and smoke-tested;
- the app now includes a workspace admin dashboard with worker health, spend,
  throughput, project status, connector-secret posture, budget policy
  management, job retry/cancel controls, dead-letter review, and audit trail.

Current trust-layer status:

- `docs/19_route_access_matrix.md` documents every FastAPI route's object
  scope, role/scope requirement, demo exception, and audit event expectation;
- access helpers normalize the existing Supabase role vocabulary into product
  groups such as `project_maintainer`, `evidence_issuer`, and
  `evidence_reviewer`;
- Supabase-backed and local membership lookup paths filter accessible
  workspaces/projects and enforce project/run/certificate object access;
- MCP user principals are filtered by project/run access, while MCP-only
  machine tokens remain limited to scoped MCP surfaces and configured project
  ids;
- release-gate-only machine tokens are separate from MCP tokens, hash-only at
  rest, project-scoped, and audited on every check;
- audit events are recorded for workspace/project creation, suite commits,
  uploaded-output runs, connector/job/work creation, measurement plans,
  evidence issue/signoff/export, retest queueing, custom behaviors, and MCP tool
  calls.
- benchmark/example imports now expose a schema endpoint, field-mapping support
  for external dataset column names, source/normalized SHA-256 fingerprints, and
  trace-import previews for LangSmith/Langfuse/OpenTelemetry-style JSONL traces.
- release-gate integration examples now cover GitHub Actions, GitLab CI,
  CircleCI, and a generic webhook payload under `integrations/release-gates/`.
- Public discovery assets now cover `robots.txt`, `sitemap.xml`, `llms.txt`,
  `/.well-known/security.txt`, `/.well-known/mcp/server.json`, Open Graph
  metadata, SoftwareApplication JSON-LD, and a web app manifest so search
  crawlers, AI agents, security researchers, and MCP registries can orient
  without crawling the private app shell.
- first-user pilot readiness now has a project-level API,
  `GET /api/projects/{project_id}/pilot-readiness`, and a setup/overview UI
  panel that turns the launch path into explicit steps: app record, example
  suite, safety options, evidence run, evidence review, and release-gate wiring.
  The same response includes the trust boundary: StackCert can reduce scoped
  release risk, but it is not a broad safety guarantee.

Current immutable-evidence status:

- `20260525021244_immutable_evidence_artifacts.sql` adds packet snapshots,
  artifact refs, artifact metadata, supersession/revocation metadata, and
  database triggers that prevent core issued-certificate edits/deletes;
- the backend computes a canonical issued packet JSON hash and stores private
  JSON/Markdown artifacts for issued evidence;
- evidence readiness blocks missing runs, incomplete runs, missing output
  coverage, insufficient safety-check counts, missing benchmark-suite linkage,
  and invalid CASS statuses, while allowing provisional evidence with explicit
  warnings;
- artifact signed URLs and hash verification require certificate access first;
- deployment smoke scripts now check the hosted evidence-readiness endpoint in
  addition to auth, MCP, and app-shell checks.
- evidence packets now include release-context hashes and fields for model,
  prompt, policy, tool, retrieval, traffic, benchmark-suite, and guard-version
  context when supplied by uploaded-output or worker runs. Release gates compare
  supplied context and block mismatches.

## What To Do Next

The imported pilot-readiness plan and feasibility review have been condensed
into a five-milestone executable roadmap. Implementation status after the
2026-06-01 hardening pass:

1. Pilot trust layer: service-layer tenancy/RBAC, route access checks, and
   audit events. Status: implemented and tested.
2. Immutable evidence and private artifacts: readiness gates, immutable issued
   packets, artifact hashes, and signed access. Status: implemented, migrated,
   deployed, and smoke-tested.
3. Managed secrets and independent worker: Secret Manager/Vault-backed provider
   secrets, worker deployment, lease renewal, dead letters, and budget caps.
   Status: secret metadata/rotation, Secret Manager refs, lease renewal, and
   retry/dead-letter logic are implemented; the separate Cloud Run worker/job
   is deployed and smoke-tested. Workspace/project budget policies are now
   persisted in Supabase and exposed through the admin dashboard, while
   provider rate-limit/backoff settings are implemented through connector
   runtime controls.
4. Release gates and agent-friendly surfaces: conservative REST release-gate
   API, scoped machine tokens, GitHub Action support, MCP hardening, and audit.
   Status: REST API, scoped tokens, script support, reusable GitHub workflow,
   MCP project scoping, audit, smoke coverage, GitLab/Circle examples, and
   release-context comparisons are implemented. Signed generic webhooks now
   wrap the same release-gate evaluator for deployment platforms that can send
   HMAC-signed JSON.
5. Pilot UX and operational readiness: import/setup polish, evidence readiness
   UI, dead-letter UI, production monitoring, backups, terms, and privacy.
   Status: uploaded-output preview diagnostics, JSONL/CSV templates, setup
   gating, worker queue/dead-letter UI, retry controls, redacted provider
   errors, immutable packet badges, export history, retest explanations, and
   first-pilot readiness guidance are implemented and locally verified. The
   admin view now includes provider health derived from usage, retries, timeouts,
   rate limits, and dead letters. Sentry is skipped for the current hardening
   pass. Uptime checks, log-based alert policies, alert notification routing,
   Supabase schema/full Storage-metadata restore rehearsal, and the read-only
   ops evidence gate are now complete for staging. External operations still
   need production Auth sender/template setup, signed customer data terms, and
   the first live pilot execution.

The immediate execution queue is now:

1. Configure production-grade Supabase Auth sender domain/SMTP, invite/password
   lifecycle templates, email confirmation policy, and account lifecycle copy.
2. Finalize the customer data contract: data mode, retention, deletion/export
   owner, redaction rules, and allowed artifact types.
3. Run one real design-partner uploaded-output pilot: one app, representative
   examples, safety-check outputs, recommendation, release report, and optional
   release gate.
4. Add the first customer-specific deployment adapter on top of the signed
   generic webhook once a design partner names the platform.
5. Observe provider throttling, retry, dead-letter, and budget behavior under
   real managed-provider traffic before expanding managed runs beyond beta.

## Current Priority

The next engineering milestone should be:

```text
Design-partner uploaded-output pilot + production operations checklist
```

The staging hosting milestone is complete: Supabase, Cloud Run API, Cloud Run
worker job, Cloudflare, and GitHub CI/CD are wired and smoke-tested. The worker
can now move a pilot team from uploaded outputs to deterministic, REST, or
model-judge managed runs with retry-safe evidence writes, managed secret refs,
lease renewal, cost accounting, release-gate checks, release-context matching,
persisted budget controls, and operator-facing queue/dead-letter health.
Uptime checks, log-based alert policies, alert notification routing, Supabase
schema/full Storage-metadata restore rehearsal, and the non-Sentry evidence
gate are complete for staging. The highest-value remaining production work is
to configure production Auth email handling, sign terms, run the first real
uploaded-output design-partner pilot, and only then expand managed provider
execution. StackCert does not need to host arbitrary customer local models for
v1; customer-owned models should appear as uploaded outputs, customer-hosted
REST endpoints, or later customer-run workers.
