# StackCert Implementation Log

Started: 2026-05-23

## Working Rules

- Keep all product work inside `stackcert_product/`.
- Follow the production plan docs in `docs/`.
- After each meaningful slice, run targeted tests and record results here.
- Keep this file updated so progress can be checked without interrupting the
  implementation flow.

## Progress

- Started implementation pass.
- Added FastAPI service package skeleton under `stackcert_service/`.
- Added seeded demo API endpoints backed by the real CASS 2,000-example run:
  health, workspaces, projects, runs, overview, ranking, correlations,
  measurements, certificate exports, and drift.
- Added service-level API smoke tests under `tests_service/`.
- Updated CI to run core tests plus service tests once dependencies are
  installed.
- Verified in temp virtualenv:
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 8 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 4 tests OK.
- Initialized Supabase project with CLI and created migration
  `20260523151421_initial_stackcert_schema.sql`.
- Added initial Supabase schema covering workspaces, projects, benchmark
  suites/cells/examples, custom behaviors, guards, candidate stacks, runs,
  guard outputs, measurement recommendations, certificates, drift signals,
  jobs, usage events, audit events, and artifact metadata.
- Added RLS policies and moved RLS helper functions into private schema.
- Added private storage buckets and storage policies for uploads, run artifacts,
  certificates, exports, and debug artifacts.
- Added `supabase/seed.sql` and `supabase/tests/rls_smoke.sql`.
- Attempted `supabase db reset --local --yes`; blocked because Docker daemon is
  not running in this environment.
- Added React/Vite/TypeScript frontend under `web/`.
- Implemented landing page, local sign-in/demo auth route, app shell, lambda
  control, and the six evidence screens:
  Overview, Stack Ranking, Co-Failure, Measurements, Certificate, and Drift.
- Wired frontend data fetching to the FastAPI endpoints with TanStack Query and
  optional Supabase Auth token forwarding.
- Added frontend smoke tests.
- Verified frontend:
  - `npm run typecheck` -> OK.
  - `npm test -- --run` -> 2 tests OK.
  - `npm run build` -> OK.
- Added custom behavior and cost-estimation product slice:
  - API endpoints for listing/creating custom behaviors.
  - API endpoint for pre-run cost estimates.
  - Setup screen where a user can draft a custom behavior/question and see
    full-eval vs CASS-incremental cost estimates.
  - API test coverage for custom behavior creation and cost estimate.
- Verified Setup page in Playwright and created a draft custom behavior through
  the rendered UI.
- Added portable fixture artifacts under `demo_data/` so the service can run
  in CI or a fresh clone without depending on parent research data.
- Updated the demo API loader to prefer real research artifacts locally, use
  the fixture when defaults are absent, and fail clearly when explicit artifact
  environment variables point to missing files.
- Re-ran targeted verification:
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 8 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 6 tests OK.
- Added production hygiene and release assets:
  - `.gitignore` and `.dockerignore`.
  - API Dockerfile with healthcheck.
  - Web Dockerfile and nginx config for static Vite deployment.
  - API and web `.env.example` files.
  - `scripts/smoke_api.py` for deployed/local API smoke checks.
  - `docs/11_local_dev_and_release_runbook.md`.
- Fixed frontend typecheck/build scripts so TypeScript no longer emits stray
  config files.
- Re-ran frontend verification after deployment asset changes:
  - `npm run typecheck` -> OK.
  - `npm test -- --run` -> 2 tests OK.
  - `npm run build` -> OK.
- Ran API smoke script against local FastAPI server:
  - `python scripts/smoke_api.py http://127.0.0.1:8000` -> OK.
- Added API observability middleware:
  - Request IDs.
  - Security headers.
  - JSON request logs with duration and status.
  - Auth regression coverage for production mode requiring a token.
- Re-ran tests:
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 8 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 7 tests OK.
- Added setup catalog API endpoints for benchmark suites, guard registry, and
  candidate stacks.
- Wired the Setup UI to those catalog endpoints so pre-run inputs are visible
  next to the custom behavior builder and cost estimate.
- Re-ran targeted checks:
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 8 tests OK.
  - `npm run typecheck` -> OK.
- Restarted the local API with the newest endpoint set and Playwright-verified
  `/app/ws_demo/proj_acme_copilot/setup`:
  - Benchmark suite, guard registry, candidate stacks, cost estimate, and
    custom behavior builder rendered without console errors.
- Added agent/deployment-friendly integration endpoints:
  - `/api/projects/{project_id}/certificate-status` for CI/CD gates.
  - `/api/integrations/agent-platforms` for planned runtime adapter coverage.
- Expanded the API smoke script to cover those endpoints.
- Re-ran verification:
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 8 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 9 tests OK.
  - `python scripts/smoke_api.py http://127.0.0.1:8000` -> OK.
- Ran dependency audits:
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - `pip-audit` -> no known vulnerabilities in dependencies; local editable
    package `stackcert-prototype` skipped because it is not on PyPI.
- Re-attempted `supabase db reset --local --yes`; still blocked because the
  Docker daemon is not running at `/Users/vik/.docker/run/docker.sock`.
- Final local verification sweep:
  - `python -m pip install -e .` -> OK.
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 8 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 9 tests OK.
  - `npm run typecheck && npm test -- --run && npm run build` -> OK.
  - `python scripts/smoke_api.py http://127.0.0.1:8000` -> OK.

## Continued Pass

- Added deterministic guard adapter for local contract tests and CI-safe dry-run
  evaluations.
- Added in-memory job service with:
  - evaluation-run jobs;
  - measurement-plan jobs;
  - project job listing;
  - job lookup.
- Added API endpoints:
  - `GET /api/projects/{project_id}/jobs`
  - `POST /api/projects/{project_id}/evaluation-jobs`
  - `GET /api/jobs/{job_id}`
  - upgraded `POST /api/runs/{run_id}/measurement-plans` to create a tracked job.
- Added backend coverage for deterministic adapter behavior, evaluation job
  lifecycle, and measurement-plan job creation.
- Wired the Setup UI to run a dry-run evaluation and show the latest job.
- Wired the Measurements UI so "Queue selected" creates a tracked measurement
  job and displays queued cost/ETA/status.
- Playwright-verified:
  - Setup dry-run completed and rendered latest job status.
  - Measurements queue flow created a queued job.
  - No browser console errors in either flow.
- Re-ran verification after the job workflow slice:
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 9 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 11 tests OK.
  - `npm run typecheck && npm test -- --run && npm run build` -> OK.
  - `python scripts/smoke_api.py http://127.0.0.1:8000` -> OK.
- Added bulk benchmark/custom-test import preview:
  - API parses JSONL or CSV content.
  - Validates required fields, side labels, parse errors, and duplicate prompts.
  - Returns row counts, issue summary, side/category summaries, and preview rows.
  - Setup UI now includes a paste/import preview workflow.
- Added API coverage for valid JSONL import preview.
- Playwright-verified the Setup import preview flow:
  - Sample JSONL preview returned `2 valid of 2`.
  - Preview rendered imported behavior names.
  - No browser console errors.
- Re-ran verification after import preview slice:
  - `python -m unittest discover -s tests -p 'test_*.py' -v` -> 9 tests OK.
  - `python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 12 tests OK.
  - `npm run typecheck && npm test -- --run && npm run build` -> OK.
  - `python scripts/smoke_api.py http://127.0.0.1:8000` -> OK.

## Supabase Local Verification

- Confirmed Docker is reachable from this workspace:
  - Docker Server `29.4.3`.
  - Supabase CLI `2.101.0`.
- Started the local Supabase stack successfully after Docker became available.
- Applied the initial StackCert schema migration and seed data locally.
- Re-ran `supabase db reset --local --yes` successfully.
- Verified local migration state shows `20260523151421` applied.
- Verified seeded workspace/project counts are present.
- Verified storage buckets exist and are private:
  - `certificates`
  - `debug-artifacts`
  - `exports`
  - `run-artifacts`
  - `uploads`
- Ran `supabase/tests/rls_smoke.sql`; it returned zero public tables missing RLS.
- Ran `supabase db lint --local`; no schema errors found.
- Ran `supabase db advisors --local`; initial warnings found:
  - direct `auth.uid()` calls in profile policies;
  - broad `for all` permissive management policies;
  - mutable search path on `public.set_updated_at`.
- Tightened the migration by:
  - adding an explicit search path to `public.set_updated_at`;
  - wrapping direct policy `auth.uid()` references in initplan-safe subqueries;
  - splitting broad management RLS policies into explicit insert/update/delete policies.
- Re-applied the migration with `supabase db reset --local --yes`.
- Re-ran Supabase checks after the cleanup:
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.
  - `supabase/tests/rls_smoke.sql` -> no public tables missing RLS.

## Durable Persistence Slice

- Added Supabase-backed persistence for custom behavior drafts and managed job
  records while preserving in-memory fallback for CI and local demo mode.
- Extended the initial migration with:
  - external custom behavior IDs;
  - prompt hashes and redacted prompt snippets;
  - custom behavior validation/version metadata;
  - external job IDs and external run IDs;
  - server-side `service_role` grants needed by the API persistence path.
- Added server-side Supabase REST repository:
  - supports current `sb_secret_...` secret keys through the `apikey` header;
  - supports legacy JWT service-role keys by adding `Authorization: Bearer`;
  - maps API-facing IDs to Supabase UUID rows for the seeded demo project;
  - stores the API job display payload in `jobs.result` for durable replay.
- Added env sanitization for shell-quoted Supabase CLI values.
- Wired custom behavior and job services to use Supabase when
  `STACKCERT_PERSISTENCE_BACKEND=supabase` is set, or automatically when
  `auto` has complete Supabase server credentials.
- Added service tests for:
  - custom behavior persistence payload shape;
  - API-secret header behavior;
  - job external ID/status round trip.
- Created a local `.venv` and installed the package in editable mode for
  repeatable verification in this workspace.

## Cloud Run Staging Prep

- Confirmed the Google Cloud SDK is installed at
  `/Users/vik/Developer/google-cloud-sdk/bin/gcloud` and the active account is
  `savikk129@gmail.com`.
- Confirmed no active GCP project is selected yet. Available projects from
  `gcloud projects list` are:
  - `creatorconsulting`
  - `friendlychat-8ed89`
  - `project-e7840c42-f298-4bd9-bff`
- Checked project billing status without creating resources:
  - `creatorconsulting`: billing disabled.
  - `friendlychat-8ed89`: billing disabled.
  - `project-e7840c42-f298-4bd9-bff`: billing enabled on
    `billingAccounts/0131D0-CA89B4-158E59`.
- Attempted to list billing budgets, but the Billing Budgets API/quota project
  path was not available from the current CLI setup. Treat budget verification
  as a deployment blocker until the selected project has a visible budget.
