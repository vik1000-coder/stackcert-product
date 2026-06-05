# Release Evidence Scope And Risk Positioning

## Core Principle

StackCert should never imply that an AI system is absolutely safe.

The product should say:

- "recommended for this app, example mix, safety-option set, risk profile, and
  assumptions";
- "scoped release evidence";
- "evidence-backed risk mitigation";
- "current as of this run and valid until drift, expiration, or material change";
- "retest when the model, prompt, safety check, tool, traffic, or policy changes."

The product should not say:

- "guaranteed safe";
- "compliance guaranteed";
- "all attacks prevented";
- "production risk eliminated";
- "auditor-proof";
- "the model is certified safe."

## Recommended Value Language

Use:

- "Choose the right safety checks for your LLM app."
- "Compare rules, classifiers, model judges, stronger models, context policies,
  and combinations on app-specific examples."
- "Measure where safety checks miss or block the same examples."
- "Run only the targeted tests that can change the recommendation."
- "Ship with scoped release evidence."
- "Retest when the app or safety setup changes."

Avoid in public or first-run demo UI:

- "Certify the guardrail stack you actually ship."
- "Measure correlated failures across composed controls."
- "Issue a defensible certificate."
- "Welfare profile."
- "Marginal winner."
- "Co-failure."
- "Recertification."

Those terms can remain in backend APIs, research notes, and methodology docs
where they are explicitly explained.

## Release-Evidence Claim Shape

Every evidence packet should be explicit:

```text
StackCert supports the selected safety-check combination for this LLM app,
example mix, risk weighting, candidate combinations, and stated assumptions.
The selected combination beat the listed alternatives by the recorded comparison
margins for this run.
```

It should also state:

```text
This evidence packet does not guarantee that the underlying AI system is safe,
compliant, or free from harmful behavior. It is evidence for a scoped
comparative risk decision and should be used with operational monitoring, human
review, access controls, and incident response processes.
```

## Required Evidence Sections

Each evidence packet should include:

- Evidence ID.
- Status: ready for review, needs more evidence, expired, revoked, failed, or
  draft.
- App, workspace, project, and environment.
- Candidate safety-check combinations.
- Selected combination and safety-check versions.
- Example suite and version.
- Example groups, labels, weights, and data-handling mode.
- Risk profile or risk weight.
- Combination rule.
- Targeted-test coverage.
- Statistical method and intervals.
- Comparison status.
- Known limitations.
- Exclusions.
- Retest triggers.
- Expiration date.
- Signoffs.
- Export hash.
- Audit event references.

## Scope And Limitation Language

Each evidence packet must include limitations such as:

- Only covers the examples, generated/custom behaviors, and traffic mix described
  in the evidence packet.
- Does not cover undiscovered attack classes.
- Does not cover changes to prompts, model versions, safety-check versions,
  thresholds, policies, tools, retrieval corpora, or traffic mix unless retested.
- Does not replace legal, compliance, security, or safety review.
- Does not guarantee that all harmful outputs or actions are prevented.
- Does not validate the correctness of customer-provided labels unless a review
  workflow is completed.
- May depend on third-party model/provider behavior outside StackCert's control.

## UI Language Rules

Use "recommended" or "ready for review" in the app before using "certified."

Good:

- "Recommended safety combination: LG3 + Phi3."
- "Ready for review."
- "Release evidence for Acme Support Copilot."
- "Retest required after safety option, model, or prompt drift."

Risky:

- "Safe."
- "Certified AI."
- "Certified winner" without naming the app scope and assumptions.

Status label suggestions:

- `ready for review`
- `needs more evidence`
- `close`
- `poor fit`
- `expired`
- `out of scope`

Evidence buttons:

- "Open release evidence"
- "Issue release evidence"
- "Export evidence"
- "Request signoff"
- "Trigger retest"

Avoid buttons like:

- "Mark safe"
- "Approve AI"
- "Guarantee compliance"

## Contract And Product Controls

Before production launch, legal/product should add:

- Terms of service disclaimers.
- Acceptable use policy.
- Limitation of liability.
- No professional/legal/compliance advice language.
- Customer responsibility for final deployment decisions.
- Third-party provider dependency language.
- Data handling and retention terms.
- Incident and vulnerability reporting path.

Product controls:

- Require user acknowledgement when issuing release evidence.
- Keep issued evidence immutable after issue.
- Use revocation/expiration instead of mutation.
- Force retesting after material drift.
- Show limitations on-screen, not only in exports.
- Keep all signoffs auditable.

## How CASS Helps Us Cover The Claim

CASS gives StackCert a concrete, defensible claim:

- It compares candidate combinations, not absolute universal safety.
- It measures overlap, brittle atoms, and shared failures where composition can
  break intuition.
- It records the example mix and risk profile.
- It can explain unresolved comparisons and recommend targeted tests.
- It can produce scoped release evidence with assumptions rather than vague
  assurance language.

The legacy K<=2 serial interval certificate is now named `old_cass`. It remains
the current auditable finite-sample evidence layer, while `CASS` refers to the
broader atom-aware, correlation-aware search frame.

That narrower claim is commercially useful and easier to defend than broad
"AI safety certification."
