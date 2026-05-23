# StackCert Cost And Future Integrations Plan

## Cost Product Goal

Users should be able to see the cost of each guardrail configuration before and
after running it.

Cost should be visible in:

- Stack Ranking.
- Measurement Planner.
- Run detail.
- Certificate artifact.
- Workspace budget.
- Public/pricing strategy later.

## Cost Components

Track:

- Provider/model input tokens.
- Provider/model output tokens.
- Per-request provider costs.
- Hosted guard costs.
- Worker CPU/memory time.
- Storage.
- Data transfer.
- Human review/signoff cost proxy later.

Each run should have:

- Estimated cost before execution.
- Actual cost after execution.
- Cost by provider.
- Cost by guard.
- Cost by benchmark cell.
- Cost by measurement action.

## Cost Schema

Suggested tables:

- `provider_price_cards`
- `cost_estimates`
- `usage_events`
- `run_cost_summaries`
- `workspace_budgets`

`usage_events` should be append-only and include:

- Workspace/project/run/job.
- Provider.
- Model or guard.
- Operation.
- Input tokens.
- Output tokens.
- Request count.
- Duration.
- Estimated cost.
- Actual cost if known.
- Currency.

## Cost UX

Show cost in:

- Pre-run estimate panel.
- Measurement planner selected-cost summary.
- Ranking table cost/latency columns.
- Certificate "evidence cost" section.
- Workspace usage ledger.

Useful metrics:

- Cost to certify.
- Cost avoided vs exhaustive measurement.
- Expected value per measurement dollar.
- Marginal welfare per dollar.
- Monthly projected cost at current traffic.
- Latency impact of each stack.

## Budget Controls

Support:

- Workspace monthly budget.
- Project budget.
- Per-run max spend.
- Per-measurement plan budget.
- Provider-specific caps.
- Concurrency caps.
- Alert thresholds.
- Hard stop on budget exhaustion.

Workers must check budget before expensive actions and write usage events as
they run.

## Future Integrations

### Deployment Pipelines

Goal: let customers use StackCert as a gate in existing delivery workflows.

Targets:

- GitHub Actions.
- GitLab CI.
- CircleCI.
- Buildkite.
- ArgoCD.
- Generic webhook.

Capabilities:

- Fetch latest certificate status.
- Fail or warn when certificate is expired/provisional/revoked.
- Attach certificate artifact to deployment record.
- Trigger re-certification on model/guard/prompt changes.

### Agent And LLM Observability

Targets:

- LangSmith.
- Langfuse.
- W&B Weave.
- MLflow.
- OpenTelemetry.
- Datadog.
- Honeycomb.
- Sentry.

Capabilities:

- Import traffic samples.
- Detect prompt/model/tool changes.
- Create drift signals.
- Attach certificate IDs to traces.
- Send incidents back to StackCert.

### Data And ML Platforms

Targets:

- Vertex AI.
- AWS Bedrock.
- Azure AI Foundry.
- Databricks.
- Snowflake.
- S3/GCS/Azure Blob.

Capabilities:

- Import benchmark datasets.
- Run evaluations near customer data.
- Store artifacts in customer-controlled storage.
- Support self-hosted/VPC deployments.

### Collaboration And GRC

Targets:

- Slack.
- Jira.
- Linear.
- PagerDuty.
- ServiceNow.
- Vanta/Drata-style evidence tools later.

Capabilities:

- Notify on drift.
- Request signoff.
- Create review tickets.
- Export evidence packages.
- Track remediation.

### Identity And Enterprise

Targets:

- SAML/OIDC SSO.
- SCIM.
- Customer-managed keys.
- PrivateLink/VPC peering.
- Audit log export.

Capabilities:

- Enterprise identity.
- Centralized provisioning.
- Strong data residency story.
- Self-hosted or customer cloud deployment.

## Integration Prioritization

Do first:

1. GitHub Actions status gate.
2. Generic webhook.
3. Slack notifications.
4. LangSmith or Langfuse import, based on design-partner demand.

Do later:

1. SSO/SAML.
2. Jira/Linear/ServiceNow.
3. VPC/self-hosted.
4. Cloud ML platform deep integrations.

## Integration Testing

Each integration needs:

- Contract tests for request/response payloads.
- Signature verification tests.
- Permission scope tests.
- Retry and idempotency tests.
- Sandbox smoke tests.
- Failure mode tests.