- Added `scripts/gcloud_budget_setup.py` to create an initial project-scoped
  budget before Cloud Run deployment.
- Enabled the Cloud Billing Budget API on quota project
  `project-e7840c42-f298-4bd9-bff`.
- Created `StackCert staging $10`:
  - billing account: `0131D0-CA89B4-158E59`
  - budget resource:
    `billingAccounts/0131D0-CA89B4-158E59/budgets/f863e81b-cd71-4e24-8968-77b2e4dc150d`
  - amount: `$10/month`
  - project scope: `project-e7840c42-f298-4bd9-bff`
  - credit handling: `exclude-all-credits`, so alerts track gross usage before
    free-trial credits are applied
  - thresholds: 50%, 90%, 100%, and forecasted 100%
- Re-ran `scripts/gcloud_cost_preflight.py` after budget creation. It passed:
  billing enabled, project-scoped budget visible, and no existing `stackcert-api`
  Cloud Run service in `us-central1`.
- Confirmed the linked Supabase project is still `cgwiwmfzpektpyquiveg`.
- Pulled Supabase API key metadata to a temporary local JSON file without
  printing secret values, and confirmed publishable plus backend-only secret
  keys are available for staging setup.
- Added `.gcloudignore` so source-based Google Cloud builds do not upload local
  virtualenvs, frontend build output, private env files, or generated artifacts.
- Added `scripts/gcloud_cost_preflight.py`, a read-only guardrail check that:
  - confirms billing is enabled on the selected project;
  - verifies a visible project-scoped budget when permissions/API setup allow
    it;
  - checks existing Cloud Run scale annotations if the service already exists;
  - fails closed before deployment when budget verification is missing.
- Added `scripts/cloud_run_secrets.py` to create or rotate the two required
  Cloud Run runtime secrets:
  - `stackcert-supabase-url`
  - `stackcert-supabase-secret-key`
- Hardened `scripts/cloud_run_secrets.py` to reject masked/non-ASCII Supabase
  CLI secret values and fall back to the legacy `service_role` key when the
  current `sb_secret` value is not retrievable.
- Added `scripts/cloud_run_api_smoke.py` to verify a deployed FastAPI Cloud Run
  service, including:
  - `/api/health`
  - unauthenticated app-route rejection
  - optional Supabase sign-in
  - authenticated `/api/projects`
  - authenticated MCP manifest and initialize call
- Updated the hosting docs and README with the Cloud Run helper scripts.
- Ran the current verification baseline after Cloud Run prep:
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` -> 11 tests OK.
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v` -> 54 tests OK.
  - `cd web && npm run lint && npm test -- --run && npm run build` -> OK.
  - `deno check supabase/functions/stackcert-api/index.ts` -> OK.
  - `docker build -f Dockerfile.api -t stackcert-api:cloudrun-prep .` -> OK.
  - Local Dockerized API smoke with `scripts/cloud_run_api_smoke.py` -> OK.

## Cloud Run Staging Deploy

- Enabled only the APIs needed for the capped staging runtime:
  - `run.googleapis.com`
  - `artifactregistry.googleapis.com`
  - `secretmanager.googleapis.com`
  - `iamcredentials.googleapis.com`
- Created Artifact Registry Docker repository:
  `projects/project-e7840c42-f298-4bd9-bff/locations/us-central1/repositories/stackcert`.
- Created Cloud Run runtime service account:
  `stackcert-api-runtime@project-e7840c42-f298-4bd9-bff.iam.gserviceaccount.com`.
- Created Secret Manager secrets:
  - `stackcert-supabase-url`
  - `stackcert-supabase-secret-key`
- First authenticated Cloud Run smoke failed because the Supabase CLI returned a
  masked current `sb_secret` value. Rotated `stackcert-supabase-secret-key` to
  the backend-only legacy `service_role` key, then redeployed a fresh revision.
- Hardened `scripts/cloud_run_secrets.py` to reject masked/non-ASCII Supabase
  CLI secret values and fall back to the legacy `service_role` key when the
  current `sb_secret` value is not retrievable.
- Built and pushed one local `linux/amd64` Docker image:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:7286c3f-staging-20260524182106`.
- Deployed Cloud Run service `stackcert-api`:
  - URL: `https://stackcert-api-oaw2bwdgyq-uc.a.run.app`
  - latest ready revision: `stackcert-api-00002-xfx`
  - min scale: default `0`
  - max scale: `1`
  - CPU: `1`
  - memory: `512Mi`
  - timeout: `60s`
  - concurrency: `40`
  - service account:
    `stackcert-api-runtime@project-e7840c42-f298-4bd9-bff.iam.gserviceaccount.com`
- Verified Cloud Run staging:
  - unauthenticated `/api/health` and auth-gate smoke -> OK.
  - authenticated Supabase demo-user smoke -> OK.
  - authenticated MCP manifest and initialize smoke -> OK.
  - post-deploy cost preflight -> OK.

## Cloudflare Temporary Frontend Prep

- Added root `package.json` and `package-lock.json` so Cloudflare Workers Builds
  can run `npm ci && npm run build` from the repository root.
- Added root `wrangler.jsonc` so `npx wrangler deploy` from the repository root
  deploys `web/dist` as Workers static assets with SPA fallback routing.
- Added `web/wrangler.jsonc` for Cloudflare Workers static-assets hosting:
  - project name: `stackcert-staging`
  - compatibility date: `2026-05-24`
  - assets directory: `./dist`
  - SPA fallback: `single-page-application`
- Added `web/public/_redirects` for compatibility with Cloudflare Pages-style
  SPA fallback behavior.
- Verified the frontend build still succeeds after adding the Cloudflare files:
  `cd web && npm run build` -> OK.
- Verified the Workers static-assets deploy config locally from `web`:
  `cd web && npx wrangler deploy --dry-run` -> OK.
- Verified the root Workers Builds commands locally:
  - `npm ci` -> OK.
  - `npm run build` -> OK.
  - `npx wrangler deploy --dry-run` -> OK.
- Cloudflare Workers Builds settings to use:
  - Path: `/`
  - Build command: `npm ci && npm run build`
  - Deploy command: `npx wrangler deploy`
  - Environment variables:
    - `VITE_ROUTER_MODE=browser`
    - `VITE_PUBLIC_BASE=/`
    - `VITE_API_BASE_URL=https://stackcert-api-oaw2bwdgyq-uc.a.run.app`
    - `VITE_SUPABASE_URL=https://cgwiwmfzpektpyquiveg.supabase.co`
    - `VITE_SUPABASE_ANON_KEY=<Supabase anon/publishable key>`
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 14 tests OK.
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`
    -> 9 tests OK.
  - `supabase db reset --local --yes` -> OK.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.
  - `supabase/tests/rls_smoke.sql` -> no public tables missing RLS.
  - Live local Supabase REST smoke persisted and re-read one custom behavior
    and one measurement-plan job through the repository.
  - Re-ran `supabase db reset --local --yes` after the live smoke to leave the
    local database in clean seeded state; custom behavior/job counts are back
    to zero.
- Updated `.env.example`, README, and the local development runbook with the
  Supabase persistence mode and backend-only secret key guidance.

## Persistent Benchmark Setup Slice

- Added a commit path for validated benchmark/custom-test imports:
  - `POST /api/projects/{project_id}/benchmark-suites`
  - keeps preview validation separate from durable suite creation;
  - groups imported rows into benchmark cells by side and policy category;
  - stores prompt hashes, redacted prompt snippets, expected safe behavior, and
    unsafe behavior metadata;
  - returns versioned suite metadata to the UI.
- Added memory fallback for committed benchmark suites so local demo/test mode
  remains lightweight.
- Added Supabase persistence for imported benchmark suites:
  - `benchmark_suites` row;
  - grouped `benchmark_cells`;
  - redacted `examples`;
  - private Storage upload in the `uploads` bucket;
  - `artifact_objects` metadata with byte size, content type, and SHA-256.
- Updated the Setup UI:
  - suite name/version controls;
  - "Create versioned suite" action after preview;
  - saved benchmark suites ledger with source/artifact status.
- Added tests for:
  - API-level import commit and list behavior;
  - Supabase repository writes for suite/cell/example/artifact objects.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 16 tests OK.
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`
    -> 9 tests OK.
  - Live Supabase smoke created one custom suite, two cells, two examples, one
    artifact metadata row, and one private Storage object.
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 2 tests OK.
  - `cd web && npm run build` -> OK.
  - Playwright verified the Setup page preview and "Create versioned suite"
    flow; no browser console warnings/errors.
  - Re-ran `supabase db reset --local --yes` after the live smoke to return the
    local database to clean seeded state.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Workspace And Project Setup Slice

- Added API schemas and service layer for creating setup records:
  - `POST /api/workspaces`
  - `POST /api/workspaces/{workspace_id}/projects`
  - persisted list/get behavior for `/api/workspaces`, `/api/projects`, and
    `/api/projects/{project_id}`.
- Added memory fallback for setup records so local demo/test mode can create
  workspaces and projects without Supabase credentials.
- Added Supabase repository support for:
  - listing and creating workspace records;
  - listing and creating project records;
  - mapping seeded demo UUIDs to API-facing demo IDs.
- Added a Projects page in the app shell:
  - create workspace form;
  - create project form;
  - workspace/project ledger with risk tier, environment, and setup status.
- Updated the app shell to read the current project name from the project API
  instead of hardcoding only "Acme Copilot".
- Added backend tests for memory-mode workspace/project creation and Supabase
  repository contracts.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 18 tests OK.
  - `cd web && npm run typecheck` -> OK.
  - Live Supabase smoke created and re-read one workspace and one project.
  - Playwright verified the Projects page create-workspace and create-project
    flow; no browser console warnings/errors.
  - `cd web && npm test -- --run` -> 2 tests OK.
  - `cd web && npm run build` -> OK.
  - Re-ran `supabase db reset --local --yes` after the live smoke to return the
    local database to clean seeded state.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Guard Connector Registry Slice

- Added guard connector schema and service layer for customer-managed adapters:
  - REST guard;
  - local Python;
  - model judge;
  - uploaded outputs.
- Added secret-safe connector handling:
  - API accepts an auth secret;
  - returned connector payloads never include the raw secret;
  - persisted config stores only `has_secret` and a placeholder secret ref.
- Added Supabase persistence for guard definitions and guard versions using
  existing `guard_definitions` and `guard_versions` tables.
- Updated guard listing to combine configured connectors with seeded demo guards.
- Added API endpoints:
  - `GET /api/projects/{project_id}/guard-connectors`
  - `POST /api/projects/{project_id}/guard-connectors`
- Updated Setup UI with a guard connector registry form and configured connector
  list.
