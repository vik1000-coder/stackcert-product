# Design Partner Pilot Checklist

Use this checklist before a design partner puts real app metadata or non-secret
evaluation artifacts into StackCert. The launch posture is a guided pilot, not
broad self-serve production.

## Current Status

As of 2026-06-05, the product is deployable as staging design-partner
infrastructure, but not yet cleared for real customer data.

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
- Static Cloudflare asset responses now have deployable security headers for
  CSP, HSTS, frame denial, referrer policy, permissions policy, and MIME
  sniffing protection.
- Frontend routes are code-split; the previous production build bundle warning
  is gone.
- Mobile setup anchors land below the sticky header, and demo bundle cold cache
  fills are serialized per lambda cost to avoid duplicated expensive first-load
  work.
- Latest local Browser QA passed for `/proof` at 1280px, `/pilot-readiness` at
  390px, and `/app/ws_demo/proj_acme_copilot/setup` at 390px with no console
  warnings/errors and no horizontal overflow.
- Cloudflare Worker static-header deployment is live as version
  `423d5df7-05a2-4e35-a563-7e2287dfe6b6`; live root responses include CSP,
  HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, and nosniff.
- Authenticated hosted smokes passed on 2026-06-05: Supabase sign-in,
  authenticated `/api/projects`, MCP release evidence, uploaded-output pilot,
  signed release-gate webhook, and Cloud Run worker execution.
- Google Cloud uptime checks are configured for direct Cloud Run `/api/health`
  and Cloudflare same-origin `/api/health`.
- Google Cloud log-based metrics and alert policies are configured for API 5xx,
  worker dead letters, provider failures, and release-gate errors.
- Google Cloud alert policies route to notification channel
  `projects/project-e7840c42-f298-4bd9-bff/notificationChannels/12163037838207638915`
  for the staging support email.
- Supabase schema restore rehearsal completed against a disposable local
  Postgres target; evidence is recorded in
  `artifacts/design-partner-ops-evidence.json`.
- Repeatable full restore rehearsal tooling exists in
  `scripts/supabase_restore_rehearsal.py`; the latest run restored
  `public,private,storage` plus Storage metadata into disposable
  `postgres:17-alpine` and verified 28 public tables, 8 storage tables,
  6 buckets, and 11 storage objects.
- `uv run python scripts/design_partner_ops_check.py --evidence-json artifacts/design-partner-ops-evidence.json --strict`
  passes.
- Launch artifact templates are in `docs/25_launch_readiness_artifacts.md`.

Still required before real customer data:

- Run one real design-partner pilot with agreed redaction/retention terms.
- Configure production-grade Supabase Auth custom sender domain/SMTP and
  reviewed invite/password lifecycle templates before broad production.
- Complete and sign the customer data terms in
  `docs/25_launch_readiness_artifacts.md` for the first real pilot.
- Add the first customer-specific release-gate adapter and observe throttling
  under real managed-provider traffic.

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
- Monitoring: Cloud Run log-based alert policies, health uptime checks, and
  alert notification routing are configured for staging. Sentry is
  intentionally skipped for the current hardening pass.
- Backups: Supabase schema restore has been rehearsed for staging. Before paid
  production, rehearse the full Postgres and Storage restore path, then record
  restore date, operator, source snapshot, restored target, and verification
  command.
- Release scope: confirm the design partner understands that the release report
  is scoped to the app, example mix, safety options, versions, release goal
  weighting, and assumptions.
- Support: record owner, escalation channel, expected response window, and
  rollback contact for the pilot.

## Evidence To Keep

- Local and hosted smoke command output.
- Alert policy identifiers or screenshots for API 5xx, worker dead letters,
  provider failures, release-gate errors, and attached notification channels.
- Uptime check identifiers for direct Cloud Run health and Cloudflare
  same-origin health; add authenticated API or release-gate checks when a
  credentialed monitor is approved.
- Backup/restore rehearsal notes for schema and, before paid production, full
  Postgres plus Storage restore.
- Signed webhook test result showing one valid pass and one failed signature.
- Completed Auth email setup, customer data terms, first-pilot execution,
  adapter intake, and provider-throttling sections from
  `docs/25_launch_readiness_artifacts.md` when applicable.

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
