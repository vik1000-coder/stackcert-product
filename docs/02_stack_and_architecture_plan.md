# StackCert Stack And Architecture Plan

## Stack Decision

Use:

- Frontend: React + Vite + TypeScript.
- API: FastAPI + Pydantic.
- Data/auth/storage: Supabase Postgres, Supabase Auth, Supabase Storage.
- Compute: Cloud Run API service plus Cloud Run worker service.
- CI/CD: GitHub Actions.

This keeps local development light while giving the product a credible path to
multi-tenant SaaS, private customer deployments, long-running jobs, audit logs,
and cost-aware scale.

## Current Supabase Notes

Checked on 2026-05-24:

- Supabase CLI installed locally: `2.101.0`.
- Current Supabase docs/changelog call out:
  - Postgres is the core managed database.
  - Auth integrates with JWTs and RLS.
  - RLS must be enabled for tables in exposed schemas.
  - New table exposure to the Data API has changed recently, so access grants
    and RLS must be deliberate.
  - Storage supports private buckets, RLS-backed access, resumable upload, and
    S3-compatible paths.

Implementation rule:

- Treat Supabase as the system of record, but do not put release-evidence business
  logic in the browser or in database-only functions.
- Keep CASS math and release-evidence issuance in the Python backend.

## Current Implementation State

The local product stack now includes:

- React/Vite frontend with public pages and authenticated workbench routes.
- FastAPI service with CASS-backed demo and uploaded-output pilot APIs.
- Supabase migrations and persistence helpers for workspaces, projects,
  benchmark suites, custom behaviors, guard connectors, jobs, usage events,
  pilot runs, issued evidence, and signoffs.
- MCP routes for release-evidence status, theory cards, measurement
  recommendations, integration guides, and deployment-review prompts.
- Supabase Edge Function demo API deployed for the temporary hosted demo.

The production target remains unchanged: deploy the Python FastAPI API and
worker to Cloud Run, keep Supabase as system of record, and serve the frontend
from a production static host. The hosted Supabase Edge Function should not
become the production CASS runtime.

## Repository Layout

Target structure:

```text
stackcert_product/
  stackcert/                  # Python CASS core package
  stackcert_service/          # FastAPI app
    api/
    auth/
    db/
    jobs/
    schemas/
    services/
  web/                        # React + Vite + TypeScript
    src/
      app/
      features/
      lib/
      routes/
      styles/
      test/
  supabase/
    migrations/
    seed.sql
    config.toml
    tests/
  .github/
    workflows/
  docs/
  design_reference/
  tests/
  local_data/                 # local-only artifacts, gitignored
```

The existing research apparatus outside `stackcert_product/` remains separate.

## Runtime Architecture

### Production Target

```text
Browser
  |
  | Supabase Auth PKCE session
  v
React/Vite app
  |
  | HTTP JSON with Supabase JWT
  v
FastAPI API on Cloud Run
  |
  | validates JWT, applies app RBAC
  v
Supabase Postgres + Storage
  |
  | job rows / artifacts
  v
Cloud Run worker service
  |
  | Python calls
  v
StackCert CASS engine + safety-check/model adapters
```

### Current Hosted Demo

```text
Browser
  |
  | Supabase Auth session
  v
Vite static app on GitHub Pages
  |
  | HTTP JSON with Supabase JWT
  v
Supabase Edge Function: stackcert-api
  |
  | verifies JWT through Supabase Auth
  v
Playable demo API surface
```

This deployment is useful for demos and product exploration. It is not the
final provider-grade worker runtime because the free-tier backend does not host
the Python FastAPI service or long-running Python evaluation workers. See
`12_supabase_free_tier_deployment.md`.

Frontend responsibilities:

- Public landing page.
- Authenticated app shell.
- Data fetching and caching.
- Tables, charts, forms, filters, selected states.
- Upload UX and signed upload handoff.
- Display cost estimates and job status.

API responsibilities:

- Validate auth tokens.
- Enforce workspace/project authorization.
- Manage API contracts and write audit events.
- Orchestrate CASS engine calls.
- Issue release evidence and export artifacts.
- Create jobs and manage job state.
- Protect service-role access to Postgres and Storage.

Worker responsibilities:

- Execute long-running evaluations.
- Respect provider rate limits and workspace budgets.
- Retry transient failures safely.
- Write outputs, measurements, usage events, and job status.
- Avoid blocking the API.

Supabase responsibilities:

- Auth identity.
- Relational state.
- Workspace membership and RLS defense in depth.
- Private object storage for uploads and artifacts.
- Local development environment via Supabase CLI.

## Frontend Architecture

Use React + Vite + TypeScript.

Libraries:

- React Router for public and app routes.
- TanStack Query for server state.
- React Hook Form + Zod for setup/config forms.
- CSS variables plus CSS modules for the design system.
- Vitest + React Testing Library for component tests.
- Playwright for browser/e2e tests.
- Optional Radix primitives for dialogs, menus, popovers, sliders, and tabs.