- Added tests for:
  - API connector creation and secret redaction;
  - Supabase persistence contract for redacted guard config.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 20 tests OK.
  - `cd web && npm run typecheck` -> OK.
  - Live Supabase smoke created and re-read one REST guard connector while
    confirming the raw secret was not returned.
  - Playwright verified the Setup page "Save connector" flow; no browser
    console warnings/errors.
  - `cd web && npm test -- --run` -> 2 tests OK.
  - `cd web && npm run build` -> OK.
  - Re-ran `supabase db reset --local --yes` after the live smoke to return the
    local database to clean seeded state.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Queued Worker Lifecycle Slice

- Added queued evaluation-job execution mode:
  - `execution_mode: immediate | queued` on evaluation-job creation;
  - immediate jobs still execute synchronously for lightweight smoke checks;
  - queued jobs persist first, then move through queued -> running -> complete
    when a worker claims them.
- Added worker execution APIs:
  - `POST /api/jobs/{job_id}/run`
  - `POST /api/projects/{project_id}/workers/run-next`
- Added `scripts/worker_once.py` so local/CI workers can claim one queued job
  without running a long-lived worker process.
- Extended persisted job records with execution input, requested guard ids,
  `started_at`, `completed_at`, `attempts`, progress, summaries, previews, and
  idempotent update behavior.
- Updated Supabase persistence with job PATCH support by external job id.
- Updated Setup UI:
  - separate "Run dry-run", "Queue dry-run", and "Run worker" controls;
  - worker completion notice and job-ledger refresh;
  - dry-run controls now choose executable seeded guards only, so configured
    customer connectors remain visible without breaking deterministic fixture
    smoke runs before live connector execution is implemented.
- Added tests for:
  - queued job creation and explicit worker execution;
  - run-next worker claiming the oldest queued job;
  - Supabase job update/display-status persistence.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 22 tests OK.
  - Live Supabase smoke created a queued evaluation job, executed it through the
    worker lifecycle, and confirmed the row persisted as `succeeded` with one
    attempt and a `complete` result.
  - Playwright verified the Setup page queue/run-worker flow against the local
    API; no browser console warnings/errors after the UI guard-selection fix.
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 2 tests OK.
  - `cd web && npm run build` -> OK.
  - Re-ran `supabase db reset --local --yes` after the live smoke to return the
    local database to clean seeded state; seeded workspace count is 1 and job
    count is 0.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Measurement Execution And Usage Ledger Slice

- Made Measurement Planner jobs executable:
  - queued measurement-plan jobs now carry selected action ids, lambda cost,
    budget cap, attempts, timestamps, and progress;
  - worker execution now supports both `evaluation_run` and `measurement_plan`
    job types;
  - completed measurement-plan jobs mark actions complete and record actual
    spend, provider-call counts, token estimates, usage-event count, and budget
    status.
- Added per-plan budget caps:
  - `MeasurementPlanCreate.max_cost_usd`;
  - API rejects selected plans that exceed the cap before queueing work.
- Added append-only usage tracking:
  - new `stackcert_service/services/usage.py`;
  - `GET /api/runs/{run_id}/costs`;
  - `GET /api/projects/{project_id}/usage-events`;
  - memory fallback and Supabase persistence for usage events.
- Added Supabase migration:
  - `20260523192827_add_usage_event_metadata.sql`;
  - usage events now include metadata for action id, cell, side, guard ids,
    API job id, API run id, and API project id.
- Updated Supabase repository behavior:
  - queued jobs now persist with zero attempts until a worker runs;
  - usage events persist with a DB job reference and redacted action metadata.
- Updated Measurements UI:
  - budget cap input;
  - "Run worker" action;
  - actual usage stat;
  - provider-call/token summary;
  - usage ledger table after worker completion.
- Added tests for:
  - measurement-plan execution through the worker;
  - budget-cap rejection;
  - run-cost usage summary;
  - Supabase usage-event persistence contract.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 24 tests OK.
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`
    -> 9 tests OK.
  - Live Supabase smoke created one measurement-plan job, executed it through
    the worker, and confirmed one usage event with $240 actual cost persisted.
  - Playwright verified the Measurements page queue/run-worker flow; no browser
    console warnings/errors.
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 2 tests OK.
  - `cd web && npm run build` -> OK.
  - Re-ran `supabase db reset --local --yes` after the live smoke to return the
    local database to clean seeded state; seeded workspace count is 1, job count
    is 0, and usage-event count is 0.
  - `supabase migration list --local` shows both local migrations applied.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Certificate Issue And Signoff Slice

- Added explicit scoped certificate issuance:
  - `POST /api/runs/{run_id}/certificate/issue`;
  - requires acknowledgement of certificate scope and limitations;
  - creates an immutable-style certificate snapshot with issued/expires
    timestamps, selected stack label, scope, limitations, reviewer note, and
    SHA-256 artifact hash.
- Added issued-certificate retrieval and signoffs:
  - `GET /api/certificates/{certificate_id}`;
  - `POST /api/certificates/{certificate_id}/signoffs`;
  - supports `approved`, `rejected`, and `requested_changes` decisions.
- Added Supabase persistence for certificate workflow:
  - creates or reuses the external evaluation run row;
  - persists certificate snapshots in `certificates`;
  - persists reviewer decisions in `certificate_signoffs`;
  - added a unique index for `(workspace_id, external_run_id)` on
    `evaluation_runs` to keep run snapshots idempotent.
- Updated Certificate UI:
  - acknowledgement checkbox;
  - "Issue scoped certificate" action;
  - issued snapshot metadata including expiration and artifact hash;
  - risk-reviewer signoff controls and signoff ledger.
- Added tests for:
  - acknowledgement-required issue flow;
  - immutable hash presence;
  - issued-certificate fetch;
  - signoff creation;
  - Supabase certificate/signoff persistence contract.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 26 tests OK.
  - Live Supabase smoke issued one certificate, persisted one evaluation run,
    created one signoff, and fetched the signoff back.
  - Playwright verified the Certificate page acknowledgement, issue, and approve
    flow; no browser console warnings/errors.
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 2 tests OK.
  - `cd web && npm run build` -> OK.
  - Re-ran `supabase db reset --local --yes` after the live smoke to return the
    local database to clean seeded state; certificate, signoff, and evaluation
    run counts are all 0.
  - `supabase migration list --local` shows both local migrations applied.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Deployment Certificate Gate Slice

- Added a machine-readable certificate gate CLI:
  - `scripts/certificate_gate.py`;
  - reads `/api/projects/{project_id}/certificate-status`;
  - supports `--require valid|provisional|needs_measurement`;
  - supports `--mode fail|warn`;
  - emits sorted JSON with `ok`, status, certificate id, scope, blocking
    reasons, and the `not_a_guarantee` flag.
- Added reusable/manual GitHub Actions workflow:
  - `.github/workflows/certificate-gate.yml`;
  - accepts StackCert API base URL, project id, required status, and fail/warn
    mode;
  - supports an optional `stackcert_api_token` secret.
- Updated runbook and README with certificate-gate usage and workflow location.
- Added tests for:
  - valid certificate pass behavior;
  - provisional certificate failing a `valid` requirement;
  - warn mode returning exit code 0 while preserving machine-readable failure.
- Verification:
  - `.venv/bin/python scripts/certificate_gate.py --base-url http://127.0.0.1:8000 --project-id proj_acme_copilot --require valid --mode fail`
    -> `ok: true`.
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 29 tests OK.
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`
    -> 9 tests OK.

## Provider-Grade Worker Hardening Slice

- Added worker reliability metadata to queued jobs:
  - `max_attempts`, `locked_by`, `lease_expires_at`, `retry_after`,
    `error_class`, `dead_letter_reason`, and bounded lifecycle `events`.
- Hardened worker execution:
  - active leases block competing workers;
  - expired leases can be reclaimed by `run-next`;
  - transient provider failures are classified and retry-scheduled with
    exponential backoff;
  - exhausted or nonretryable jobs move to `failed` with dead-letter metadata;
  - successful jobs clear lease/error/retry fields.
- Added operator retry:
  - `POST /api/jobs/{job_id}/retry`;
  - resets failed or expired jobs to queued state after investigation.
- Added a worker identity query parameter to:
  - `POST /api/projects/{project_id}/workers/run-next`;
  - `POST /api/jobs/{job_id}/run`;
  - `scripts/worker_once.py --worker-id`.
- Added deterministic failure injection for local/provider-contract tests:
  - `provider_timeout`;
  - `provider_rate_limited`;
  - `invalid_configuration`.
- Verification:
  - `uv run --with pytest pytest tests_service/test_api_demo.py -q`
    -> 21 tests passed.

## MCP Integration Surface Slice

- Added an authenticated MCP-style HTTP JSON-RPC surface:
  - `GET /api/mcp/manifest`;
  - `POST /api/mcp/rpc`.
- Added agent/pipeline-oriented MCP tools:
  - `list_projects`;
  - `get_certificate_status`;
  - `estimate_run_cost`;
  - `get_run_costs`;
  - `create_measurement_plan`.
- Added MCP resources:
  - project certificate status;
  - project agent-deployment integration guide;
  - run certificate payload;
  - run cost ledger.
- Added MCP prompts:
  - `draft_custom_behavior`;
  - `deployment_gate_review`.
- The surface is intentionally scoped around MCP server concepts: tools for
  actions/lookups, resources for durable evidence packets, and prompts for
  repeatable review/custom-behavior workflows.
- Verification:
  - `uv run --with pytest pytest tests_service/test_api_demo.py -q`
    -> 24 tests passed.

## Landing, Onboarding, And Helper Pages Slice

- Improved the landing page positioning:
  - explains CASS as Correlation-Aware Stack Selection;
  - clarifies who the buyer/users are: AI platform, safety, and risk/GRC;
  - expands the product surface beyond the dashboard into benchmark building,
    guard connectors, provider-grade worker jobs, certificate gates, and MCP
    resources for agent-platform workflows;
  - improves the no-guarantee risk positioning in the footer and legal/docs
    routes.
- Added a real onboarding route:
  - `/onboarding`;
  - captures rollout role, workspace/project names, risk tier, data handling,
    and first evidence mode;
  - creates a workspace and project through the API when submitted;
  - falls back to the seeded demo setup path if the user wants to explore first.
- Implemented all footer/helper pages from the UI template:
  - Product: Why StackCert, How it works, Pricing, Changelog, Status;
  - Resources: Documentation, Methodology paper, Replication kit, Blog,
    Glossary;
  - Company: About, Customers, Security, Careers, Press;
  - Legal: Privacy, Terms, SOC 2, DPA, Subprocessors.
- Added route tests for:
  - landing CASS explanation;
  - onboarding shell;
  - legal/helper route rendering.
- Browser checked:
  - `/`;
  - `/onboarding`;
  - `/terms`.
- Verification:
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `cd web && npm run build` -> OK.
  - `uv run --with pytest pytest tests_service tests -q` -> 43 tests passed.
  - `supabase --help` -> CLI available.
  - `supabase status` -> local Supabase stack running.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.

## Responsive UI QA Slice

- Verified the marketing/onboarding/helper UI under explicit browser viewport
  overrides:
  - desktop: 1440x900;
  - tablet: 900x900;
  - mobile: 390x844.
- Routes checked:
  - `/`;
  - `/onboarding`;
  - `/terms`;
  - `/docs`;
  - `/security`.
- Automated layout checks:
  - no horizontal page overflow at any checked breakpoint;
  - meaningful content rendered on every route;
  - no framework error overlays;
  - no browser console warnings/errors.
- Interaction check:
  - mobile onboarding role selector changes active state from `AI platform` to
    `Safety`;
  - no horizontal overflow after the interaction.
- Screenshot artifacts saved outside the repo:
  - `/tmp/stackcert-landing-desktop-1440x900.png`;
  - `/tmp/stackcert-landing-mobile-390x844.png`;
  - `/tmp/stackcert-onboarding-tablet-900x900.png`;
  - `/tmp/stackcert-onboarding-mobile-390x844.png`;
  - `/tmp/stackcert-terms-mobile-390x844.png`.
- Extended the check to the authenticated app shell after starting the local API:
  - first pass found horizontal overflow on mobile/tablet setup surfaces,
    mobile co-failure, and mobile projects;
  - patched shared grid/card shrink behavior and replaced fixed setup/project
    inline grids with responsive CSS classes;
  - wrapped setup action buttons so they do not push the page sideways.
- Full post-fix responsive matrix:
  - 13 routes x 3 viewports = 39 route/viewport checks;
  - no horizontal overflow;
  - no API unavailable states;
  - no framework overlays;
  - no browser console warnings/errors.
- Fixed app screenshot artifacts saved outside the repo:
  - `/tmp/stackcert-app-cofailure-mobile-fixed-390x844.png`;
  - `/tmp/stackcert-app-setup-mobile-fixed-390x844.png`;
  - `/tmp/stackcert-app-projects-mobile-fixed-390x844.png`.
- Verification after fixes:
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `cd web && npm run build` -> OK.
  - `uv run --with pytest pytest tests_service tests -q` -> 43 tests passed.

## Supabase Free-Tier Deploy Slice

- Added hosted deployment support for the Vite app:
  - `VITE_ROUTER_MODE=hash` switches to `HashRouter` for static hosting;
  - `VITE_PUBLIC_BASE=./` builds relative asset URLs for static hosting.
- Expanded Auth UI:
  - real Supabase sign-in;
  - real Supabase sign-up;
  - hosted demo defaults set to `demo@stackcert.dev`.
- Added Supabase Edge Function API at `supabase/functions/stackcert-api`:
  - public health and export endpoints;
  - Supabase Auth-verified app endpoints;
  - overview, ranking, correlations, measurements, costs, certificate,
    drift, setup catalogs, jobs, custom behavior, cost estimate, integrations,
    and MCP manifest/RPC routes for a playable hosted demo.
- Added deployment test assets:
  - `scripts/deployment_smoke.py`;
  - `tests_service/test_deployment_readiness.py`;
  - CI hosted-build check using hash routing and static asset base.
- Deployed to Supabase project `cgwiwmfzpektpyquiveg`:
  - Edge Function `stackcert-api`;
  - Supabase Auth-backed demo user.
- Published the static web build with real Supabase Auth/API env to GitHub
  Pages repo `vik1000-coder/stackcert-product`.
- Supabase Storage served `index.html` as `text/plain` with sandbox headers, so
  the browser displayed raw HTML instead of the app shell.
- Moved the static web entrypoint to GitHub Pages while keeping Supabase Auth
  and the Supabase Edge Function API:
  - `https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in`
- Created and verified confirmed demo Auth user for the hosted app.
- Verification:
  - `uv run --with pytest pytest tests_service tests -q` -> 48 tests passed.
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `cd web && npm run build` -> OK.
  - hosted-storage build with real Supabase env -> OK.
  - `supabase db lint --local` -> no schema errors found.
  - `supabase db advisors --local` -> no issues found.
  - `scripts/deployment_smoke.py ...` -> deployment smoke OK.
  - Remote API matrix covering app workflows and exports -> OK.
  - Playwright loaded hosted landing and auth routes at mobile/desktop widths
    with no browser console errors.

## Documentation Update Slice

- Added `docs/12_supabase_free_tier_deployment.md` covering:
  - hosted Supabase demo URL and API URL;
  - demo auth account;
  - Edge Function/static Storage deployment model;
  - hash-router hosted build commands;
  - deployment smoke command;
  - known limitations of the free-tier demo path.
- Updated `README.md` to reflect the current product scope and hosted demo.
- Updated `docs/00_plan_index.md` to include the hosted demo and new deploy doc.
- Updated `docs/02_stack_and_architecture_plan.md` with the current Supabase
  free-tier runtime alongside the intended production runtime.
- Updated `docs/06_testing_ci_cd_plan.md` with the current CI/deployment smoke
  coverage.
- Updated `docs/11_local_dev_and_release_runbook.md` with hosted build and
  smoke-test instructions.

## Hosted Link Fix Slice

- Investigated the original Supabase Storage app URL after it showed raw HTML:
  - `index.html` was served as `text/plain`;
  - response included sandbox headers and `x-content-type-options: nosniff`.
- Tried a Supabase Edge Function web entrypoint and confirmed Supabase applied
  the same document sandboxing behavior.
- Published the static web app to GitHub Pages instead, while keeping Supabase
  as the Auth/API backend:
  - repo: `https://github.com/vik1000-coder/stackcert-product`;
  - app: `https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in`.
