# StackCert Production Plan Index

Last updated: 2026-05-23

This directory is the living implementation plan for turning the CASS prototype
into a production-ready StackCert company product.

## Current Decision

Build StackCert as a full-stack SaaS/workbench with:

- React + Vite + TypeScript for the public site and authenticated app.
- FastAPI for product APIs and CASS engine orchestration.
- Supabase Postgres, Auth, and Storage from the beginning.
- Cloud Run API and worker services for economical horizontal scale.
- GitHub Actions for test, security, migration, preview, and release workflows.

The product should remain light in day-to-day development, but the architecture
must be able to support real customer throughput, long-running evaluations,
private data, audit trails, and tenant isolation.

## Design References

Two design bundles are preserved:

- `design_reference/claude_design_project/`: earlier dashboard-only design.
- `design_reference/claude_design_project_v2/`: latest landing page plus app
  design. Treat this as the primary reference unless the user says otherwise.

Latest primary files:

- `design_reference/claude_design_project_v2/Landing.html`
- `design_reference/claude_design_project_v2/StackCert.html`
- `design_reference/claude_design_project_v2/ui-landing.jsx`
- `design_reference/claude_design_project_v2/ui-core.jsx`
- `design_reference/claude_design_project_v2/ui-shell.jsx`
- `design_reference/claude_design_project_v2/ui-overview.jsx`
- `design_reference/claude_design_project_v2/ui-ranking.jsx`
- `design_reference/claude_design_project_v2/ui-corr.jsx`
- `design_reference/claude_design_project_v2/ui-planner.jsx`
- `design_reference/claude_design_project_v2/ui-cert.jsx`
- `design_reference/claude_design_project_v2/ui-drift.jsx`

## Planning Docs

- `01_user_and_product_plan.md`: users, workflows, and product thesis.
- `02_stack_and_architecture_plan.md`: production stack and system design.
- `03_ui_implementation_inventory.md`: landing and app UI inventory.
- `04_phased_development_plan.md`: iterative implementation plan.
- `05_database_auth_security_plan.md`: schema, auth, RLS, and security.
- `06_testing_ci_cd_plan.md`: test strategy and GitHub Actions plan.
- `07_models_benchmarks_custom_tests_plan.md`: model, benchmark, and custom
  behavior workflows.
- `08_cost_and_future_integrations_plan.md`: cost modeling and integration
  roadmap.
- `09_agent_deployment_research_and_integration_plan.md`: how current agent
  deployments work and where StackCert should integrate.
- `10_certificate_scope_and_risk_positioning.md`: release-evidence scope,
  disclaimers, and risk-positioning rules.
- `11_local_dev_and_release_runbook.md`: local API/web/Supabase setup and
  release gates.
- `12_supabase_free_tier_deployment.md`: current hosted free-tier demo deploy,
  Auth/API/static hosting commands, smoke test, and limitations.
- `13_production_hosting_setup.md`: recommended Cloudflare Pages, Supabase,
  Cloud Run, and GitHub Actions production setup checklist.
- `14_product_language_guide.md`: current public/demo vocabulary and copy rules.

## Current Hosted Demo

The playable hosted demo is deployed at:

```text
https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in
```

It uses GitHub Pages for the static web app plus Supabase Auth and the
`stackcert-api` Edge Function.
See `12_supabase_free_tier_deployment.md` for deployment and verification
details.

## Test Cadence

Every implementation slice should end with a small verification pass:

- Backend/core edits: run Python unit tests and targeted API tests.
- Database migrations: run migration apply/reset and RLS policy tests.
- Frontend edits: run TypeScript, lint, unit/component tests, and build.
- Workflow changes: run Playwright e2e against local Supabase/API/web.
- Release candidates: run the full CI matrix, security scans, migration checks,
  smoke tests, and at least one golden release-evidence replay.

The current core smoke test remains:

```bash
cd stackcert_product
python3 -m unittest discover -s tests -p 'test_*.py' -v
```
