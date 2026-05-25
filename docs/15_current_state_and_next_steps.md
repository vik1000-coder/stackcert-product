# Current State And Next Steps

Last updated: 2026-05-25

This document is the short operational view of the product. The older planning
docs still matter, but this page should be the first place to check when
deciding what to build next.

The detailed executable roadmap is now
`18_pilot_ready_execution_plan.md`. This page summarizes the current baseline;
the execution plan owns the ordered implementation queue.

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
- Worker-produced evidence writes are idempotent across retries: jobs, guard
  outputs, measurement recommendations, and usage events now have stable
  conflict keys instead of duplicate-prone append behavior.
- Connector price cards are captured at setup and propagated through run
  estimates, provider token accounting, and usage ledgers.
- Supabase-backed persistence for custom behaviors, benchmark suites, guard
  connectors, jobs, usage events, issued evidence, signoffs, and uploaded-output
  pilot runs.
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
  bearer tokens scoped to `mcp:read` / `mcp:write`.

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
uv run python -m py_compile stackcert_service/services/pricing.py stackcert_service/services/jobs.py stackcert_service/services/usage.py stackcert_service/services/guard_connectors.py stackcert_service/db/supabase.py stackcert_service/security/auth.py stackcert_service/main.py stackcert_service/services/mcp.py stackcert/guards/rest_adapter.py stackcert/guards/model_judge_adapter.py scripts/hash_mcp_machine_token.py
  -> OK

uv run python -m unittest tests_service.test_access_control
  -> 10 tests passed

uv run python -m unittest discover -s tests_service
  -> 80 tests passed

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

Playwright responsive smoke against local API/web
  -> release evidence page rendered at 1238px and 390px widths after issuing a packet

supabase status / local db reset
  -> blocked in this resumed session because Docker daemon was not reachable at /Users/vik/.docker/run/docker.sock

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
docker buildx build --platform linux/amd64 -f Dockerfile.api ...
gcloud run deploy stackcert-api ...
uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1
  -> OK
```

Latest hosted verification:

- Supabase remote migration history matches local migrations:
  `20260523151421`, `20260523192827`, `20260524023733`, `20260525001842`,
  `20260525021244`.
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
  `deploy cloudflare` on commit `b022c1c`.
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
- Latest ready revision is `stackcert-api-00006-4qd`, deployed from commit
  `b022c1c`.
- Staging caps are active: max scale `1`, min scale default `0`, CPU `1`,
  memory `512Mi`, timeout `60s`, concurrency `40`.
- The current Cloud Run revision passes unauthenticated and authenticated
  `scripts/cloud_run_api_smoke.py`, authenticated `scripts/mcp_client_smoke.py`
  against the hosted `/api/mcp` endpoint with the official Python MCP SDK, and
  full `scripts/deployment_smoke.py` against Cloudflare + Cloud Run +
  Supabase Auth.
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
- worker-produced outputs and measurement recommendations are upserted by
  stable run/guard/example and run/action keys, so retrying the same job does
  not duplicate evidence rows;
- connector secrets now resolve through a backend-only provider-secret resolver:
  local development can use process-memory secrets for fake providers, while
  production connector configs point workers at explicit environment-secret
  refs such as `STACKCERT_GUARD_SECRET_<GUARD_KEY>`;
- connector price cards now support per-request, input-token, and output-token
  cost estimates, with provider-reported token usage used when REST/model-judge
  endpoints return it;
- jobs enforce a run-level budget cap before execution;
- worker outputs create a persisted `worker_evaluation` evidence run;
- CASS recommendation, overlap, measurement-plan, cost, and release-evidence
  pages can read that worker-produced run;
- usage events are recorded per evaluated safety check with stable external
  event ids for retry-safe persistence;
- retry, lease, dead-letter, manual retry, and run-next worker APIs remain in
  place from the earlier worker hardening slice.

Current trust-layer status:

- `docs/19_route_access_matrix.md` documents every FastAPI route's object
  scope, role/scope requirement, demo exception, and audit event expectation;
- access helpers normalize the existing Supabase role vocabulary into product
  groups such as `project_maintainer`, `evidence_issuer`, and
  `evidence_reviewer`;
- Supabase-backed and local membership lookup paths filter accessible
  workspaces/projects and enforce project/run/certificate object access;
- MCP user principals are filtered by project/run access, while MCP-only
  machine tokens remain limited to scoped MCP surfaces;
- audit events are recorded for workspace/project creation, suite commits,
  uploaded-output runs, connector/job/work creation, measurement plans,
  evidence issue/signoff/export, retest queueing, custom behaviors, and MCP tool
  calls.

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

## What To Do Next

The imported pilot-readiness plan and feasibility review have been condensed
into a five-milestone executable roadmap:

1. Pilot trust layer: service-layer tenancy/RBAC, route access checks, and
   audit events.
2. Immutable evidence and private artifacts: readiness gates, immutable issued
   packets, artifact hashes, and signed access.
3. Managed secrets and independent worker: Secret Manager/Vault-backed provider
   secrets, worker deployment, lease renewal, dead letters, and budget caps.
4. Release gates and agent-friendly surfaces: conservative REST release-gate
   API, scoped machine tokens, GitHub Action support, MCP hardening, and audit.
5. Pilot UX and operational readiness: import/setup polish, evidence readiness
   UI, dead-letter UI, production monitoring, backups, terms, and privacy.

The immediate execution queue is:

1. Create a route-by-route access matrix for `stackcert_service/main.py`.
2. Implement `stackcert_service/security/access.py`.
3. Add persistence membership lookup for Supabase and local fallback.
4. Apply access checks to project, run, connector, job, usage, evidence, and
   MCP routes.
5. Add an audit event service and wire sensitive mutations.
6. Add evidence-readiness gates before issue.
7. Add private artifact storage first for evidence JSON/Markdown exports.

## Current Priority

The next engineering milestone should be:

```text
Pilot trust layer: tenancy/RBAC + audit + immutable evidence + private artifacts
```

The staging hosting milestone is complete: Supabase, Cloud Run, Cloudflare, and
GitHub CI/CD are wired and smoke-tested. The worker can now move a pilot team
from uploaded outputs to deterministic, REST, or model-judge managed runs with
retry-safe evidence writes and cost accounting. The next value milestone is
replacing prototype workspace assumptions with real tenant membership/role
enforcement, recording audit events, and making evidence/artifact handling
defensible for design-partner data. The worker/secret/release-gate integration
layer follows immediately after that trust layer.