- Updated README, deployment docs, architecture docs, CI plan, runbook, and this
  log to use the working GitHub Pages app URL.
- Verification:
  - GitHub Pages returned `content-type: text/html; charset=utf-8`.
  - Playwright loaded the hosted sign-in route.
  - Playwright signed in with the demo account and reached the overview route.
  - Playwright reported no browser console errors for the hosted app.
  - `scripts/deployment_smoke.py ... --web-url https://vik1000-coder.github.io/stackcert-product/` -> deployment smoke OK.
  - `uv run --with pytest pytest tests_service/test_deployment_readiness.py -q` -> 5 tests passed.
  - `cd web && npm test -- --run` -> 4 tests passed.

## Production Hosting Planning Slice

- Added `docs/13_production_hosting_setup.md` capturing the recommended
  production setup:
  - Cloudflare Pages for the Vite frontend;
  - Supabase staging/prod for Auth, Postgres, Storage, and RLS;
  - Google Cloud Run for FastAPI and workers;
  - GitHub Actions environments, secrets, and deploy workflows;
  - cost controls, smoke tests, CORS, and production usability checklist.
- Linked the new production hosting setup doc from README and the plan index.

## Hosted Demo Auth Gate Fix Slice

- Fixed the GitHub Pages demo entry flow after "Open the demo" exposed the
  authenticated API 401 response.
- Updated public demo links on landing, onboarding, and static helper pages to
  route through `/auth/sign-in?next=...` instead of going directly to
  `/app/ws_demo/proj_acme_copilot/...`.
- Updated `AuthPage` so successful sign-in returns to the requested `next`
  app route, with the seeded overview as fallback.
- Added an app-shell auth guard that waits for a Supabase session before
  issuing app API queries and redirects direct unauthenticated app links to
  sign-in.
- Redeployed the GitHub Pages frontend:
  - commit `cce6651` in `vik1000-coder/stackcert-product`.
- Verification:
  - `cd web && npm run typecheck` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `uv run --with pytest pytest tests_service/test_deployment_readiness.py -q` -> 5 tests passed.
  - Hosted build with real Supabase env -> OK.
  - Playwright clicked "Open the demo" from the live landing page and landed on
    the sign-in page.
  - Playwright signed in with the demo account and reached the overview page.
  - Playwright loaded a direct unauthenticated app URL from a fresh page and was
    redirected to sign-in.
  - `scripts/deployment_smoke.py ... --web-url https://vik1000-coder.github.io/stackcert-product/` -> deployment smoke OK.

## Source Repository GitHub Pages CI/CD Slice

- Set up option 1: this source repository is now the source of truth for the
  GitHub Pages deployment.
- GitHub repository:
  - `https://github.com/vik1000-coder/stackcert-product`
- Deployed site target:
  - `https://vik1000-coder.github.io/stackcert-product/`
  - demo sign-in route:
    `https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in`
- Added `.github/workflows/deploy-pages.yml` to:
  - run Python unit/API tests;
  - run frontend typecheck and Vitest;
  - build Vite with `VITE_ROUTER_MODE=hash` and
    `VITE_PUBLIC_BASE=/stackcert-product/`;
  - publish `web/dist` through GitHub Pages;
  - run `scripts/deployment_smoke.py` against the deployed Pages URL and
    Supabase Auth/API.
- Configured repository variables/secrets:
  - vars: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`;
  - secrets: `VITE_SUPABASE_ANON_KEY`, `STACKCERT_SMOKE_EMAIL`,
    `STACKCERT_SMOKE_PASSWORD`.
- Fixed the first source-repo CI failures:
  - certificate issuing test now accepts the current scoped certificate status
    (`valid` or `provisional`) instead of assuming the fixture dataset is
    always fully valid;
  - landing/auth tests now match the updated seeded-demo auth copy;
  - Vitest setup now explicitly cleans up mounted React trees after each test.
- Included the explanatory product-copy UI refinements that were already in the
  working tree, covering the landing page, dashboard explainers, and responsive
  definition rows.
- Local verification:
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` -> OK.
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 39 tests passed.
  - `cd web && npm run lint && npm run typecheck && npm test -- --run &&
    npm run build` -> OK.
  - GitHub Pages hash build with Supabase env placeholders -> OK.
  - `supabase start && supabase db reset --local && supabase status` -> OK.
- Remote verification after push:
  - `deploy pages` run `26346305957` -> passed, including deployed smoke test.
  - `ci` run `26346305964` -> passed, including Supabase migration checks.
- Follow-up hardening:
  - opted both workflows into GitHub Actions' Node 24 runtime early with
    `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` so the June 2026 runner change is
    tested before it becomes the default.
  - bumped GitHub Actions to current Node 24-ready major versions:
    `actions/checkout@v6`, `actions/setup-python@v6`,
    `actions/setup-node@v6`, `actions/configure-pages@v6`,
    `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`, and
    `supabase/setup-cli@v2`.
  - wrapped the auth inputs in a real form so hosted browser validation has no
    password-field console warning during the demo sign-in flow.
  - added auth input `autocomplete` attributes for password-manager support and
    cleaner browser diagnostics.
