# Pilot-Ready Execution Plan

Last updated: 2026-05-25

Source inputs:

- `16_pilot_ready_release_evidence_plan.md`
- `17_pilot_ready_plan_review.md`
- current implementation state in `15_current_state_and_next_steps.md`

This is the executable plan. It turns the imported `instructions.md` roadmap
and the feasibility review into ordered build slices that can be implemented,
tested, deployed, and documented one at a time.

## Product Target

StackCert should help teams that are shipping LLM apps answer a narrow,
high-value release question:

```text
Given this app, this example suite, these candidate safety checks, these costs,
and these deployment assumptions, which safety-check combination should we
ship, what residual risk remains, and when must we retest?
```

The product is not a general "AI is safe" guarantee. It is a scoped release
evidence workbench for teams that need to compare safety options, justify a
deployment decision, automate retesting, and keep a defensible audit trail.

## Primary Users And Jobs

### AI platform engineer

Problem: They already have prompts, model routes, guardrails, classifiers,
model judges, or agent workflows, but they do not know which combination is
actually worth shipping for a specific app.

StackCert job:

- import examples and safety-check outputs;
- connect REST or model-judge checks when ready;
- compare quality, residual risk, overlap, and cost;
- run targeted follow-up tests;
- expose release status to CI or agent deployment pipelines.

### Applied AI product owner

Problem: They need to make a release decision and explain tradeoffs without
pretending the tool can guarantee safety.

StackCert job:

- show the recommended safety-check stack in product language;
- show what risk remains and where assumptions apply;
- make cost and coverage understandable;
- produce release evidence that is useful in review meetings.

### Security, risk, or compliance reviewer

Problem: They need evidence that a release decision was based on a stable
dataset, known assumptions, and reviewable outputs.

StackCert job:

- preserve immutable evidence packets;
- retain hashes and provenance for inputs, outputs, and exports;
- record audit events for sensitive actions;
- make signoff, supersession, and retest status clear.

### Agent or CI system

Problem: It needs a conservative machine-readable answer before a deployment:
can this config ship, or should the release stop?

StackCert job:

- expose release-evidence status through REST and MCP;
- authenticate machine callers with scoped tokens;
- return blocking reasons, not marketing language;
- support repeatable release-gate checks.

## Current Baseline

Already working or substantially implemented:

- React/Vite app, landing pages, auth routes, onboarding, and app screens.
- FastAPI service around the CASS core.
- Supabase Auth, schema, RLS foundations, Storage foundations, and remote
  migrations.
- Cloudflare Workers static frontend, Cloud Run FastAPI API, GitHub Pages
  fallback, and CI/CD smoke coverage.
- Uploaded-output pilot flow through recommendation, overlap, measurement,
  cost, release evidence, and drift views.
- Deterministic, REST, and model-judge worker paths.
- Retry-safe worker persistence for jobs, outputs, recommendations, and usage
  events.
- Connector price cards and provider token accounting.
- MCP endpoints with Supabase bearer auth and MCP-only machine bearer tokens.
- Hosted MCP smoke coverage through the official Python MCP SDK.

The current product is useful for staging walkthroughs and internal testing.
It is not yet ready for real customer data because the trust layer is still too
thin: service-layer authorization, immutable evidence semantics, private
artifact handling, managed connector secrets, and independently deployed
worker operations need to be hardened.

## Execution Rules

Every milestone must end with:

- targeted backend tests;
- relevant frontend tests or typecheck/build;
- migration checks if the database changes;
- at least one local smoke path;
- hosted smoke coverage when the change affects deployed behavior;
- documentation updates in `15_current_state_and_next_steps.md` and this file;
- an `implementation_log.md` entry.

Every route that reads or mutates project data must answer these questions in
code:

- Who is the caller?
- Which workspace/project/run/evidence object is being accessed?
- What role or machine scope is required?
- What audit event should be recorded?
- Is the output safe to return to this caller?

## Milestone 1: Pilot Trust Layer

Goal: make the current staging app safe enough for a design partner's real
project metadata and non-secret eval artifacts.

Status: implemented locally on 2026-05-25. The route matrix, access helper
module, membership lookup, route authorization, and audit writer are in place.
Remaining trust work has moved into Milestone 2: immutable evidence and private
artifacts.

This milestone comes first because every later integration depends on exact
tenant isolation and trustworthy evidence state.

### User Stories

- As a workspace owner, I can create projects and connectors in my workspace,
  and I cannot see or mutate another workspace's projects.
