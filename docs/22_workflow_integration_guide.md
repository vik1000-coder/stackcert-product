# Workflow Integration Guide

Use this guide when a design partner asks how StackCert fits into their normal
release workflow. The v1 path is intentionally narrow: issue a scoped release
report, then ask StackCert whether a deployment context should pass, warn, or
block.

## Supported Gate Paths

- GitHub Actions: `integrations/release-gates/github-action/action.yml`.
- GitHub reusable workflow: `.github/workflows/certificate-gate.yml`.
- GitLab CI: `integrations/release-gates/gitlab-ci.yml`.
- CircleCI: `integrations/release-gates/circleci-config.yml`.
- Generic HMAC webhook:
  `POST /api/projects/{project_id}/release-gates/webhook`.
- API/MCP: authenticated release-report status and retest guidance.

## Generic Webhook Contract

Sign `timestamp.raw_body` with the project-scoped webhook secret and send:

- `X-StackCert-Timestamp`
- `X-StackCert-Signature`

Payload fields reuse the release-gate evaluator:

- `environment`
- `run_id`
- `required_status`
- `mode`
- `lambda_cost`
- `model_id`
- `model_version`
- `prompt_hash`
- `policy_hash`
- `benchmark_suite_id`
- `benchmark_suite_version`
- `guard_connector_versions`
- optional `event_id`, `event_source`, and `event_type`

## Notification Pattern

For v1, prefer workflow-native notifications rather than a new StackCert-owned
notification system:

- GitHub/GitLab/CircleCI job annotations and deployment status.
- Slack or Teams message posted by the deployment workflow after reading the
  StackCert decision.
- PagerDuty or ticket creation owned by the customer release system.

Native outbound Slack/Jira/Linear integrations should wait until a design
partner names the exact workflow and payload they need.

## Integration Acceptance Criteria

- A passing release report allows deployment.
- A warning report is visible in the workflow and requires the agreed manual
  review policy.
- A blocking report fails the workflow.
- A stale or mismatched release context blocks in fail mode.
- A failed webhook signature is visible in audit/admin logs without exposing the
  raw secret.