- Final option 1 verification:
  - `ci` run `26346576582` passed after the auth metadata polish.
  - `deploy pages` run `26346576576` passed after the auth metadata polish.
  - Live Pages smoke path verified with Playwright:
    `https://vik1000-coder.github.io/stackcert-product/?v=0ba9115` ->
    "View seeded demo" -> sign-in -> seeded overview dashboard.
  - Browser console produced no warnings or errors during that deployed flow.

## Real Pilot V1: Uploaded Outputs to Release Evidence

- Implemented the first non-demo pilot path: a user can create a workspace and
  project, import a versioned example suite, upload existing safety-check
  outputs, and generate an app-specific recommendation run.
- Added backend pilot-run orchestration in `stackcert_service/services/pilot_runs.py`:
  - parses JSONL/CSV uploaded outputs;
  - reconstructs committed benchmark-suite cells and examples;
  - runs the CASS engine over uploaded guard results;
  - exposes overview, ranking, overlap, measurement-plan, cost, drift, and
    release-evidence payloads for the created run.
- Updated FastAPI routes so project pages are no longer tied to the seeded demo:
  - `POST /api/projects/{project_id}/runs/uploaded-outputs`;
  - `GET /api/projects/{project_id}/runs`;
  - run-scoped overview, ranking, correlations, measurements, costs,
    certificate JSON/Markdown, and drift dispatch to pilot runs when present.
- Extended Supabase-store helpers enough for pilot runs to reconstruct committed
  suite bundles from Supabase tables. Full persisted run snapshots remain a next
  production-hardening item.
- Updated certificate issuing so uploaded-output pilot runs can be locked into
  scoped release evidence under the correct project.
- Updated the Supabase Edge Function fallback so the hosted app can handle
  project-specific runs and uploaded-output creation instead of only serving the
  seeded demo.
- Updated the React app flow:
  - added project/run context in `web/src/lib/appContext.tsx`;
  - app shell now tracks active project runs and sidebar run metadata;
  - setup page can create suites and uploaded-output runs;
  - overview, ranking, overlap, measurements, certificate, and drift pages use
    the active run instead of assuming `real_main_2000`;
  - onboarding now defaults to uploaded outputs and writes customer-facing
    project descriptions.
- Added service coverage for the real pilot flow:
  - workspace/project creation;
  - suite import;
  - uploaded-output run creation;
  - project run listing;
  - overview/measurement/evidence endpoints;
  - evidence issue path with correct project binding.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` -> 9
    tests passed.
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 40 tests passed.
  - `cd web && npm run lint` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `cd web && npm run build` -> OK.
  - `deno check supabase/functions/stackcert-api/index.ts` -> OK.
  - Local Playwright smoke: onboarding -> create project -> create versioned
    example suite -> create uploaded-output run -> overview -> release evidence
    -> acknowledge scope -> issue evidence snapshot.
- Remaining production gaps:
  - persist uploaded-output evaluation runs, guard outputs, and generated
    certificate snapshots to Supabase tables instead of keeping pilot run objects
    in API memory;
  - replace the Edge Function's lightweight uploaded-output simulation with the
    same CASS-backed computation used by FastAPI or route production to the
    FastAPI service;
  - add richer import templates and validation messages for user-provided
    output schemas;
  - add a hosted end-to-end CI smoke for the new pilot flow once persistent run
    storage is in place.

## Production-Durable Pilot V1 Persistence

- Implemented durable storage for uploaded-output pilot runs using the existing
  Supabase data model:
  - `evaluation_runs` stores the external run id, suite id, CASS parameters,
    status, and run summary;
  - `guard_outputs` stores the uploaded safety-check outputs by external
    example id and guard key, with linked example UUIDs when available;
  - `measurement_recommendations` stores targeted follow-up test actions;
  - issued evidence continues to persist through `certificates` and
    `certificate_signoffs`.
- Added `projects.setup_status` with migration
  `20260524023733_add_project_setup_status.sql` so setup/evidence state can
  survive reloads and Supabase-backed sessions.
- Fixed Supabase suite creation to return the database suite UUID to the
  frontend/API, which lets uploaded-output runs find the committed suite in
  Supabase mode.
- Added Supabase store methods for:
  - persisting uploaded-output pilot runs;
  - listing persisted pilot runs for a project;
  - checking whether a run exists by external run id;
  - reconstructing a pilot run source bundle from persisted run, suite, and
    output rows.
- Updated `pilot_runs` so API-memory state is now a cache:
  - new runs persist immediately when Supabase persistence is configured;
  - run summaries/listing can come from Supabase;
  - run detail/overview/ranking/certificate paths can reconstruct the CASS
    engine after `pilot_runs.clear_runs()` or an API restart.
- Added persistence regression coverage:
  - Supabase REST contract test for storing/listing/reloading uploaded-output
    runs;
  - service-level test proving a pilot run can be restored after memory is
    cleared.
- Verification:
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` -> 9
    tests passed.
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 42 tests passed.
  - `cd web && npm run lint` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `cd web && npm run build` -> OK.
  - `deno check supabase/functions/stackcert-api/index.ts` -> OK.
  - `supabase migration up --local` -> migration applied, local database up to
    date.
  - `supabase migration list --local` -> local migration history includes
    `20260524023733`.
  - `supabase db query --local --file supabase/tests/rls_smoke.sql` -> no rows,
    meaning no public tables without RLS.
  - `supabase db lint --local` -> no schema errors.
  - `supabase db advisors --local` -> no issues found.
- Remaining production gaps:
  - route the hosted frontend to a persistent FastAPI API instead of relying on
    the lightweight Edge Function simulation for real pilot computation;
  - add hosted end-to-end CI smoke for onboarding -> import -> upload -> reload
    -> issue evidence once the production API host is in place;
  - add richer upload validation templates and customer-facing row-level import
    errors.

## Hosted Supabase Deploy Refresh

- Linked the local Supabase project to hosted project
  `cgwiwmfzpektpyquiveg`.
- Deployed remote database migrations:
  - `20260523151421_initial_stackcert_schema.sql`
  - `20260523192827_add_usage_event_metadata.sql`
  - `20260524023733_add_project_setup_status.sql`
- Redeployed Supabase Edge Function `stackcert-api` with `--no-verify-jwt` so
  public health/export routes can run while protected app routes still enforce
  Supabase Auth inside the function.
- Hosted API base:
  `https://cgwiwmfzpektpyquiveg.supabase.co/functions/v1/stackcert-api`
- Verification:
  - `supabase db push --linked --dry-run` -> planned exactly the three expected
    migrations.
  - `supabase db push --linked --yes` -> applied all three migrations.
  - `supabase migration list --linked` -> local and remote histories match.
  - Remote `projects.setup_status` column exists with default
    `ready_for_setup`.
  - `GET /api/health` on the hosted Edge Function -> 200.
  - `GET /api/workspaces` without a bearer token -> 401, preserving the app API
    auth gate.

## MCP And CASS Theory Hardening

- Upgraded the FastAPI MCP surface from an app-specific JSON-RPC helper into a
  closer MCP-shaped remote HTTP contract:
  - `POST /api/mcp` handles JSON-RPC requests and initialization for protocol
    version `2025-06-18`;
  - `POST /api/mcp/rpc` remains as a compatibility endpoint;
  - notifications such as `notifications/initialized` return `202`;
  - `GET /api/mcp` returns `405` because this implementation does not expose
    an SSE stream.
- Expanded MCP discovery:
  - tool metadata now includes titles, schemas, annotations, and structured
    outputs;
  - resources include release-evidence status, release evidence packets, theory
    cards, measurement recommendations, integration guides, and cost ledgers;
  - resource templates expose project/run URI patterns;
  - prompts include deployment-gate review, CASS theory audit, and custom
    behavior drafting.
- Added release-evidence-focused tools:
  - `get_release_evidence_status`;
  - `get_run_theory_card`;
  - `get_measurement_recommendations`;
  - legacy `get_certificate_status` remains as an alias.
- Added a CASS theory card payload that records:
  - K<=2 serial aggregation;
  - `P(pair passes cell) = q_a * q_b + rho_ab * sigma_a * sigma_b`;
  - benign utility and adversarial miss definitions;
  - `welfare = benign_pass - lambda_cost * adversarial_miss`;
  - feasible/rho-prior interval assumptions;
  - comparison-certificate semantics;
  - measured vs unmeasured pair-cell accounting and diagnostics.
- Updated the Supabase Edge Function demo MCP routes with the same release
  evidence/theory-card concepts so hosted demos do not expose stale MCP copy.
- Redeployed Supabase Edge Function `stackcert-api` to project
  `cgwiwmfzpektpyquiveg` after the MCP update.
- Added theory regression coverage:
  - unmeasured K=2 pair intervals use `rho_prior` inside feasible Bernoulli
    bounds;
  - comparison gap centers match differences between CASS welfare estimates;
  - measured pair-cell comparisons have zero comparison radius.
- Verification:
  - `.venv/bin/python -m unittest tests.test_k2_exact -v` -> 3 tests passed.
  - Targeted MCP API tests -> 5 tests passed.
  - `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` -> 11
    tests passed.
  - `.venv/bin/python -m unittest discover -s tests_service -p 'test_*.py' -v`
    -> 44 tests passed.
  - `cd web && npm run lint` -> OK.
  - `cd web && npm test -- --run` -> 4 tests passed.
  - `cd web && npm run build` -> OK.
  - `deno check supabase/functions/stackcert-api/index.ts` -> OK.
  - Hosted `GET /api/health` on the Supabase Edge Function -> 200.
  - Hosted unauthenticated `GET /api/mcp/manifest` -> 401, preserving the app
    API auth gate. Authenticated MCP smoke still needs the smoke anon key in the
    shell or CI secret.

## GitHub Actions And Cloudflare Build Fix

- Investigated failing GitHub checks for commit `b2f1a29`:
  - `ci / frontend checks`;
  - `deploy pages / test and build web`.
- Root cause: adding a root npm workspace made `cd web && npm ci` use the root
  lockfile. The root lockfile did not include GitHub's Linux x64 Rolldown
  optional native binding, so Vitest failed with
  `Cannot find module '@rolldown/binding-linux-x64-gnu'`.
- Removed the root npm workspace wiring and kept the root package focused on
  Cloudflare Workers Builds:
  - root `npm ci` installs Wrangler only;
  - root `npm run build` installs the web app with `web/package-lock.json` and
    then builds the frontend;
  - root `npx wrangler deploy` still deploys `web/dist`.
