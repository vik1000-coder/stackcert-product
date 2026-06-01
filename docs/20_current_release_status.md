# Current Release Status

Last updated: 2026-06-01 04:20 UTC

This is the concise status page for the deployed StackCert staging system. Use
it when checking whether local code, GitHub, Supabase, Cloud Run, and
Cloudflare agree.

## Source And CI

- Repository: `vik1000-coder/stackcert-product`
- Branch: `codex/design-partner-deployability-discovery` for the current
  deployability PR; `main` remains the release base.
- Release path: pushes to `main` run `ci`, the GitHub Pages fallback deploy,
  and then the Cloudflare Worker deploy after CI succeeds.
- Latest audit result:
  - `ci`: success
  - `deploy pages`: success
  - `deploy cloudflare`: success
- Exact run and commit IDs are intentionally not hard-coded here because docs
  updates create new commits and Cloudflare version IDs change on every deploy.
  Use `gh run list --branch main --limit 6` and
  `npx wrangler deployments list --name stackcert-staging` for the live IDs.

## Hosted URLs

- Cloudflare app and same-origin API:
  `https://stackcert-staging.savikk129.workers.dev/`
- Sign-in route:
  `https://stackcert-staging.savikk129.workers.dev/auth/sign-in`
- Cloud Run API:
  `https://stackcert-api-oaw2bwdgyq-uc.a.run.app`
- Fallback GitHub Pages app:
  `https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in`

Demo credentials:

```text
Email: demo@stackcert.dev
Password: stackcert-demo
```

## Deployed Services

Cloudflare Workers:

- Worker: `stackcert-staging`
- Deployment status: verified through direct `wrangler deploy` during this
  audit.
- Current verified version ID: `d09f2851-2583-4302-967d-c5b4da0e20bb`
- Behavior: serves `web/dist` static assets and proxies `/api/*` plus
  `/api/mcp` and `/openapi.json` to Cloud Run.

Cloud Run API:

- Service: `stackcert-api`
- Region: `us-central1`
- Latest ready revision: `stackcert-api-00019-cwt`
- Image:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:7f9558b-staging-202606010411-amd64`
- Traffic: 100% to latest revision
- Scale guardrails: min instances `0`, max instances `3`, concurrency `40`
- GCP budget guardrail: `StackCert staging $50`

Cloud Run worker job:

- Job: `stackcert-worker`
- Region: `us-central1`
- Tasks: `1`
- Parallelism: `1`
- Max retries: `0`
- Timeout: `900s`

Supabase:

- Auth is active for the hosted app.
- Local and linked remote migrations match through
  `20260525164132_add_budget_policies.sql`.
- Recent Supabase changelog check noted the current Data API exposure change;
  current migrations explicitly grant access and enable RLS for exposed public
  tables.

## Current Product Capabilities

- Public landing pages, auth, guided onboarding, project setup, and the app
  workbench are live.
- CASS-backed recommendation, ranking, overlap, measurement, cost, release
  evidence, and retest views are live for the demo project.
- Uploaded-output pilot flow persists benchmark suites, outputs, runs,
  readiness, and issued evidence.
- Worker-backed deterministic, REST, and model-judge evaluation paths are
  implemented and tested.
- Connector secrets use redacted metadata and backend-only secret references.
- Release-gate REST and MCP surfaces are authenticated, project-scoped, and
  smoke-tested.
- Admin operations includes worker health, spend, usage, audit trail,
  retry/cancel controls, dead-letter review, and persisted workspace/project
  budget policies.

## Verification Run

Most recent local verification from this status update:

```text
uv run python -m unittest discover -s tests_service -p 'test_*.py' -v
  -> 119 tests passed

uv run python -m unittest discover -s tests -p 'test_*.py' -v
  -> 17 tests passed

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run
  -> 34 tests passed

npm --prefix web run build
  -> OK

supabase db push --linked --dry-run
  -> remote database is up to date

uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1 --service stackcert-api
  -> OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-staging.savikk129.workers.dev/ --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/hosted_uploaded_output_pilot_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev/ --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/release_gate_webhook_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev/ --project-id proj_acme_copilot
  -> OK

uv run python scripts/cloud_run_worker_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo --project-id project-e7840c42-f298-4bd9-bff --region us-central1
  -> OK
```

Live auth behavior checked through smoke tests:

- unauthenticated app API calls are denied;
- Supabase demo sign-in succeeds;
- authenticated `/api/projects`, admin overview, release-gate, and MCP calls
  succeed through Cloudflare.
- browser QA covers `/demo`, `/integrations`, authenticated demo setup, and
  mobile viewports without horizontal overflow or missing-auth failures.

## Remaining Production Work

The app is solid staging/pilot infrastructure, but still needs these before a
true production launch:

1. Finish production environment setup for the design-partner pilot: Sentry
   DSNs, uptime checks, alert routing, and Cloud Run log-based alerts.
2. Backup/restore rehearsal for Supabase Postgres and Storage artifacts.
3. Auth sender-domain setup, email templates, and invite/account lifecycle
   policy.
4. First customer-specific deployment adapter on top of the signed generic
   release-gate webhook.
5. Provider throttling observation in hosted operations after the new provider
   health admin view has real managed-run traffic.

Design-partner v1 is intentionally uploaded-output first. StackCert does not
need to host customer local models for the first deployable workflow; customer
or local models should appear as uploaded outputs, customer-hosted REST
endpoints, or a later customer-run worker.

Completed in the current implementation branch:

- Reviewed trace-import commits now turn trace previews into draft benchmark
  suites through `POST /api/projects/{project_id}/trace-imports`.
- First-pilot clarity now uses “Release report” as the primary artifact name
  and makes the demo/private-pilot boundary explicit.
- Signed generic release-gate webhook endpoint:
  `POST /api/projects/{project_id}/release-gates/webhook`.
- Provider health admin view derived from jobs, retries, dead letters, and
  usage events.
- Optional Sentry hooks for FastAPI and the React app through environment
  variables.
- Design-partner pilot checklist: `docs/21_design_partner_pilot_checklist.md`.
