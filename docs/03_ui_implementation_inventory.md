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
- `ui-ranking.jsx`: stack ranking.
- `ui-corr.jsx`: co-failure map.
- `ui-planner.jsx`: measurement planner.
- `ui-cert.jsx`: certificate artifact.
- `ui-drift.jsx`: drift monitoring.
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

Sections from `ui-landing.jsx`:

1. Sticky nav.
2. Hero with headline and product preview.
3. Customer/logo strip.
4. Problem section: hidden correlation tax.
5. How it works: declare candidates, run bundle-greedy, issue certificate.
6. Product previews: ranking, co-failure, measurements, certificate.
7. Feature grid.
8. Proof/research callouts.
9. Pricing.
10. Final CTA.
11. Footer.

Implementation notes:

- Preserve the headline: "Certify the guardrail stack you actually ship."
- Preserve the product preview as code-native UI, not a static screenshot.
- Replace fake customer names/testimonial with final approved copy before
  public launch.
- The "Open app" CTA should route to sign-in or the app depending on session.
- The "Book demo" CTA can be a placeholder route until CRM/calendar exists.
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

- Overview
- Stack ranking
- Co-failure
- Measurements
- Certificate
- Drift

App shell:

- Sidebar with workspace/project context.
- Top search.
- Lambda/risk profile control.
- Persona segmented control.
- Notifications.
- Command palette on Cmd/Ctrl+K.
- Keyboard nav 1-6.

The persona control is useful as a product idea, but in production it should not
hide core facts. It can tune helper copy and default focus.

## Screen Requirements

### Overview

Purpose:

- Answer whether the stack is certified and what should happen next.

Required data:

- Recommended stack.
- Certificate status.
- Welfare estimate and interval.
- Regret avoided.
- Measurement coverage.
- Benchmark mixture.
- Recent drift signals.
- Cost summary for current recommendation.

Required interactions:

- Open certificate.
- See ranking.
- Inspect co-failure.
- Change lambda/risk profile.
- Export current evidence summary.

### Stack Ranking

Purpose:

- Compare all candidate stacks and expose marginal-vs-full welfare movement.

Required data:

- Candidate stack IDs.
- Guard display names and versions.
- First-order welfare.
- Full welfare.
- Intervals.
- Certification/open/negative status.
- Estimated latency and cost.

Required interactions:

- Sort columns.
- Filter status.
- Compare selected stacks.
- Export CSV.
- Inspect stack detail.

### Co-Failure

Purpose:

- Make correlated failure visible and actionable.

Required data:

- Guard pair matrix.
- Side: adversarial or benign.
- Cell-level breakdown.
- Worst co-miss and false-block pairs.
- Measurement gaps.

Required interactions:

- Toggle adversarial/benign.
- Click matrix cell.
- Queue relevant measurement.
- Jump to stack ranking filtered by pair.

### Measurements

Purpose:

- Turn uncertainty into the next best evaluation spend.

Required data:

- Recommended measurement actions.
- Expected radius reduction.
- Cost estimate.
- ETA estimate.
- Comparisons affected.
- Provider/model call estimates.

Required interactions:

- Select/clear/select all.
- Queue plan.
- Re-rank after measurements complete.
- View cost impact.

### Certificate

Purpose:

- Formal evidence artifact.

Required data:

- Certificate status.
- Scope, assumptions, candidate set.
- Benchmark suite versions and weights.
- Stack versions.
- Welfare profile.
- Measurement coverage.
- Comparison proof state.
- Signoffs.
- Expiration and invalidation rules.

Required interactions:

- Issue certificate.
- Export JSON.
- Export Markdown.
- Export PDF.
- Request signoff.
- View audit log.

### Drift

Purpose:

- Keep certificates live after launch.

Required data:

- Drift signals.
- Recertification history.
- Model/guard/prompt/version diffs.
- Traffic mixture changes.
- Incident and benchmark updates.

Required interactions:

- Trigger recertification.
- Configure signal.
- Snooze/acknowledge with audit reason.
- Open affected certificate.

## Additional Product Screens Needed

The current app design covers the evidence console. A usable product also needs:

- Sign in/sign up.
- Workspace onboarding.
- Project setup.
- Benchmark/custom behavior builder.
- Guard/model connector setup.
- Candidate stack builder.
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
- Do not compute certificate truth in the frontend.
- Browser-test desktop and mobile breakpoints before handoff.