- Updated GitHub Actions frontend steps to run explicit package commands:
  `npm --prefix web ci --workspaces=false --include=optional`, followed by
  prefix-scoped lint, typecheck, test, and build commands.
- Verification:
  - local `npm ci && npm run build` -> OK;
  - local `npm --prefix web test -- --run` -> 4 tests passed;
  - local `npx wrangler deploy --dry-run` -> OK;
  - clean Docker `linux/amd64` `npm ci && npm run build &&
    npm --prefix web test -- --run` -> OK.

## Cloudflare Workers Staging Deployment

- Deployed the Cloudflare Workers static-assets app:
  `https://stackcert-staging.savikk129.workers.dev`.
- Built the frontend with:
  - `VITE_ROUTER_MODE=browser`;
  - `VITE_PUBLIC_BASE=/`;
  - `VITE_API_BASE_URL=https://stackcert-api-oaw2bwdgyq-uc.a.run.app`;
  - `VITE_SUPABASE_URL=https://cgwiwmfzpektpyquiveg.supabase.co`;
  - browser-safe Supabase publishable key.
- Removed `web/public/_redirects` because Cloudflare Workers Assets already
  uses `not_found_handling: "single-page-application"` and rejected the
  `_redirects` SPA fallback as an infinite loop.
- Updated Cloud Run service `stackcert-api` to revision `stackcert-api-00003-szq`
  with `https://stackcert-staging.savikk129.workers.dev` in
  `STACKCERT_CORS_ORIGINS`; max instances remains `1`.
- Updated `scripts/deployment_smoke.py` to send a small user agent so
  Cloudflare does not reject Python urllib requests with error `1010`.
- Verification:
  - Cloudflare index route -> 200 StackCert app shell;
  - Cloudflare SPA fallback route -> 200 app shell;
  - Cloud Run health -> 200 production;
  - CORS preflight from Cloudflare origin to Cloud Run API -> allowed;
  - Playwright landing-page render -> OK;
  - Playwright sign-in/demo flow -> reaches the real recommendation dashboard;
  - `scripts/deployment_smoke.py` against Cloudflare + Cloud Run + Supabase Auth
    -> `deployment smoke OK`.

## CI/CD Verification And Docs Refresh

- Confirmed latest GitHub Actions runs on `main` are green:
  - `ci`;
  - fallback `deploy pages`;
  - `deploy cloudflare`.
- Added GitHub secret/variables for the Cloudflare CD path:
  - `CLOUDFLARE_API_TOKEN` as a scoped secret;
  - `CLOUDFLARE_ACCOUNT_ID`;
  - `VITE_API_BASE_URL` now points at Cloud Run;
  - Supabase URL/key and smoke user remain configured.
- Added `.github/workflows/deploy-cloudflare.yml`:
  - runs after `ci` succeeds on `main`;
  - builds the browser-routed Cloudflare frontend;
  - deploys with Wrangler;
  - smokes Cloudflare + Cloud Run + Supabase Auth.
- Verified external services:
  - Supabase local/remote migration history matches;
  - Cloud Run `stackcert-api` revision is `stackcert-api-00003-szq`;
  - Cloud Run CORS includes the Cloudflare staging origin;
  - Cloudflare `stackcert-staging` deployments are visible with the scoped token;
  - GitHub `deploy cloudflare` produced a new Worker deployment;
  - full deployed smoke returns `deployment smoke OK`.
- Noted Cloudflare token limitation: the scoped token can deploy/list Workers,
  but Workers Builds API endpoints return `403`; add Workers Builds
  read/config permissions if build-log introspection becomes required.
- Updated `README.md`, `.env.example`, and deployment/status docs to reflect the
  working Supabase + Cloud Run + Cloudflare staging stack.

## Deterministic Provider Worker Evidence Slice

- Extended evaluation jobs beyond the seeded demo project:
  - jobs can now target a real project benchmark suite;
  - workers execute configured safety-check connectors using the deterministic
    provider adapter contract;
  - run-level budget caps block evaluation before work starts;
  - worker outputs create a persisted `worker_evaluation` CASS evidence run;
  - usage events are recorded per evaluated safety check.
- Made worker-produced runs first-class evidence runs:
  - project run lists now include `worker_evaluation` sources;
  - persisted worker runs reload with their sampled example set;
  - recommendation, ranking, overlap, measurement, cost, and release-evidence
    endpoints can operate on worker-produced runs.
- Made measurement-plan creation durable for real pilot runs by routing the API
  through the job service instead of returning an unstored plan object.
- Updated setup UI behavior:
  - dry-run jobs use connector `guard_key` values rather than database ids;
  - setup invalidates runs/stacks after worker completion;
  - completed worker runs open directly in the recommendation view.
- Added regression coverage:
  - non-demo project worker run with suite import, two connectors, budget-cap
    rejection, queued worker execution, persisted run, overview, and cost ledger;
  - Supabase store listing for `worker_evaluation` evidence sources.
- Verification:
  - `uv run python -m py_compile stackcert_service/services/jobs.py stackcert_service/services/pilot_runs.py stackcert_service/db/supabase.py stackcert_service/schemas.py` -> OK;
  - `uv run python -m unittest discover tests_service` -> 56 tests passed;
  - `uv run python -m unittest discover tests` -> 11 tests passed;
  - `npm --prefix web run typecheck -- --pretty false` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm run build` -> OK;
  - Playwright local smoke created a real project, imported a suite, added two
    connectors, queued a worker dry-run from setup, ran the worker, opened the
    resulting recommendation run, and checked desktop/mobile horizontal
    overflow -> OK. Screenshot: `output/setup-worker-smoke.png`.

## REST Provider Adapter And Hosted MCP Smoke Slice

- Implemented the real REST safety-check adapter contract:
  - outbound POST payload now includes guard/run/example/cell ids, prompt hash,
    redacted prompt, source, policy category, and example metadata;
  - accepts `binary_pass`, `safe`, `block`, `unsafe`, `binary_block`,
    `block_probability`, `risk_score`, or `score` provider responses;
  - applies connector thresholds for score-only responses;
  - records adapter/endpoint/provider metadata without storing secrets;
  - classifies HTTP timeout, rate-limit, provider, and configuration failures
    for worker retries/dead-letter handling.
- Added production endpoint safety checks so REST connectors must use HTTPS
  and cannot target localhost, metadata hosts, or literal private/link-local
  addresses when `STACKCERT_ENV=production`.
- Wired `adapter_mode: rest_guard` into project evaluation jobs:
  - non-demo jobs preflight configured REST connectors before queueing;
  - backend-only secrets resolve through
    `STACKCERT_GUARD_SECRET_<GUARD_KEY>`;
  - worker execution calls configured connector endpoints and persists the
    resulting `worker_evaluation` CASS run;
  - usage events include adapter mode/type metadata.
- Added authenticated hosted MCP smoke coverage:
  - `scripts/deployment_smoke.py` now checks MCP manifest discovery,
    `/api/mcp` initialize, and `get_release_evidence_status`;
  - `scripts/cloud_run_api_smoke.py` now checks the same release-evidence tool
    path when Supabase smoke credentials are provided;
  - deployment readiness tests assert the smoke script covers MCP and
    limitations flags.
- Added regression coverage:
  - REST adapter unit tests with an in-process fake provider;
  - score-only response threshold/probability preservation;
  - API worker test that starts a fake REST guard server, creates two
    authenticated connectors, runs a queued job, and verifies persisted
    overview/cost evidence;
  - missing backend-secret preflight failure with the expected env var name;
  - production URL-safety checks for local/metadata endpoints.
- Verification:
  - `uv run python -m py_compile stackcert/guards/rest_adapter.py stackcert_service/services/jobs.py stackcert_service/schemas.py scripts/deployment_smoke.py scripts/cloud_run_api_smoke.py` -> OK;
  - `uv run python -m unittest tests.test_rest_adapter` -> 3 tests passed;
  - `uv run python -m unittest discover -s tests_service` -> 59 tests passed;
  - `uv run python -m unittest discover -s tests` -> 14 tests passed;
  - `npm --prefix web run typecheck -- --pretty false` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm --prefix web run build` -> OK;
  - `npm run build` -> OK.

## Provider Secrets, Model-Judge Worker, And MCP Client Slice

- Added backend-only provider secret management:
  - connector creation now records explicit secret refs and secret status
    without returning raw secret material to the browser;
  - local development/test connectors can use process-memory secret refs for
    fake providers;
  - production connector configs point at environment-secret refs such as
    `STACKCERT_GUARD_SECRET_<GUARD_KEY>` and fail preflight if the worker does
    not have the secret.
- Implemented model-judge worker execution:
  - added an HTTP JSON model-judge adapter that supports OpenAI-compatible chat,
    Ollama chat, and direct JSON judge endpoints;
  - parses `block`, `safe`, `binary_pass`, `risk_score`, `score`, and
    structured chat message JSON responses;
  - keeps raw model output out of stored metadata by default while preserving
    category/rationale summaries;
  - wires `adapter_mode: model_judge` into job preflight, worker execution,
    usage events, and persisted `worker_evaluation` CASS runs.
- Added MCP client-level smoke coverage:
  - added `mcp==1.27.1`;
  - added `scripts/mcp_client_smoke.py`, which uses the official Python MCP SDK
    `ClientSession` and `streamable_http_client` against `/api/mcp`;
  - GitHub Pages and Cloudflare deploy workflows now run the SDK smoke after
    the existing hosted deployment smoke.
- Updated setup UI/API types for model-judge connector fields: model, provider
  format, system prompt, timeout, and secret env var.
- Added regression coverage:
  - model-judge adapter unit tests with fake OpenAI-compatible and direct JSON
    providers;
  - project worker model-judge run with two connectors, persisted overview, and
    authorization header verification;
  - deployment-readiness assertions that hosted workflows run the MCP SDK smoke.
- Verification:
  - `uv run python -m py_compile stackcert/guards/model_judge_adapter.py stackcert/guards/rest_adapter.py stackcert_service/services/provider_secrets.py stackcert_service/services/guard_connectors.py stackcert_service/services/jobs.py stackcert_service/schemas.py scripts/mcp_client_smoke.py scripts/deployment_smoke.py scripts/cloud_run_api_smoke.py` -> OK;
  - `uv run python -m unittest tests.test_model_judge_adapter tests.test_rest_adapter` -> 6 tests passed;
  - targeted API/deployment-readiness tests for model judge, REST, secret
    preflight, and MCP SDK workflow coverage -> OK;
  - `uv run python -m unittest discover -s tests_service` -> 60 tests passed;
  - `uv run python -m unittest discover -s tests` -> 17 tests passed;
  - `npm --prefix web run typecheck -- --pretty false` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm --prefix web run build` -> OK;
  - `npm run build` -> OK;
  - local `scripts/mcp_client_smoke.py --api-url http://127.0.0.1:18081` against
    a local FastAPI server -> `mcp client smoke OK`.

