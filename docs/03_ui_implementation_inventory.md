# StackCert UI Implementation Inventory

## Source Of Truth

The latest design bundle is saved at:

```text
stackcert_product/design_reference/claude_design_project_v2/
```

Primary files:

- `Landing.html`: public landing page entrypoint.
- `StackCert.html`: authenticated app entrypoint.
- `ui-core.jsx`: design tokens and primitives.
- `ui-landing.jsx`: public site sections.
- `ui-shell.jsx`: app shell, sidebar, top bar, command palette.
- `ui-overview.jsx`: answer page.
- `ui-ranking.jsx`: options compared.
- `ui-corr.jsx`: overlap analysis.
- `ui-planner.jsx`: test plan and cost.
- `ui-cert.jsx`: release evidence.
- `ui-drift.jsx`: retest monitoring.
- `_check/*.png`: visual reference screenshots.

Earlier bundle:

- `design_reference/claude_design_project/` remains preserved for comparison.
- Use `claude_design_project_v2` as the current spec.

## Product Surfaces

The implementation now has two first-class UI surfaces:

1. Public site.
2. Authenticated app.

They share the same visual system, but they should not share all layout
components. The public site is narrative and conversion-oriented; the app is a
dense evidence workbench.

Current copy rule: public and demo UI should explain the product to an LLM app
operator, not to someone who already knows the CASS paper. Prefer "safety
check," "combination," "app examples," "targeted tests," and "release evidence."
Keep CASS, welfare, certificate, and internal route/API names out of visible UI
unless a methodology page is explicitly explaining them.

## Shared Design Tokens

Use CSS variables for the core tokens from `ui-core.jsx`:

```css
:root {
  --sc-bg: #f6f6f8;
  --sc-surface: #ffffff;
  --sc-surface-2: #fafafb;
  --sc-surface-3: #f1f1f3;
  --sc-line: #e7e7ea;
  --sc-line-2: #d6d6dc;
  --sc-ink: #111114;
  --sc-ink-2: #3a3a42;
  --sc-ink-3: #62626d;
  --sc-dim: #9a9aa3;
  --sc-accent: #5b5bd6;
  --sc-accent-soft: #eeeefb;
  --sc-ok: #1f9d55;
  --sc-warn: #a85d11;
  --sc-bad: #bc2a2a;
}
```

Typography:

- UI sans: Inter, then system sans.
- Mono: JetBrains Mono, then ui-monospace.
- Do not use negative letter spacing beyond what the supplied design specifies.
- Keep tool chrome compact and deliberate.

Geometry:

- App cards: about 10px radius.
- Landing large panels: 14px to 22px where shown.
- Buttons: 7px to 10px depending on context.
- App sidebar: 232px.
- App top bar: 56px.
- App page max width: 1320px.
- Landing container: about 1180px.

## Public Landing Page Inventory

Current landing sections:

1. Sticky nav.
2. Hero with headline and product preview.
3. Basic building blocks: safety options and combinations.
4. Problem section: choosing the combination is the hard part.
5. Common alternatives: best single check, stronger model, more context, or
   exhaustive testing.
6. How StackCert chooses: app examples, overlap tests, and recommendation.
7. Product previews: recommendation, options compared, overlap analysis, test
   plan and cost, release evidence, retest triggers.
8. Feature grid.
9. Proof/research callouts.
10. Pricing.
11. Final CTA.
12. Footer.

Implementation notes:

- Preserve the headline family: "Choose the right safety checks for your LLM
  app."
- Preserve the product preview as code-native UI, not a static screenshot.
- Do not reintroduce the old "Built for teams making agent guardrails..."
  language.
- The demo CTA should route through sign-in to the seeded support-copilot demo.
- The "Start pilot" CTA routes to onboarding until CRM/calendar exists.
- Pricing numbers are product assumptions, not final billing truth. Keep them
  configurable.

Responsive requirements:

- Desktop landing must reveal the product preview in the first scroll.
- Tablet should collapse product cards to one column.
- Mobile nav should collapse to a menu.
- Pricing cards should stack cleanly.
- Product preview should not overflow the viewport.

## Authenticated App Inventory

Navigation labels:

- Recommendation
- Options compared
- Overlap analysis
- Test plan and cost
- Release evidence
- When to retest
- App setup
- Apps

App shell:

- Sidebar with workspace/project context.
- Top search.
- Risk-weight/risk-profile control.
- Persona segmented control.
- Notifications.
- Command palette on Cmd/Ctrl+K.
- Keyboard nav 1-8.

The persona control is useful as a product idea, but in production it should not
hide core facts. It can tune helper copy and default focus.

## Screen Requirements

### Overview

Purpose:

- Answer which safety-check combination is recommended and what should happen
  next.

Required data:

- Recommended combination.
- Release-evidence status.
- App score and confidence interval.
- Lift over the obvious one-at-a-time pick.
- Targeted-test coverage.
- Example mix.
- Recent retest triggers.
- Cost summary for current recommendation.

Required interactions:

- Open release evidence.
- See ranking.
- Inspect overlap.
- Change risk weight/profile.
- Export current evidence summary.

### Options Compared

Purpose:

- Compare all candidate combinations and expose one-at-a-time versus
  overlap-tested movement.

Required data:

- Candidate combination IDs.
- Safety-check display names and versions.
- One-at-a-time score.
- Together score.
- Intervals.
- Recommended/close/poor-fit status.
- Estimated latency and cost.

Required interactions:

- Sort columns.
- Filter status.
- Compare selected stacks.
- Export CSV.
- Inspect combination detail.

### Overlap Analysis

Purpose:

- Make shared unsafe misses and shared false blocks visible and actionable.

Required data:

- Safety-check pair matrix.
- Side: adversarial or benign.
- Cell-level breakdown.
- Worst shared-miss and false-block pairs.
- Targeted-test gaps.

Required interactions:

- Toggle adversarial/benign.
- Click matrix cell.
- Queue relevant measurement.
- Jump to options compared filtered by pair.

### Test Plan And Cost

Purpose:

- Turn uncertainty into the next best evaluation spend.

Required data:

- Recommended test bundles.
- Expected decision help.
- Cost estimate.
- ETA estimate.
- Comparisons affected.
- Provider/model call estimates.

Required interactions:

- Select/clear/select all.
- Queue plan.
- Re-rank after tests complete.
- View cost impact.

### Release Evidence

Purpose:

- Scoped release evidence for one app, one example mix, and one safety-option
  set.

Required data:

- Evidence status.
- Scope, assumptions, candidate set.
- Example suite versions and weights.
- Combination and safety-check versions.
- Risk profile.
- Targeted-test coverage.
- Comparison proof state.
- Signoffs.
- Expiration and invalidation rules.

Required interactions:

- Issue release evidence.
- Export JSON.
- Export Markdown.
- Export PDF.
- Request signoff.
- View audit log.

### Drift

Purpose:

- Keep release evidence fresh after launch.

Required data:

- Drift signals.
- Retest history.
- Model/safety-check/prompt/version diffs.
- Traffic mixture changes.
- Incident and benchmark updates.

Required interactions:

- Trigger retest.
- Configure signal.
- Snooze/acknowledge with audit reason.
- Open affected release evidence.

## Additional Product Screens Needed

The current app design covers the evidence console. A usable product also needs:

- Sign in/sign up.
- Workspace onboarding.
- Project setup.
- Example/custom behavior builder.
- Safety-check/model connector setup.
- Candidate combination builder.
- Cost estimate/usage ledger.
- Job/run history.
- Settings: members, roles, secrets, retention, billing.

These should be implemented after the core landing/app shell and seeded demo
are stable.

## Data Mapping

Prototype display IDs:

- `LG3`
- `Phi3`
- `L3-3B`
- `Gemma`
- `Rules`
- `Lex`
- `CR`

Backend IDs should remain stable, descriptive, and versioned:

- `llama_guard3_1b`
- `phi3_mini_judge`
- `llama3_2_3b_judge`
- `gemma3_1b_judge`
- `rules_policy`
- `lexical_guard`
- `cautious_rules_policy`

Add a frontend display-name utility. Do not store short display labels as the
source of truth.

## Fidelity Rules

- Preserve the latest landing page and app design.
- Keep UI text code-native.
- Keep the app table-driven and evidence-forward.
- Keep public landing copy crisp and specific.
- Do not replace the evidence app with marketing cards.
- Do not ship inert controls in core workflows.
- Do not compute release-evidence truth in the frontend.
- Browser-test desktop and mobile breakpoints before handoff.
