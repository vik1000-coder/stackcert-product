# Design Partner Pilot Checklist

Use this checklist before a design partner puts real app metadata or non-secret
evaluation artifacts into StackCert. The launch posture is a guided pilot, not
broad self-serve production.

## Pilot Mode

- Primary path: uploaded-output pilot.
- Customer brings: one LLM app, representative examples, and safety-check
  outputs from their own systems.
- StackCert produces: recommendation, overlap analysis, targeted tests, scoped
  release report, and optional release-gate checks.
- Managed REST/model-judge runs are advanced/beta and must stay behind budget
  caps and redacted secret handling.
- StackCert does not host arbitrary customer local models in v1. Customer-owned
  models should be represented by uploaded outputs, customer-hosted REST
  endpoints, or a future customer-run worker.

## Required Before Real Customer Data

- Data handling: confirm customer data mode, retention expectation, and whether
  examples are raw, redacted, hashes-only, or customer-hosted.
- Auth: configure production Supabase sender domain, email templates, email
  confirmation policy, and invite/account lifecycle copy.
- Monitoring: configure Sentry DSNs, Cloud Run log-based alerts, and uptime
  checks for `/api/health`, authenticated `/api/projects`, and the Cloudflare
  same-origin API proxy.
- Backups: rehearse Supabase Postgres and Storage restore, then record restore
  date, operator, source snapshot, restored target, and verification command.
- Release scope: confirm the design partner understands that the release report
  is scoped to the app, example mix, safety options, versions, release goal
  weighting, and assumptions.
- Support: record owner, escalation channel, expected response window, and
  rollback contact for the pilot.

## Evidence To Keep

- Local and hosted smoke command output.
- Sentry project DSNs configured in the relevant runtime environment, without
  storing DSNs in source.
- Alert policy identifiers or screenshots for API 5xx, worker dead letters,
  provider failures, and release-gate errors.
- Uptime check identifiers for health, authenticated API, and Cloudflare proxy.
- Backup/restore rehearsal notes.
- Signed webhook test result showing one valid pass and one failed signature.