- As a reviewer, I can view release evidence and sign off, but I cannot change
  connectors, run jobs, or issue evidence unless granted the right role.
- As a release engineer, my machine token can read release status without
  gaining broad app access.
- As a compliance reviewer, I can see who issued evidence, who signed it, who
  exported it, and what object each action affected.

### Scope

1. Add service-layer access helpers.
   - New module: `stackcert_service/security/access.py`.
   - Helpers:
     - `require_workspace_member`
     - `require_project_access`
     - `require_run_access`
     - `require_certificate_access`
     - `require_role`
     - `require_scope`
   - Role order:
     - `owner`
     - `admin`
     - `maintainer`
     - `reviewer`
     - `viewer`
   - Machine scopes:
     - `mcp:read`
     - `mcp:write`
     - `release_gate:read`
     - `release_gate:write`

2. Add membership lookup to persistence.
   - Extend `stackcert_service/db/supabase.py`.
   - Keep in-memory fallback behavior for local tests.
   - Filter workspace/project lists by principal membership.

3. Apply route authorization.
   - `workspaces`: member-only list, owner/admin create behavior.
   - `projects`: workspace member and role checks.
   - `benchmark-suites`: project maintainer for create, viewer for read.
   - `custom-behaviors`: project maintainer for create, viewer for read.
   - `guard-connectors`: project maintainer/admin for write, viewer for read.
   - `evaluation-jobs`, `workers/run-next`, job retry/run: maintainer/admin or
     worker-scoped machine token.
   - `runs`, rankings, overlap, measurements, costs, drift: viewer access.
   - `certificate issue`: maintainer/admin plus readiness gates.
   - `certificate signoff`: reviewer or above.
   - `MCP write tools`: require `mcp:write` plus project access.

4. Add audit-event writer.
   - Service: `stackcert_service/services/audit.py`.
   - Events:
     - `workspace.created`
     - `project.created`
     - `benchmark_suite.committed`
     - `custom_behavior.created`
     - `guard_connector.created`
     - `evaluation_job.created`
     - `evaluation_job.run`
     - `evaluation_job.retry`
     - `measurement_plan.created`
     - `evidence.issued`
     - `evidence.signoff.created`
     - `evidence.exported`
     - `mcp.tool_called`
     - `release_gate.checked`

5. Add cross-tenant and role-denial tests.
   - New test file: `tests_service/test_access_control.py`.
   - Cover:
     - user A cannot access user B workspace/project/run;
     - viewer cannot create connector or job;
     - reviewer can sign off but cannot issue evidence;
     - read-only MCP token cannot call write tools;
     - machine tokens do not work on normal app routes;
     - demo fallback remains usable outside production mode.

### Acceptance Criteria

- No project-scoped route returns data unless the principal has access.
- Write routes enforce roles, not just authentication.
- MCP machine auth stays restricted to MCP/release-gate surfaces.
- Audit events exist for all sensitive mutations.
- Existing demo flows still work in non-production local mode.

### Verification

```bash
uv run python -m unittest tests_service.test_access_control
uv run python -m unittest discover -s tests_service
uv run python -m unittest discover -s tests
npm --prefix web run typecheck
npm --prefix web test -- --run
npm --prefix web run build
supabase db push --linked --dry-run
```

## Milestone 2: Immutable Evidence And Private Artifacts

Goal: make evidence packets reconstructable, tamper-resistant, and private by
default.

### User Stories

- As a reviewer, I can reconstruct an issued evidence packet from stored inputs,
  outputs, hashes, and assumptions without depending on frontend state.
- As a release owner, once evidence is issued, it cannot be silently edited.
- As a security team, uploaded examples, guard outputs, and evidence exports are
  private and only available through authorized short-lived access.
- As a product owner, I can see why evidence cannot be issued yet.

### Scope

1. Add evidence readiness gates.
   - New service function in `stackcert_service/services/certificates.py` or a
     dedicated `evidence.py`.
   - Block issue when:
     - no committed suite exists;
     - no current run exists;
     - required safety checks have missing output coverage;
     - unresolved critical comparison or invalid status exists;
     - cost/budget assumptions are stale;
     - actor lacks role;
     - run has stale model/prompt/policy assumptions.

2. Make issued evidence immutable in service and database behavior.
   - Store issued packet snapshots.
   - Allow only append-only signoffs, exports, supersession, or revocation
     metadata.
   - Prevent mutation of core fields after issue.
   - Keep table names compatible; do not rename `certificates` yet unless a
     migration becomes clearly necessary.