## Cloud Run API Rollout For Model-Judge Slice

- Ran the read-only cost preflight before deployment:
  - billing enabled for `project-e7840c42-f298-4bd9-bff`;
  - visible project budget: `StackCert staging $10`;
  - existing `stackcert-api` service retained staging-safe scale annotations.
- Built and pushed the API image:
  - `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:c761a3f-staging-20260524232912`
- Deployed Cloud Run service `stackcert-api` with the existing staging caps:
  min instances `0`, max instances `1`, CPU `1`, memory `512Mi`,
  concurrency `40`, timeout `60s`, Supabase Secret Manager bindings, and the
  existing Cloudflare/GitHub/local CORS origins.
- New ready revision:
  - `stackcert-api-00004-qv9`
- Hosted verification:
  - `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app` -> `cloud run api smoke OK`;
  - `uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `mcp client smoke OK`.

## Worker Idempotency, Price Cards, And MCP Machine Auth Slice

- Added retry-safe persistence for worker-produced evidence:
  - jobs upsert on `(workspace_id, external_job_id)`;
  - worker guard outputs upsert on `(run_id, guard_key, external_example_id)`;
  - worker measurement recommendations upsert on `(run_id, action_key)`;
  - usage events carry an `external_event_id` and upsert on
    `(workspace_id, external_event_id)`;
  - uploaded-output runs still use their existing replace semantics.
- Added Supabase migration
  `20260525001842_worker_idempotency_and_usage_keys.sql` for the new usage
  event id column and uniqueness keys. Applied it to the linked Supabase
  project with `supabase db push --linked --yes`; `supabase migration list`
  now shows the migration on both local and remote histories.
- Added connector price-card support:
  - setup API accepts per-request, input-token, and output-token pricing;
  - connector configs persist price cards without exposing provider secrets;
  - worker cost estimates and usage ledgers use price cards;
  - REST and model-judge adapters preserve provider-reported token usage when
    endpoints return OpenAI-style or direct usage fields.
- Added MCP-only machine bearer tokens:
  - `STACKCERT_MCP_MACHINE_TOKEN_HASHES` stores comma-separated token id/hash
    entries;
  - `STACKCERT_MCP_MACHINE_TOKEN_SCOPES` stores `mcp:read` /
    `mcp:read|mcp:write` scopes;
  - machine tokens authenticate only `/api/mcp` and `/api/mcp/rpc`; normal app
    routes still require Supabase Auth;
  - read-only machine tokens receive a JSON-RPC 403 for write tools such as
    `create_measurement_plan`.
- Added `scripts/hash_mcp_machine_token.py` for safe token-hash generation and
  extended `scripts/mcp_client_smoke.py` with `--bearer-token`.
- Updated setup UI/API types with connector price-card fields.
- Applied Supabase advisor check on the linked project:
  - no error-level advisor findings;
  - existing warn-level finding remains: Supabase Auth leaked-password
    protection is disabled and should be enabled before production.
- Verification:
  - `uv run python -m py_compile stackcert_service/services/pricing.py stackcert_service/services/jobs.py stackcert_service/services/usage.py stackcert_service/services/guard_connectors.py stackcert_service/db/supabase.py stackcert_service/security/auth.py stackcert_service/main.py stackcert_service/services/mcp.py stackcert/guards/rest_adapter.py stackcert/guards/model_judge_adapter.py scripts/hash_mcp_machine_token.py` -> OK;
  - `uv run python -m unittest tests_service.test_auth tests_service.test_deployment_readiness tests_service.test_supabase_store` -> 19 tests passed;
  - `uv run python -m unittest discover -s tests_service` -> 64 tests passed;
  - `uv run python -m unittest discover -s tests` -> 17 tests passed;
  - `npm --prefix web run typecheck` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm --prefix web run build` -> OK;
  - `npm run build` -> OK;
  - local official MCP SDK smoke against a production-mode FastAPI server with
    an MCP-only machine bearer token -> `mcp client smoke OK`;
  - `supabase db advisors --linked --type all --level warn --fail-on error`
    -> OK exit with the leaked-password-protection warning above.
- Follow-up CI fix:
  - first post-commit `ci` run on `88f91bc` failed only in the Supabase setup
    step because `supabase/setup-cli@v2` could not resolve `latest` under a
    GitHub release rate limit;
  - pinned the CI Supabase CLI version to `2.101.0`, matching the local CLI
    used for the migration push.

## Worker Idempotency Slice Hosted Rollout

- Pushed follow-up commit `b022c1c` with the pinned Supabase CLI CI fix.
- GitHub Actions on `b022c1c`:
  - `ci` -> success;
  - fallback `deploy pages` -> success;
  - `deploy cloudflare` -> success, including hosted Cloudflare + Cloud Run +
    Supabase Auth smoke.
- Ran the read-only GCP cost preflight before deployment:
  - billing enabled for `project-e7840c42-f298-4bd9-bff`;
  - visible project budget: `StackCert staging $10`;
  - existing `stackcert-api` service retained staging-safe scale annotations.
- Built and pushed the Cloud Run API image:
  - first local Docker image was arm64-only and Cloud Run rejected it before
    creating a serving revision;
  - rebuilt with `docker buildx build --platform linux/amd64 --push`;
  - final image tag:
    `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:b022c1c-staging-202605250046-amd64`.
- Deployed Cloud Run service `stackcert-api` with staging caps preserved:
  min instances `0`, max instances `1`, CPU `1`, memory `512Mi`,
  concurrency `40`, timeout `60s`, Supabase Secret Manager bindings, and the
  existing Cloudflare/GitHub/local CORS origins.
- New ready revision:
  - `stackcert-api-00006-4qd`
- Hosted URLs:
  - Cloudflare app:
    `https://stackcert-staging.savikk129.workers.dev/auth/sign-in`
  - Cloud Run API:
    `https://stackcert-api-oaw2bwdgyq-uc.a.run.app`
- Hosted verification:
  - `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app` -> `cloud run api smoke OK`;
  - authenticated `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `cloud run api smoke OK`;
  - authenticated `uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `mcp client smoke OK`;
  - authenticated `uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `deployment smoke OK`;
  - post-deploy `uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1 --gcloud /Users/vik/Developer/google-cloud-sdk/bin/gcloud` -> OK.

## Milestone 5 Pilot UX And Operational Readiness

- Added uploaded-output preview diagnostics before run creation:
  - new route `POST /api/projects/{project_id}/runs/uploaded-outputs/preview`;
  - validates JSONL/CSV output rows without creating a run;
  - reports detected format, row count, safety-check count, suite-example
    coverage, missing/unknown example ids, per-check coverage, and per-cell
    coverage;
  - malformed output files now return UI-friendly preview errors instead of
    forcing users into a failed run attempt.
- Polished setup/import UX:
  - JSONL and CSV output templates;
  - output coverage preview panel;
  - uploaded-output run creation is gated until a user-imported versioned suite
    exists and the latest preview is not invalid;
  - the seeded demo/research suite is no longer treated as an uploaded-output
    target, which avoids misleading `Benchmark suite not found` errors.
- Added operator-facing worker health on the setup page:
  - queued/running/failed/dead-letter counts;
  - latest job output/error/progress stats;
  - worker lease and retry timing;
  - redacted provider error display;
  - retry button for failed jobs.
- Polished release-evidence review UI:
  - immutable packet badge after issue;
  - full packet hash display;
  - private artifact export history;
  - retest-trigger explanations for model, prompt/policy, example mix, safety
    option, and generic scope changes.
- Updated docs:
  - `README.md`;
  - `docs/15_current_state_and_next_steps.md`;
  - `docs/18_pilot_ready_execution_plan.md`.
- Verification:
  - `uv run python -m py_compile stackcert_service/schemas.py stackcert_service/services/pilot_runs.py stackcert_service/main.py` -> OK;
  - focused uploaded-output preview/API tests -> passed;
  - `uv run python -m unittest discover -s tests_service` -> 90 tests passed;
  - `uv run python -m unittest discover -s tests` -> 17 tests passed;
  - `npm --prefix web run typecheck` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm --prefix web run build` -> OK;
  - `npm run build` -> OK;
  - Browser QA against `http://127.0.0.1:5174/app/ws_demo/proj_acme_copilot/setup`
    with API on `127.0.0.1:8000`:
    - desktop setup page rendered without API errors;
    - seeded demo suite correctly disabled uploaded-output preview until a
      versioned custom suite was created;
    - creating the sample versioned suite enabled coverage preview;
    - preview returned 100% coverage for the sample output template and enabled
      uploaded-output run creation;
    - worker queue UI rendered;
    - 390px mobile viewport rendered without framework overlays or console
      errors.
- GitHub Actions after push:
  - `ci` run `26382004865` -> success;
  - fallback `deploy pages` run `26382004853` -> success;
  - `deploy cloudflare` run `26382070724` -> success.

## Pilot-Ready Execution Plan Reset

- Added `docs/18_pilot_ready_execution_plan.md` as the executable roadmap
  distilled from the imported `instructions.md` plan, the feasibility review,
  and the current implementation baseline.
- Updated the docs index, current-state doc, phased development plan, and
  README so future work points at the new roadmap instead of the older broad
  priority stack.
- The next implementation queue is now explicit:
  1. route access matrix;
  2. access helper module;
  3. Supabase/local membership lookup;
  4. route authorization;
  5. audit event service;
  6. evidence-readiness gates;
  7. private artifact service for evidence exports.
- Strategic priority is now sequenced as:
  - first, the pilot trust layer: tenancy/RBAC, audit, immutable evidence, and
    private artifacts;
  - second, the pilot integration layer: managed secrets, independent Cloud Run
    worker, and release-gate APIs;
  - third, pilot UX and production operations.

## Milestone 1 Pilot Trust Layer

- Added `docs/19_route_access_matrix.md`, covering every FastAPI route's object
  scope, required role or machine scope, demo exception, and audit expectation.
- Added `stackcert_service/security/access.py` with:
  - role normalization and aliases for the existing Supabase role vocabulary;
  - product role groups such as `project_maintainer`, `evidence_issuer`, and
    `evidence_reviewer`;
  - app-principal, machine-scope, workspace, project, run, and certificate
    grant helpers.
- Added Supabase and local membership lookup paths:
  - workspace/project list filtering by principal membership;
  - workspace owner membership creation for locally created workspaces;
  - project/run/certificate access checks that deny cross-tenant reads and
    writes.
- Applied route authorization to workspace, project, benchmark suite, custom
  behavior, connector, job, run, usage, evidence, drift, retest, and MCP routes.
