# Production Hosting Setup

Last updated: 2026-05-23

This is the recommended production hosting plan for StackCert after the
temporary hosted demo. The goal is to keep costs controlled, deployment boring,
and the product credible for real customers.

## Recommended Production Stack

```text
app.stackcert.com        -> Cloudflare Pages React app
api.stackcert.com        -> Google Cloud Run FastAPI service
worker / jobs            -> Google Cloud Run Jobs or worker service
Supabase                 -> Auth, Postgres, Storage, RLS
GitHub Actions           -> CI/CD, migrations, deploys, smoke tests
Cloudflare DNS/WAF       -> domain, TLS, caching, basic protection
```

Use Cloudflare Pages for the frontend, Supabase Pro for Auth/Postgres/Storage,
and Google Cloud Run for the Python API plus workers.

## Why This Stack

- Cloudflare Pages is cheap, global, simple, and a good fit for the Vite SPA.
- Supabase keeps our Auth, Postgres, RLS, and Storage path aligned with the
  schema already in the repo.
- Cloud Run is a strong fit for FastAPI and Python worker containers.
- GitHub Actions is already the CI foundation in the repo.
- This avoids Kubernetes and heavy platform work until the product actually
  needs it.

## Domain And Cloudflare

Set up:

- Buy or confirm the production domain, ideally `stackcert.com`.
- Add the domain to Cloudflare DNS.
- Create DNS records:
  - `stackcert.com` -> marketing/landing, can point to the same Pages app at
    first.
  - `app.stackcert.com` -> Cloudflare Pages.
  - `api.stackcert.com` -> Cloud Run API.
  - `staging.stackcert.com` -> staging frontend.
  - `api-staging.stackcert.com` -> staging API.

Create a Cloudflare API token for GitHub Actions with permissions to deploy
Pages.

Required GitHub secrets or variables:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_PAGES_PROJECT_NAME
```

## Supabase

Create two Supabase projects:

```text
stackcert-staging
stackcert-prod
```

Use Supabase Pro before real users or real customer data touch production.

Auth configuration:

```text
Production Site URL:
  https://app.stackcert.com

Production Redirect URLs:
  https://app.stackcert.com/**
  https://stackcert.com/**

Staging Site URL:
  https://staging.stackcert.com

Staging Redirect URLs:
  https://staging.stackcert.com/**
```

Collect these values for each environment:

```text
SUPABASE_PROJECT_REF
SUPABASE_URL
SUPABASE_ANON_KEY or publishable key
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
SUPABASE_DB_PASSWORD
```

Rules:

- `SUPABASE_ANON_KEY` or publishable key can be used in the frontend.
- `SUPABASE_SERVICE_ROLE_KEY` must only live in backend/server/GitHub/GCP
  secrets.
- `SUPABASE_JWT_SECRET` must only live in backend/server secrets.

## Google Cloud

Create either one GCP project with separated staging/prod service names, or
preferably two projects:

```text
stackcert-staging
stackcert-prod
```

Enable required APIs:

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable iamcredentials.googleapis.com
```

Create Artifact Registry repositories:

```text
stackcert-api
stackcert-worker
```

Create runtime service accounts:

```text
stackcert-api-runtime
stackcert-worker-runtime
github-deployer
```

For GitHub deployment, prefer Workload Identity Federation instead of long-lived
JSON keys.

Required GitHub secrets or variables:

```text
GCP_PROJECT_ID_STAGING
GCP_PROJECT_ID_PROD
GCP_REGION
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
```

Use `us-central1` initially for cost/free-tier friendliness unless there is a
strong reason to optimize for another region.

## Cloud Run Services

Deploy the API:

```text
service: stackcert-api
image: Dockerfile.api
public: yes, behind api.stackcert.com
```

Required API environment:

```text
STACKCERT_ENV=production
STACKCERT_PERSISTENCE_BACKEND=supabase
STACKCERT_CORS_ORIGINS=https://app.stackcert.com,https://stackcert.com
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_JWT_SECRET
```

Deploy workers:

```text
service/job: stackcert-worker
image: same image or worker-specific image
public: no
```

Required worker environment:

```text
STACKCERT_ENV=production
STACKCERT_PERSISTENCE_BACKEND=supabase
SUPABASE_URL
SUPABASE_SECRET_KEY
```

