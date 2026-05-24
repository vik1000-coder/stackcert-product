# StackCert Phased Development Plan

This plan is intentionally iterative. Each phase should produce a usable slice,
run tests, and leave the codebase deployable.

## Implementation Status As Of 2026-05-24

The project has moved beyond the original planning pass.

Completed or substantially implemented:

- Phase 0 planning/design ingestion.
- Phase 1 app foundation: React/Vite app, FastAPI service, Supabase migrations,
  local/CI checks, Dockerfiles, and GitHub Actions.
- Phase 2 landing/auth shell: public pages, auth routes, app shell, and hosted
  GitHub Pages demo with Supabase Auth.
- Phase 3 seeded evidence console: overview, ranking, overlap, measurements,
  release evidence, drift, JSON/Markdown export, and CASS-backed demo data.
- Phase 4 first pilot path: workspace/project creation, setup flow,
  benchmark-suite import, uploaded safety-check outputs, and CASS-backed
  release evidence for user-created pilot runs.
- Parts of Phase 5 and Phase 6: safety-check connector records, queued job
  simulation, provider retry/dead-letter tests, cost ledgers, release-evidence
  issue/signoff, and durable Supabase persistence for pilot runs.
- Agent/MCP integration slice: authenticated MCP endpoints, release-evidence
  status, theory cards, measurement recommendations, cost ledgers, integration
  guides, and deployment-review prompts.

Still not complete:

- Real provider-backed worker execution.
- Cloud Run staging/production deployment for the Python FastAPI service.
- Production frontend host pointed at the real FastAPI API.
- Full workspace membership/RBAC enforcement beyond the current prototype
  assumptions.
- Production observability, backups, billing/budget enforcement, and legal terms.

Current next milestone:

```text
Cloud Run staging FastAPI + Supabase persistence + authenticated frontend smoke
```

## Phase 0: Planning And Design Ingestion

Status: complete.

Deliverables:

- Save latest design bundle in `design_reference/claude_design_project_v2/`.
- Update product, stack, UI, security, testing, benchmark, and cost plans.
- Verify current Python core tests still pass.
- Confirm Supabase CLI availability.

Acceptance criteria:

- Plans are internally consistent.
- No old SQLite-only or dashboard-only assumptions remain as the main path.
- Existing core tests pass.

Verification:

```bash
cd stackcert_product
python3 -m unittest discover -s tests -p 'test_*.py' -v
supabase --version
```

## Phase 1: Production Foundation

Status: substantially implemented locally and in CI. Production Cloud Run
deployment remains in Phase 8.

Goal: Create the real app skeleton with CI and local Supabase before feature
work accelerates.

Deliverables:

- `web/` React + Vite + TypeScript app.
- `stackcert_service/` FastAPI service.
- `supabase/` local config, initial migrations, seed data.
- `.github/workflows/ci.yml`.
- Shared API schema convention.
- Local development scripts.

Backend tasks:

- Add FastAPI app with `/api/health`.
- Add auth middleware that can validate Supabase JWTs, with a local test bypass
  only for tests.
- Add Postgres connection layer.
- Add basic workspace/project models.
- Add structured logging.

Frontend tasks:

- Build shared design tokens from `ui-core.jsx`.
- Add public landing route.
- Add auth routes.
- Add app shell route with placeholder authenticated pages.
- Add TanStack Query and API client.

Database tasks:

- Create initial workspace, member, project, audit event, and job tables.
- Enable RLS on every exposed table.
- Add seed workspace and demo project.

Tests:

- Python unit tests.
- API health and auth tests.
- Migration apply/reset test.
- RLS smoke tests.
- Frontend typecheck and build.

Acceptance criteria:

- Local Supabase, API, and web app start with documented commands.
- CI runs on pull requests.
- A signed-in test user can load the app shell.
- Service-role secrets are never present in frontend code.

## Phase 2: Landing Page And Authenticated Shell

