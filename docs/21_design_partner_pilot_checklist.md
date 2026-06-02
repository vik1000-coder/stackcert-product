# Design Partner Pilot Checklist

Use this checklist before a design partner puts real app metadata or non-secret
evaluation artifacts into StackCert. The launch posture is a guided pilot, not
broad self-serve production.

## Current Status

As of 2026-06-02, the product is deployable as a staging design-partner demo,
not yet cleared for real customer data.

Done:

- Safe sample pilots for customer support, internal assistant, and agentic
  workflows can be duplicated into private projects.
- Template-seeded runs are explicitly marked as sample evidence and must be
  replaced before a buyer-facing release claim.
- Uploaded-output pilot path is the primary private-pilot setup flow.
- REST/model-judge connectors require recent passing live validation before
  worker-backed provider runs.
- Release reports have durable versions and Markdown/JSON/PDF export controls.
- Project permissions expose Admin, Editor, Reviewer, and Viewer capabilities,
  with restricted UI controls disabled instead of silently hidden.
- Retention policies can be previewed or applied for raw examples, provider
  responses, redacted snippets, and aggregate retention.
- YAML config import can preview/apply pilot profile fields, safety options,
  examples references, combination rules, and release context.
- Public `/proof` page shows the narrow benchmark, Grok 4.3 comparison,
  fail-closed voting rule, example input/output summaries, and cost simulator.
- Public pilot-readiness, procurement, support, integrations, sitemap, and
  `llms.txt` pages/files are updated for the design-partner posture.
- Signed generic release-gate webhook exists:
  `POST /api/projects/{project_id}/release-gates/webhook`.
- Non-Sentry operations evidence checker exists:
  `scripts/design_partner_ops_check.py`.
- Latest local gates passed for the hosted-pilot hardening slice: frontend
  typecheck, targeted frontend workflow tests, targeted service controls, and
  the core API regression suite.
- Latest Playwright QA passed through sample duplication, private overview,
  report PDF export, setup config preview, admin retention preview, and 390px
  mobile setup overflow check.
- Latest public hosted smoke passed against Cloudflare same-origin API and
  direct Cloud Run `/api/health`.

Still required before real customer data:

- Export Supabase smoke credentials and rerun authenticated hosted smoke,
  hosted uploaded-output pilot smoke, signed webhook smoke, and worker smoke.
- Fill the operations evidence template and run the checker in strict mode.
- Configure uptime checks, Cloud Run log-based alerts, Supabase restore
  rehearsal evidence, Supabase Auth sender/templates, customer data contract,
  and support owner.
- Run one real design-partner pilot with agreed redaction/retention terms.

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
- Monitoring: configure Cloud Run log-based alerts and uptime checks for
  `/api/health`, authenticated `/api/projects`, and the Cloudflare same-origin
  API proxy. Sentry is intentionally skipped for the current hardening pass.
- Backups: rehearse Supabase Postgres and Storage restore, then record restore
  date, operator, source snapshot, restored target, and verification command.
- Release scope: confirm the design partner understands that the release report
  is scoped to the app, example mix, safety options, versions, release goal
  weighting, and assumptions.
- Support: record owner, escalation channel, expected response window, and
  rollback contact for the pilot.

## Evidence To Keep

- Local and hosted smoke command output.
- Alert policy identifiers or screenshots for API 5xx, worker dead letters,
  provider failures, and release-gate errors.
- Uptime check identifiers for health, authenticated API, and Cloudflare proxy.
- Backup/restore rehearsal notes.
- Signed webhook test result showing one valid pass and one failed signature.

## Readiness Evidence Template

Use `uv run python scripts/design_partner_ops_check.py --print-template` to
create the evidence object. Fill each value with an alert id, uptime check id,
restore rehearsal note, or owner/contact reference, then run:

```bash
uv run python scripts/design_partner_ops_check.py \
  --evidence-json artifacts/design-partner-ops-evidence.json \
  --strict
```

The checker is read-only and does not configure cloud resources. It prevents the
team from calling a pilot production-ready until the non-Sentry operational
evidence exists.

## Customer Data Controls

- Pick one data mode before import: raw-allowed, redacted snippets, hashes-only,
  or customer-hosted artifacts.
- Record retention and deletion/export owner before uploading real examples.
- Prefer uploaded outputs for local/customer-owned models; do not ask a design
  partner to send model weights or local-model credentials.
- Record the exact release context in the run: model id/version, prompt hash,
  policy hash, tool config hash, retrieval config hash, and traffic profile.
- Re-run the report when any release-context value changes.