- Added `stackcert_service/services/audit.py` and wired sensitive mutations to
  audit events, including project/workspace creation, suite commits, uploaded
  runs, connector/job actions, measurement plans, evidence issue/signoff/export,
  retest queueing, custom behaviors, and MCP tool calls.
- Updated MCP manifest/tool/resource/prompt handling so user principals are
  filtered by project/run access and MCP-only machine tokens remain scoped to
  MCP surfaces.
- Added `tests_service/test_access_control.py` and extended Supabase store
  contract coverage for membership and audit-event writes.
- Verification:
  - `uv run python -m unittest tests_service.test_access_control` -> 10 tests passed;
  - `uv run python -m unittest discover -s tests_service` -> 77 tests passed;
  - `uv run python -m unittest discover -s tests` -> 17 tests passed;
  - `npm --prefix web run typecheck` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm --prefix web run build` -> OK;
  - `npm run build` -> OK;
  - `git diff --check` -> OK.

## Milestone 2 Immutable Evidence And Private Artifacts

- Added Supabase migration
  `20260525021244_immutable_evidence_artifacts.sql`:
  - `certificates.packet_snapshot` for canonical issued packet JSON;
  - `certificates.artifact_refs` for attached private artifacts;
  - supersession/revocation metadata fields;
  - `artifact_objects.metadata`;
  - indexes for artifact type/metadata lookup;
  - triggers that reject edits to issued certificate core fields and reject
    certificate deletes.
- Applied the migration to the linked Supabase staging project:
  - `supabase db push --linked --dry-run` showed exactly the new migration;
  - `supabase db push --linked --yes` applied it;
  - `supabase migration list --linked` shows local and remote both include
    `20260525021244`.
- Supabase advisors after the migration:
  - `supabase db advisors --linked --type all --level warn --fail-on error`
    exited successfully;
  - existing warning remains: Supabase Auth leaked-password protection is
    disabled.
- Added `stackcert_service/services/artifacts.py`:
  - memory fallback for local tests;
  - Supabase artifact listing;
  - private storage signed URL creation;
  - SHA-256 verification by downloading stored artifacts.
- Extended certificate issuing:
  - evidence readiness gates run before issue;
  - canonical issued packet JSON is hashed with SHA-256;
  - issued packet snapshot and private JSON/Markdown artifact refs are returned
    with the certificate;
  - issue remains idempotent for existing certificate IDs.
- Added API routes:
  - `GET /api/runs/{run_id}/certificate/readiness`;
  - `GET /api/certificates/{certificate_id}/artifacts`;
  - `POST /api/certificates/{certificate_id}/artifacts/{artifact_type}/signed-url`;
  - `GET /api/certificates/{certificate_id}/artifacts/{artifact_type}/verify`.
- Updated deployment smoke scripts so hosted auth smokes check the evidence
  readiness endpoint.
- Updated release-evidence UI:
  - readiness checklist with blockers and warnings;
  - issue button disabled when readiness blocks issue;
  - locked packet details include artifact count and hash;
  - private artifacts show type, size, SHA-256, hash verification, and
    authenticated short-lived download controls.
- Added tests:
  - `tests_service/test_evidence_readiness.py`;
  - API coverage for readiness, artifact verification, and signed URL creation;
  - Supabase store contract coverage for artifact upload, metadata persistence,
    signed URLs, and verification.
- Verification:
  - `uv run python -m unittest tests_service.test_evidence_readiness tests_service.test_supabase_store tests_service.test_api_demo.DemoApiTest.test_certificate_issue_requires_ack_and_accepts_signoff tests_service.test_api_demo.DemoApiTest.test_certificate_markdown_export tests_service.test_access_control` -> 28 tests passed;
  - `uv run python -m unittest discover -s tests_service` -> 80 tests passed;
  - `uv run python -m unittest discover -s tests` -> 17 tests passed;
  - `npm --prefix web run typecheck` -> OK;
  - `npm --prefix web test -- --run` -> 6 tests passed;
  - `npm --prefix web run build` -> OK;
  - Playwright local responsive smoke against `http://127.0.0.1:5173/app/ws_demo/proj_acme_copilot/certificate` with API on `127.0.0.1:18082` -> desktop and 390px mobile layouts rendered after issuing evidence.
- Local Supabase reset was not rerun in this resumed session because Docker was
  not reachable at `/Users/vik/.docker/run/docker.sock`.

## Milestone 2 Hosted Deployment And Smoke Closure

- Committed and pushed the Milestone 2 implementation:
  - `ca61bc2` `Implement pilot trust layer`;
  - `325ea1a` `Implement immutable evidence artifacts`;
  - `bf2ac7e` `Gate demo workspace behind staging flag`;
  - `086a54b` `Avoid demo audit foreign keys`.
- Deployed the FastAPI/CASS API to Cloud Run with staging cost caps preserved:
  - service: `stackcert-api`;
  - region: `us-central1`;
  - project: `project-e7840c42-f298-4bd9-bff`;
  - revision: `stackcert-api-00009-sb6`;
  - image:
    `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:086a54b-staging-202605250309-amd64`;
  - max instances `1`, min instances `0`, CPU `1`, memory `512Mi`,
    concurrency `40`, timeout `60s`.
- Added `STACKCERT_ENABLE_DEMO_WORKSPACE`:
  - default remains disabled for real production tenants;
  - Cloud Run staging sets it to `true` so the public demo user can access the
    seeded `proj_acme_copilot` walkthrough while auth remains required.
- Adjusted Supabase audit persistence for the synthetic demo workspace:
  - audit events keep demo workspace/project IDs in metadata;
  - nullable database FK columns are left empty when the demo objects are not
    real Supabase rows;
  - user actions and MCP calls no longer fail with audit FK violations in the
    staging demo.
- Hosted verification after the final deploy:
  - `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app` -> `cloud run api smoke OK`;
  - authenticated `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `cloud run api smoke OK`;
  - authenticated `uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `mcp client smoke OK`;
  - authenticated `uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `deployment smoke OK`;
  - post-deploy `uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1 --gcloud /Users/vik/Developer/google-cloud-sdk/bin/gcloud` -> OK.
- GitHub Actions after the final push:
  - `ci` on `086a54b` -> success;
  - fallback `deploy pages` on `086a54b` -> success after rerun against the
    updated API revision;
  - `deploy cloudflare` on `086a54b` -> success.
- Local verification after the final follow-up:
  - `uv run python -m unittest discover -s tests_service` -> 82 tests passed;
  - `npm --prefix web run typecheck` -> OK;
  - `git diff --check` -> OK.

## Milestone 3/4 Managed Secrets, Worker Lease Renewal, And Release Gate

- Added redacted provider-secret management on guard connectors:
  - `GET /api/projects/{project_id}/guard-connectors/{guard_id}/secret`;
  - `POST /api/projects/{project_id}/guard-connectors/{guard_id}/secret`;
  - `POST /api/projects/{project_id}/guard-connectors/{guard_id}/secret/rotate`;
  - `POST /api/projects/{project_id}/guard-connectors/{guard_id}/secret/disable`.
- Secret handling now stores only refs and metadata in connector config:
  - local memory refs for test/dev providers;
  - `env://...` runtime refs;
  - `gcp-secret://projects/{project}/secrets/{secret}/versions/{version}`
    Secret Manager refs for Cloud Run workers.
- Added audit events for secret register/rotate/disable/use and tests proving
  raw provider secrets do not appear in API/store responses.
- Added worker lease renewal:
  - service method `jobs.renew_job_lease`;
  - route `POST /api/jobs/{job_id}/lease/renew`;
  - worker event `lease_renewed`.
- Updated `scripts/worker_once.py`:
  - can run multiple jobs;
  - can claim across all persisted projects with `--all-projects`;
  - exits cleanly when no runnable jobs are available.
- Added release-gate API:
  - `POST /api/projects/{project_id}/release-gates/evaluate`;
  - returns `pass`, `warn`, or `block`, evidence packet ids, blockers,
    warnings, retest triggers, and machine-readable assumptions;
  - checks explicit run ids, environment, changed-since-evidence triggers,
    guard connector versions, benchmark suite ids, and scoped evidence status.
- Added release-gate-only machine token auth:
  - `STACKCERT_RELEASE_GATE_TOKEN_HASHES`;
  - `STACKCERT_RELEASE_GATE_TOKEN_SCOPES`;
  - `STACKCERT_RELEASE_GATE_TOKEN_PROJECTS`;
  - helper `scripts/hash_release_gate_token.py`.
- Project scoping now applies to MCP machine tokens through
  `STACKCERT_MCP_MACHINE_TOKEN_PROJECTS`.
- Updated `scripts/certificate_gate.py` with `--release-gate` mode and
  release-context inputs for CI/deploy systems.
- Updated `.github/workflows/certificate-gate.yml` so reusable workflow callers
  can opt into the release-gate API and pass deployment context.
- Updated hosted smoke scripts so authenticated smoke coverage calls the new
  release-gate route in addition to Auth, readiness, and MCP.
- Updated docs:
  - `README.md`;
  - `docs/11_local_dev_and_release_runbook.md`;
  - `docs/13_production_hosting_setup.md`;
  - `docs/15_current_state_and_next_steps.md`;
  - `docs/18_pilot_ready_execution_plan.md`;
  - `docs/19_route_access_matrix.md`.
- Verification:
  - `uv run python -m py_compile stackcert_service/services/provider_secrets.py stackcert_service/services/guard_connectors.py stackcert_service/db/supabase.py stackcert_service/security/auth.py stackcert_service/security/access.py stackcert_service/services/mcp.py stackcert_service/services/jobs.py stackcert_service/services/release_gates.py stackcert_service/main.py scripts/certificate_gate.py scripts/hash_release_gate_token.py scripts/worker_once.py` -> OK;
  - focused Milestone 3/4 tests -> 14 tests passed;
  - release-gate threshold regression tests -> passed;
  - `uv run python -m unittest discover -s tests_service` -> 89 tests passed.
- Deployed the corrected API revision to Cloud Run with staging cost caps
  preserved:
  - service: `stackcert-api`;
  - region: `us-central1`;
  - project: `project-e7840c42-f298-4bd9-bff`;
  - revision: `stackcert-api-00011-pt2`;
  - image:
    `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:f80909d-staging-202605250340-amd64`;
  - max instances `1`, min instances `0`, CPU `1`, memory `512Mi`,
    concurrency `40`, timeout `60s`.
- Hosted verification:
  - unauthenticated `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app` -> `cloud run api smoke OK`;
  - authenticated `uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `cloud run api smoke OK`;
  - authenticated `uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `mcp client smoke OK`;
  - authenticated `uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo` -> `deployment smoke OK`;
  - post-deploy `uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1 --gcloud /Users/vik/Developer/google-cloud-sdk/bin/gcloud` -> OK.
