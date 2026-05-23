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