Status: substantially implemented and hosted through Cloudflare Workers static
assets plus Supabase Auth and the Cloud Run FastAPI/CASS API. GitHub Pages plus
the Supabase Edge Function remain available as a fallback/demo-preview path.

Goal: Faithfully implement the latest public landing page and authenticated app
chrome.

Deliverables:

- Landing page from `Landing.html` and `ui-landing.jsx`.
- Sign in/sign up using Supabase Auth.
- App shell from `StackCert.html` and `ui-shell.jsx`.
- Session-aware CTA routing.
- Basic workspace/project switcher.

Tests:

- Frontend unit tests for nav/auth state.
- Playwright tests:
  - Landing page loads.
  - Open app redirects unauthenticated user to sign-in.
  - Signed-in user reaches app shell.
- Accessibility scan for nav, forms, dialogs, and focus states.
- Visual review against design screenshots.

Acceptance criteria:

- Public site looks production-grade.
- The app shell is not a static mock.
- Auth state controls navigation.

## Phase 3: Seeded Evidence Console

Status: substantially implemented. The hosted Edge Function mirrors this for
demo use; the real CASS-backed FastAPI service still needs Cloud Run hosting.

Goal: Make the designed app screens use real CASS backend data from the current
demo dataset while keeping user-facing labels beginner-friendly.

Deliverables:

- Demo data import job.
- API endpoints:
  - overview
  - ranking
  - correlations
  - measurements
  - release evidence
  - drift/retest triggers
- UI screens wired to API data.
- JSON and Markdown export.

Backend tasks:

- Wrap current `stackcert` Python core behind service functions.
- Store run summaries in Postgres.
- Store source JSONL and output artifacts in Supabase Storage.
- Persist release evidence as immutable snapshots.

Frontend tasks:

- Implement Recommendation.
- Implement Options compared.
- Implement Overlap analysis.
- Implement Test plan and cost.
- Implement Release evidence.
- Implement When to retest.
- Add loading, empty, error, and retry states.

Tests:

- Golden release-evidence replay test.
- API contract tests for every endpoint.
- Frontend component tests for tables/charts.
- Playwright path:
  - load app
  - inspect overview
  - change lambda/risk profile
  - open options compared
  - open overlap analysis
  - export release evidence

Acceptance criteria:

- The app shows the real recommended demo combination.
- No core evidence is hard-coded in React.
- Exported release evidence matches backend output.

## Phase 4: Project Setup, Benchmarks, And Custom Behaviors

Status: partially implemented. The uploaded-output pilot flow is usable; richer
editing/versioning and customer-facing validation UX remain.

Goal: Make StackCert useful for a real pilot without code edits.

Deliverables:

- Project setup wizard.
- Benchmark suite selector.
- CSV/JSONL upload.
- Custom behavior/question builder.
- Behavior taxonomy editor.
- Validation report.
- Candidate combination builder.

Key product behaviors:

- Users can choose built-in benchmark suites.
- Users can upload their own examples.
- Users can create custom behaviors/questions on the fly.
- Users can assign side, severity, policy category, tags, and weights.
- The app versions every benchmark suite and custom behavior set.

Tests:

- Upload validation tests.
- Malformed file tests.
- Custom behavior schema tests.
- UI form tests.
- Storage policy tests.
- API integration tests for create/edit/version flows.

Acceptance criteria:

- A user can create a new project, define an example mix, and prepare a
  candidate evidence run without touching the command line.

## Phase 5: Safety Check, Model, And Evaluation Runner

Status: partially implemented. Connector records, redaction, queued jobs,
leases, retries, budget checks, usage records, and deterministic provider-style
worker execution exist. Real outbound REST/model-provider execution and long-job
lease renewal remain the major gaps.

Goal: Move from uploaded outputs to managed evaluations.

Deliverables:

- Safety-check/model connector registry.
- REST adapter configuration.
- Python/local adapter configuration.
- Model judge adapter configuration.
- Secret handling and redaction.
- Async evaluation jobs.
- Worker service.
- Cost and latency collection.

Tests:

