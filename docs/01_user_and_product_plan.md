# StackCert User And Product Plan

## Product Thesis

StackCert should be a one-stop workbench for teams choosing safety-check
combinations for AI agents, copilots, or model-backed workflows in environments
where safety, usefulness, reliability, cost, and auditability matter.

The product should not feel like a generic BI dashboard. It should feel like an
AI app release console: precise, operational, evidence-backed, and useful
before, during, and after launch. Users should not need to understand the CASS
paper before the product makes sense.

The user should be able to:

1. Choose or create app examples that represent the behavior they care about.
2. Connect candidate safety checks, model judges, policies, or custom adapters.
3. Compare safety, usefulness, latency, and cost for competing combinations.
4. Run only the targeted tests that can change the recommendation.
5. Export release evidence that a security or GRC reviewer can understand.
6. Keep watching drift after launch so old evidence does not silently remain
   trusted.

## Primary Users

### AI Security Lead

This is the primary buyer and daily power user.

Responsibilities:

- Own jailbreak, prompt-injection, unsafe-content, data-exposure, tool-risk, and
  policy compliance controls.
- Decide which safety-check combination is ready to ship.
- Explain why the obvious one-at-a-time pick can fail once checks are combined.
- Trigger retesting after safety-check, model, prompt, traffic, or incident
  changes.

StackCert value:

- Surfaces shared misses and shared false blocks, not only one-at-a-time scores.
- Explains why the recommended combination is defensible.
- Converts a review into scoped release evidence.
- Gives a recurring drift workflow instead of a one-time report.

Most important screens:

- Overview
- Options compared
- Overlap analysis
- Test plan and cost
- Release evidence
- When to retest

### AI Platform Engineer

Responsibilities:

- Connect safety-check APIs, local policies, model judges, example suites, and
  evaluation jobs.
- Keep safety-check versions, prompts, thresholds, and run metadata accurate.
- Make evaluations reproducible and affordable.
- Wire release evidence into existing deployment workflows.

StackCert value:

- Adapter registry for REST, Python, local, and provider-backed safety checks.
- Run validation before any result is trusted.
- Test plan with cost, ETA, and expected decision help.
- APIs, CLI, and future CI/CD gates.

Most important screens:

- Setup and integrations
- Test plan and cost
- Options compared
- When to retest
- Cost ledger

### Model Risk / GRC Reviewer

Responsibilities:

- Review scope, assumptions, candidate set, example mix, residual risk,
  and signoff.
- Confirm that exported artifacts are stable and traceable.
- Preserve evidence for audits.

StackCert value:

- Conservative release-evidence language.
- Explicit assumptions and limitations.
- Immutable evidence snapshots.
- JSON, Markdown, PDF, and API exports.
- Audit log and signer workflow.

Most important screens:

- Release evidence
- Overview
- Audit log
- Retest history

### Product Owner

Responsibilities:

- Balance user friction from false blocks against safety risk.
- Understand how risk profile choices affect launch and cost.
- Decide whether more measurement spend is worth it.

StackCert value:

- Named risk profiles that map to the risk weight.
- Safety/usefulness tradeoff explanations in product terms.
- Combination cost and latency comparisons.
- Lift over the obvious one-at-a-time pick.

Most important screens:

- Overview
- Options compared
- Cost comparison
- Normal-example false-block view

### Solutions Engineer / Customer Success

Responsibilities:

- Run pilots.
- Import customer data.
- Configure candidate safety checks and custom behaviors.
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
2. Explain the practical problem: LLM app teams have many safety options, and
   choosing how to combine them is hard.

Required public pages for the first production pass:

- Landing page from `Landing.html`.
- Pricing section from the design.
- Security page or section.
- Methodology/docs entry point.
- Sign in and open app flows.

The landing page should remain clear and direct. The current shipped messages
are:

- "Choose the right safety checks for your LLM app."
- Teams often pick the best single check, use a stronger model, add lots of
  context, or test every combination. Those shortcuts can be expensive,
  ambiguous, or misleading.
- StackCert compares combinations on app-specific examples and runs only the
  targeted overlap tests that can change the decision.
- The product serves safety, platform, and risk teams from one scoped evidence
  record.

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

### 2. Choose Examples And Behaviors

The product must support both built-in and user-defined evaluations.

Inputs:

- Provided example suites from StackCert.
- Uploaded CSV/JSONL datasets.
- Custom behavior definitions created in the UI.
- Expected behavior, side label, severity, policy category, and tags.
- Optional prompt templates and generated variants.

Output:

- Versioned example suite.
- Cell taxonomy and weights.
- Validation report before evaluation begins.

### 3. Connect Models, Safety Checks, And Judges

The user defines candidate safety checks and combinations.

Supported first:

- Uploaded safety-check outputs.
- REST safety-check adapter.
- Python/local safety-check adapter.
- Model judge adapter.
- Local/Ollama-style adapter when available.

Supported later:

- Hosted provider adapters.
- LangChain/LlamaIndex/LangGraph hooks.
- Customer CI/CD and observability integrations.

### 4. Validate And Estimate

Before a run starts, the user should see:

- Missing examples or safety-check outputs.
- Invalid labels or scores.
- Duplicate examples.
- Unmapped benchmark cells.
- Estimated token, model, compute, and storage cost.
- Estimated ETA and concurrency limits.

### 5. Compare And Recommend

The app runs evaluations or imports outputs, computes CASS statistics, ranks
candidate combinations, and determines what recommendation is supported.

Important:

- The frontend never computes release-evidence truth.
- The FastAPI service calls the Python core.
- Release evidence is issued from backend-generated immutable snapshots.

### 6. Measure Next

When a winner is unresolved, the test plan should recommend the next targeted
tests with:

- Expected decision help.
- Comparisons affected.
- Cost estimate.
- ETA estimate.
- Required provider/model calls.
- Confidence impact.

The user can queue a test plan and recompute.

### 7. Export And Sign Off

The release-evidence flow should support:

- JSON export for machines.
- Markdown export for model cards.
- PDF export for reviewers.
- Signoff by security, platform, and risk roles.
- Audit trail and immutable artifact storage.

### 8. Monitor Drift

Retest triggers should include:

- Safety-check version change.
- Policy/prompt change.
- Base model change.
- Traffic mixture change.
- New attack family.
- Benchmark suite change.
- Incidents or manual flags.
- Time-based expiration.

Drift should lead to retesting, not just an alert.

## What Must Be Real In The First Usable App

The first usable production-oriented build should include:

- Public landing page and app shell matching the latest design.
- Supabase Auth sign-in/sign-up.
- Workspace and project records in Supabase Postgres.
- Seeded demo project from the current CASS data.
- Eight app screens using backend data.
- Release-evidence JSON and Markdown export.
- Basic storage for uploaded artifacts.
- CI running backend, frontend, DB, and smoke tests.

The first build can still defer:

- Full Stripe billing.
- Full SSO/SAML.
- Heavy provider marketplace.
- Enterprise self-hosting.
- PDF polish beyond a basic export.
