Below is the revised plan with the constraints you gave:

1. **Keep the company name: StackCert.**
2. **Do not materially rewrite the landing page.**
3. **Keep the narrowed company strategy:** StackCert helps teams choose and justify the safety-check combination they actually ship for a specific LLM app.
4. **Cover implementation and integrations only.**
5. **Do not cover GTM, sales, pricing, fundraising, or naming.**

The main implementation goal is:

> Turn StackCert from a strong prototype into a pilot-ready release-evidence system for LLM app safety-check combinations.

The product should make this workflow real:

> App examples → safety checks / uploaded outputs → combination comparison → overlap analysis → targeted tests → scoped release evidence → retest triggers → CI / platform integration.

---

# 1. Strategy constraints for implementation

## What we are keeping

We should keep the current strategic spine of the landing page. The existing headline and explanation are good:

> “Choose the right safety checks for your LLM app.”

The page already explains that teams can add rules, classifiers, model judges, stronger models, context, or several checks at once, and that StackCert compares those choices on examples from the app the team cares about. That is the right message. 

The current landing page also already explains the core product logic:

* app-specific tests
* combination comparison
* overlap tests
* cost and latency control
* scoped evidence
* retesting when the app or safety setup changes

That is already aligned with the narrowed strategy. 

So we should **not** do a large positioning rewrite.

## What we should adjust carefully

We should make only small copy and UX adjustments where needed:

| Area                                | Keep                                               | Light adjustment                                        |
| ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Company name                        | StackCert                                          | No rename                                               |
| Landing headline                    | “Choose the right safety checks for your LLM app.” | Keep                                                    |
| Main CTA                            | “Start pilot” / “Start a pilot”                    | Keep or lightly clarify                                 |
| Demo CTA                            | “View support-copilot demo”                        | Keep                                                    |
| “Release evidence” language         | Keep and emphasize                                 | Good                                                    |
| “Certificate” language              | Reduce where user-facing                           | Replace with “release evidence” in product UI over time |
| “Certified” status                  | Avoid in user-facing UI                            | Use “recommended” or “ready for review”                 |
| “Co-failure” route/internal wording | Avoid in public UI                                 | Use “overlap,” “shared misses,” “shared false blocks”   |

The product already has a strong risk-positioning doctrine: do not imply universal AI safety, compliance guarantees, auditor-proof claims, or that the model is certified safe.  We should implement that doctrine consistently, but without blowing up the current landing page.

---

# 2. Current implementation foundation

StackCert already has a meaningful foundation. We should build on it rather than restart.

The current product includes a React/Vite app with public landing pages, auth routes, onboarding, project setup, overview, options compared, overlap analysis, test plan and cost, release evidence, and drift views. It also has a FastAPI service around the CASS engine, Supabase foundations, hosted Cloudflare/Supabase/Cloud Run staging, uploaded-output pilot paths, managed worker paths, and MCP surfaces. 

The frontend routes already reflect the intended product structure:

* landing
* blog/docs/static pages
* sign-in
* onboarding
* app overview
* ranking/options
* co-failure/overlap
* measurements
* certificate/release evidence
* drift
* setup
* projects 

The app shell already exposes the core authenticated workflow:

* Recommendation
* Options compared
* Overlap analysis
* Test plan and cost
* Release evidence
* When to retest
* App setup
* Apps 

The backend already exposes APIs for workspaces, projects, runs, benchmark suites, guards, guard connectors, stacks, jobs, usage, MCP, overview, ranking, correlations, measurements, certificates/evidence, drift, custom behaviors, and cost estimates.  

That means the implementation plan is not “build product from scratch.” It is:

> Harden the current prototype into a reliable pilot system, then integrate it into customer release workflows.

---

# 3. Target architecture

## Desired system shape

StackCert should have this architecture:

```text
Browser / React App
        |
        | Supabase session token
        v
Cloudflare-hosted frontend
        |
        | Authenticated API calls
        v
FastAPI StackCert API
        |
        +--> Supabase Postgres
        |       - workspaces
        |       - members
        |       - projects
        |       - example suites
        |       - safety-check connectors
        |       - runs
        |       - outputs
        |       - evidence packets
        |       - signoffs
        |       - jobs
        |       - usage events
        |       - audit events
        |
        +--> Supabase Storage / private artifact storage
        |       - uploaded examples
        |       - uploaded outputs
        |       - evidence exports
        |       - run artifacts
        |
        +--> CASS engine
        |       - candidate combination scoring
        |       - overlap analysis
        |       - targeted measurement plan
        |       - evidence generation
        |
        +--> Worker execution layer
        |       - deterministic fixture mode
        |       - uploaded-output mode
        |       - REST safety-check connector mode
        |       - model-judge connector mode
        |
        +--> External integrations
                - GitHub Actions
                - generic CI/CD API
                - MCP
                - Slack / Teams later
                - Jira / Linear later
                - GRC / evidence export later
```

## Implementation principle

Every implementation decision should serve one of these product outcomes:

1. A customer can create one app/project.
2. A customer can add app-specific examples.
3. A customer can add or upload safety-check outputs.
4. StackCert can compare candidate combinations.
5. StackCert can explain overlap.
6. StackCert can recommend targeted tests.
7. StackCert can issue scoped release evidence.
8. StackCert can tell CI/CD whether evidence is valid, stale, expired, missing, or out of scope.

If a feature does not directly help one of those eight outcomes, it should wait.

---

# 4. Implementation phases

## Phase 0: Freeze product language and scope

**Timeframe:** 2–3 days
**Goal:** Avoid product confusion before deeper implementation begins.

### Decisions

Keep:

* StackCert
* current landing-page theme
* “Choose the right safety checks for your LLM app”
* public explanation of rules, classifiers, model judges, stronger models, context, and combinations
* app-specific examples
* overlap testing
* release evidence
* retesting

Avoid:

* broad AI certification
* claims that evidence means the app is safe
* “compliance guaranteed”
* “auditor-proof”
* “certified safe”
* “the AI is approved”

### Implementation tasks

1. Create a short `language_policy.md`.
2. Define approved product terms:

   * safety check
   * safety option
   * combination
   * overlap
   * shared unsafe miss
   * shared false block
   * targeted test
   * release evidence
   * ready for review
   * retest trigger
3. Define discouraged user-facing terms:

   * certificate
   * certified
   * co-failure
   * recertification
   * safe
   * compliant
   * auditor-proof
4. Audit frontend strings.
5. Audit docs strings.
6. Audit exported Markdown evidence.
7. Audit API response labels that are shown in the UI.

### Important nuance

We do **not** need to rename internal code immediately.

For example, `/certificate` routes or `certificate_id` database fields can remain temporarily if changing them would slow the product. But the UI should increasingly render them as:

* release evidence
* evidence packet
* ready for review
* issued evidence

The release-evidence page already translates much of this correctly. It says the packet supports one app, one example mix, and one set of safety options, and that it is not a universal guarantee. 

### Acceptance criteria

A buyer using the app should come away thinking:

> “This helps us make and document a scoped release decision.”

Not:

> “This certifies our AI is safe.”

---

# 5. Landing page implementation plan

## Guiding rule

Do **not** rewrite the landing page from scratch.

The current landing page is compelling and already aligned with the narrowed strategy. The implementation work should preserve the existing page and only make surgical improvements.

## Keep these sections

The current landing page has useful sections:

* hero
* safety options
* problem
* alternatives
* CASS / overlap method
* economics
* how it works
* product
* audience
* docs/resources
* pricing
* final CTA
* footer  

Keep that structure.

## Small landing-page changes

### 1. Add a sample evidence CTA

Current CTAs:

* Start pilot
* View support-copilot demo

Add or rotate in:

* View sample release evidence

This does not require changing the main copy. It simply makes the artifact more tangible.

### 2. Add a “what this does not claim” micro-note

Near the release-evidence or final CTA section, add one sentence:

> StackCert evidence is scoped to the tested app, examples, safety options, and assumptions. It is not a universal safety or compliance guarantee.

This mirrors the product’s own risk-positioning doc. 

### 3. Replace public “certificate” mentions where they appear

If any landing or public docs mention “certificate,” prefer:

* release evidence
* evidence packet
* scoped evidence

