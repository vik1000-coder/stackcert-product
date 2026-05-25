# Release Gate Integrations

Last updated: 2026-05-25

StackCert release gates are designed to fail closed. Deployment systems call
`POST /api/projects/{project_id}/release-gates/evaluate` with the release
context they are about to ship. StackCert returns `pass`, `warn`, or `block`
with machine-readable reasons.

## Supported Examples

- GitHub Actions: `.github/workflows/certificate-gate.yml`
- GitLab CI: `integrations/release-gates/gitlab-ci.yml`
- CircleCI: `integrations/release-gates/circleci-config.yml`
- Generic webhook payload: `integrations/release-gates/generic-webhook-request.json`

## Required Secrets

- `STACKCERT_API_URL`
- `STACKCERT_PROJECT_ID`
- `STACKCERT_API_TOKEN`

The token should be a release-gate-only machine token with
`release_gate:read`, scoped to the target project. It should not be an app user
token or MCP token.

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
