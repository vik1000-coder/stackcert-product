# Current Release Status

Last updated: 2026-05-25 18:35 UTC

This is the concise status page for the deployed StackCert staging system. Use
it when checking whether local code, GitHub, Supabase, Cloud Run, and
Cloudflare agree.

## Source And CI

- Repository: `vik1000-coder/stackcert-product`
- Branch: `main`
- Verified deployed application commit at the start of this audit: `e17da3c`
- Latest green GitHub Actions runs for `e17da3c`:
  - `ci`: success
  - `deploy pages`: success
  - `deploy cloudflare`: success

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
- Deployment status: verified through both GitHub Actions and direct
  `wrangler deploy` during this audit. Cloudflare version IDs change on each
  deploy even when the app bundle is unchanged; use
  `npx wrangler deployments list --name stackcert-staging` for the latest ID.
- Behavior: serves `web/dist` static assets and proxies `/api/*` plus
  `/api/mcp` to Cloud Run.

Cloud Run API:

- Service: `stackcert-api`
- Region: `us-central1`
- Latest ready revision: `stackcert-api-00017-vmj`
- Image:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:932ac14-staging-202605251701-amd64`
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
uv run python -m unittest discover tests_service -v
  -> 110 tests passed

uv run python -m unittest discover -s tests -p 'test_*.py' -v
  -> 17 tests passed

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run
  -> 6 tests passed

npm --prefix web run build
  -> OK

npm run build
  -> OK

supabase db lint
  -> OK

supabase db push --linked --dry-run
  -> remote database is up to date

uv run python scripts/gcloud_cost_preflight.py --project-id project-e7840c42-f298-4bd9-bff --region us-central1 --service stackcert-api
  -> OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev/ --api-url https://stackcert-staging.savikk129.workers.dev/ --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK

uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev/ --supabase-url https://cgwiwmfzpektpyquiveg.supabase.co --email demo@stackcert.dev --password stackcert-demo
  -> OK
```

Live auth behavior checked through smoke tests:

- unauthenticated app API calls are denied;
- Supabase demo sign-in succeeds;
- authenticated `/api/projects`, admin overview, release-gate, and MCP calls
  succeed through Cloudflare.

## Remaining Production Work

The app is solid staging/pilot infrastructure, but still needs these before a
true production launch:

1. Production observability: Sentry or equivalent, uptime checks, alert routing,
   and Cloud Run log-based alerts.
2. Backup/restore rehearsal for Supabase Postgres and Storage artifacts.
3. Auth sender-domain setup, email templates, and invite/account lifecycle
   policy.
4. Trace-import commit flow after the existing trace preview.
5. Signed generic deployment webhooks and first customer-specific deployment
   adapter.
6. Provider throttling observability beyond the current retry/dead-letter
   handling.