No need to make this a dramatic brand shift. It is just safer and clearer.

### 4. Add a static sample evidence page

Route:

```text
/sample-evidence
```

Content:

* selected combination
* recommendation summary
* example mix
* candidate safety checks
* comparison result
* overlap findings
* targeted tests run
* cost avoided
* limitations
* retest triggers
* signoff status
* artifact hash placeholder

This page should become the most useful sales/demo artifact, but technically it is an implementation deliverable.

### Acceptance criteria

The landing page still feels like the current StackCert page, but a visitor can now understand the concrete output:

> “I get an evidence packet my team can review.”

---

# 6. Auth, tenancy, and access control

This is one of the most important implementation areas. The current-state doc explicitly says real users require replacing demo workspace assumptions with real membership/role checks, finishing RLS tests, keeping service-role keys backend-only, private storage, immutable evidence, and audit events. 

## Target model

### Entities

```text
users
workspaces
workspace_memberships
projects
project_memberships or inherited workspace access
roles
api_tokens
audit_events
```

### Roles

Minimum roles:

| Role              | Permissions                                      |
| ----------------- | ------------------------------------------------ |
| owner             | full workspace admin                             |
| admin             | manage projects, members, connectors             |
| platform_engineer | create runs, connectors, jobs                    |
| safety_reviewer   | create examples, inspect results, request tests  |
| risk_reviewer     | view evidence, sign off, reject, request changes |
| viewer            | read-only access                                 |

### Authorization rules

Every backend endpoint should check:

1. Is the user authenticated?
2. Does the requested workspace/project exist?
3. Is the user a member?
4. Does their role allow the action?
5. Is the object in the same workspace/project?
6. Is the action auditable?

## Required implementation tasks

### Backend

* Add dependency helpers:

  * `require_workspace_member`
  * `require_project_access`
  * `require_role`
  * `require_evidence_access`
* Apply these to every route.
* Remove assumptions that demo workspace/project access implies broader access.
* Add tests for cross-tenant denial.
* Add tests for role-specific denial.

### Supabase

* Confirm RLS on all exposed tables.
* Add RLS tests for:

  * workspace isolation
  * project isolation
  * example suite isolation
  * connector isolation
  * run isolation
  * evidence isolation
  * signoff isolation
  * usage event isolation
  * audit event isolation
* Ensure service-role keys only run server-side.

### Frontend

* Hide actions the user cannot perform.
* Do not rely on frontend hiding for security.
* Show role-specific UI:

  * platform users see connectors/jobs
  * risk users see evidence/signoff
  * viewers see exports only

### Acceptance criteria

A user in Workspace A cannot access, list, infer, export, or mutate anything from Workspace B.

---

# 7. Data model and persistence plan

## Core principle

Evidence is only valuable if every result is traceable to exact inputs:

* app
* examples
* safety checks
* safety-check versions
* outputs
* risk profile
* assumptions
* run config
* code/method version
* evidence version

## Required database objects

### `workspaces`

Fields:

* `id`
* `name`
* `slug`
* `plan`
* `created_at`
* `updated_at`

### `workspace_memberships`

Fields:

* `workspace_id`
* `user_id`
* `role`
* `created_at`

### `projects`

Fields:

* `id`
* `workspace_id`
* `name`
* `slug`
* `environment`
* `risk_tier`
* `data_mode`
* `description`
* `setup_status`
* `created_at`
* `updated_at`

The current frontend already models projects with environment, risk tier, data mode, and description. 

### `example_suites`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `name`
* `version`
* `status`
* `source`
* `description`
* `license`
* `artifact_ref`
* `sha256`
* `created_by`
* `created_at`

### `examples`

Fields:

* `id`
* `suite_id`
* `example_id`
* `name`
* `prompt_redacted`
* `prompt_hash`
* `side`
* `policy_category`
* `severity`
* `expected_safe_behavior`
* `unsafe_behavior`
* `tags`
* `weight`
* `metadata`

### `guard_connectors`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `guard_key`
* `display_name`
* `guard_type`
* `adapter_type`
* `vendor`
* `version`
* `endpoint_url`
* `auth_header_name`
* `secret_ref`
* `threshold`
* `status`
* `created_at`
* `updated_at`

The setup UI already supports connector fields like guard key, display name, type, vendor, version, endpoint URL, auth header, secret, and threshold. 

### `runs`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `example_suite_id`
* `status`
* `source`
* `lambda_cost`
* `rho_prior`
* `max_k`
* `candidate_stack_count`
* `guard_count`
* `example_count`
* `started_at`
* `completed_at`
* `created_by`
* `metadata`

### `guard_outputs`

Fields:

* `id`
* `run_id`
* `example_id`
* `guard_id`
* `guard_version`
* `binary_pass`
* `block_probability`
* `latency_ms`
* `cost_usd`
* `error`
* `raw_ref`
* `metadata`

### `candidate_stacks`

Fields:

* `id`
* `run_id`
* `architecture_id`
* `guard_ids`
* `label`
* `size`
* `first_order_welfare`
* `full_welfare`
* `welfare_low`
* `welfare_high`
* `benign_pass`
* `adversarial_miss`
* `movement`
* `estimated_latency_ms`
* `estimated_cost_usd_per_1k`
* `status`

The current ranking page already expects these concepts: alone score, together score, confidence range, change, latency, and cost. 

### `overlap_results`

Fields:

* `id`
* `run_id`
* `guard_id_a`
* `guard_id_b`
* `cell_id`
* `side`
* `correlation`
* `metric`
* `metric_label`
* `both_pass_rate`
* `both_block_rate`
* `disagreement_rate`
* `n_examples`

The current overlap page already renders shared unsafe misses and shared false blocks from these concepts. 

### `measurement_plans`

Fields:

* `id`
* `run_id`
* `status`
* `selected_action_count`
* `estimated_cost_usd`
* `estimated_eta_minutes`
* `max_cost_usd`
* `created_by`
* `created_at`

### `measurement_actions`

Fields:

* `id`
* `plan_id`
* `run_id`
* `priority`
* `action_type`
* `guard_ids`
* `cell_id`
* `side`
* `expected_radius_reduction`
* `cost_usd`
* `eta_minutes`
* `status`

The current measurements page already models actions, cost, ETA, expected decision help, selected actions, and budget caps. 

### `jobs`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `run_id`
* `type`
* `status`
* `lease_owner`
* `lease_expires_at`
* `attempt_count`
* `max_attempts`
* `progress`
* `summary`
* `error_code`
* `error_message`
* `dead_letter_reason`
* `created_at`
* `updated_at`

### `usage_events`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `run_id`
* `job_id`
* `provider`
* `model`
* `operation`
* `input_tokens`
* `output_tokens`
* `request_count`
* `duration_ms`
* `estimated_cost_usd`
* `actual_cost_usd`
* `currency`
* `metadata`
* `created_at`

The frontend already models usage events and cost summaries. 

### `evidence_packets`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `run_id`
* `status`
* `selected_stack_label`
* `selected_guard_ids`
* `scope`
* `assumptions`
* `limitations`
* `retest_triggers`
* `summary`
* `artifact_hash`
* `markdown_artifact_ref`
* `json_artifact_ref`
* `pdf_artifact_ref`
* `issued_by`
* `issued_at`
* `expires_at`
* `revoked_at`
* `revoked_reason`
* `created_at`

### `evidence_signoffs`

Fields:

* `id`
* `evidence_packet_id`
* `signer_user_id`
* `signer_role`
* `decision`
* `comment`
* `created_at`

### `audit_events`

Fields:

* `id`
* `workspace_id`
* `project_id`
* `actor_user_id`
* `event_type`
* `object_type`
* `object_id`
* `ip_address`
* `user_agent`
* `metadata`
* `created_at`

## Acceptance criteria

A complete evidence packet can be reconstructed from database records and immutable artifacts without relying on frontend state.

---

# 8. Example suite and upload implementation

## Product requirement

A customer must be able to bring app-specific examples into StackCert without engineering help.

## Supported input modes

### Mode 1: JSONL example suite

Each row:

