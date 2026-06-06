# StackCert Models, Benchmarks, And Custom Tests Plan

## Product Goal

StackCert should become the place where a team defines what their LLM app must
and must not do, tests candidate safety-check combinations against that behavior,
and chooses the best configuration with cost and risk tradeoffs visible.

The product should support:

- Built-in benchmark suites.
- Customer-provided datasets.
- Custom questions and behaviors made in the UI.
- Model/safety-check/judge connectors.
- Cost-aware targeted-test planning.
- Reproducible benchmark and run versions.

## Benchmark Registry

Initial sources:

- Existing CASS 2,000-example data.
- User-provided JSONL/CSV uploads.
- Curated benchmark packs after license review.
- Buyer-facing templates for customer support, internal assistant, and agentic
  workflow release checks.

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

Template packs should be customizable by the buyer before release use:

- Customer support: refunds, abuse handling, account access, privacy, escalation,
  policy refusal, benign support requests.
- Internal assistant: confidential data access, policy quality, HR/IT routing,
  safe knowledge lookup, unsupported action requests.
- Agentic workflow: tool misuse, approval bypass, unauthorized state changes,
  payment/vendor actions, rollback paths, safe read-only summaries.

Each template should expose editable fields for `example_id`, `input`, `output`,
`expected_decision`, `risk_category`, `weight`, `severity`, `metadata`, source,
and holdout split. Template examples are tuning/bootstrap aids; buyer release
reports should mark them separately from private evidence.

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

The app should prevent release evidence from depending on draft or invalid
behaviors unless the evidence explicitly marks them provisional.

## Model And Safety Check Registry

Concepts:

- A model is an LLM or classifier used as a safety check, judge, or target.
- A safety check is a configured decision layer with versioned thresholds,
  prompts, rules, or provider settings.
- A combination is an ordered composition of safety checks.

Safety-check fields:

- Safety-check ID.
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

Candidate pools should be broad enough that CASS is choosing among real buyer
options, not just proving a favorite local pair. The registry should support:

- Frontier baselines: OpenAI, Anthropic, Google, xAI, or another buyer-approved
  closed-source model through an OpenAI-compatible or provider-specific adapter.
- Open/open-weight judges: Qwen, Llama, Gemma, Mistral/Mixtral, Phi, DeepSeek,
  OLMo, and other buyer-hosted models represented by uploaded outputs, REST
  endpoints, or OpenAI-compatible model judge connectors.
- Safety guards: Llama Guard, ShieldGemma, Qwen Guard, LlamaFirewall-style
  workflow monitors, OpenGuardrails-style context guards, and customer-specific
  policy checks.
- Non-model controls: deterministic rules, lexical checks, classifiers, tool
  permission gates, MCP resource allowlists, human-review routes, and fallback
  routers.

Every candidate needs a deployment status: `available_now`, `uploaded_output`,
`connector_ready`, `requires_secret`, `requires_customer_hosting`, or
`research_only`.

## Evaluation Run Design

Run stages:

1. Draft.
2. Validating inputs.
3. Estimating cost.
4. Queued.
5. Running.
6. Aggregating.
7. Producing release evidence.
8. Complete.
9. Failed/canceled.

Every run should record:

- Workspace/project.
- Benchmark suite version.
- Candidate combinations.
- Safety-check versions.
- Risk profile.
- Data handling mode.
- Cost estimate.
- Actual usage.
- Worker/job events.
- Release-evidence output if issued.

## Targeted Test Planning

The test planner should be tied to real execution.

For each recommended targeted test:

- Safety-check pair.
- Example group.
- Side.
- Current uncertainty/radius.
- Comparisons affected.
- Expected decision help.
- Estimated provider calls.
- Estimated tokens.
- Estimated dollar cost.
- ETA.
- Priority score.

User actions:

- Select tests.
- Queue plan.
- Set budget cap.
- Set max wall time.
- Pause/cancel.
- Recompute recommendation and release evidence after results land.

## CASS v2 Candidate Replay

The current replay artifact is generated with:

```bash
uv run python scripts/cass_v2_replay.py
```

It writes `web/src/data/cassSearchReplay.json` and compares:

- `old_cass`: K=2 serial-veto reference.
- `CASS`: K<=4 candidate search over serial veto, majority, supermajority,
  unanimous-block, and quota rules.

Current saved-output results at lambda 5:

- Public 240-example frontier proof sample: old_cass local reference goal score
  0.5500; CASS v2 local search goal score 0.5687 with Llama 3.2 1B judge +
  Llama Guard 3 1B + Qwen3 8B. Grok remains strongest on raw score.
- Broader 2,000-example local fixture: old_cass reference goal score 0.5122;
  CASS v2 local search goal score 0.5934 with Llama Guard 3 1B + Phi-3 Mini
  judge + Qwen3 8B.

Use this as a product proof of broader candidate search, not as a universal
claim that small/open-weight committees beat frontier models.

## Model And Benchmark Testing Strategy

Use fake adapters first:

- Deterministic fake REST safety check.
- Deterministic fake model judge.
- Erroring provider.
- Slow provider.
- Rate-limited provider.

Then real adapters:

- Local Python safety check.
- REST safety check.
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

1. User selects "New evidence run".
2. App asks what the agent/app does and what failures matter.
3. User selects built-in benchmark packs.
4. User adds custom behaviors/questions on the fly.
5. App validates and versions the suite.
6. User connects candidate safety checks/models.
7. App estimates cost and time.
8. Worker runs targeted tests.
9. App recommends a combination or next targeted tests.
10. User issues release evidence.
11. App watches drift and prompts retesting.

The core promise: no spreadsheet wrangling, no one-off scripts, no separate
audit binder, and no blind trust in one-at-a-time scores.