3. Store private artifacts.
   - Add artifact service around Supabase Storage:
     - upload object;
     - calculate SHA-256;
     - persist object metadata;
     - generate signed URL only after access check;
     - support customer-hosted artifact references later.
   - Artifact classes:
     - uploaded examples;
     - uploaded guard outputs;
     - worker output bundles;
     - issued evidence JSON;
     - issued evidence Markdown;
     - optional PDF later.

4. Add export verification.
   - Endpoint or service method to verify stored artifact hash.
   - Evidence exports include:
     - packet id;
     - run id;
     - project id;
     - issued at;
     - artifact refs;
     - SHA-256 hashes;
     - scope and limitations;
     - retest triggers;
     - signoff summary.

5. Add UI evidence readiness diagnostics.
   - Release evidence page should show missing coverage, stale assumptions,
     missing signoffs, or blocked issue reasons.
   - Do not overstate validity.

### Acceptance Criteria

- Issued evidence has immutable core fields and stable hashes.
- Evidence export can be verified against stored artifact metadata.
- Unauthorized callers cannot fetch private artifact URLs.
- UI displays issue blockers clearly.
- Audit events are recorded for issue, signoff, export, supersede, and revoke.

### Verification

```bash
uv run python -m unittest discover -s tests -p 'test_certificate_logic.py'
uv run python -m unittest tests_service.test_supabase_store
uv run python -m unittest tests_service.test_access_control
uv run python -m unittest discover -s tests_service
npm --prefix web run typecheck
npm --prefix web test -- --run
npm --prefix web run build
supabase db push --linked --dry-run
```

## Milestone 3: Managed Secrets And Independent Worker

Goal: move provider-backed runs from API-triggered staging behavior to a
separate worker runtime that can handle real connector secrets, retries,
leases, budgets, and dead letters.

### User Stories

- As an AI platform engineer, I can register a REST or model-judge connector
  without exposing the provider secret to the browser.
- As a workspace owner, I can set run and workspace budget caps before provider
  jobs execute.
- As an operator, long-running jobs renew leases and either finish, retry, or
  dead-letter with a reviewable reason.
- As a design partner, the same evidence path works whether outputs are
  uploaded or generated by managed worker runs.

### Scope

1. Implement managed secret backend.
   - Extend `stackcert_service/services/provider_secrets.py`.
   - Keep env-ref resolver for local/dev.
   - Add Google Secret Manager resolver for Cloud Run.
   - Evaluate Supabase Vault for future Supabase-native deployments.
   - Store only secret references and metadata in Postgres.
   - Track:
     - secret ref;
     - provider type;
     - created by;
     - created at;
     - last rotated at;
     - last used at;
     - status.

2. Add secret write/rotation API.
   - Backend-only write path.
   - Redacted responses.
   - Audit events for create, rotate, disable, and use.
   - Tests proving secrets never appear in API responses or frontend bundles.

3. Deploy independent worker.
   - Use `scripts/worker_once.py` as the seed.
   - Add Cloud Run Job or worker service deployment path.
   - Preserve cost controls:
     - max instances low for staging;
     - budget preflight before deploy;
     - per-run budget cap before execution;
     - workspace budget cap before execution.
   - Add `deploy-worker` workflow only after the local path is stable.

4. Add lease renewal and dead-letter review.
   - Lease duration configurable.
   - Worker renews lease during long jobs.
   - Dead letters preserve provider error class and redacted details.
   - API and UI expose dead-letter review and retry.

5. Recompute evidence after targeted measurements.
   - When follow-up measurement outputs land, recompute recommendation,
     overlap, cost, and evidence readiness.
   - Avoid duplicate outputs via existing idempotency keys.

### Acceptance Criteria

- Real provider secrets are never returned to the browser.
- Cloud Run worker/job can process at least one deterministic job in staging.
- REST/model-judge jobs can run with managed secret refs.
- Worker lease renewal prevents duplicate active execution.
- Dead-lettered jobs are visible and retryable by authorized users.
- Cost caps block execution before provider calls.

### Verification

```bash
uv run python -m unittest tests_service.test_deployment_readiness
uv run python -m unittest tests_service.test_supabase_store
uv run python -m unittest discover -s tests_service
uv run python scripts/gcloud_cost_preflight.py --project-id "$GCP_PROJECT_ID" --region "${GCP_REGION:-us-central1}"
uv run python scripts/cloud_run_api_smoke.py --api-url "$STACKCERT_API_URL"
uv run python scripts/deployment_smoke.py --web-url "$STACKCERT_WEB_URL" --api-url "$STACKCERT_API_URL" --supabase-url "$SUPABASE_URL" --email "$SMOKE_EMAIL" --password "$SMOKE_PASSWORD"
```

