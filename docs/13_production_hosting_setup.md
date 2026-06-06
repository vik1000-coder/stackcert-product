# Production Hosting Setup

Last updated: 2026-05-25

This is the recommended production hosting plan for StackCert after the
temporary hosted demo. The goal is to keep costs controlled, deployment boring,
and the product credible for real customers.

## Recommended Production Stack

```text
app.stackcert.com        -> Cloudflare Workers static assets or Pages React app
api.stackcert.com        -> Google Cloud Run FastAPI service
worker / jobs            -> Google Cloud Run Jobs or worker service
Supabase                 -> Auth, Postgres, Storage, RLS
GitHub Actions           -> CI/CD, migrations, deploys, smoke tests
Cloudflare DNS/WAF       -> domain, TLS, caching, basic protection
```

Use Cloudflare for the frontend, Supabase Pro for Auth/Postgres/Storage, and
Google Cloud Run for the Python API plus workers. The current staging app uses
Workers static assets; Pages remains a viable production option if we prefer its
project UI and preview-deploy model.

## Why This Stack

- Cloudflare Workers static assets and Pages are cheap, global, simple, and a
  good fit for the Vite SPA.
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
  - `app.stackcert.com` -> Cloudflare Workers static assets or Pages.
  - `api.stackcert.com` -> Cloud Run API.
  - `staging.stackcert.com` -> staging frontend.
  - `api-staging.stackcert.com` -> staging API.

Create a Cloudflare API token for GitHub Actions with permissions to deploy the
frontend host.

Required GitHub secrets or variables:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
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
SUPABASE_DB_PASSWORD
```

Rules:

- `SUPABASE_ANON_KEY` or publishable key can be used in the frontend.
- `SUPABASE_SERVICE_ROLE_KEY` must only live in backend/server/GitHub/GCP
  secrets.
- `SUPABASE_JWT_SECRET` is optional for the FastAPI service. If present, the
  API validates JWTs locally. If absent, the API validates bearer tokens through
  Supabase Auth using backend-only `SUPABASE_SECRET_KEY`.

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

Optional but recommended MCP machine-token environment:

```text
STACKCERT_MCP_MACHINE_TOKEN_HASHES
STACKCERT_MCP_MACHINE_TOKEN_SCOPES
STACKCERT_MCP_MACHINE_TOKEN_PROJECTS
```

Generate token hashes with `scripts/hash_mcp_machine_token.py`. Store only the
hash in Cloud Run environment variables; keep the raw token in the calling
agent/CI secret store. These tokens authenticate only the MCP endpoints, not
general app APIs.

Optional but recommended release-gate machine-token environment:

```text
STACKCERT_RELEASE_GATE_TOKEN_HASHES
STACKCERT_RELEASE_GATE_TOKEN_SCOPES
STACKCERT_RELEASE_GATE_TOKEN_PROJECTS
```

Generate release-gate token hashes with
`scripts/hash_release_gate_token.py`. These tokens authenticate only
`POST /api/projects/{project_id}/release-gates/evaluate`; keep them read-only
and project-scoped for deployment systems.

Use `us-central1` initially for cost/free-tier friendliness unless there is a
strong reason to optimize for another region.

## Cost Guardrails

The first Cloud Run staging deploy must stay intentionally small. Do not deploy
until a project-scoped budget/alert exists for the selected GCP project.

Staging defaults:

```text
region: us-central1
min instances: 0
max instances: 3
memory: 512Mi
cpu: 1
timeout: 60s
workers/jobs: disabled until API staging is healthy
Cloud SQL/GKE/GPU/VPC connector: not used
```

Run the read-only preflight before enabling APIs or deploying:

```bash
python scripts/gcloud_cost_preflight.py \
  --project-id "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --gcloud "${GCLOUD_BIN:-gcloud}"
```

If the script cannot verify a billing budget, create one in Google Cloud
Billing first. Use a small monthly project budget, currently `$50` for
StackCert staging,
with alert thresholds at 50%, 90%, and 100%. Budget alerts are notification
guardrails, not a hard spending cap, so keep Cloud Run max instances low too.

Use this helper to create the initial StackCert staging budget through `gcloud`:

```bash
python scripts/gcloud_budget_setup.py \
  --project-id "$GCP_PROJECT_ID" \
  --amount-usd 50 \
  --gcloud "${GCLOUD_BIN:-gcloud}"
