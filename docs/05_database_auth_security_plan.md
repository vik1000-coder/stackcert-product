# StackCert Database, Auth, And Security Plan

## Security Principles

StackCert will handle prompts, safety-check outputs, policy decisions,
model/provider secrets, and audit artifacts. Treat customer data as sensitive
from the first production-oriented implementation.

Rules:

- Use Supabase Auth for identity.
- Use Postgres workspace membership for authorization.
- Enable RLS on every exposed table.
- Keep service-role access server-side only.
- Keep raw artifacts in private Storage buckets.
- Prefer redacted snippets or hashes by default.
- Record audit events for security-sensitive actions.
- Never use user-editable metadata for authorization.

## Multi-Tenant Model

Core tenant boundary:

- `workspaces`
- `workspace_memberships`
- `projects`

Every customer-owned row should include `workspace_id`, directly or through a
parent that is easy to join. API authorization and RLS policies should both
check workspace membership.

Suggested roles:

- `owner`
- `admin`
- `platform`
- `security`
- `risk_reviewer`
- `viewer`

Do not rely only on frontend route guards. The API and database must enforce
access.

## Initial Tables

Identity and tenancy:

- `profiles`
- `workspaces`
- `workspace_memberships`
- `invitations`
- `audit_events`

Projects and configuration:

- `projects`
- `project_environments`
- `welfare_profiles`
- `risk_profiles`
- `benchmark_suites`
- `benchmark_cells`
- `examples`
- `custom_behaviors`
- `custom_behavior_versions`

Safety checks and combinations:

- `guard_definitions`
- `guard_versions`
- `guard_adapters`
- `provider_connections`
- `candidate_stacks`
- `candidate_stack_members`

Runs and measurements:

- `evaluation_runs`
- `run_examples`
- `guard_outputs`
- `pair_measurements`
- `welfare_estimates`
- `measurement_recommendations`
- `measurement_plans`
- `jobs`
- `job_events`

Release evidence and drift:

- `certificates`
- `certificate_artifacts`
- `certificate_signoffs`
- `drift_signals`
- `recertification_runs`

Cost:

- `provider_price_cards`
- `cost_estimates`
- `usage_events`
- `run_cost_summaries`
- `workspace_budgets`

Storage metadata:

- `artifact_objects`
- `upload_sessions`

Some table names intentionally preserve earlier CASS/API terminology such as
`guard_*`, `candidate_stacks`, `welfare_estimates`, and `certificates`. Product
copy should translate these to safety checks, combinations, app scores, and
release evidence.

## Storage Buckets

Private buckets:

- `uploads`
- `run-artifacts`
- `certificates`
- `exports`
- `debug-artifacts`

Path convention:

```text
workspace_id/project_id/run_id/artifact_type/file_name
```

Access model:

- Frontend uploads through signed upload URLs or controlled Supabase client
  policies.
- API records metadata rows and audit events.
- API creates signed download URLs for authorized users.
- Raw artifacts are never public by default.

## RLS Policy Shape

For public/exposed schemas:

- Enable RLS on every table.
- Grant only the operations required by `anon` and `authenticated`.
- Prefer policies that check workspace membership.
- Require `auth.uid() is not null` in authenticated policies.
- Do not put privileged `security definer` functions in exposed schemas.
- Use `security_invoker` for views when exposed.

Example policy shape:

```sql
create policy "workspace members can read projects"
on public.projects
for select
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);
```

For write policies, check role:

```sql
and wm.role in ('owner', 'admin', 'platform', 'security')
```

## Backend Authorization

FastAPI should validate the Supabase JWT for every authenticated API request.

Backend checks:

- User exists.
- User is an active member of workspace.
- Role permits the operation.
- Project belongs to workspace.
- Requested artifact belongs to project/run.

RLS remains defense in depth. The API must not skip its own authorization just
because RLS exists.

## Secrets

Secret types:

- Supabase service role secret.
- Provider API keys.
- Guard endpoint credentials.
- Webhook signing secrets.
- Encryption/KMS configuration.

Rules:

- Never expose service role or provider secrets to the browser.
- Store customer provider keys encrypted or in a dedicated secret store.
- Redact secrets in logs, job events, and errors.
- Use short-lived signed URLs for artifact access.
- Rotate internal secrets before production launch.

## Data Privacy

Support project-level data handling modes:

- `raw_allowed`: raw prompts and outputs can be stored.
- `redacted_snippets`: store snippets after redaction.
- `hashes_only`: store hashes and aggregate metrics only.
- `customer_hosted`: raw data remains in customer environment.

The UI should make the mode visible because it changes what can be audited and
what can be exported.

## Audit Events

Record audit events for:

- Workspace/member changes.
- Role changes.
- Provider connection create/update/delete.
- Uploads and deletes.
- Evaluation run creation/cancellation.
- Measurement plan approval.
- Certificate issue/revoke/expire.
- Signoff approve/reject.
- Drift signal acknowledge/snooze/recertify.
- Export download.

Audit events should include:

- Actor user ID.
- Workspace and project ID.
- Action.
- Target type and ID.
- Timestamp.
- IP/user-agent when available.
- Before/after summary when safe.

## Reliability And Recovery

Production requirements:

- Postgres backups and restore test.
- Storage retention policy.
- Idempotent workers.
- Job retries with bounded attempts.
- Dead-letter state for failed jobs.
- Provider timeout and circuit breaker.
- Run cancellation.
- Migration rollback or forward-fix plan.

## Security Test Requirements

CI should include:

- RLS tests for authorized and unauthorized users.
- API authorization tests.
- Storage access tests.
- Secret scanning.
- Dependency vulnerability scans.
- Static analysis for Python and TypeScript.
- Tests that frontend bundles do not contain service-role or provider secrets.
