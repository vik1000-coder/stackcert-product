# StackCert User And Product Plan

## Product Thesis

StackCert should be a one-stop guardrail certification workbench for teams that
ship AI agents, copilots, or model-backed workflows into environments where
safety, reliability, and auditability matter.

The product should not feel like a generic BI dashboard. It should feel like an
AI safety launch-gate console: precise, operational, evidence-backed, and useful
before, during, and after launch.

The user should be able to:

1. Choose or create the benchmark behaviors they care about.
2. Connect candidate guards, model judges, policies, or custom adapters.
3. Estimate quality, risk, latency, and cost for competing guardrail stacks.
4. Run only the measurements needed to certify or refute a stack.
5. Export a certificate that a security or GRC reviewer can understand.
6. Keep watching drift after launch so old certificates do not silently remain
   trusted.

## Primary Users

### AI Security Lead

This is the primary buyer and daily power user.

Responsibilities:

- Own jailbreak, prompt-injection, unsafe-content, data-exposure, tool-risk, and
  policy compliance controls.
- Decide whether a guardrail stack is launch-ready.
- Explain why a marginally good guard pair can still fail together.
- Trigger re-certification after guard, model, prompt, traffic, or incident
  changes.

StackCert value:

- Surfaces co-failure, not only marginal pass/block rates.
- Explains why the winning stack is defensible.
- Converts a review into an evidence artifact.
- Gives a recurring drift workflow instead of a one-time report.

Most important screens:

- Overview
- Stack Ranking
- Co-Failure
- Measurements
- Certificate
- Drift

### AI Platform Engineer

Responsibilities:

- Connect guard APIs, local policies, model judges, benchmark sets, and
  evaluation jobs.
- Keep guard versions, prompts, thresholds, and run metadata accurate.
- Make evaluations reproducible and affordable.
- Wire certification into existing deployment workflows.

StackCert value:

- Adapter registry for REST, Python, local, and provider-backed guards.
- Run validation before any result is trusted.
- Measurement planner with cost, ETA, and expected value.
- APIs, CLI, and future CI/CD gates.

Most important screens:

- Setup and integrations
- Measurements
- Stack Ranking
- Drift
- Cost ledger

### Model Risk / GRC Reviewer

Responsibilities:

- Review scope, assumptions, candidate set, benchmark mixture, residual risk,
  and signoff.
- Confirm that exported artifacts are stable and traceable.
- Preserve evidence for audits.

StackCert value:

- Conservative certificate language.
- Explicit assumptions and limitations.
- Immutable issued certificate snapshots.
- JSON, Markdown, PDF, and API exports.
- Audit log and signer workflow.

Most important screens:

- Certificate
- Overview
- Audit log
- Drift history

### Product Owner

Responsibilities:

- Balance user friction from false blocks against safety risk.
- Understand how risk profile choices affect launch and cost.
- Decide whether more measurement spend is worth it.

StackCert value:

- Named risk profiles that map to lambda.
- Welfare tradeoff explanations in product terms.
- Config cost and latency comparisons.
- Regret avoided by using full StackCert evaluation instead of marginal scores.

Most important screens:

- Overview
- Stack Ranking
- Cost comparison
- Benign false-block view

### Solutions Engineer / Customer Success

Responsibilities:

- Run pilots.
- Import customer data.
- Configure candidate guards and custom behaviors.
- Produce evidence packets quickly.

StackCert value:

- Guided onboarding.
- Built-in benchmarks plus custom behavior generation/import.
- Demo-safe seeded project.
- Reusable reports and customer-specific templates.

Most important screens:

- Landing page
- Onboarding
- Setup/import
- All evidence screens

## Public Site

The latest design adds a production-facing public site. It should serve two jobs:

1. Convert qualified safety, platform, and risk teams.
2. Explain the non-obvious insight: stacking guardrails creates a hidden
   correlation tax.

Required public pages for the first production pass:

- Landing page from `Landing.html`.
- Pricing section from the design.
- Security page or section.
- Methodology/docs entry point.
- Sign in and open app flows.

The landing page should remain clear and direct. The current design's strongest
messages are:

- "Certify the guardrail stack you actually ship."
- Marginal block-rates lie because co-failure matters.
- CASS schedules only the measurements needed to issue a defensible certificate.
- The product serves safety, platform, and risk teams from one evidence record.

## Authenticated Product Workflow

### 1. Create Workspace And Project

The user creates a workspace, then a project representing an app, agent, or
deployment surface.

Inputs:

- Workspace name and members.
- Project name and environment.
- Use case, risk tier, and deployment stage.
- Data handling mode: raw prompts allowed, redacted snippets, hashes only, or
  customer-hosted/private mode.

### 2. Choose Benchmarks And Behaviors

The product must support both built-in and user-defined evaluations.

Inputs:

- Provided benchmark suites from StackCert.
- Uploaded CSV/JSONL datasets.
- Custom behavior definitions created in the UI.
- Expected behavior, side label, severity, policy category, and tags.
- Optional prompt templates and generated variants.

Output:

- Versioned benchmark suite.
- Cell taxonomy and weights.
- Validation report before evaluation begins.

### 3. Connect Models, Guards, And Judges

The user defines candidate guardrails and candidate stacks.

Supported first:

- Uploaded guard outputs.
- REST guard adapter.
- Python/local guard adapter.
- Model judge adapter.
- Local/Ollama-style adapter when available.

Supported later:

- Hosted provider adapters.
- LangChain/LlamaIndex/LangGraph hooks.
- Customer CI/CD and observability integrations.

### 4. Validate And Estimate

Before a run starts, the user should see:

- Missing examples or guard outputs.
- Invalid labels or scores.
- Duplicate examples.
- Unmapped benchmark cells.
- Estimated token, model, compute, and storage cost.
- Estimated ETA and concurrency limits.

### 5. Run And Certify

The app runs evaluations or imports outputs, computes CASS statistics, ranks
candidate stacks, and determines what is certified.

Important:

- The frontend never computes certification.
- The FastAPI service calls the Python core.
- Certificates are issued from backend-generated immutable snapshots.

### 6. Measure Next

When a winner is unresolved, the Measurement Planner should recommend the next
measurements with:

- Expected radius reduction.
- Comparisons affected.
- Cost estimate.
- ETA estimate.
- Required provider/model calls.
- Confidence impact.

The user can queue a measurement plan and recompute.

### 7. Export And Sign Off

The certificate flow should support:

- JSON export for machines.
- Markdown export for model cards.
- PDF export for reviewers.
- Signoff by security, platform, and risk roles.
- Audit trail and immutable artifact storage.

### 8. Monitor Drift

Drift signals should include:

- Guard version change.
- Policy/prompt change.
- Base model change.
- Traffic mixture change.
- New attack family.
- Benchmark suite change.
- Incidents or manual flags.
- Time-based expiration.

Drift should lead to re-certification, not just an alert.

## What Must Be Real In The First Usable App

The first usable production-oriented build should include:

- Public landing page and app shell matching the latest design.
- Supabase Auth sign-in/sign-up.
- Workspace and project records in Supabase Postgres.
- Seeded demo project from the current CASS data.
- Six evidence screens using backend data.
- Certificate JSON and Markdown export.
- Basic storage for uploaded artifacts.
- CI running backend, frontend, DB, and smoke tests.

The first build can still defer:

- Full Stripe billing.
- Full SSO/SAML.
- Heavy provider marketplace.
- Enterprise self-hosting.
- PDF polish beyond a basic export.