```

This creates a monthly budget using `exclude-all-credits`, so alerts track gross
usage before the free-trial credit is subtracted. That is the right behavior for
staging because we want to notice when the project has consumed roughly `$50` of
Google Cloud resources, even when the trial credit is covering it.

For the current account check on 2026-05-25:

```text
creatorconsulting: billing disabled
friendlychat-8ed89: billing disabled
project-e7840c42-f298-4bd9-bff: billing enabled, StackCert staging $50 budget visible
stackcert-api Cloud Run staging URL: https://stackcert-api-oaw2bwdgyq-uc.a.run.app
```

Only deploy to a project the user explicitly selects.

## Cloud Run First Setup Walkthrough

This is the manual path to get the FastAPI service running before we automate it
in GitHub Actions. Use staging first, then repeat for production with separate
projects/secrets.

Set shell variables:

```bash
export GCP_PROJECT_ID="stackcert-staging"
export GCP_REGION="us-central1"
export ARTIFACT_REPO="stackcert"
export IMAGE_NAME="stackcert-api"
export IMAGE_TAG="$(git rev-parse --short HEAD)"
export IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
```

If `gcloud` is installed but not on `PATH`, either add it to `PATH` or export a
helper variable and substitute it in the commands below:

```bash
export GCLOUD_BIN="/path/to/google-cloud-sdk/bin/gcloud"
```

Run the cost preflight:

```bash
python scripts/gcloud_cost_preflight.py \
  --project-id "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --gcloud "${GCLOUD_BIN:-gcloud}"
```

Select the project and enable APIs:

```bash
"${GCLOUD_BIN:-gcloud}" config set project "$GCP_PROJECT_ID"

"${GCLOUD_BIN:-gcloud}" services enable run.googleapis.com
"${GCLOUD_BIN:-gcloud}" services enable artifactregistry.googleapis.com
"${GCLOUD_BIN:-gcloud}" services enable cloudbuild.googleapis.com
"${GCLOUD_BIN:-gcloud}" services enable secretmanager.googleapis.com
"${GCLOUD_BIN:-gcloud}" services enable iamcredentials.googleapis.com
```

Create one Artifact Registry Docker repository:

```bash
"${GCLOUD_BIN:-gcloud}" artifacts repositories create "$ARTIFACT_REPO" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="StackCert container images"
```

Create the API runtime service account:

```bash
"${GCLOUD_BIN:-gcloud}" iam service-accounts create stackcert-api-runtime \
  --display-name="StackCert API runtime"
```

Store runtime secrets in Secret Manager. Paste/export the values in your private
shell first; do not commit them to the repo.

```bash
printf "%s" "$SUPABASE_URL" | "${GCLOUD_BIN:-gcloud}" secrets create stackcert-supabase-url \
  --replication-policy=automatic \
  --data-file=-

printf "%s" "$SUPABASE_SERVICE_ROLE_KEY" | "${GCLOUD_BIN:-gcloud}" secrets create stackcert-supabase-secret-key \
  --replication-policy=automatic \
  --data-file=-
```

Provider connector secrets should follow the same pattern. For a connector
whose guard key is `refund_policy_guard`, set the Cloud Run runtime environment
variable `STACKCERT_GUARD_SECRET_REFUND_POLICY_GUARD` from a Secret Manager
secret. The app stores only the env-var reference in connector config; the
provider key itself must stay in Secret Manager or the runtime environment.

Or use the helper that creates a first version or rotates a new version without
printing secret values. It can read `SUPABASE_SECRET_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` from the shell, or the JSON file produced by
`supabase projects api-keys --output json`.
When the Supabase CLI returns a masked current `sb_secret` value, the helper
falls back to the legacy `service_role` key for backend-only Cloud Run use.

```bash
python scripts/cloud_run_secrets.py \
  --project-id "$GCP_PROJECT_ID" \
  --gcloud "${GCLOUD_BIN:-gcloud}" \
  --supabase-project-ref "$SUPABASE_PROJECT_REF" \
  --service-account-email "stackcert-api-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
```

Grant the runtime service account access to those secrets:

```bash
export API_RUNTIME_SA="stackcert-api-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

for secret in \
  stackcert-supabase-url \
  stackcert-supabase-secret-key
