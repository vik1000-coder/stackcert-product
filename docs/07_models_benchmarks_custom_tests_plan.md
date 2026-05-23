# StackCert Models, Benchmarks, And Custom Tests Plan

## Product Goal

StackCert should become the place where a team defines what their AI system must
not do, tests candidate guardrail stacks against that behavior, and certifies
the best configuration with cost and risk tradeoffs visible.

The product should support:

- Built-in benchmark suites.
- Customer-provided datasets.
- Custom questions and behaviors made in the UI.
- Model/guard/judge connectors.
- Cost-aware measurement planning.
- Reproducible benchmark and run versions.

## Benchmark Registry

Initial sources:

- Existing CASS 2,000-example data.
- User-provided JSONL/CSV uploads.
- Curated benchmark packs after license review.

Each benchmark suite should include:

- Suite ID.
- Name.
- Version.
- License/source.
- Owner.
- Creation timestamp.
- Cells.
- Examples.
- Labels.
- Side: adversarial or benign.
- Weights.
- Validation status.

Benchmark cells should include:

- Cell ID.
- Name.
- Side.
- Policy category.
- Severity.
- Weight.
- Description.
- Example count.

## Custom Behavior Builder

Users should be able to define custom tests inside StackCert.

Behavior fields:

- Name.
- Description.
- Target application context.
- Expected safe behavior.
- Unsafe behavior to detect.
- Side: adversarial or benign.
- Policy category.
- Severity.
- Tags.
- Prompt/question text.
- Optional prompt template variables.
- Expected output label or grading rubric.
- Redaction sensitivity.

Creation modes:

- Manual single question.
- Bulk paste/import.
- CSV/JSONL upload.
- Template-based generation.
- Future AI-assisted generation with human approval.

Important:

- User-created attack content can be sensitive. Store and display according to
  project data handling mode.
- Generated questions should be drafts until reviewed.
- Every behavior set needs a version.

## Quality Controls For Custom Tests

Validation should check:

- Required fields.
- Duplicate or near-duplicate examples.
- Missing side labels.
- Unmapped policy categories.
- Empty expected behavior.
- Unsupported file format.
- Invalid template variables.
- Excessive prompt length.
- Unsafe storage mode mismatch.

Review workflow:

- Draft.
- Validated.
- Approved.
- Archived.

The app should prevent a certificate from depending on draft or invalid
behaviors unless the certificate explicitly marks them provisional.

## Model And Guard Registry

Concepts:

- A model is an LLM or classifier used as a guard, judge, or target.
- A guard is a configured decision layer with versioned thresholds/prompts.
- A stack is an ordered composition of guards.

Guard fields:

- Guard ID.
- Display name.
- Type: rules, lexical, classifier, model judge, REST, Python, hosted provider.
- Version.
- Adapter type.
- Endpoint or provider reference.
- Decision schema.
- Latency estimate.
- Cost model.
- Owner.

Adapter types:

- Uploaded outputs.
- REST adapter.
- Python/local adapter.
- Model judge adapter.
- Local model adapter.
- Future hosted provider adapters.

## Evaluation Run Design

Run stages:

1. Draft.
2. Validating inputs.
3. Estimating cost.
4. Queued.
5. Running.
6. Aggregating.
7. Certifying.
8. Complete.
9. Failed/canceled.

Every run should record:

- Workspace/project.
- Benchmark suite version.
- Candidate stacks.
- Guard versions.
- Welfare/risk profile.
- Data handling mode.
- Cost estimate.
- Actual usage.
- Worker/job events.
- Certificate output if issued.

## Measurement Planning

The Measurement Planner should be tied to real execution.

For each recommended measurement:

- Guard pair.
- Benchmark cell.
- Side.
- Current uncertainty/radius.
- Comparisons affected.
- Expected radius reduction.
- Estimated provider calls.
- Estimated tokens.
- Estimated dollar cost.
- ETA.
- Priority score.

User actions:

- Select measurements.
- Queue plan.
- Set budget cap.
- Set max wall time.
- Pause/cancel.
- Recompute certificate after results land.

## Model And Benchmark Testing Strategy

Use fake adapters first:

- Deterministic fake REST guard.
- Deterministic fake model judge.
- Erroring provider.
- Slow provider.
- Rate-limited provider.

Then real adapters:

- Local Python guard.
- REST guard.
- Local model or Ollama-style adapter if available.
- Hosted provider adapter after secret handling is hardened.

Tests:

- Adapter contract tests.
- Output parser tests.
- Error classification tests.
- Retry and timeout tests.
- Cost accounting tests.
- Benchmark validation tests.
- Golden run replay tests.

## One-Stop-Shop Workflow

The eventual ideal flow:

1. User selects "New certification".
2. App asks what the agent/app does and what failures matter.
3. User selects built-in benchmark packs.
4. User adds custom behaviors/questions on the fly.
5. App validates and versions the suite.
6. User connects candidate guards/models.
7. App estimates cost and time.
8. Worker runs measurements.
9. App recommends a stack or next measurements.
10. User issues certificate.
11. App watches drift and recertifies.

The core promise: no spreadsheet wrangling, no one-off scripts, no separate
audit binder, and no blind trust in marginal scores.