- Adapter unit tests with fake providers.
- Worker idempotency tests.
- Retry/dead-letter tests.
- Rate limit tests.
- Provider secret redaction tests.
- End-to-end small benchmark run.

Acceptance criteria:

- A user can connect at least one REST safety check and one local/model judge adapter.
- A worker can execute a small deterministic run and write CASS evidence
  results for a real project.
- Test plan can queue executable targeted-test jobs.
- A production REST/model-provider adapter can execute with provider-specific
  retries, rate limits, and idempotent writes.

## Phase 6: Cost, Governance, And Release Evidence Workflow

Status: partially implemented. Cost estimates/ledgers, issue flow, signoff, and
evidence exports exist; immutability/audit hardening remains.

Goal: Make the product credible for real security and GRC review.

Deliverables:

- Cost estimate before run.
- Actual usage ledger after run.
- Release-evidence issue flow.
- Signoff workflow.
- Reviewer comments.
- Audit log.
- PDF export.
- Expiration and invalidation rules.

Tests:

- Cost estimator unit tests.
- Release-evidence immutability tests.
- Audit log tests.
- Role permission tests.
- PDF/export smoke tests.

Acceptance criteria:

- A risk reviewer can approve or reject release evidence.
- Release evidence cannot be silently mutated after issue.
- Users can see estimated and actual cost for each configuration.

## Phase 7: Drift And Retesting

Status: prototype UI/API only. Real drift signals and retest automation remain.

Goal: Turn StackCert into an ongoing operational tool.

Deliverables:

- Drift signal configuration.
- Model/safety-check/prompt/version diff records.
- Traffic mixture import.
- Incident/manual signal creation.
- Retest job creation.
- Drift-to-evidence traceability.

Tests:

- Drift trigger unit tests.
- Retest API tests.
- UI flow tests for acknowledge/snooze/retest.
- Audit log coverage.

Acceptance criteria:

- A drift signal can mark release evidence provisional or expired.
- A user can trigger retesting and see the resulting run.

## Phase 8: Production Hardening And Deployment

Status: planned. `docs/13_production_hosting_setup.md` now contains the Cloud
Run setup walkthrough; implementation is next.

Goal: Prepare for design partners and early revenue.

Deliverables:

- Cloud Run deployment for API and worker.
- Production Supabase project.
- Private storage buckets.
- GitHub Actions release workflow.
- Sentry or equivalent error reporting.
- Structured logs and basic dashboards.
- Backup/restore runbook.
- Security checklist and threat model.

Tests:

- Preview deployment smoke tests.
- Production migration dry-run.
- Load test for dashboard endpoints.
- Worker stress test with fake adapters.
- Secret scanning and dependency scanning.
- RLS tests in CI.

Acceptance criteria:

- Main branch can deploy through CI/CD.
- Rollback path exists.
- No release proceeds without migrations, tests, scans, and smoke tests.

## Phase 9: Enterprise And Ecosystem Integrations

Goal: Meet customers where their AI deployment pipelines already live.

Candidate integrations:

- GitHub Actions release-evidence gate.
- GitLab CI, CircleCI, Buildkite.
- ArgoCD or deployment webhooks.
- LangSmith, Langfuse, W&B Weave, MLflow.
- Datadog, Sentry, Honeycomb, OpenTelemetry.
- Slack, Jira, Linear, PagerDuty.
- SSO/SAML and SCIM.
- Cloud KMS and customer-managed keys.
- Self-hosted/VPC deployment.

Tests:

- Contract tests for webhook payloads.
- Integration sandbox tests.
- Permission and token-scope tests.
- Failure-mode tests.

Acceptance criteria:

- StackCert can block or warn on risky deployments using release-evidence status.
- Existing customer pipelines can consume StackCert evidence without manual PDF
  handling.

## Working Cadence

After each meaningful slice:

1. Run targeted tests.
2. Update docs if the implementation changes the plan.
3. Verify that the app still starts locally.
4. Keep migrations reversible or forward-fixable.
5. Capture follow-up risks immediately, not at the end of the phase.