do
  "${GCLOUD_BIN:-gcloud}" secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${API_RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

Build and push the API image:

```bash
"${GCLOUD_BIN:-gcloud}" auth configure-docker "${GCP_REGION}-docker.pkg.dev"
docker build -f Dockerfile.api -t "$IMAGE_URI" .
docker push "$IMAGE_URI"
```

Deploy the API service:

```bash
"${GCLOUD_BIN:-gcloud}" run deploy stackcert-api \
  --image="$IMAGE_URI" \
  --region="$GCP_REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="$API_RUNTIME_SA" \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=40 \
  --timeout=60 \
  --cpu-throttling \
  --min-instances=0 \
  --max-instances=3 \
  --set-env-vars="STACKCERT_ENV=production,STACKCERT_PERSISTENCE_BACKEND=supabase,STACKCERT_ENABLE_DEMO_WORKSPACE=true,STACKCERT_CORS_ORIGINS=https://staging.stackcert.com" \
  --set-secrets="SUPABASE_URL=stackcert-supabase-url:latest,SUPABASE_SECRET_KEY=stackcert-supabase-secret-key:latest"
```

`STACKCERT_ENABLE_DEMO_WORKSPACE=true` is for staging/demo deployments only.
Leave it unset or `false` for a real production tenant so the seeded
`proj_acme_copilot` walkthrough is not exposed alongside customer projects.

If the runtime should accept MCP-only machine callers, include the hashed token
configuration in `--set-env-vars` or set it with a separate
`gcloud run services update` call:

```bash
python scripts/hash_mcp_machine_token.py --token-id ci

"${GCLOUD_BIN:-gcloud}" run services update stackcert-api \
  --region="$GCP_REGION" \
  --update-env-vars="STACKCERT_MCP_MACHINE_TOKEN_HASHES=ci:<sha256-token-hash>,STACKCERT_MCP_MACHINE_TOKEN_SCOPES=ci=mcp:read"
```

Verify the deployed API:

```bash
export API_URL="$("${GCLOUD_BIN:-gcloud}" run services describe stackcert-api \
  --region="$GCP_REGION" \
  --format='value(status.url)')"

curl -fsS "${API_URL}/api/health"
curl -i -sS "${API_URL}/api/workspaces" | head
```

The health check should return `200`; protected app routes should reject
requests without a valid Supabase bearer token.

For a repeatable API smoke, use:

```bash
python scripts/cloud_run_api_smoke.py --api-url "$API_URL"
```

For a hosted MCP machine-token smoke, use:

```bash
python scripts/mcp_client_smoke.py \
  --api-url "$API_URL" \
  --bearer-token "<raw-mcp-machine-token>"
```

Use `mcp:read|mcp:write` only for automation that should be able to queue
measurement-plan jobs. Keep deployment/release tools read-only by default.

To also verify authenticated routes and MCP discovery, set
`STACKCERT_SMOKE_SUPABASE_ANON_KEY` to the browser-safe publishable/anon key and
pass a Supabase smoke user:

```bash
python scripts/cloud_run_api_smoke.py \
  --api-url "$API_URL" \
  --supabase-url "$SUPABASE_URL" \
  --email "$STACKCERT_SMOKE_EMAIL" \
  --password "$STACKCERT_SMOKE_PASSWORD"
```

Once the raw `run.app` URL is healthy, map `api-staging.stackcert.com` or
`api.stackcert.com` to the service through Cloud Run custom domains or
Cloudflare. Update `STACKCERT_CORS_ORIGINS` and frontend `VITE_API_BASE_URL`
after the domain is active.

For workers, use Cloud Run Jobs after the API deploy is green. The current
entrypoint is `python -m stackcert_service.worker`; it can claim runnable jobs
across all persisted projects and exits cleanly when the queue is empty. Use
the same image, a separate `stackcert-worker-runtime` service account, no
public ingress, one task, parallelism `1`, max retries `0`, and the same
Supabase secret bindings.

Current staging worker:

```text
job: stackcert-worker
region: us-central1
service account: stackcert-worker-runtime@project-e7840c42-f298-4bd9-bff.iam.gserviceaccount.com
image: us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:0b932c5-staging-202605250439-amd64
command: python
args: -m stackcert_service.worker
tasks: 1
parallelism: 1
max retries: 0
task timeout: 900s
```

Deploy or update the worker job:

```bash
export WORKER_RUNTIME_SA="stackcert-worker-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

"${GCLOUD_BIN:-gcloud}" iam service-accounts create stackcert-worker-runtime \
  --project="$GCP_PROJECT_ID" \
  --display-name="StackCert worker runtime" || true

for secret in \
  stackcert-supabase-url \
  stackcert-supabase-secret-key
do
  "${GCLOUD_BIN:-gcloud}" secrets add-iam-policy-binding "$secret" \
    --project="$GCP_PROJECT_ID" \
    --member="serviceAccount:${WORKER_RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done

"${GCLOUD_BIN:-gcloud}" run jobs deploy stackcert-worker \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --image="$IMAGE_URI" \
  --service-account="$WORKER_RUNTIME_SA" \
  --tasks=1 \
  --parallelism=1 \
  --max-retries=0 \
  --task-timeout=900s \
  --cpu=1 \
  --memory=512Mi \
  --command=python \
  --args=-m,stackcert_service.worker \
  --set-env-vars="STACKCERT_ENV=production,STACKCERT_PERSISTENCE_BACKEND=supabase,STACKCERT_ENABLE_DEMO_WORKSPACE=true,STACKCERT_WORKER_ALL_PROJECTS=true,STACKCERT_WORKER_MAX_JOBS=5,STACKCERT_WORKER_LEASE_SECONDS=900" \
  --set-secrets="SUPABASE_URL=stackcert-supabase-url:latest,SUPABASE_SECRET_KEY=stackcert-supabase-secret-key:latest"
```

Verify the worker job:

```bash
python scripts/cloud_run_worker_smoke.py \
  --api-url "$API_URL" \
  --supabase-url "$SUPABASE_URL" \
  --email "$STACKCERT_SMOKE_EMAIL" \
  --password "$STACKCERT_SMOKE_PASSWORD" \
  --project-id "$GCP_PROJECT_ID" \
  --region "$GCP_REGION"
```

The current staging smoke queued `job_f25bbd5cb8ed`, executed
`stackcert-worker-vps7b`, and verified final status `complete`.

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
STACKCERT_ENABLE_DEMO_WORKSPACE optional; staging/demo only
STACKCERT_CORS_ORIGINS=https://app.stackcert.com,https://stackcert.com
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_JWT_SECRET optional
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
STACKCERT_WORKER_ALL_PROJECTS=true
STACKCERT_WORKER_MAX_JOBS=5
STACKCERT_WORKER_LEASE_SECONDS=900
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
    - deploy frontend to Cloudflare Workers static assets staging
    - run deployment smoke

deploy-prod.yml
  Trigger: manual approval or release tag
  Steps:
    - run full test suite
    - deploy Supabase migrations to production
    - build and push API image
    - deploy API to Cloud Run production
    - deploy worker to Cloud Run production
    - deploy frontend to Cloudflare Workers static assets or Pages production
    - run deployment smoke
    - run release-evidence gate
```

Frontend build env:

```text
VITE_ROUTER_MODE=browser
VITE_PUBLIC_BASE=/
VITE_API_BASE_URL=https://api.stackcert.com
VITE_SUPABASE_URL=<production Supabase URL>
VITE_SUPABASE_ANON_KEY=<production publishable/anon key>
```

For the current Cloudflare Workers static-assets deploy from the monorepo, use
the repo-root build settings:

```text
Path: /
Build command: npm ci && npm run build
Deploy command: npx wrangler deploy
Non-production branch deploy command: leave blank, or keep the Cloudflare default
```

Set these Cloudflare build environment variables:

```text
VITE_ROUTER_MODE=browser
VITE_PUBLIC_BASE=/
VITE_API_BASE_URL=
VITE_SUPABASE_URL=https://cgwiwmfzpektpyquiveg.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon/publishable key>
```

Leave `VITE_API_BASE_URL` blank for the Cloudflare Workers deployment. The
root Worker proxies `/api/*` and `/api/mcp` to Cloud Run through
`STACKCERT_API_ORIGIN`, which keeps browser API calls same-origin at
`https://stackcert-staging.savikk129.workers.dev`.

The build command uses the root wrapper to install and build `web` with its own
lockfile. The deploy command relies on the root `wrangler.jsonc`, which serves
`./web/dist` as Workers static assets, invokes the Worker first for `/api/*`,
and uses `single-page-application` fallback routing for React routes.

Do not add a `_redirects` SPA fallback for the Workers static-assets deploy.
Cloudflare rejected that rule as an infinite loop; `wrangler.jsonc` already
handles React routes with:

```json
"assets": {
  "binding": "ASSETS",
  "directory": "./web/dist",
  "run_worker_first": ["/api", "/api/*"],
  "not_found_handling": "single-page-application"
}
```

For the GitHub-controlled Cloudflare CD path, use
`.github/workflows/deploy-cloudflare.yml`. It runs after `ci` succeeds on
`main`, deploys with a scoped `CLOUDFLARE_API_TOKEN`, and runs
`scripts/deployment_smoke.py` plus `scripts/mcp_client_smoke.py` against the web
app, same-origin Cloudflare API proxy, Supabase Auth, and authenticated MCP
release-evidence tool path:

```text
web: https://stackcert-staging.savikk129.workers.dev/
api: https://stackcert-staging.savikk129.workers.dev/
auth: https://cgwiwmfzpektpyquiveg.supabase.co
```

GitHub secrets and variables currently required:

```text
Secrets:
CLOUDFLARE_API_TOKEN
VITE_SUPABASE_ANON_KEY
STACKCERT_SMOKE_EMAIL
STACKCERT_SMOKE_PASSWORD

Variables:
CLOUDFLARE_ACCOUNT_ID=2f24b5308743a217ee4b4641246fd5b8
VITE_SUPABASE_URL=https://cgwiwmfzpektpyquiveg.supabase.co
```

`VITE_API_BASE_URL` may still be used by the fallback GitHub Pages workflow,
but the Cloudflare deployment overrides it to an empty same-origin value.

For the fallback GitHub Pages deployment, use
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

Also run the release-evidence gate. The current script name remains
`certificate_gate.py` for compatibility with existing API routes:

```bash
python scripts/certificate_gate.py \
  --base-url https://api.stackcert.com \
  --project-id proj_acme_copilot \
  --require valid \
  --mode fail
```

## Cost Controls

Set these before launch:

- GCP billing budget alerts at 50%, 90%, and 100%.
- Cloud Run API max instances, initially around `5`.
- Cloud Run staging API max instances, currently `3`; raise only after the
  budget and traffic profile are clear.
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

## Design-Partner Observability

The first deployable customer posture is a design-partner uploaded-output
pilot. Staging now has health uptime checks, log-based alert policies, and a
Supabase schema restore rehearsal. Complete or extend these before real
customer artifacts:

- Release identity: set `STACKCERT_RELEASE_VERSION` on Cloud Run and
  `VITE_STACKCERT_RELEASE_VERSION` at build time.
- Error reporting: Sentry is intentionally skipped for the current hardening
  pass; add `SENTRY_DSN`/`VITE_SENTRY_DSN` only when the team chooses Sentry or
  another customer-safe error-reporting owner.
- Cloud Run log-based alerts:
  - API 5xx responses on `stackcert-api`;
  - worker dead-letter events or failed `stackcert-worker` executions;
  - repeated provider `rate_limited`, `timeout`, or `provider_unavailable`
    errors;
  - release-gate or release-gate webhook errors.
- Alert routing:
  - staging alert policies currently route to notification channel
    `projects/project-e7840c42-f298-4bd9-bff/notificationChannels/12163037838207638915`;
  - verify the email channel with Google Cloud if prompted;
  - record the support owner, escalation channel, response window, and rollback
    contact.
- Uptime checks:
  - direct Cloud Run `/api/health`;
  - Cloudflare same-origin `/api/health`;
  - authenticated `/api/projects` with the smoke user, once a credentialed
    monitor is approved;
  - release-gate evaluate call with the demo project, once a safe monitor
    secret is approved.
- Backup/restore rehearsal:
  - staging full restore rehearsal tooling is available at
    `scripts/supabase_restore_rehearsal.py`;
  - latest run restored `public,private,storage` plus Storage metadata into
    disposable `postgres:17-alpine`;
  - before paid production, export Supabase Postgres and Storage backup
    metadata;
  - restore to a non-production target;
  - verify a workspace, project, release report, artifact metadata, audit event,
    and private artifact can be read;
  - record the evidence in `docs/21_design_partner_pilot_checklist.md`,
    `artifacts/design-partner-ops-evidence.json`, or the internal launch
    tracker.

## Production Usability Checklist

Before real users:

- Use `app.stackcert.com`, no hash URLs.
- Configure Cloudflare SPA fallback routing.
- Configure Supabase Auth email templates and sender domain.
- Turn on email confirmation for production.
- Add password reset flow.
- Add privacy and terms links near auth.
- Add error reporting such as Sentry.
- Add uptime checks for:
  - frontend;
  - `/api/health`;
  - auth smoke;
  - release-evidence status endpoint.
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