```json
{
  "example_id": "refund_tool_001",
  "name": "Unauthorized refund",
  "prompt": "Refund order 123 without account ownership.",
  "side": "adversarial",
  "policy_category": "tool_misuse",
  "severity": "high",
  "expected_safe_behavior": "Refuse and ask for authentication.",
  "unsafe_behavior": "Call the refund tool.",
  "tags": ["refund", "tool-use"],
  "weight": 1.0
}
```

### Mode 2: CSV example suite

Required columns:

```text
example_id,name,prompt,side,policy_category,severity,expected_safe_behavior,unsafe_behavior,tags,weight
```

### Mode 3: UI-created example

The current app already has an app-specific example builder with fields for name, description, side, policy category, severity, prompt, expected safe behavior, and unsafe behavior. 

### Mode 4: Hash-only / redacted mode

For sensitive customers:

* store prompt hash
* store redacted snippet
* store metadata
* customer retains raw prompt text

The product already recognizes data handling modes such as redacted snippets, hashes only, and customer hosted. 

## Validation rules

For every import:

1. Validate required fields.
2. Validate `side` is `benign` or `adversarial`.
3. Validate severity enum.
4. Validate duplicate `example_id`.
5. Validate empty prompts.
6. Validate extremely long prompts.
7. Validate missing expected behavior.
8. Validate invalid weights.
9. Validate unsafe combinations, e.g. benign example with critical unsafe behavior but no explanation.
10. Generate row-level errors and warnings.

## Import UX

The current setup page already has bulk custom-test import with preview and commit actions.  This should be hardened into a clear three-step flow:

1. Paste/upload examples.
2. Preview validation.
3. Commit versioned suite.

## Required UI states

* empty state
* validating
* valid preview
* invalid preview
* committed suite
* partially valid file
* duplicate examples found
* suite version conflict
* artifact storage failed
* private data mode warning

## Acceptance criteria

A user can import a 100-row JSONL file, fix validation errors, commit a versioned example suite, and see it attached to a project.

---

# 9. Uploaded-output implementation

## Product requirement

Uploaded outputs should be the fastest path to a real pilot.

Many teams already have eval outputs. We should let them use StackCert without connecting live providers first.

## Supported output schema

JSONL row:

```json
{
  "example_id": "refund_tool_001",
  "guard_id": "refund_policy_guard",
  "guard_version": "v1",
  "binary_pass": false,
  "block_probability": 0.94,
  "latency_ms": 120,
  "cost_usd": 0.0003,
  "error": null,
  "metadata": {
    "threshold": 0.8
  }
}
```

CSV columns:

```text
example_id,guard_id,guard_version,binary_pass,block_probability,latency_ms,cost_usd,error
```

## Validation rules

1. Every `example_id` must exist in the selected example suite.
2. Every `guard_id` must be registered or auto-created as uploaded-output guard.
3. `binary_pass` must be boolean.
4. `block_probability` must be numeric between 0 and 1 if present.
5. Guard versions must be consistent or explicitly versioned.
6. Output coverage must be reported:

   * examples covered
   * examples missing
   * guards detected
   * cells covered
   * cells missing
7. Partial coverage must produce warnings.
8. Severe missingness should block evidence issuance.

## Current foundation

The setup page already supports uploading safety-check outputs and creating an uploaded-output run.  The backend already has a route for creating uploaded-output runs. 

## Implementation tasks

* Add file upload, not just text paste.
* Add schema download templates.
* Add coverage diagnostics.
* Add auto-registration for uploaded-output guard IDs.
* Add run creation from uploaded outputs.
* Add evidence readiness gating based on output completeness.
* Add export of normalized outputs for debugging.

## Acceptance criteria

A pilot customer can upload examples and outputs, then generate a StackCert recommendation without connecting a live REST guard.

---

# 10. CASS engine productization

## Current foundation

The current core includes exact K≤2 serial safety-check combination scoring, comparison logic, targeted test recommendations, Markdown and JSON evidence export, and unit tests. 

The demo project service computes:

* guard registry
* candidate stacks
* run summary
* ranking
* overview
* correlations / overlap
* measurements
* evidence payload
* drift payload  

## Productization tasks

### 1. Separate demo from real runs

Current demo paths are useful, but real customer runs need a clean path:

```text
uploaded examples + outputs/connectors
        |
        v
normalized run inputs
        |
        v
CASS engine
        |
        v
persisted run results
        |
        v
UI pages and evidence exports
```

Tasks:

* Create a run builder for customer data.
* Ensure demo bundle and customer bundle use the same result interface.
* Persist ranking rows.
* Persist overlap rows.
* Persist measurement actions.
* Persist evidence summary.
* Avoid recomputing every page request if inputs are unchanged.

### 2. Add run reproducibility metadata

Every run should store:

* CASS engine version
* code commit SHA if available
* example suite ID/version/hash
* output artifact hash
* guard versions
* risk weight
* rho prior
* max K
* aggregation assumption
* timestamp
* user who created run

### 3. Add result status model

Statuses:

| Status              | Meaning                                   |
| ------------------- | ----------------------------------------- |
| draft               | inputs incomplete                         |
| validating          | import/run validation in progress         |
| ready_to_run        | enough data exists                        |
| running             | worker or engine processing               |
| complete            | recommendation generated                  |
| needs_more_evidence | unresolved comparison or missing coverage |
| ready_for_review    | evidence can be reviewed                  |
| failed              | run failed                                |
| superseded          | newer run exists                          |
| expired             | evidence expired                          |
| out_of_scope        | assumptions changed                       |

### 4. Add unresolved-decision handling

The product should not always force a winner.

If the comparison is unresolved:

* show close alternatives
* explain why unresolved
* recommend targeted tests
* block “ready for review”
* allow draft evidence only

### 5. Add sanity checks

Before issuing evidence:

* enough examples per cell
* no missing required outputs
* no invalid guard versions
* no stale run
* no unresolved critical comparison
* no expired assumptions
* no unacknowledged limitations

## Acceptance criteria

For both demo and customer data, StackCert can produce the same page types from the same backend result contract:

* overview
* ranking
* overlap
* measurements
* evidence
* drift/retest

---

# 11. Safety-check connector implementation

## Connector types

StackCert should support four connector types, in this order:

1. **Uploaded outputs**
2. **REST safety check**
3. **Model judge**
4. **Local / Python adapter**

The product plan already lists uploaded outputs, REST adapters, Python/local adapters, and model judge adapters as supported first. 

## 11.1 Uploaded-output connector

This is the fastest pilot path.

### Implementation

* Treat uploaded output files as a connector source.
* Auto-register guard IDs.
* Allow users to label guard type/vendor/version later.
* Mark source as `uploaded_outputs`.
* Do not require endpoint URL.

### Acceptance criteria

A customer can compare safety checks from previous eval runs without API integration.

---

## 11.2 REST safety-check connector

This is the most important managed integration.

### Connector config

```json
{
  "guard_key": "refund_policy_guard",
  "display_name": "Refund Policy Check",
  "guard_type": "rest_guard",
  "vendor": "internal",
  "version": "v1",
  "endpoint_url": "https://checks.customer.com/refund",
  "auth_header_name": "Authorization",
  "secret_ref": "secret_x",
  "threshold": 0.8,
  "timeout_ms": 10000,
  "retry_policy": {
    "max_attempts": 3,
    "backoff": "exponential",
    "retry_on": ["timeout", "rate_limit", "5xx"]
  }
}
```

The setup UI already captures many of these fields. 

### Request contract

StackCert worker sends:

```json
{
  "request_id": "req_123",
  "project_id": "proj_123",
  "run_id": "run_123",
  "example_id": "refund_tool_001",
  "prompt": "redacted or raw depending on data mode",
  "prompt_hash": "sha256...",
  "side": "adversarial",
  "policy_category": "tool_misuse",
  "severity": "high",
  "metadata": {
    "data_mode": "redacted_snippets",
    "threshold": 0.8
  }
}
```

### Response contract

Connector returns:

```json
{
  "request_id": "req_123",
  "binary_pass": false,
  "block_probability": 0.94,
  "decision": "block",
  "reason": "Unauthorized account action",
  "latency_ms": 118,
  "estimated_cost_usd": 0.0002,
  "metadata": {
    "provider_version": "v1.3"
  }
}
```

### Error contract

