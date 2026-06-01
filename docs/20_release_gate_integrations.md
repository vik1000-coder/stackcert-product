# Release Gate Integrations

Last updated: 2026-06-01

StackCert release gates are designed to fail closed. Deployment systems call
`POST /api/projects/{project_id}/release-gates/evaluate` with the release
context they are about to ship. StackCert returns `pass`, `warn`, or `block`
with machine-readable reasons.

Deployment systems that cannot store a bearer token can instead call
`POST /api/projects/{project_id}/release-gates/webhook` with the same JSON
payload plus optional event metadata. Sign `timestamp.raw_body` with
HMAC-SHA256 and send:

- `X-StackCert-Timestamp`
- `X-StackCert-Signature`

## Supported Examples

- GitHub Actions: `.github/workflows/certificate-gate.yml`
- GitHub composite action: `integrations/release-gates/github-action/action.yml`
- GitHub example workflow: `integrations/release-gates/github-actions.yml`
- GitLab CI: `integrations/release-gates/gitlab-ci.yml`
- CircleCI: `integrations/release-gates/circleci-config.yml`
- Generic webhook payload: `integrations/release-gates/generic-webhook-request.json`
- Generic webhook smoke: `scripts/release_gate_webhook_smoke.py`

## GitHub Actions

Use the reusable workflow when this repository is checked out in the pipeline.
Use the composite action when another repository wants a drop-in CI step:

```yaml
steps:
  - uses: savikk129/multi_agents/stackcert_product/integrations/release-gates/github-action@main
    with:
      api-url: ${{ vars.STACKCERT_API_URL }}
      project-id: ${{ vars.STACKCERT_PROJECT_ID }}
      token: ${{ secrets.STACKCERT_RELEASE_GATE_TOKEN }}
      required-status: valid
      environment: production
```

The action calls the release-gate API directly and emits `decision`, `status`,
`blocking-reasons`, and `warnings` outputs for later deployment steps.

## Required Secrets

- `STACKCERT_API_URL`
- `STACKCERT_PROJECT_ID`
- `STACKCERT_API_TOKEN`
- `STACKCERT_RELEASE_WEBHOOK_SECRET_HASHES`
- `STACKCERT_RELEASE_WEBHOOK_SECRET_PROJECTS`

The token should be a release-gate-only machine token with
`release_gate:read`, scoped to the target project. It should not be an app user
token or MCP token.

Webhook secrets are environment configured for v1 and project scoped, matching
the current machine-token posture. Customer-facing webhook secret management is
deferred until a design partner needs rotation in the UI.

## Context Matching

Release gates can now compare evidence packet context against deployment
context:

- `model_id`
- `model_version`
- `prompt_hash`
- `policy_hash`
- `benchmark_suite_id`
- `benchmark_suite_version`
- `guard_connector_versions`

Missing context warns. Mismatched context blocks in fail mode.