## Milestone 4: Release Gates And Agent-Friendly Surfaces

Goal: make StackCert operationally sticky by letting CI, deployment platforms,
and agent runtimes check release evidence conservatively.

### User Stories

- As a release engineer, my CI pipeline can block a deployment when evidence is
  missing, expired, stale, or outside scope.
- As an agent runtime, I can ask StackCert for current release status through
  MCP without receiving broad application privileges.
- As a security reviewer, I can audit every machine check that affected a
  release decision.

### Scope

1. Add release-gate API.
   - Endpoint:
     - `POST /api/projects/{project_id}/release-gates/evaluate`
   - Inputs:
     - environment;
     - model id/version;
     - prompt or policy hash;
     - guard connector versions;
     - benchmark suite id/version;
     - run id or latest accepted evidence;
     - deployment ref/commit SHA.
   - Outputs:
     - `pass`, `warn`, or `block`;
     - blocking reasons;
     - evidence packet id;
     - required retest triggers;
     - machine-readable assumptions.

2. Add API token model for release gates.
   - Separate from MCP-only token config.
   - Hash at rest.
   - Scope to workspace/project.
   - Rotate and revoke.
   - Audit every use.

3. Update GitHub Action and script.
   - Extend `scripts/certificate_gate.py`.
   - Provide a reusable workflow/action example.
   - Test:
     - valid evidence passes;
     - expired evidence blocks;
     - model mismatch blocks;
     - missing token fails closed.

4. Harden MCP.
   - Decide read-only default tools.
   - Require explicit write scopes for work-creating tools.
   - Add hosted compatibility test with at least one additional MCP client or
     inspector-style runtime.
   - Audit MCP tool calls with method, project, outcome, and caller type.

### Acceptance Criteria

- A CI job can fail closed on missing or stale evidence.
- Machine tokens are scoped, revocable, and auditable.
- MCP remains useful for agents but cannot bypass app authorization.
- Release-gate output is conservative and explains why it passed or blocked.

### Verification

```bash
uv run python -m unittest tests_service.test_certificate_gate
uv run python scripts/mcp_client_smoke.py --api-url "$STACKCERT_API_URL" --supabase-url "$SUPABASE_URL" --email "$SMOKE_EMAIL" --password "$SMOKE_PASSWORD"
uv run python scripts/deployment_smoke.py --web-url "$STACKCERT_WEB_URL" --api-url "$STACKCERT_API_URL" --supabase-url "$SUPABASE_URL" --email "$SMOKE_EMAIL" --password "$SMOKE_PASSWORD"
gh run list --limit 10
```

## Milestone 5: Pilot UX And Operational Readiness

Goal: make the product understandable and reliable enough for first design
partners.

### User Stories

- As a non-specialist product owner, I understand what CASS is, what StackCert
  does, and what it does not guarantee.
- As a platform engineer, I can complete setup without reading source code.
- As a reviewer, I can inspect evidence, blockers, signoffs, and retest
  triggers in the UI.
- As an operator, I can monitor errors, usage, cost, and uptime.

### Scope

1. Setup and import polish.
   - Better templates for JSONL/CSV examples.
   - Output coverage diagnostics before run creation.
   - Clear errors for malformed outputs.
   - Built-in example suites as selectable starting points.

2. Evidence page polish.
   - Readiness checklist.
   - Immutable packet badge after issue.
   - Artifact hash display.
   - Signoff panel.
   - Export history.
   - Retest trigger explanations.

3. Worker/dead-letter UI.
   - Queued/running/failed job states.
   - Retry controls for authorized roles.
   - Redacted provider error details.

4. Production operations.
   - Production Supabase project.
   - Production Cloudflare domain.
   - Production Cloud Run service/worker.
   - Sentry or equivalent error monitoring.
   - Uptime checks.
   - Backup/restore rehearsal.
   - Auth email templates and sender domain.
   - Budget alerts for GCP, Supabase, and provider spend.

5. Legal/product docs.
   - Terms.
   - Privacy.
   - Data handling.
   - Scoped-evidence disclaimers.
   - No-guarantee positioning.

### Acceptance Criteria