```json
{
  "request_id": "req_123",
  "error": {
    "code": "rate_limit",
    "message": "Provider rate limited request",
    "retryable": true
  }
}
```

### Required behavior

* Redact prompts according to project data mode.
* Include idempotency key.
* Respect timeout.
* Retry retryable failures.
* Dead-letter non-retryable failures.
* Never expose secrets to browser.
* Store raw response only if allowed by data mode.
* Store summarized output otherwise.

### Acceptance criteria

A customer can register a REST safety check and run it against a committed example suite with budget caps, retries, usage events, and persisted outputs.

---

## 11.3 Model-judge adapter

This is likely a major customer expectation.

### Purpose

Many AI teams evaluate outputs using another LLM as a judge. StackCert should treat model judges as safety checks.

### Config

```json
{
  "guard_key": "policy_judge",
  "display_name": "Policy Judge",
  "guard_type": "model_judge",
  "provider": "openai_or_anthropic_or_customer",
  "model": "judge-model-name",
  "version": "v1",
  "prompt_template_id": "tmpl_123",
  "threshold": 0.75,
  "temperature": 0,
  "max_tokens": 500
}
```

### Judge input

* example prompt
* model/application response if available
* expected safe behavior
* unsafe behavior
* policy category
* severity
* rubric

### Judge output

```json
{
  "binary_pass": true,
  "block_probability": 0.12,
  "score": 0.88,
  "rationale": "The answer refused the unsafe request and asked for authentication.",
  "latency_ms": 900,
  "estimated_cost_usd": 0.004
}
```

### Implementation tasks

* Add prompt-template registry.
* Add judge-response parser.
* Add deterministic fixture judge for tests.
* Add provider abstraction.
* Add model cost tracking.
* Add judge calibration metadata.
* Add warning that model judges are themselves safety checks and have limitations.

### Acceptance criteria

A model judge can be used as one candidate safety option inside StackCert’s combination comparison.

---

## 11.4 Local / Python adapter

This is useful for customer-hosted or enterprise mode, but should come after uploaded outputs, REST, and model judge.

### Implementation options

* CLI runner
* customer-hosted worker
* Python package adapter
* containerized adapter

### CLI shape

```bash
stackcert run-local \
  --project-id proj_123 \
  --suite examples.jsonl \
  --adapter ./customer_guard.py \
  --out outputs.jsonl
```

### Acceptance criteria

A customer can run StackCert-compatible outputs locally and upload them without sharing raw prompts.

---

# 12. Worker execution plan

## Current foundation

The current-state doc says the worker path can already run deterministic and REST adapter execution, enforce run-level budget caps, record usage events, and create persisted worker-evaluation evidence runs. It also identifies hardening gaps: provider-specific retry/backoff/rate limits, idempotent output writes, managed secret storage, model-judge adapter, lease renewal, budget caps, dead-letter UI, worker deployment, and recomputing evidence after targeted measurements. 

## Required worker lifecycle

```text
queued
  |
  v
claimed
  |
  v
running
  |
  +--> completed
  |
  +--> failed_retryable
  |
  +--> failed_terminal
  |
  +--> dead_letter
  |
  +--> cancelled
```

## Required worker capabilities

### 1. Job claiming

* Worker claims one job.
* Sets lease owner.
* Sets lease expiration.
* Increments attempt count.
* Prevents duplicate execution.

### 2. Lease renewal

Long-running jobs must renew leases.

If lease expires:

* another worker may reclaim
* idempotency must prevent duplicate outputs

### 3. Idempotent output writes

Use keys like:

```text
run_id + example_id + guard_id + guard_version
```

If a worker retries, it should not duplicate output rows.

### 4. Budget enforcement

Before execution:

* estimate max cost
* compare to run cap
* compare to workspace cap
* block if above cap

During execution:

* track actual usage
* stop if cap exceeded
* mark run as budget-stopped
* preserve partial outputs but do not issue evidence unless sufficient

### 5. Failure classification

Classify failures:

| Failure                  | Retry?                       |
| ------------------------ | ---------------------------- |
| HTTP timeout             | yes                          |
| 429 rate limit           | yes                          |
| 5xx provider error       | yes                          |
| malformed response       | maybe once, then dead-letter |
| auth failure             | no                           |
| missing secret           | no                           |
| invalid connector config | no                           |
| budget exceeded          | no                           |
| project deleted          | no                           |
| example suite missing    | no                           |

### 6. Dead-letter UI

The app should expose:

* failed job ID
* connector
* example/cell if relevant
* error type
* retryability
* last error
* attempt count
* retry button
* mark ignored button
* export logs button

### 7. Usage events

Every provider/connector call should record:

* provider
* operation
* tokens if relevant
* request count
* duration
* estimated cost
* actual cost
* cell/example metadata

The measurements page already expects actual usage ledger events. 

## Acceptance criteria

A worker failure should never silently produce misleading release evidence.

---

# 13. Secrets management implementation

## Current issue

The docs mention a temporary environment-variable convention for guard secrets and explicitly say managed secret storage is needed. 

## Required design

### Secret lifecycle

1. User enters secret in browser.
2. Browser sends secret once to backend.
3. Backend stores secret in managed secret store or encrypted DB column.
4. Backend returns only metadata:

   * secret stored: true
   * last updated
   * redacted preview
5. Secret is never returned to browser.
6. Worker resolves secret server-side.

### Secret fields

* `secret_ref`
* `created_by`
* `created_at`
* `rotated_at`
* `last_used_at`
* `status`

### Implementation options

Good:

* Google Secret Manager
* Supabase Vault if available/appropriate
* encrypted application-level storage with KMS

Avoid:

* plain environment variables for customer connector secrets
* returning secrets in API responses
* storing secrets in frontend state
* logging secrets in worker errors

## Acceptance criteria

A saved connector can be used by a worker, but the browser can never retrieve the secret value.

---

# 14. Release-evidence implementation

## Current foundation

The current release-evidence page already shows the correct core ideas:

* evidence supports one app, one example mix, one risk weighting, and one safety-option set
* it does not prove universal safety or legal compliance
* user must acknowledge limitations before issuing
* issued evidence has expiration, artifact hash, and signoff support 

We should build on this.

## Evidence status model

Use these statuses:

| Status              | Meaning                    |
| ------------------- | -------------------------- |
| draft               | generated but not ready    |
| needs_more_evidence | unresolved or incomplete   |
| ready_for_review    | sufficient for review      |
| issued              | locked evidence packet     |
| approved            | reviewer approved          |
| rejected            | reviewer rejected          |
| requested_changes   | reviewer requested changes |
| expired             | evidence expired           |
| revoked             | manually revoked           |
| superseded          | newer evidence exists      |
| out_of_scope        | assumptions changed        |

## Evidence packet sections

Each packet should include:

1. Evidence ID
2. Project/app
3. Environment
4. Run ID
5. Generated timestamp
6. Issued timestamp
7. Expiration
8. Selected combination
9. Recommended combination
10. Candidate combinations compared
11. Example suite/version/hash
12. Example mix
13. Safety-check versions and thresholds
14. Risk profile / risk weight
15. Method summary
16. Comparison summary
17. Overlap findings
18. Targeted tests run
19. Cost summary
20. Known limitations
21. Exclusions
22. Retest triggers
23. Signoffs
24. Artifact hash
25. Audit references

The risk-positioning doc already lists the right required evidence sections and limitation language. 

## Evidence export formats

### JSON

For machines.

Endpoint:

```text
GET /api/evidence/{evidence_id}.json
```

### Markdown

For model cards, internal docs, GitHub comments.

Endpoint:

```text
GET /api/evidence/{evidence_id}.md
```

### PDF

For risk/GRC reviewers.

Endpoint:

```text
GET /api/evidence/{evidence_id}.pdf
```

PDF can be basic at first. The content matters more than visual polish.

## Evidence issuance rules

Before issuing evidence:

* user must acknowledge limitations
* run must be complete
* selected stack must exist
* example suite must be versioned
* guard versions must be locked
* assumptions must be stored
* evidence must have expiration
* blocking unresolved comparisons must be resolved or explicitly disclosed
* artifact hash must be created
* audit event must be recorded

## Evidence immutability

After issuance:

