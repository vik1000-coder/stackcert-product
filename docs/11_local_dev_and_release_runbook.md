# Local Development And Release Runbook

This runbook is the practical path from a fresh clone to a deployable StackCert
build. It assumes this directory is the application root.

## Local API

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
python -m uvicorn stackcert_service.main:app --host 127.0.0.1 --port 8000 --reload
```

The API prefers the real CASS research artifacts when they exist at the parent
workspace paths. If they are absent, it falls back to the checked-in
`demo_data/` fixture so the app still runs in CI and clean clones.

## Local Web App

```bash
cd web
npm ci
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173`. Without Supabase environment variables, the app
uses local demo mode. With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the
sign-in route uses Supabase Auth and forwards the access token to the API.

## Supabase

```bash
supabase start
supabase db reset --local --yes
supabase db lint --local
supabase db advisors --local
supabase db query --local --file supabase/tests/rls_smoke.sql
```

The reset requires Docker. The local migration creates private storage buckets,
RLS-protected product tables, and server-side grants for the API persistence
path.

By default the API uses in-memory demo persistence so tests and clean clones do
not require Supabase credentials. To use local Supabase for custom behavior and
job persistence, run the API with:

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SECRET_KEY="$(supabase status -o env | awk -F= '/^SECRET_KEY=/{gsub(/"/, "", $2); print $2; exit}')"
export STACKCERT_PERSISTENCE_BACKEND=supabase
python -m uvicorn stackcert_service.main:app --host 127.0.0.1 --port 8000 --reload
```

Use `SUPABASE_SECRET_KEY` only in backend/server environments. The frontend
should receive only the publishable/anon key through `VITE_SUPABASE_ANON_KEY`.
In production mode, the API validates bearer tokens with `SUPABASE_JWT_SECRET`
when provided. If it is not provided, it validates tokens through Supabase Auth
using `SUPABASE_URL` and backend-only `SUPABASE_SECRET_KEY`.

## Hosted Demo

The current playable deploy is documented in
`docs/15_current_state_and_next_steps.md`. The older Supabase Edge Function /
GitHub Pages path is documented in `docs/12_supabase_free_tier_deployment.md`
as a fallback.

Public app:

```text
https://stackcert-staging.savikk129.workers.dev/auth/sign-in
```

The hosted target uses:

- Cloudflare Workers static assets for the static Vite app;
- `VITE_ROUTER_MODE=browser` for clean routes;
- `VITE_PUBLIC_BASE=/` for root-hosted assets;
- Supabase Auth for sign-in/sign-up;
- Cloud Run FastAPI/CASS service for the API.

Run this after hosted deploys:

```bash
export STACKCERT_SMOKE_SUPABASE_ANON_KEY="<publishable-or-anon-key>"
scripts/deployment_smoke.py \
  --web-url "https://stackcert-staging.savikk129.workers.dev/" \
  --api-url "https://stackcert-api-oaw2bwdgyq-uc.a.run.app" \
  --supabase-url "https://cgwiwmfzpektpyquiveg.supabase.co" \
  --email demo@stackcert.dev \
  --password stackcert-demo
```

## Verification

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python -m unittest discover -s tests_service -p 'test_*.py' -v

cd web
npm run typecheck
npm test -- --run
npm run build
VITE_ROUTER_MODE=hash VITE_PUBLIC_BASE=./ \
  VITE_API_BASE_URL=https://example.invalid/functions/v1/stackcert-api \
  VITE_SUPABASE_URL=https://example.supabase.co \
  VITE_SUPABASE_ANON_KEY=example \
  npm run build
```

With the API running:

```bash
python scripts/smoke_api.py http://127.0.0.1:8000
```

Deployment systems and external agent platforms should use the machine-readable
release-evidence gate endpoint instead of scraping UI state. Some endpoint and
script names still use `certificate` for backwards compatibility, but product
copy should describe the result as scoped release evidence.

```bash
curl http://127.0.0.1:8000/api/projects/proj_acme_copilot/certificate-status
curl http://127.0.0.1:8000/api/integrations/agent-platforms
python scripts/certificate_gate.py \
  --base-url http://127.0.0.1:8000 \
  --project-id proj_acme_copilot \
  --require valid \
  --mode fail
```

MCP-compatible clients should use `/api/mcp`; `/api/mcp/rpc` remains available
for compatibility with the app's JSON-RPC tests.

```bash
curl http://127.0.0.1:8000/api/mcp/manifest
curl -X POST http://127.0.0.1:8000/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":"init-1","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"local"}}}'
curl -X POST http://127.0.0.1:8000/api/mcp/rpc \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":"theory-1","method":"resources/read","params":{"uri":"stackcert://runs/real_main_2000/theory-card"}}'
```

The managed-run foundation exposes local job endpoints:

```bash
curl http://127.0.0.1:8000/api/projects/proj_acme_copilot/jobs
curl -X POST http://127.0.0.1:8000/api/projects/proj_acme_copilot/evaluation-jobs \
  -H 'content-type: application/json' \
  -d '{"guard_ids":["lexical_guard","rules_policy"],"examples_per_cell":2,"seed":7,"adapter_mode":"deterministic_fixture"}'
```

These jobs stay in-memory when `STACKCERT_PERSISTENCE_BACKEND=memory` or when
Supabase credentials are absent in `auto` mode. With `SUPABASE_URL`,
`SUPABASE_SECRET_KEY`, and `STACKCERT_PERSISTENCE_BACKEND=supabase`, custom
behavior drafts and job records persist through Supabase.

## Container Builds

```bash
docker build -f Dockerfile.api -t stackcert-api:local .
docker build -f web/Dockerfile -t stackcert-web:local web
```

The API image includes the portable fixture data and expects production
deployments to provide Supabase and artifact storage settings through
environment variables. The API image listens on `PORT`, defaulting to `8080`,
which matches Cloud Run. The web image serves the static Vite build through
nginx.

## Release Gates

- Python core and service tests pass.
- Frontend typecheck, unit tests, and production build pass.
- Supabase migration resets locally with Docker.
- `supabase db lint --local`, `supabase db advisors --local`, and
  `supabase/tests/rls_smoke.sql` pass.
- Security workflow runs secret scanning, Python dependency audit, and npm audit.
- Smoke script passes against the deployed API.
- Deployment smoke passes against the hosted Supabase Auth/API/web target when
  releasing the free-tier demo.
- Release-evidence gate returns `ok: true` for the deployment target or intentionally
  runs in `warn` mode.
- A release-evidence export includes scoped limitations and retest triggers.
