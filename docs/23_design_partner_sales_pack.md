# Design Partner Sales Pack

This is the buyer-facing package for turning StackCert from a strong demo into a
sellable design-partner pilot.

## One-Sentence Offer

Bring one agentic LLM workflow, representative examples, and candidate
safety-check outputs; StackCert compares local/open-weight checks, frontier
fallbacks, workflow controls, and hybrid routes to find the cheapest defensible
release path and produce a scoped release report.

## What The Pilot Includes

- One private pilot project.
- Example import and uploaded-output coverage review.
- Comparison of frontier baselines, open-weight model judges, guard models,
  deterministic checks, customer REST checks, context policies, and hybrid
  fallback routes where available.
- Recommendation, overlap analysis, targeted tests, and release report.
- One release-gate path: GitHub Actions, GitLab CI, CircleCI, generic webhook,
  API, or MCP.
- Support owner and agreed escalation path.

## Packaging

- Diagnostic Sprint: $5k-$10k for benchmark design, candidate mapping, a small
  replay, and go/no-go memo.
- Design Partner Pilot: $15k-$35k for one private workflow, 100-2,000 examples,
  3-15 candidate checks/routes, one release report, review call, and retest
  plan.
- Production Evidence Program: $4k-$12k/month for repeated release reports,
  retests, reviewer seats, audit history, and release-gate integrations after
  the first pilot works.

Provider calls are customer-paid or explicitly budgeted evaluation credits.

## What The Pilot Does Not Include

- A universal AI safety certification.
- A guarantee that future production traffic is safe.
- Hosting arbitrary customer local models.
- Broad self-serve production launch support.
- Native outbound Slack/Jira/Linear automation before a customer-specific
  workflow is named.

## Procurement FAQ

- Data: start with redacted examples or hashes-only metadata when possible.
- Providers: uploaded-output pilots avoid sending customer prompts to model
  providers; managed runs require explicit connector setup.
- Retention: agree on retention, deletion/export owner, and artifact access
  before real data import.
- Operations: staging uptime checks, Cloud Run alert policies, alert routing,
  restore rehearsal, and smoke tests are complete. Before real customer data,
  confirm production Auth email setup, signed data terms, and the named support
  owner for the pilot.
- Legal: release reports are scoped evidence, not warranties or universal
  certifications.

## Success Criteria

- Customer completes the uploaded-output path without command-line help.
- Release report states scope, assumptions, limitations, and retest triggers.
- Release gate can pass, warn, and block in the customer workflow.
- Customer can explain why the recommended combination is better than a single
  default check, old_cass reference, or always-frontier path for the scoped task.
- Customer can customize benchmark templates into private release evidence
  rather than relying on sample/template data.
