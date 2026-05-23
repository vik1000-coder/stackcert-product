# Supabase Backend And Hosted Web Deployment

Last verified: 2026-05-23

This document describes the current playable hosted deployment. Supabase runs
the free-tier Auth/API backend, while GitHub Pages serves the static Vite app.
The fuller production path remains FastAPI plus workers on a general compute
platform.

## Current Hosted Demo

Public app:

```text
https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in
```

API:

```text
https://cgwiwmfzpektpyquiveg.supabase.co/functions/v1/stackcert-api
```

Supabase project:

```text
cgwiwmfzpektpyquiveg
```

Demo account:

```text
Email: demo@stackcert.dev
Password: stackcert-demo
```

GitHub Pages repo:

```text
https://github.com/vik1000-coder/stackcert-product
```

Do not put service-role keys, provider keys, or customer secrets in this file.

## What Supabase Hosts Today

The free-tier deployment uses:

- Supabase Auth for sign-in/sign-up and JWT sessions.
- Supabase Edge Function `stackcert-api` for a playable authenticated API.

The Edge Function mirrors the main product API surface enough for demos:

- overview, ranking, co-failure, measurements, costs, certificate, drift;
- setup catalogs, custom behavior creation, import preview, guard connectors;
- jobs, worker-run simulation, certificate issue/signoff;
- MCP manifest/RPC and agent-platform integration metadata.

The Edge Function verifies Supabase Auth tokens before serving app data. Public
exceptions are limited to health and export endpoints.

## What GitHub Pages Hosts Today

GitHub Pages serves the static Vite build from this source repository. The
`.github/workflows/deploy-pages.yml` workflow runs tests, builds `web/dist`,
deploys the Pages artifact, and then runs a deployed smoke test.

The build is configured with:

- `VITE_ROUTER_MODE=hash`, so deep links work on a static host;
- `VITE_PUBLIC_BASE=/stackcert-product/`, so assets resolve correctly under the
  Pages project path;
- `VITE_API_BASE_URL` pointing at the Supabase Edge Function API;
- `VITE_SUPABASE_URL` and a publishable/anon key for Supabase Auth.

Supabase Storage was tried for the static app, but its public object endpoint
served `index.html` as `text/plain` with sandbox headers, which made browsers
show raw HTML. Supabase Edge Functions applied the same document sandboxing
behavior. GitHub Pages is therefore the working public web entrypoint while
Supabase remains the backend.

## What Supabase Does Not Host

Supabase free tier does not host the Python FastAPI app or long-running Python
workers. The production path is still:

- FastAPI service for CASS orchestration, authorization, certificates, and
  provider-safe API contracts;
- worker service for durable evaluation jobs, provider retries, budgets, and
  artifact writes;
- Supabase Postgres/Auth/Storage as the system of record.

The hosted Edge Function should be treated as a demo/API-preview layer, not as
the final provider-grade worker backend.

## Build For Static Hosting

The hosted SPA uses hash routing and relative asset URLs.

```bash
cd stackcert_product/web

export SUPABASE_PROJECT_REF=cgwiwmfzpektpyquiveg
export VITE_SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
export VITE_API_BASE_URL="${VITE_SUPABASE_URL}/functions/v1/stackcert-api"
export VITE_SUPABASE_ANON_KEY="<publishable-or-anon-key>"

VITE_ROUTER_MODE=hash \
VITE_PUBLIC_BASE=./ \
npm run build
```

Only use a publishable/anon key in `VITE_SUPABASE_ANON_KEY`. Never build the
frontend with a service-role key.

## Deploy Edge Function

```bash
cd stackcert_product
supabase functions deploy stackcert-api \
  --project-ref cgwiwmfzpektpyquiveg \
  --no-verify-jwt \
  --use-api
```

The function is deployed with `--no-verify-jwt` so it can keep `/api/health`
and export routes public while enforcing Supabase Auth manually for app routes.

## Deploy Static App To GitHub Pages

The source-of-truth repo is:

```text
https://github.com/vik1000-coder/stackcert-product
```

Push to `main` or run the `deploy pages` workflow manually. The workflow:

- installs Python dependencies;
- runs Python core and service tests;
- installs frontend dependencies;
- runs TypeScript checks and Vitest;
- builds the Vite app for GitHub Pages;
- uploads the Pages artifact;
- deploys Pages;
- runs `scripts/deployment_smoke.py` against the deployed URL.

Required repository variables:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
```

Required repository secrets:

```text
VITE_SUPABASE_ANON_KEY
STACKCERT_SMOKE_EMAIL
STACKCERT_SMOKE_PASSWORD
```

## Demo Auth User

The hosted demo has a confirmed Supabase Auth user:

```text
demo@stackcert.dev
```

If it needs to be recreated, use the Supabase Auth Admin API with a service-role
key from a private shell or dashboard. Verify with a password-token request
using the publishable/anon key.

## Deployment Smoke Test

Run the deployment smoke script after every hosted deploy:

```bash
cd stackcert_product

export STACKCERT_SMOKE_SUPABASE_ANON_KEY="<publishable-or-anon-key>"

scripts/deployment_smoke.py \
  --web-url "https://vik1000-coder.github.io/stackcert-product/" \
  --api-url "https://cgwiwmfzpektpyquiveg.supabase.co/functions/v1/stackcert-api" \
  --supabase-url "https://cgwiwmfzpektpyquiveg.supabase.co" \
  --email demo@stackcert.dev \
  --password stackcert-demo
```

The smoke test checks:

- public web shell loads;
- public health endpoint works;
- app API rejects unauthenticated calls;
- Supabase Auth password sign-in works;
- authenticated project read returns the seeded demo project.

## Local/CI Deployment Contract Tests

Deployment readiness is covered by:

```bash
uv run --with pytest pytest tests_service/test_deployment_readiness.py -q
```

The test asserts that:

- the frontend supports hash routing for static hosting;
- Auth supports both sign-in and sign-up;
- the Edge Function has an auth gate and demo API routes;
- CI builds the hosted static configuration;
- the deployment smoke script covers web, API, and Auth.

## Release Checklist For This Target

- `uv run --with pytest pytest tests_service tests -q`
- `cd web && npm run typecheck`
- `cd web && npm test -- --run`
- `cd web && npm run build`
- hosted hash build with real Supabase URL and publishable key
- `supabase db lint --local`
- `supabase db advisors --local`
- `supabase functions deploy stackcert-api ...`
- publish `web/dist` to GitHub Pages
- `scripts/deployment_smoke.py ...`
- browser-load landing and auth routes at desktop and mobile widths

## Known Limitations

- Supabase Storage and Edge Functions sandbox document-shaped HTML responses on
  this project, so they are not used as the public web entrypoint.
- GitHub Pages is the current web host; Supabase remains the Auth/API backend.
- Edge Function state is demo-oriented and not a durable replacement for the
  Python API/worker path.
- Remote Postgres migrations are not part of this free-tier demo deploy unless
  the project is linked or a remote DB password/connection string is provided.
- The certificate remains a scoped comparative-risk artifact. It does not
  guarantee the AI system is safe, compliant, or free of harmful behavior.
