# Product Language Guide

Last updated: 2026-05-23

This guide records the current public and demo vocabulary. It exists because the
backend and research layer still use CASS-era terms, while the product should be
understandable to a normal LLM app team.

## Current Positioning

StackCert helps teams choose cost-effective safety-check combinations for LLM
apps. It compares options on examples from the application the team cares about,
runs targeted tests where overlap can change the decision, and produces scoped
release evidence.

The plain-English value proposition:

- Safer results because combinations are judged on app-specific unsafe and normal
  examples.
- Lower cost because StackCert avoids testing every possible overlap.
- Better scale because teams can repeat the workflow across apps, releases, and
  retest triggers.
- Clearer review because the evidence says what was tested, what was not tested,
  and when it must be refreshed.

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
- Internal engineering docs can name the backend fields when needed.

## Landing Page Story

The landing page should teach the problem before naming the method:

1. LLM app teams have many safety options.
2. Common shortcuts are flawed: pick the best single check, use a more expensive
   model, add lots of context, or test every combination.
3. The real question is which combination works for this application.
4. StackCert compares combinations on app examples and runs only decision-changing
   overlap tests.
5. The result is a recommendation plus release evidence that is safer, cheaper,
   and easier to scale.

Current hero:

```text
Choose the right safety checks for your LLM app.
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