- A design partner can complete the uploaded-output pilot flow without command
  line help.
- Evidence readiness and blockers are visible before issue.
- Production checklist has owners and evidence of completion.
- Hosted staging remains green after the UX and ops additions.

### Verification

```bash
npm --prefix web run typecheck
npm --prefix web test -- --run
npm --prefix web run build
uv run python -m unittest discover -s tests_service
uv run python scripts/deployment_smoke.py --web-url "$STACKCERT_WEB_URL" --api-url "$STACKCERT_API_URL" --supabase-url "$SUPABASE_URL" --email "$SMOKE_EMAIL" --password "$SMOKE_PASSWORD"
```

## Immediate Execution Queue

Start here. These are the next tasks in order.

### Ticket 1: Route Access Map

Create a route-by-route access matrix for `stackcert_service/main.py`.

Status: done. See `docs/19_route_access_matrix.md`.

Deliverables:

- document each route's object scope, required role, machine scope, and audit
  event;
- identify demo-only exceptions;
- identify routes that need project/run/certificate lookup helpers.

Done when:

- the matrix is committed under `docs/`;
- implementation tickets can reference exact route names.

### Ticket 2: Access Helper Module

Implement `stackcert_service/security/access.py` with role/scope helpers and
unit tests.

Status: done. Role aliases/groups, app-principal checks, machine-scope checks,
and demo fallback behavior are covered in `tests_service/test_access_control.py`.

Done when:

- helpers work with in-memory test principals;
- role hierarchy is covered;
- read-only machine tokens cannot satisfy app write requirements.

### Ticket 3: Persistence Membership Lookup

Add workspace/project membership access methods to the Supabase store and local
fallback store.

Status: done. Supabase membership lookup and local owner-membership fallback are
implemented, and workspace/project lists are filtered by principal.

Done when:

- tests can create two principals and two workspaces;
- each principal only lists their own accessible objects.

### Ticket 4: Apply Access To Project Routes

Apply access helpers to workspace, project, suite, custom behavior, connector,
job, run, certificate, usage, and drift routes.

Status: done. Object-scoped reads/writes now require workspace/project/run or
certificate access. Existing non-production demo access remains available for
local/staging smoke flows.

Done when:

- cross-tenant reads and writes are denied;
- existing happy-path tests still pass;
- hosted demo still works in staging.

### Ticket 5: Audit Event Service

Add `audit.py` service and wire it into sensitive mutations.

Status: done. The audit service writes to Supabase when configured and keeps a
memory fallback for local tests.

Done when:

- audit events are written for project creation, connector creation, job
  creation/run/retry, evidence issue/signoff, and MCP write calls;
- tests verify event shape and object ids.

### Ticket 6: Evidence Readiness Gates

Add backend evidence-readiness checks before issue.

Done when:

- incomplete coverage blocks issue;
- stale assumptions block issue;
- unauthorized actors block issue;
- blockers are returned in a UI-friendly shape.

### Ticket 7: Private Artifact Service

Add the artifact service and wire it first to evidence JSON/Markdown exports.

Done when:

- issued exports store hashes;
- authorized signed URL generation works;
- unauthorized artifact access is denied;
- evidence export audit events are written.

## Deferrals

Do not spend near-term engineering time on these unless a real design partner
requires them:

- billing and paid plans;
- SSO/SAML;
- Slack, Teams, Jira, or Linear notifications;
- broad GRC platform features;
- provider marketplace;
- enterprise self-hosting;
- PDF export beyond a basic generated artifact;
- renaming core database tables for product-language purity.

## Release Discipline

Before any production-facing rollout:

```bash
git status --short --branch
uv run python -m unittest discover -s tests_service
uv run python -m unittest discover -s tests
npm --prefix web run typecheck
npm --prefix web test -- --run
npm --prefix web run build
npm run build
supabase db push --linked --dry-run
uv run python scripts/gcloud_cost_preflight.py --project-id "$GCP_PROJECT_ID" --region "${GCP_REGION:-us-central1}"
```

For Cloud Run deploys, keep staging cost caps until explicitly changed:

- min instances: `0`
- max instances: `1`
- CPU: `1`
- memory: `512Mi`
- timeout: `60s`
- concurrency: `40`
- budget: `StackCert staging $10`

## Current Next Move

The next implementation move is Ticket 1, followed immediately by Ticket 2 and
Ticket 3. That starts Milestone 1 without touching cloud spend and gives the
rest of the trust-layer work a precise authorization contract.
