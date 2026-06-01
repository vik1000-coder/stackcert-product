# Design Partner Sales Pack

This is the buyer-facing package for turning StackCert from a strong demo into a
sellable design-partner pilot.

## One-Sentence Offer

Bring one LLM app, representative examples, and safety-check outputs; StackCert
compares the combinations you could ship and produces a scoped release report
that can be wired into your release workflow.

## What The Pilot Includes

- One private pilot project.
- Example import and uploaded-output coverage review.
- Comparison of safety-check combinations.
- Recommendation, overlap analysis, targeted tests, and release report.
- One release-gate path: GitHub Actions, GitLab CI, CircleCI, generic webhook,
  API, or MCP.
- Support owner and agreed escalation path.

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
- Operations: keep evidence for uptime checks, Cloud Run alerts, Supabase
  backup/restore rehearsal, Auth email setup, smoke tests, and support owner.
- Legal: release reports are scoped evidence, not warranties or universal
  certifications.

## Success Criteria

- Customer completes the uploaded-output path without command-line help.
- Release report states scope, assumptions, limitations, and retest triggers.
- Release gate can pass, warn, and block in the customer workflow.
- Customer can explain why the recommended combination is better than a single
  default check or always-frontier path for the scoped task.