For beta, workers can run as Cloud Run Jobs on a schedule. Later, use Pub/Sub or
Cloud Tasks for job dispatch.

## GitHub Repository And Environments

This folder should live in a real GitHub repo before production deployment.

Create GitHub environments:

```text
staging
production
```

Add secrets/variables:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF_STAGING
SUPABASE_PROJECT_REF_PROD
SUPABASE_DB_PASSWORD_STAGING
SUPABASE_DB_PASSWORD_PROD

VITE_SUPABASE_URL_STAGING
VITE_SUPABASE_URL_PROD
VITE_SUPABASE_ANON_KEY_STAGING
VITE_SUPABASE_ANON_KEY_PROD

STACKCERT_API_URL_STAGING=https://api-staging.stackcert.com
STACKCERT_API_URL_PROD=https://api.stackcert.com

CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_PAGES_PROJECT_NAME

GCP_PROJECT_ID_STAGING
GCP_PROJECT_ID_PROD
GCP_REGION
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
```

## CI/CD Workflows To Add

Keep the existing `ci.yml`, then add:

```text
deploy-staging.yml
  Trigger: push to main
  Steps:
    - run tests/typecheck/build
    - deploy Supabase migrations to staging
    - build and push API image
    - deploy API to Cloud Run staging
    - deploy worker to Cloud Run staging
    - deploy frontend to Cloudflare Pages staging
    - run deployment smoke

deploy-prod.yml
  Trigger: manual approval or release tag
  Steps:
    - run full test suite
    - deploy Supabase migrations to production
    - build and push API image
    - deploy API to Cloud Run production
    - deploy worker to Cloud Run production
    - deploy frontend to Cloudflare Pages production
    - run deployment smoke
    - run certificate gate
```

Frontend build env:

```text
VITE_ROUTER_MODE=browser
VITE_PUBLIC_BASE=/
VITE_API_BASE_URL=https://api.stackcert.com
VITE_SUPABASE_URL=<production Supabase URL>
VITE_SUPABASE_ANON_KEY=<production publishable/anon key>
```

Add a Cloudflare Pages redirect rule so React routes work:

```text
/* /index.html 200
```

For the temporary GitHub Pages source-of-truth deployment, use
`.github/workflows/deploy-pages.yml`. It builds from this repository, deploys
`web/dist` through GitHub Pages, and runs `scripts/deployment_smoke.py` after
publish.

## Production Smoke Tests

After every deploy, run:

```bash
scripts/deployment_smoke.py \
  --web-url "https://app.stackcert.com" \
  --api-url "https://api.stackcert.com" \
  --supabase-url "<production Supabase URL>" \
  --email "<smoke test user>" \
  --password "<smoke test password>"
```

Also run the certificate gate:

```bash
python scripts/certificate_gate.py \
  --base-url https://api.stackcert.com \
  --project-id proj_acme_copilot \
  --require valid \
  --mode fail
```

## Cost Controls

Set these before launch:

- GCP billing budget alerts at 50%, 80%, and 100%.
- Cloud Run API max instances, initially around `5`.
- Cloud Run worker max instances, initially around `2`.
- Worker concurrency caps.
- Per-workspace and per-run StackCert budget limits.
- Provider/API spend caps.
- Supabase usage alerts.
- Cloudflare analytics alerts.
- Invite-only signup until production behavior is stable.

Provider/model calls will probably dominate infrastructure cost, so StackCert's
own budget checks and cost-estimation workflow matter more than small hosting
differences.

## Production Usability Checklist

Before real users:

- Use `app.stackcert.com`, no hash URLs.
- Configure Cloudflare Pages routing fallback.
- Configure Supabase Auth email templates and sender domain.
- Turn on email confirmation for production.
- Add password reset flow.
- Add privacy and terms links near auth.
- Add error reporting such as Sentry.
- Add uptime checks for:
  - frontend;
  - `/api/health`;
  - auth smoke;
  - certificate status endpoint.
- Confirm CORS only allows production/staging frontend domains.
- Confirm service-role keys are never exposed to the browser.

## Required Inputs Before Implementation

To execute this setup, we need:

1. Domain name decision and DNS access.
2. Cloudflare account/domain access.
3. Supabase staging and production projects, or permission to create them.
4. GCP billing/project access, or permission to create the projects.
5. A real GitHub repository for this codebase.
6. A production smoke-test user plan.
