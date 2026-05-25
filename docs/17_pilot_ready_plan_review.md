# Pilot-Ready Plan Review

Reviewed: 2026-05-25

Source plan: `16_pilot_ready_release_evidence_plan.md`

## Verdict

The plan is directionally strong and worth adopting, with revisions. It fits
the current StackCert strategy: make the app useful for teams that need to pick,
justify, and retest the safety-check combination they ship for one specific LLM
app. It is also mostly compatible with the codebase we have now.

The main caveat is timing and sequencing. The plan reads like a 60-90 day
pilot-readiness roadmap, not a single implementation sprint. Some items are
already implemented since the plan was written, while other items are harder
than the plan makes them sound because they cross auth, storage, evidence
immutability, and customer data boundaries.

## What Makes Sense

- The strategy constraints are right: keep StackCert, keep the landing page
  mostly stable, and avoid broad "AI safety certification" claims.
- The core workflow is exactly the product we should harden:
  examples -> safety checks or uploaded outputs -> combination comparison ->
  overlap analysis -> targeted tests -> scoped release evidence -> retest
  triggers -> CI/platform integration.
- Uploaded outputs first is the right pilot wedge. It lets teams use existing
  eval artifacts before they trust us with live provider integration.
- The focus on release evidence, not universal guarantees, is essential for
  risk positioning.
- The integration order is sensible: uploaded outputs, REST connectors, model
  judges, release gates, MCP, then notifications/tickets/storage/GRC/SSO.
- The "do not build yet" list is good. We should avoid billing, broad GRC,
  provider marketplaces, SSO, and deep enterprise self-hosting until the core
  evidence workflow is proven.

## What Is Already Done

Several plan items are stale in a good way because the codebase already moved:

- Cloudflare, Supabase Auth, Cloud Run API, and GitHub CI/CD are deployed and
  smoke-tested.
- Uploaded-output runs exist and can produce recommendation, overlap,
  measurement, cost, and release-evidence views.
- Deterministic, REST, and model-judge worker paths exist for project runs.
- Worker-produced outputs, measurement recommendations, jobs, and usage events
  now have retry-safe idempotent persistence.
- Connector price cards and provider token accounting exist.
- MCP has official Python SDK smoke coverage and MCP-only machine bearer token
  auth for read/write scopes.
- Supabase has a broad initial schema with RLS enabled, membership tables,
  audit event tables, artifact metadata tables, jobs, usage events, certificates,
  signoffs, and drift signals.

These should be marked complete or partially complete in future planning, so we
do not rebuild them.

## Main Gaps

The plan correctly identifies the highest-risk missing pieces:

1. Real service-layer tenancy/RBAC.
   Supabase has membership/RLS foundations, but FastAPI routes still mostly use
   a generic authenticated principal and demo-project assumptions. Before real
   pilots, every route needs project/workspace access checks and role checks.

2. Evidence immutability and audit.
   The current product issues evidence-like certificates and signoffs, but
   immutable packet semantics, export audit events, revocation/supersession, and
   reviewer-ready evidence status transitions are not complete enough for real
   customer risk review.

3. Private artifacts.
   The schema has artifact metadata and Supabase Storage foundations, but
   example/output/evidence artifacts need consistent private bucket storage,
   signed URL rules, artifact hashes, and export access checks.

4. Managed customer connector secrets.
   The current env-ref/local-memory approach is appropriate for staging and
   fake providers, but customer connector secrets need Secret Manager, Supabase
   Vault, or encrypted application storage with rotation metadata.

5. Independently deployed worker.
   The worker logic exists through API-triggered endpoints. A production pilot
   should run it as a Cloud Run Job/service with lease renewal, monitoring, and
   dead-letter review.

6. Import/upload polish.
   The backend supports preview/commit and uploaded outputs, but file upload,
   templates, coverage diagnostics, and clearer step-by-step setup are still
   major usability gaps for non-engineering pilot users.

7. Release-gate integration.
   MCP and a certificate-status endpoint exist, but a stable release-gate API
   with environment/config comparison, API tokens, and a GitHub Action should
   be built before this becomes operationally sticky.

## Feasibility

The plan is doable with the current stack. No major architecture change is
needed. The current React/Vite + FastAPI + Supabase + Cloud Run + Cloudflare
stack is enough for the next stage.

The most expensive work is not compute or cloud infrastructure; it is
correctness and trust work:

- authorization checks must be exact;
- evidence must be reconstructable and immutable;
- customer data/artifacts must be private by default;
- worker failures must not produce misleading evidence;
- release-gate outputs must be conservative and explain blocking reasons.

The 30/60/90 day framing is reasonable for a focused team. For a single
developer-agent loop, the same plan should be treated as iterative milestones,
with each milestone ending in tests, docs, and hosted smoke coverage.

## Recommended Revisions

### Revise P0

P0 should be narrower and more security-focused:

- service-layer workspace/project/role checks;
- cross-tenant API tests;
- evidence immutability and audit events for issue/signoff/export;
- private artifact storage for examples, outputs, and evidence exports;
- setup flow simplification for uploaded-output pilots;
- output coverage diagnostics and evidence-readiness gates;
- managed secret storage design plus first backend implementation;
- Cloud Run worker/job deployment with lease renewal;
- release-gate API skeleton with machine-token auth.

### Move Or Reframe

- PDF export is useful, but Markdown/JSON plus stable artifact hashing matter
  more for the first real pilot. A basic PDF can follow once evidence content is
  stable.
- Slack/Teams and Jira/Linear should stay P2 unless a design partner directly
  asks for them.
- SSO/SAML should stay later. Workspace roles, invites, API tokens, and audit
  logs are more urgent.
- Do not rename database tables from `certificates` to `evidence_packets` yet.
  Use product language in the UI/API and keep compatibility aliases until there
  is a clear migration reason.
- Do not persist every derived ranking/overlap row immediately if recomputation
  remains deterministic and fast for pilot-scale runs. Persist hashes,
  inputs, outputs, and evidence packets first; add derived-result persistence
  when performance or audit reconstruction demands it.

## Suggested Next Milestone

The best next milestone is:

```text
Pilot trust layer: tenancy/RBAC + immutable evidence/audit + private artifacts
```

This is the milestone that turns the current useful prototype into something a
design partner could reasonably trust with a real app workflow.

Concrete scope:

- Add FastAPI authorization helpers:
  `require_workspace_member`, `require_project_access`, `require_role`, and
  `require_evidence_access`.
- Apply them to project, run, connector, job, usage, evidence, artifact, and MCP
  routes.
- Add cross-workspace and role-denial tests.
- Add audit-event creation for connector create/update, job run/retry,
  measurement-plan creation, evidence issue/signoff/export, MCP write calls,
  and retest triggers.
- Make issued release evidence immutable in service code and database policy.
- Store uploaded examples/outputs and evidence exports in private artifact
  storage with hashes.
- Add evidence-readiness checks that prevent issuance from incomplete coverage,
  unresolved critical comparisons, stale assumptions, or unauthorized actors.

After that, the next milestone should be:

```text
Pilot integration layer: Cloud Run worker + managed secrets + release gate API
```

That should include Secret Manager/Vault-backed connector secrets, worker lease
renewal, dead-letter UI or API, release-gate API tokens, and a GitHub Action
prototype.

## Bottom Line

Adopt this plan, but treat it as a roadmap to refine rather than a literal task
list. The product thesis is right, the architecture is compatible with what we
already built, and the priority stack is mostly correct. The next work should
not be more concept development; it should be trust hardening around tenancy,
evidence immutability, auditability, artifact privacy, and operational release
gates.
