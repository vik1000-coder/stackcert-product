# Product Language Guide

Last updated: 2026-06-05

This guide records the current public and demo vocabulary. CASS now means the
current atom-aware, correlation-aware committee-search method. The old K<=2
serial interval certificate is called `old_cass` when discussed directly. The
product should still be understandable to a normal LLM app team.

## Current Positioning

StackCert helps teams choose cost-effective safety-check combinations for
agentic LLM workflows. It compares rules, classifiers, small model judges,
frontier fallback routes, context policies, and customer checks on examples from
the workflow the team cares about, then produces scoped release evidence.

The plain-English value proposition:

- Safer agent workflows because combinations are judged on workflow-specific
  unsafe and normal examples.
- Lower cost because StackCert finds the cheapest defensible release path: a
  local/open-weight committee when it is enough, a frontier fallback when it
  changes the decision, or a human-review gate when automation is not ready.
- Better scale because teams can repeat the workflow across apps, releases, and
  retest triggers.
- Clearer review because the evidence says what was tested, what was not tested,
  and when it must be refreshed.

The commercial posture is service-led product. Early buyers should experience
StackCert as a guided diagnostic or design-partner pilot backed by software, not
as a blank self-serve SaaS form that pretends to know the buyer's risk policy.
The software should make the work repeatable; the first paid outcome is a
defensible release report.

## Preferred Terms

Use these in public pages, onboarding, and the demo dashboard:

- `LLM app`: the customer workflow being improved.
- `Safety check`: a rule, classifier, model judge, context policy, stronger-model
  route, or other step around the LLM.
- `Combination`: the set of safety checks the app might run together.
- `App examples`: unsafe and normal examples that represent the target workflow.
- `One-at-a-time pick`: the shortcut where teams score checks separately and
  choose the apparent winner.
- `Overlap`: when two checks miss the same unsafe examples or block the same
  normal examples.
- `Targeted tests`: the extra tests StackCert runs only when they can change the
  recommendation.
- `Release evidence`: the scoped packet reviewers use for an app release.
- `Retest`: what happens after model, prompt, tool, policy, traffic, or
  safety-check changes.

## Avoid In First-Run UI

Avoid these unless the page is explicitly technical or methodological:

- `guardrail stack`
- `certificate` as the primary user-facing artifact
- `certification`
- `recertification`
- `welfare`
- `marginal winner`
- `co-failure`
- `pair-cell`
- `benchmark mixture`

Acceptable exceptions:

- API routes and scripts can keep compatibility names such as
  `certificate-status`.
- Methodology pages can say "CASS" after explaining it in plain English.
- Historical K<=2 results and interval-engine details should say `old_cass`.
- Internal engineering docs can name the backend fields when needed.

## Landing Page Story

The landing page should teach the problem before naming the method:

1. Agentic workflow teams have many safety options.
2. Common shortcuts are flawed: pick the best single check, use a more expensive
   model, add lots of context, or test every combination.
3. The real question is which combination works for this workflow.
4. StackCert compares combinations on workflow examples and runs only
   decision-changing overlap tests.
5. The result is a recommendation plus release evidence that is safer, cheaper,
   and easier to scale.

Current hero:

```text
Find the cheapest defensible release path for your AI agent.
```

Avoid saying "small models beat frontier models" as a general claim. Say:

```text
StackCert compares frontier baselines, open-weight judges, guard models,
customer controls, and hybrid routes, then shows which path is defensible for
this workflow.
```

## Demo Dashboard Story

The seeded support-copilot demo should answer:

- What is this app trying to prevent?
- Which safety options are being compared?
- Why does the obvious one-at-a-time pick lose?
- Where do the cost savings come from?
- What exactly does the release evidence support?
- When would the team need to retest?

Current navigation labels:

- Recommendation
- Options compared
- Overlap analysis
- Test plan and cost
- Release evidence
- When to retest
- App setup
- Apps

## Evidence Language

Say:

```text
This packet supports a decision about one LLM app, one example mix, and one set
of safety options. It is not a universal safety guarantee.
```

Do not say:

```text
This certifies the AI system is safe.
```

The evidence should always show:

- app and run scope;
- selected combination;
- assumptions;
- limitations;
- retest triggers;
- signoff state;
- export links.

## Pricing Language

Use service-led package language until repeat usage is proven:

- `Sample Sandbox`: free sample pilot with clearly marked template evidence.
- `Diagnostic Sprint`: $5k-$10k for benchmark design, candidate mapping, a
  small replay, and go/no-go memo.
- `Design Partner Pilot`: $15k-$35k for one private workflow, buyer examples,
  candidate checks/routes, a release report, review call, and retest plan.
- `Production Evidence Program`: $4k-$12k/month for repeated reports, retests,
  reviewer seats, audit history, and release-gate integrations.

Provider costs are customer-paid or explicitly budgeted. Do not imply unlimited
frontier benchmarking in a fixed pilot price.