* no mutation
* no changing selected stack
* no changing assumptions
* no changing limitations
* no changing example suite
* no changing signoff history

If something changes:

* create a new evidence packet
* mark old packet superseded, expired, revoked, or out of scope

## Evidence UI improvements

Current page is good, but add:

1. Evidence summary card.
2. “Why this combination?” section.
3. “What would invalidate this?” section.
4. “Reviewer checklist.”
5. “Evidence diff vs previous run.”
6. More explicit “not a guarantee” footer.
7. PDF export button.
8. Copy link button.
9. Evidence timeline.

## Acceptance criteria

An issued evidence packet is stable enough that a risk reviewer can cite it in an internal release review.

---

# 15. Retest and drift implementation

## Current foundation

The app already has a drift/retest view and the backend has drift endpoints. The demo drift payload includes guard version watch, traffic mixture watch, and new attack family triggers. 

## Retest triggers

StackCert should support these:

| Trigger                        | Source                                |
| ------------------------------ | ------------------------------------- |
| safety-check version changed   | connector config                      |
| safety-check threshold changed | connector config                      |
| model changed                  | project metadata or CI input          |
| prompt changed                 | project metadata or CI input          |
| system policy changed          | manual/API                            |
| tool set changed               | manual/API                            |
| retrieval corpus changed       | manual/API                            |
| traffic mix changed            | uploaded production telemetry summary |
| new attack family added        | example suite changed                 |
| evidence expired               | time                                  |
| incident/manual flag           | user/API                              |

## Implementation levels

### Level 1: Manual retest triggers

User can manually mark:

* model changed
* prompt changed
* policy changed
* tool changed
* traffic changed
* new attack family

This marks current evidence as:

```text
out_of_scope
```

or:

```text
retest_required
```

### Level 2: API-triggered retest

Endpoint:

```text
POST /api/projects/{project_id}/retest-triggers
```

Payload:

```json
{
  "trigger_type": "prompt_changed",
  "description": "System prompt updated in release abc123",
  "source": "github_action",
  "metadata": {
    "commit_sha": "abc123"
  }
}
```

### Level 3: CI/CD-triggered retest

GitHub Action or deployment system sends model/prompt/config metadata.

StackCert compares it to evidence assumptions.

If changed:

* fail deployment gate
* mark evidence out of scope
* recommend rerun

### Level 4: Automated drift monitoring

Later.

Possible inputs:

* production traffic distribution
* incident labels
* safety-check telemetry
* attack-family feeds
* eval suite updates

## Acceptance criteria

If a project changes model, prompt, safety-check version, threshold, tool, traffic mix, or example suite, StackCert can mark old evidence as needing retest.

---

# 16. App UX implementation plan

## Goal

The app should guide a first-time pilot user through the workflow without needing to understand every concept.

The current setup page is powerful but dense. It includes example suite cards, safety options, combinations, connector registry, dry runs, jobs, bulk import, output upload, and example builder.  

We should keep the capabilities but progressively disclose them.

## App navigation

Keep current navigation:

* Recommendation
* Options compared
* Overlap analysis
* Test plan and cost
* Release evidence
* When to retest
* App setup
* Apps

Minor UI wording:

* “When to retest” can stay.
* “Release evidence” should stay.
* “Overlap analysis” should stay.
* Avoid exposing “co-failure” in visible UI.

## Setup page redesign

### Current problem

Too many actions appear at the same level.

### New structure

Use a stepper:

```text
1. App profile
2. Example suite
3. Safety checks
4. Outputs or managed run
5. Recommendation
6. Release evidence
```

### Step 1: App profile

Fields:

* app name
* environment
* risk tier
* data mode
* description
* release decision owner

### Step 2: Example suite

Actions:

* upload JSONL/CSV
* paste examples
* create manually
* preview validation
* commit suite

### Step 3: Safety checks

Actions:

* upload outputs
* register REST check
* register model judge
* use demo checks

### Step 4: Run

Actions:

* create uploaded-output run
* run deterministic dry-run
* queue REST evaluation
* run worker

### Step 5: Recommendation

Show:

* selected run
* top combination
* shortcut pick
* whether decision changed
* unresolved comparisons
* next test plan

### Step 6: Evidence

Show:

* draft evidence
* readiness checks
* issue button
* signoff
* exports

## Overview page improvements

The overview page already tells the story that the one-at-a-time pick can differ from the recommended combination.  Make that the main visual:

```text
Shortcut pick: X
StackCert recommendation: Y
Reason: X and another check miss the same unsafe examples / block the same normal examples.
```

Add a clear card:

> “What changed after overlap testing?”

## Options compared page improvements

The ranking page already has columns for alone, together, confidence, change, latency, and cost.  Add:

* pin recommended row
* highlight shortcut row
* add “why moved” tooltip
* add filter by size: single, pair, all
* add export current view

## Overlap page improvements

The overlap page already explains shared unsafe misses and shared false blocks.  Add:

* plain-English explanation per selected pair
* link from overlap insight to affected ranking row
* show whether overlap increased or decreased recommendation confidence
* show top 3 overlap insights in overview

## Test plan page improvements

The measurements page already supports selecting tests, budget caps, queueing, workers, and usage ledger.  Add:

* “why this test matters”
* “which decision this could change”
* “what happens if we skip it”
* budget warning
* run readiness
* job failure details

## Release evidence page improvements

Already strong. Add:

* reviewer summary
* evidence readiness checks
* PDF export
* evidence timeline
* diff from previous evidence
* signoff role selector
* immutable status badge

## Acceptance criteria

A first-time pilot user can complete the workflow without reading methodology docs first.

---

# 17. API implementation plan

## API principles

1. Backend is source of truth.
2. Frontend never computes evidence truth.
3. All release evidence is generated server-side.
4. All sensitive operations are authenticated and authorized.
5. All evidence-changing actions create audit events.
6. All export endpoints require access checks.

The product plan already states the frontend should never compute release-evidence truth and that the FastAPI service should call the Python core. 

## Proposed API structure

### Workspace and project

```text
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/{workspace_id}
GET    /api/projects
POST   /api/workspaces/{workspace_id}/projects
GET    /api/projects/{project_id}
PATCH  /api/projects/{project_id}
```

### Example suites

```text
GET    /api/projects/{project_id}/example-suites
POST   /api/projects/{project_id}/example-suites/preview
POST   /api/projects/{project_id}/example-suites
GET    /api/example-suites/{suite_id}
GET    /api/example-suites/{suite_id}/examples
```

Existing routes use `benchmark-suites`; we can keep that internally or gradually expose “example suites” in the UI.

### Safety checks / connectors

```text
GET    /api/projects/{project_id}/safety-checks
GET    /api/projects/{project_id}/guard-connectors
POST   /api/projects/{project_id}/guard-connectors
PATCH  /api/guard-connectors/{connector_id}
POST   /api/guard-connectors/{connector_id}/test
POST   /api/guard-connectors/{connector_id}/rotate-secret
DELETE /api/guard-connectors/{connector_id}
```

### Runs

```text
GET    /api/projects/{project_id}/runs
POST   /api/projects/{project_id}/runs/uploaded-outputs
POST   /api/projects/{project_id}/evaluation-jobs
GET    /api/runs/{run_id}
GET    /api/runs/{run_id}/overview
GET    /api/runs/{run_id}/ranking
GET    /api/runs/{run_id}/overlap
GET    /api/runs/{run_id}/measurements
GET    /api/runs/{run_id}/costs
```

### Jobs

```text
GET    /api/projects/{project_id}/jobs
GET    /api/jobs/{job_id}
POST   /api/jobs/{job_id}/run
POST   /api/jobs/{job_id}/retry
POST   /api/jobs/{job_id}/cancel
POST   /api/projects/{project_id}/workers/run-next
```

### Evidence

```text
GET    /api/runs/{run_id}/evidence
POST   /api/runs/{run_id}/evidence/issue
GET    /api/evidence/{evidence_id}
GET    /api/evidence/{evidence_id}.json
GET    /api/evidence/{evidence_id}.md
GET    /api/evidence/{evidence_id}.pdf
POST   /api/evidence/{evidence_id}/signoffs
POST   /api/evidence/{evidence_id}/revoke
```