Avoid:

- Next.js as the default. SSR is not needed for the authenticated workbench.
- Tailwind as the first styling layer. The supplied design has precise custom
  tokens and bespoke charts.
- Heavy charting libraries until custom SVG becomes a bottleneck.

Routes:

```text
/                         public landing
/pricing                  public pricing or anchored section
/security                 public security posture
/docs                     docs/methodology entry
/auth/sign-in
/auth/sign-up
/app/:workspaceId/:projectId/overview
/app/:workspaceId/:projectId/ranking
/app/:workspaceId/:projectId/co-failure
/app/:workspaceId/:projectId/measurements
/app/:workspaceId/:projectId/certificate
/app/:workspaceId/:projectId/drift
/app/:workspaceId/:projectId/setup
/app/:workspaceId/:projectId/costs
```

## Backend Architecture

Use FastAPI.

Libraries:

- Pydantic v2 for request/response models.
- SQLAlchemy 2.x or SQLModel for Postgres access.
- Alembic only if we maintain non-Supabase migrations outside Supabase CLI.
  Prefer Supabase migrations as the source of truth.
- httpx for provider/guard calls.
- pytest + httpx for API tests.
- structlog or standard JSON logging.
- OpenTelemetry instrumentation later.

API groups:

```text
/api/health
/api/auth/session
/api/workspaces
/api/projects
/api/benchmark-suites
/api/custom-behaviors
/api/guards
/api/stacks
/api/runs
/api/jobs
/api/certificates
/api/costs
/api/drift
/api/integrations
/api/mcp
/api/mcp/manifest
/api/mcp/rpc
```

The API should expose display-ready data for the UI but keep raw artifacts in
Storage. Expensive aggregations should be precomputed into run summary tables.

## Data Flow

### Seeded Demo Flow

1. Load existing JSONL examples and safety-check outputs.
2. Persist workspace/project/run summaries into Supabase.
3. Store source artifacts in private Storage.
4. Compute recommendation, option ranking, overlap analysis, test plan, and
   release evidence with Python core.
5. Serve the app screens from API endpoints.

### Customer Flow

1. User creates project.
2. User picks built-in example suites or uploads/custom-creates behaviors.
3. User connects candidate safety checks and defines candidate combinations.
4. API estimates cost and creates an evaluation run.
5. Worker evaluates missing safety-check outputs.
6. API computes CASS summaries and release-evidence state.
7. User queues targeted tests or issues release evidence.
8. Drift signals trigger retest jobs.

## API Shape

Key endpoints:

```text
GET  /api/workspaces
POST /api/workspaces
GET  /api/projects/:projectId
POST /api/projects

GET  /api/projects/:projectId/benchmark-suites
POST /api/projects/:projectId/benchmark-suites
POST /api/projects/:projectId/custom-behaviors

GET  /api/projects/:projectId/guards
POST /api/projects/:projectId/guards
GET  /api/projects/:projectId/stacks
POST /api/projects/:projectId/stacks

POST /api/projects/:projectId/runs
GET  /api/runs/:runId
GET  /api/runs/:runId/overview
GET  /api/runs/:runId/ranking
GET  /api/runs/:runId/correlations
GET  /api/runs/:runId/measurements
POST /api/runs/:runId/measurement-plans

GET  /api/runs/:runId/certificate
POST /api/runs/:runId/certificate/issue
GET  /api/certificates/:certificateId/export.json
GET  /api/certificates/:certificateId/export.md
GET  /api/certificates/:certificateId/export.pdf

GET  /api/projects/:projectId/drift
POST /api/projects/:projectId/recertify

GET  /api/projects/:projectId/costs/estimate
GET  /api/runs/:runId/costs
```

## Scaling Model

Keep the API stateless:

- Any instance can serve any request.
- Sessions come from Supabase Auth.
- State lives in Postgres and Storage.
- Long jobs go to workers.

Scale expensive work separately:

- API Cloud Run: high concurrency, low CPU/memory.
- Worker Cloud Run: lower concurrency, provider-aware rate limits.
- Job rows in Postgres for MVP.
- Move to Cloud Tasks, Pub/Sub, Redis/RQ, or a managed queue when throughput
  requires it.

Cost controls:

- Workspace-level monthly budget.
- Per-provider rate limits.
- Per-run max examples and max measurements.
- Cancellation and pause controls.
- Token/call estimates before submission.
- Actual usage events written by workers.

## Deployment Environments

Use three environments:

- Local: Supabase CLI, local API, local Vite.
- Preview: per-PR Cloud Run/API and frontend preview when practical, against a
  preview Supabase branch or isolated test project.
- Production: Cloud Run API/worker, Supabase project, private storage buckets.

Environment variables:

- Browser only gets Supabase public URL and publishable key.
- API gets Supabase URL, JWT secret or JWKS config, service role secret, storage
  bucket names, and provider secret references.
- Worker gets API/service DB access and provider secret references.
- Never expose service role or provider secrets to the frontend.
