# Launch Readiness Artifacts

Last updated: 2026-06-05

Use this file for the non-code artifacts required before StackCert handles real
design-partner customer data. The staging system now has hosted smokes,
Cloudflare security headers, Google Cloud uptime checks, log-based alert
policies with notification routing, and a repeatable Supabase restore rehearsal.
The remaining launch work is mostly operational ownership, legal/commercial
agreement, and first-customer execution.

## Supabase Auth Email Setup

Complete in the Supabase dashboard before broad production:

- Sender identity:
  - custom sender domain configured and verified;
  - SPF, DKIM, and DMARC records checked;
  - production sender name and reply-to owner chosen.
- SMTP:
  - production SMTP provider selected;
  - Supabase SMTP host, port, username, and password configured;
  - test invite, confirmation, and password reset messages delivered.
- Account lifecycle:
  - email confirmation policy chosen;
  - invite expiration and resend policy chosen;
  - password reset route verified against the hosted app;
  - account removal/deactivation owner recorded.
- Templates:
  - invite template reviewed;
  - email confirmation template reviewed;
  - magic-link template either disabled or reviewed;
  - password reset template reviewed;
  - email-change template reviewed.

Evidence to keep:

```text
Sender domain:
SMTP provider:
Templates reviewed by:
Confirmation policy:
Invite/reset smoke result:
Dashboard screenshot or internal ticket:
```

## Customer Data Terms

Use this checklist before importing any real customer examples, outputs, or app
metadata.

- Customer:
- Workflow/app name:
- StackCert project id:
- Data mode:
  - redacted snippets;
  - hashes-only;
  - customer-hosted artifacts;
  - raw allowed only if explicitly signed.
- Allowed artifacts:
  - examples;
  - safety-check outputs;
  - release-context hashes;
  - release reports;
  - provider responses;
  - private artifacts.
- Prohibited artifacts:
  - model weights;
  - local-model credentials;
  - provider secrets;
  - production user secrets;
  - unnecessary raw conversations.
- Retention:
  - raw examples retention:
  - provider responses retention:
  - redacted snippets retention:
  - aggregate evidence retention:
- Deletion/export owner:
- Support owner:
- Customer rollback/escalation contact:
- Signed terms location:

## First Pilot Execution Checklist

The first sellable pilot should stay uploaded-output first.

1. Signed terms and data mode are complete.
2. Customer creates or approves one private pilot project.
3. Customer provides representative examples with stable `external_id` values.
4. Customer provides safety-check outputs keyed to the same example ids.
5. StackCert runs uploaded-output preview and confirms full coverage.
6. StackCert creates the uploaded-output run.
7. StackCert reviews recommendation, overlap, cost, and targeted tests.
8. StackCert issues a release report with explicit scope and retest triggers.
9. Customer reviewer signs off or records an override.
10. StackCert wires one release gate in the customer's chosen workflow.
11. StackCert verifies pass, warn, and block behavior.
12. StackCert records support owner, retention owner, and next retest date.

Success criteria:

- Customer can complete the uploaded-output path without command-line help.
- Release report states scope, assumptions, limitations, and retest triggers.
- Release gate can pass, warn, and block in the customer workflow.
- Customer can explain why the recommended combination beats the default
  safety-check posture for the scoped workflow.

## Customer-Specific Adapter Intake

Use this intake before building a platform-specific release-gate adapter. Do
not build one until a named customer workflow exists; generic GitHub Actions,
GitLab CI, CircleCI, API, MCP, and HMAC webhook paths already exist.

- Customer:
- Platform:
  - GitHub Actions;
  - GitLab CI;
  - CircleCI;
  - Buildkite;
  - Jenkins;
  - Argo CD;
  - Harness;
  - custom deploy service;
  - agent workflow.
- Trigger event:
- Required auth mode:
  - release-gate machine token;
  - HMAC signed webhook;
  - customer secret manager;
  - OIDC/federated identity.
- Payload fields available:
- Required release-context fields:
  - model id/version;
  - prompt hash;
  - policy hash;
  - tool config hash;
  - retrieval config hash;
  - traffic profile.
- Where pass/warn/block should appear:
- Required rollback behavior:
- Audit/log retention requirement:
- Customer owner:
- StackCert owner:

Adapter done means:

- The adapter calls the existing release-gate evaluator or signed webhook.
- Secrets are never logged.
- Invalid signatures/tokens fail closed.
- Context mismatches block.
- The customer can see a clear pass/warn/block result in their workflow.
- A smoke test covers at least one pass and one block.

## Provider Throttling Observation

Managed REST/model-judge runs should remain beta until real provider traffic has
been observed.

Run this observation after a design partner opts into managed providers:

- Connector live test passes within the last seven days.
- Run budget cap is configured.
- Provider timeout and retry settings are recorded.
- One small run completes successfully.
- One controlled failure or rate-limit case is captured if feasible.
- Admin provider-health view shows usage, timeout, retry, rate-limit, and
  dead-letter state.
- Customer-facing recommendation still prefers uploaded outputs when provider
  traffic is unnecessary.

Evidence to keep:

```text
Project id:
Provider/adapter:
Run id:
Usage event ids:
Timeout/retry settings:
Observed rate-limit or no-rate-limit note:
Dead-letter/retry result:
Provider-health screenshot or exported summary:
Decision to keep/expand managed provider mode:
```