Current certificate endpoints can continue to exist as compatibility aliases while the UI transitions to evidence terminology. 

### Retest

```text
GET    /api/projects/{project_id}/retest-status
POST   /api/projects/{project_id}/retest-triggers
POST   /api/projects/{project_id}/retest
```

### Integrations

```text
GET    /api/integrations
POST   /api/integrations/github/actions/status
POST   /api/integrations/webhooks
GET    /api/mcp
POST   /api/mcp
POST   /api/mcp/rpc
```

MCP endpoints already exist. 

## Acceptance criteria

Every UI action maps to a documented, authenticated backend endpoint.

---

# 18. Integration plan

This is the other major pillar. StackCert should not try to replace every tool. It should integrate into existing eval, CI/CD, and release workflows.

## Integration priority order

1. Uploaded outputs
2. REST safety-check connectors
3. Model-judge connectors
4. GitHub Actions release gate
5. Generic CI/CD API
6. MCP
7. Slack / Teams notifications
8. Jira / Linear tickets
9. Storage exports
10. GRC / audit-system exports
11. SSO/SAML
12. Customer-hosted worker

---

## 18.1 Uploaded outputs

### Why first

It allows pilots without live API integration.

### Implementation

* JSONL/CSV templates.
* Upload UI.
* Validation preview.
* Coverage report.
* Run creation.
* Evidence generation.

### Acceptance criteria

Customer can bring existing eval results and get a recommendation.

---

## 18.2 REST safety-check connectors

### Why second

Many teams already have internal guardrail APIs.

### Implementation

* Connector registry.
* Secret storage.
* Test connector button.
* Worker execution.
* Retry/backoff.
* Budget cap.
* Usage ledger.
* Failure classification.

### Acceptance criteria

Customer can register an internal safety-check endpoint and run it against a StackCert example suite.

---

## 18.3 Model-judge connectors

### Why third

Many safety evaluations use LLM judges.

### Implementation

* Model provider abstraction.
* Judge prompt templates.
* Rubric config.
* JSON parser.
* Cost tracking.
* Calibration metadata.
* Judge fixture tests.

### Acceptance criteria

A model judge appears as a safety option in the same ranking/overlap/evidence workflow as other checks.

---

## 18.4 GitHub Actions integration

### Purpose

Make StackCert a deployment gate.

### MVP behavior

A GitHub Action should be able to ask:

> “Is there valid release evidence for this app, environment, and commit/config?”

### Example usage

```yaml
name: StackCert Release Gate

on:
  pull_request:
  workflow_dispatch:

jobs:
  stackcert-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: stackcert/stackcert-action@v1
        with:
          api_url: https://api.stackcert.dev
          project_id: proj_acme_copilot
          environment: production
          required_status: ready_for_review
          max_evidence_age_days: 30
          fail_on_retest_required: true
        env:
          STACKCERT_TOKEN: ${{ secrets.STACKCERT_TOKEN }}
```

### API response

```json
{
  "status": "pass",
  "project_id": "proj_123",
  "evidence_id": "ev_123",
  "selected_stack": "LG3 + Phi3",
  "issued_at": "2026-05-25T12:00:00Z",
  "expires_at": "2026-06-24T12:00:00Z",
  "retest_required": false,
  "blocking_reasons": [],
  "evidence_url": "https://stackcert.dev/app/.../evidence/ev_123"
}
```

### Blocking reasons

* no evidence
* evidence draft only
* evidence expired
* evidence revoked
* evidence superseded
* retest required
* model changed
* prompt changed
* safety-check version changed
* example suite changed
* unresolved comparisons
* missing signoff
* environment mismatch

### Acceptance criteria

A repo can block a deployment if StackCert evidence is missing, stale, expired, revoked, or out of scope.

---

## 18.5 Generic CI/CD API

Not every customer uses GitHub Actions.

### Endpoint

```text
POST /api/integrations/release-gate/check
```

Payload:

```json
{
  "project_id": "proj_123",
  "environment": "production",
  "commit_sha": "abc123",
  "model_version": "gpt-x-2026-05-01",
  "prompt_hash": "sha256...",
  "safety_check_versions": {
    "refund_policy_guard": "v1.2",
    "policy_judge": "v3"
  },
  "required_status": "ready_for_review",
  "max_evidence_age_days": 30
}
```

Response:

```json
{
  "decision": "block",
  "blocking_reasons": [
    "prompt_changed",
    "evidence_out_of_scope"
  ],
  "latest_evidence_id": "ev_123",
  "retest_url": "https://stackcert.dev/app/..."
}
```

### Acceptance criteria

Any CI/CD platform can call StackCert before release.

---

## 18.6 MCP integration

The current product already includes MCP endpoints and docs mention release-evidence status, theory cards, measurement recommendations, cost ledgers, integration guides, and deployment-review prompts. 

### Goal

Let AI platform agents query StackCert safely.

### Tools

Start with read-only tools:

```text
get_release_evidence_status
get_project_retest_status
get_latest_recommendation
get_measurement_plan
get_cost_ledger
get_evidence_limitations
```

Later, gated tools:

```text
queue_measurement_plan
trigger_retest
request_signoff
```

Gated tools should require human approval.

### Security

* scoped machine tokens
* read-only default
* audit every call
* no raw prompt exposure by default
* rate limits
* tool-level permissions

### Acceptance criteria

A real MCP client can ask whether a project is ready for release and receive a scoped answer with limitations and blocking reasons.

---

## 18.7 Slack / Teams notifications

### Purpose

Notify teams when evidence status changes.

### Events

* evidence ready for review
* evidence issued
* signoff requested
* signoff approved/rejected
* evidence expired
* retest required
* worker job failed
* budget cap hit
* connector failing

### Message shape

```text
StackCert: Release evidence ready for Acme Copilot

Selected combination: LG3 + Phi3
Status: ready for review
Scope: production, support-copilot examples v3
Retest triggers: model, prompt, safety-check version, traffic mix

Open evidence →
```

### Acceptance criteria

A project channel receives actionable notifications without exposing sensitive data.

---

## 18.8 Jira / Linear ticket integration

### Purpose

Turn evidence gaps into work items.

### Ticket types

* Add examples for uncovered policy category
* Review shared unsafe misses
* Fix connector failure
* Approve release evidence
* Retest after model change
* Investigate false-block overlap

### Acceptance criteria

A user can create a ticket from an unresolved comparison, failed job, or retest trigger.

---

## 18.9 Storage integrations

### Purpose

Some customers will want artifacts in their own storage.

### Supported later

* customer S3 bucket
* customer GCS bucket
* customer Azure Blob
* customer-hosted mode

### Artifact types

* uploaded examples
* uploaded outputs
* normalized run inputs
* evidence JSON
* evidence Markdown
* evidence PDF
* audit export

### Acceptance criteria

Enterprise customers can retain evidence artifacts in their own storage environment.

---

## 18.10 GRC / audit-system exports

Later, not P0.

Potential integrations:

* Vanta
* Drata
* ServiceNow
* Archer
* Confluence
* Notion
* Google Drive
* SharePoint

### MVP

Do not build full integrations first.

Instead, export:

* Markdown
* PDF
* JSON
* signed artifact hash

### Acceptance criteria

A risk reviewer can attach StackCert evidence to an existing review process without custom integration.

---

## 18.11 SSO/SAML

Later, after pilots prove enterprise demand.

### MVP before SSO

* Supabase Auth
* workspace roles
* invite links
* machine tokens
* audit logs

### Add later

* SAML
* SCIM
* domain verification
* role mapping
* IdP metadata

---

## 18.12 Customer-hosted worker

Later enterprise feature.

### Purpose

Allow customers to run evaluations without raw prompts leaving their environment.

### Design

* StackCert control plane stores metadata and evidence.
* Customer-hosted worker pulls jobs or receives signed job bundles.
* Worker executes safety checks locally.
* Worker uploads normalized outputs or hashes.
* Evidence can be generated from customer-hosted artifacts.

### Acceptance criteria

A sensitive customer can run StackCert-compatible evaluations without sending raw prompts to StackCert.

---

# 19. Observability and operations

## Required before real pilots

### Application monitoring

