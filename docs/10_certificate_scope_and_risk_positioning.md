# Certificate Scope And Risk Positioning

## Core Principle

StackCert should never imply that an AI system is absolutely safe.

The product should say:

- "certified for this benchmark mixture, candidate set, guard versions, welfare
  profile, and aggregation rule";
- "evidence-backed risk mitigation";
- "conditional certificate";
- "current as of this run and valid until drift/expiration."

The product should not say:

- "guaranteed safe";
- "compliance guaranteed";
- "all attacks prevented";
- "production risk eliminated";
- "auditor-proof."

## Recommended Value Language

Use:

- "Certify the guardrail stack you actually ship."
- "Measure correlated failures across composed controls."
- "Issue a defensible, scoped certificate."
- "Reduce launch risk with evidence."
- "Find the minimum measurements needed to support the decision."
- "Monitor drift so stale certificates do not remain trusted."

Avoid:

- "Guarantee safety."
- "Prevent every jailbreak."
- "Make agents compliant."
- "Eliminate hallucinations."
- "Certify your model is safe."

## Certificate Claim Shape

Every certificate should be explicit:

```text
StackCert certifies that, among the candidate guardrail stacks evaluated in
this run, under the stated benchmark mixture, welfare profile, aggregation rule,
guard versions, and statistical assumptions, the selected stack is preferred to
the listed alternatives by the recorded comparison margins.
```

It should also state:

```text
This certificate does not guarantee that the underlying AI system is safe,
compliant, or free from harmful behavior. It is evidence for a scoped
comparative risk decision and should be used with operational monitoring,
human review, access controls, and incident response processes.
```

## Required Certificate Sections

Each certificate should include:

- Certificate ID.
- Status: valid, provisional, expired, revoked, failed, draft.
- Project and environment.
- Candidate set.
- Selected stack and versions.
- Benchmark suite and version.
- Benchmark cells and weights.
- Data handling mode.
- Welfare/risk profile.
- Aggregation rule.
- Measurement coverage.
- Statistical method and intervals.
- CASS comparison proof status.
- Known limitations.
- Exclusions.
- Drift triggers.
- Expiration date.
- Signoffs.
- Export hash.
- Audit event references.

## Scope And Limitation Language

Each certificate must include limitations such as:

- Only covers the benchmark examples, generated/custom behaviors, and traffic
  mixture described in the certificate.
- Does not cover undiscovered attack classes.
- Does not cover changes to prompts, model versions, guard versions, thresholds,
  policies, tools, retrieval corpora, or traffic mixture unless re-certified.
- Does not replace legal, compliance, security, or safety review.
- Does not guarantee that all harmful outputs or actions are prevented.
- Does not validate the correctness of customer-provided labels unless a review
  workflow is completed.
- May depend on third-party model/guard/provider behavior outside StackCert's
  control.

## UI Language Rules

Use "Certified" only with local context:

- Good: "CASS-certified for prod-risk-v4."
- Good: "Certified winner among 12 candidate stacks."
- Risky: "Safe."
- Risky: "Certified AI."

Status label suggestions:

- `Valid`
- `Provisional`
- `Needs measurement`
- `Expired`
- `Revoked`
- `Out of scope`

Certificate buttons:

- "Issue scoped certificate"
- "Export evidence"
- "Request signoff"
- "Trigger recertification"

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

- Require user acknowledgement when issuing a certificate.
- Keep certificates immutable after issue.
- Use revocation/expiration instead of mutation.
- Force re-certification after material drift.
- Show limitations on-screen, not only in exports.
- Keep all signoffs auditable.

## How CASS Helps Us Cover The Claim

CASS gives StackCert a concrete, defensible claim:

- It compares candidate stacks, not absolute universal safety.
- It measures co-failure where composition can break intuition.
- It records the benchmark mixture and welfare profile.
- It can explain unresolved comparisons and recommend next measurements.
- It can produce a bounded certificate with assumptions rather than vague
  assurance language.

That narrower claim is commercially useful and easier to defend than broad
"AI safety certification."