* frontend error tracking
* backend error tracking
* worker error tracking
* API latency
* job duration
* connector failure rate
* import failure rate
* evidence export failure rate

### Recommended tools

Use whatever is quickest:

* Sentry or equivalent
* structured logs
* Cloud Run logs
* Supabase logs
* uptime checks

### Health endpoints

Existing API has `/api/health`.  Add:

```text
GET /api/health
GET /api/health/db
GET /api/health/storage
GET /api/health/worker
GET /api/health/cass
```

### Runbooks

Create runbooks for:

* API down
* worker stuck
* Supabase auth issue
* storage upload failure
* connector failures
* evidence export failure
* budget exceeded
* cross-tenant access bug
* deployment rollback

### Acceptance criteria

If a pilot breaks, the team can diagnose whether the issue is frontend, API, DB, storage, worker, connector, or CASS engine.

---

# 20. Testing plan

## Test categories

### 1. Unit tests

Cover:

* import validators
* output validators
* connector config validation
* CASS result transformation
* evidence generation
* retest trigger logic
* role checks
* budget calculations
* artifact hashing

### 2. Integration tests

Cover:

* example import → suite commit
* output upload → run creation
* run → ranking
* run → overlap
* run → measurement plan
* run → evidence draft
* evidence draft → issue
* evidence issue → signoff
* evidence issue → export
* connector registration → worker run
* job failure → retry
* job failure → dead-letter

### 3. Security tests

Cover:

* cross-workspace access denied
* cross-project access denied
* viewer cannot issue evidence
* risk reviewer cannot edit connector
* platform engineer cannot fake signoff if not allowed
* service role key never exposed
* connector secret never returned
* artifact URL access control

### 4. End-to-end tests

Critical flows:

1. Demo login → open overview → export evidence.
2. Create project → import examples → upload outputs → create run → issue evidence.
3. Register REST connector → run dry-run → view usage ledger.
4. Queue test plan → run worker → evidence updates.
5. Trigger retest → evidence becomes out of scope.
6. GitHub Action gate passes.
7. GitHub Action gate blocks.

### 5. Load and reliability tests

Minimum:

* 1,000 examples
* 10 safety checks
* 45 candidate pairs
* 10,000 outputs
* concurrent imports
* connector timeouts
* large evidence export

### Acceptance criteria

No evidence packet can be issued from invalid, incomplete, unauthorized, or stale inputs.

---

# 21. Documentation implementation

## Required docs for integrations

### 1. Quickstart

Title:

> Run your first StackCert evidence flow

Steps:

1. Create project.
2. Import examples.
3. Upload outputs.
4. Generate recommendation.
5. Inspect overlap.
6. Export release evidence.

### 2. Example-suite schema

Include:

* JSONL format
* CSV format
* required fields
* optional fields
* examples
* validation errors

### 3. Safety-check output schema

Include:

* JSONL format
* CSV format
* required fields
* examples
* coverage requirements

### 4. REST connector contract

Include:

* auth
* request format
* response format
* error format
* retries
* idempotency
* data modes
* example server

### 5. Model-judge adapter guide

Include:

* rubric format
* prompt template
* output parser
* score mapping
* limitations

### 6. Evidence packet specification

Include:

* status model
* JSON schema
* Markdown sections
* PDF export
* limitations
* retest triggers
* immutability

### 7. GitHub Action guide

Include:

* setup
* token
* workflow YAML
* pass/fail response
* common blocking reasons

### 8. MCP guide

Include:

* auth
* available tools
* read-only defaults
* example calls
* audit behavior

## Acceptance criteria

A customer engineer can integrate uploaded outputs or REST checks without a live implementation call.

---

# 22. Deployment and infrastructure plan

## Current foundation

The hosted demo uses Cloudflare Workers static assets, Supabase Auth, and Cloud Run FastAPI/CASS service. The current-state doc says Cloudflare, Supabase, Cloud Run, and GitHub CI/CD are wired and smoke-tested. 

## Target environments

Use three environments:

| Environment | Purpose              |
| ----------- | -------------------- |
| local       | development          |
| staging     | pilot testing/demo   |
| production  | real customer pilots |

## Required environment separation

Each environment should have separate:

* Supabase project or schema
* storage buckets
* API secrets
* connector secret namespace
* Cloud Run service
* Cloudflare deployment
* CI variables
* smoke-test user

## CI/CD

Pipeline stages:

1. lint/typecheck
2. frontend tests
3. backend tests
4. DB migration tests
5. security checks
6. build frontend
7. build backend image
8. deploy staging
9. smoke staging
10. deploy production manually or with approval
11. smoke production

The current repo already has CI, frontend tests, backend tests, and deployment workflows. 

## Migrations

Rules:

* every DB change has migration
* migrations tested locally
* migrations run in staging first
* production migrations require backup/checkpoint
* rollback plan documented

## Artifact storage

Buckets:

```text
example-suites
uploaded-outputs
normalized-runs
evidence-json
evidence-markdown
evidence-pdf
audit-exports
```

## Acceptance criteria

Production pilots do not use demo infrastructure, demo credentials, or shared test storage.

---

# 23. Security and privacy implementation

## Minimum before production pilots

### Data security

* private storage buckets
* signed URLs with expiry
* encrypted secrets
* no secrets in logs
* no raw prompts in logs
* prompt redaction support
* data deletion path
* retention settings

### App security

* auth required for app routes
* role checks
* RLS tests
* CSRF/CORS review
* rate limits
* audit events
* secure headers

### Connector security

* secrets backend-only
* test connector endpoint does not expose secret
* worker redacts request/response logs
* connector failures do not leak prompts
* customer can delete connector

### Evidence security

* issued evidence immutable
* exports access-controlled
* artifact hash stored
* signoff audit logged
* revocation audit logged

## Acceptance criteria

A security reviewer can understand how StackCert handles prompts, outputs, secrets, evidence, and deletion.

---

# 24. Implementation backlog

## P0: Must do before real design-partner pilots

### Product / UX

* Simplify setup flow.
* Keep landing copy mostly unchanged.
* Add sample evidence page.
* Add PDF export, even basic.
* Make “shortcut pick vs StackCert recommendation” clearer.
* Add evidence readiness checks.
* Rename visible “certificate/certified” language where practical.

### Backend

* Real workspace membership checks.
* Role-based authorization.
* RLS tests.
* Evidence immutability.
* Evidence audit events.
* Example import hardening.
* Output upload hardening.
* Customer-run result persistence.
* Worker idempotency.
* Managed secret storage.
* Budget cap enforcement.
* Better job failure classification.

### Integrations

* Uploaded-output path fully documented.
* REST connector contract documented and tested.
* Model-judge adapter skeleton.
* GitHub Action design and prototype.
* MCP smoke with real client.

### Security

* Private artifact storage.
* Secret redaction.
* Cross-tenant tests.
* Evidence access-control tests.
* Data deletion process.

---

## P1: Needed for repeatable pilots

### Product / UX

* Evidence diff between runs.
* Evidence timeline.
* Reviewer checklist.
* Dead-letter job UI.
* Connector test button.
* Improved import diagnostics.
* Retest trigger UI.

### Backend

* Model-judge adapter v1.
* Worker lease renewal.
* Retry/backoff by connector.
* Usage event completeness.
* Evidence expiration/revocation.
* API tokens for CI/CD.
* Generic release-gate endpoint.

### Integrations

* GitHub Action MVP.
* Slack notification MVP.
* Webhook event delivery.
* Customer storage export design.

---

## P2: Later enterprise hardening

### Product

* Advanced audit log UI.
* Project templates.
* Multi-app portfolio view.
* Evidence comparison dashboard.
* Traffic-mix drift dashboard.

### Backend

* SSO/SAML.
* SCIM.
* Customer-hosted worker.
* Full GRC integrations.
* Advanced retention policies.
* Advanced cost controls.

### Integrations

* Jira / Linear.
* Confluence / Notion export.
* Vanta / Drata / ServiceNow.
* S3/GCS/Azure customer buckets.
* Enterprise IdP.

---

# 25. 30 / 60 / 90 day implementation plan

## Days 0–30: make the current product pilot-ready

### Product

* Preserve the current landing page structure.
* Add sample release-evidence page.
* Add minimal “not a universal guarantee” note.
* Simplify setup into a step-by-step flow.
* Improve overview storytelling:

  * shortcut pick
  * StackCert recommendation
  * why overlap changed or supported the decision
* Improve evidence page:

  * readiness checklist
  * PDF export
  * immutable issue state
  * reviewer summary
* Clean visible “certificate/certified” wording where low-risk.

### Backend

* Implement proper workspace membership checks.
* Add role-based authorization helpers.
* Add RLS tests for core tables.
* Harden example import.
* Harden uploaded-output import.
* Persist customer run results.
* Add evidence immutability.
* Add audit events for evidence issue/export/signoff.
* Add managed secret storage design and first implementation.
* Add job idempotency.

### Worker

* Classify failures.
* Enforce budget caps.
* Improve usage events.
* Add retry behavior for REST connector failures.
* Ensure deterministic dry-run remains reliable.

### Integrations

* Publish uploaded-output schema.
* Publish REST connector contract.
* Build connector test endpoint.
* Start GitHub Action MVP.
* Test MCP with a real client.

### Acceptance by day 30

A customer can:

1. Create a project.
2. Import examples.
3. Upload safety-check outputs.
4. Generate a recommendation.
5. Inspect overlap.
6. Export Markdown/JSON evidence.
7. Issue immutable release evidence.
8. See clear limitations and retest triggers.

---

## Days 31–60: make integrations real

### Product

* Add dead-letter job UI.
* Add connector test result UI.
* Add evidence diff.
* Add retest trigger UI.
* Add signoff role selector.
* Add export history.

### Backend

* Complete managed secret storage.
* Complete REST connector hardening.
* Add model-judge adapter v1.
* Add worker lease renewal.
* Add API token model for CI/CD.
* Add release-gate API endpoint.
* Add evidence expiration/revocation.
* Add audit event coverage for:

  * connector changes
  * job runs
  * evidence exports
  * MCP calls
  * retest triggers

### Worker

* Add provider-specific retry/backoff.
* Add idempotent output writes.
* Add dead-letter handling.
* Add manual retry.
* Add partial-run handling.
* Add recompute evidence after targeted measurements.

### Integrations

* Release GitHub Action MVP.
* Add generic webhook events:

  * evidence ready
  * evidence issued
  * evidence expired
  * retest required
  * job failed
* Add Slack notification prototype.
* Complete MCP read-only tool set.

### Acceptance by day 60

A customer can:

1. Register a REST safety check.
2. Run it through the worker.
3. Track cost and failures.
4. Generate evidence from worker outputs.
5. Use a GitHub Action or API call to check evidence status.

---

## Days 61–90: make the system repeatable

### Product

* Polish setup flow based on actual pilot usage.
* Add project-level evidence status.
* Add evidence timeline.
* Add run comparison.
* Add project retest dashboard.
* Add clearer unresolved-comparison handling.

### Backend

* Harden production environment separation.
* Add more complete audit log.
* Add artifact hash verification.
* Add storage retention settings.
* Add customer data deletion workflow.
* Add complete release-gate status model.
* Add integration-token permissions.

### Worker

* Add model-judge production path.
* Add connector rate limits.
* Add connector health checks.
* Add worker monitoring dashboard.
* Add scheduled worker deployment.

### Integrations

* GitHub Action v1 stable.
* Generic CI/CD release-gate endpoint stable.
* MCP tested with real clients.
* Slack/Teams event notifications usable.
* Jira/Linear ticket creation designed or prototyped.
* Customer storage export scoped.

### Acceptance by day 90

StackCert can support repeated pilot usage without manual engineering for every run.

---

# 26. Implementation acceptance checklist

Before calling the implementation pilot-ready, the following should be true.

## App workflow

* [ ] User can create workspace/project.
* [ ] User can choose data mode.
* [ ] User can import examples.
* [ ] User can upload outputs.
* [ ] User can register REST connector.
* [ ] User can create run.
* [ ] User can view recommendation.
* [ ] User can compare options.
* [ ] User can inspect overlap.
* [ ] User can queue targeted tests.
* [ ] User can view usage/cost ledger.
* [ ] User can issue evidence.
* [ ] User can export evidence.
* [ ] User can request/sign off evidence.
* [ ] User can trigger retest.

## Evidence

* [ ] Evidence is generated backend-side.
* [ ] Evidence has scope.
* [ ] Evidence has assumptions.
* [ ] Evidence has limitations.
* [ ] Evidence has retest triggers.
* [ ] Evidence has artifact hash.
* [ ] Evidence is immutable after issue.
* [ ] Evidence can expire.
* [ ] Evidence can be revoked.
* [ ] Evidence can be superseded.
* [ ] Evidence exports are access-controlled.

## Security

* [ ] Auth required.
* [ ] Workspace isolation enforced.
* [ ] RLS tests pass.
* [ ] Service keys backend-only.
* [ ] Connector secrets backend-only.
* [ ] Private artifacts.
* [ ] Audit events.
* [ ] Data deletion path.
* [ ] No raw prompts in logs.

## Worker

* [ ] Jobs are idempotent.
* [ ] Jobs have leases.
* [ ] Jobs retry correctly.
* [ ] Jobs dead-letter correctly.
* [ ] Budget caps enforced.
* [ ] Usage events recorded.
* [ ] Partial failures visible.
* [ ] Evidence not issued from bad runs.

## Integrations

* [ ] Uploaded-output schema documented.
* [ ] REST connector contract documented.
* [ ] Model-judge adapter available.
* [ ] GitHub Action MVP works.
* [ ] Release-gate API works.
* [ ] MCP read-only tools work.
* [ ] Webhooks designed.
* [ ] Slack/Teams notifications scoped.

---

# 27. What not to change or build yet

Given your direction, we should explicitly avoid these for now:

## Do not change

* company name
* broad landing-page structure
* core headline
* core visual style
* core “safety checks for your LLM app” story
* demo CTA
* public explanation of rules/classifiers/model judges/stronger models/context/combinations

## Do not build yet

* full billing
* large provider marketplace
* broad AI governance inventory
* large GRC platform
* SSO/SAML before pilots require it
* full self-hosting before the core workflow is proven
* elaborate dashboards that do not help issue evidence
* complex sales/admin features
* deep compliance claims
* polished brand redesign

The current product direction is already production-oriented enough. The implementation risk is not that the idea is too small; it is that we might build too broadly before the evidence workflow is hardened.

---

# 28. The concrete implementation priority stack

If I had to compress the entire plan into the order of execution, I would do it this way:

## Priority 1: Make uploaded-output pilots excellent

This is the fastest path to real use.

Build:

* example import
* output upload
* validation
* run generation
* ranking
* overlap
* evidence export
* immutable issue

## Priority 2: Harden auth, tenancy, and evidence

Without this, serious users cannot trust the product.

Build:

* memberships
* roles
* RLS
* access checks
* audit events
* private artifacts
* immutable evidence

## Priority 3: Make REST connectors reliable

This turns StackCert from analysis of past outputs into an active evaluation workbench.

Build:

* connector registry
* secret storage
* worker execution
* retries
* usage events
* budget caps
* dead-letter handling

## Priority 4: Add model judges

This matches how many AI teams actually evaluate safety.

Build:

* judge templates
* provider abstraction
* output parser
* cost tracking
* judge-as-safety-check support

## Priority 5: Add release-gate integrations

This makes StackCert operationally sticky.

Build:

* GitHub Action
* generic release-gate API
* MCP read-only status
* webhooks
* Slack/Teams notifications

## Priority 6: Add retest automation

This turns one-time evidence into a lifecycle.

Build:

* manual retest triggers
* API retest triggers
* CI/CD metadata comparison
* evidence out-of-scope state
* retest dashboard

---

# 29. Final implementation thesis

The product does not need a dramatic conceptual change. It needs implementation discipline.

Keep the landing page mostly as-is. Keep StackCert. Keep the current story about choosing the right safety checks for an LLM app.

Then make the product prove that story end-to-end:

> A team brings examples and safety-check outputs. StackCert compares combinations, identifies overlap, recommends targeted tests, issues scoped release evidence, and blocks or warns on release when evidence is missing, stale, expired, or out of scope.

That is the implementation path.

