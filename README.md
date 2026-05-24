# StackCert Product Prototype

This is an isolated product prototype for CASS Labs / StackCert. It is separate
from the research apparatus in the parent directory.

StackCert helps teams choose the right safety-check combinations for LLM apps.
The product compares rules, classifiers, model judges, stronger-model routes,
context policies, and other checks on examples from the application the team
actually cares about. The goal is safer, useful results at lower test cost,
with scoped release evidence instead of broad safety claims.

The current scope includes the CASS core under the hood, a product API, a React
LLM app safety workbench, Supabase schema/Auth/Storage foundations, CI checks,
and a hosted Supabase free-tier demo. The core engine includes:

- data schemas and JSONL/CSV import;
- safety-check adapters and offline evaluation runner;
- exact K=2 serial combination scoring;
- comparison logic for release evidence;
- targeted test recommendations;
- Markdown and JSON evidence export;
- unit tests for core evidence behavior.

The product direction is now a production-oriented full-stack app:

- public landing page that explains safety options and why combinations matter;
- authenticated StackCert workbench for app-specific recommendations;
- FastAPI service around the Python CASS core;
- authenticated MCP endpoints for release-evidence status, theory cards, and
  agent deployment reviews;
- Supabase Postgres/Auth/Storage;
- Cloud Run API and worker services;
- GitHub Actions CI/CD.

For the current implementation state and next priorities, start with
`docs/15_current_state_and_next_steps.md`.

## Hosted Demo

The current hosted demo is live at:

```text
https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in
```

Demo login:

```text
Email: demo@stackcert.dev
Password: stackcert-demo
```

This hosted version uses GitHub Pages for the static web app, plus Supabase
Auth and a Supabase Edge Function API. The fuller production architecture still
keeps the Python CASS engine, FastAPI service, and worker service as the
provider-grade path. See `docs/12_supabase_free_tier_deployment.md`.

Current hosted API base:

```text
https://cgwiwmfzpektpyquiveg.supabase.co/functions/v1/stackcert-api
```

Current Cloud Run staging API:

```text
https://stackcert-api-oaw2bwdgyq-uc.a.run.app
```

The Cloud Run service is the real FastAPI/CASS runtime. The Supabase Edge
Function remains the lightweight hosted-demo API until the frontend deployment
is repointed to Cloud Run.

## Product App Planning

The original dashboard UI handoff bundle is copied into:

```text
design_reference/claude_design_project/
```

The latest landing-page-plus-app UI handoff bundle is copied into:

```text
design_reference/claude_design_project_v2/
```

Planning docs for turning this into a production-ready application live in:

- `docs/00_plan_index.md`
- `docs/01_user_and_product_plan.md`
- `docs/02_stack_and_architecture_plan.md`
- `docs/03_ui_implementation_inventory.md`
- `docs/04_phased_development_plan.md`
- `docs/05_database_auth_security_plan.md`
- `docs/06_testing_ci_cd_plan.md`
- `docs/07_models_benchmarks_custom_tests_plan.md`
- `docs/08_cost_and_future_integrations_plan.md`
- `docs/09_agent_deployment_research_and_integration_plan.md`
- `docs/10_certificate_scope_and_risk_positioning.md`
- `docs/11_local_dev_and_release_runbook.md`
- `docs/12_supabase_free_tier_deployment.md`
- `docs/13_production_hosting_setup.md`
- `docs/14_product_language_guide.md`
- `docs/15_current_state_and_next_steps.md`

Initial GitHub Actions workflow drafts live in:

- `.github/workflows/ci.yml`
- `.github/workflows/certificate-gate.yml`
- `.github/workflows/security.yml`
- `.github/workflows/nightly.yml`
- `.github/workflows/deploy-pages.yml`

Cloud Run staging helpers live in:

- `scripts/gcloud_budget_setup.py`
- `scripts/gcloud_cost_preflight.py`
- `scripts/cloud_run_secrets.py`
- `scripts/cloud_run_api_smoke.py`

Run the cost preflight before any GCP deployment. It is read-only and should
pass before enabling APIs or creating Cloud Run resources:

```bash
python scripts/gcloud_cost_preflight.py \
  --project-id "$GCP_PROJECT_ID" \
  --region "${GCP_REGION:-us-central1}" \
  --gcloud "${GCLOUD_BIN:-gcloud}"
```

The current staging budget is `StackCert staging $10` on
`project-e7840c42-f298-4bd9-bff`, scoped to gross Google Cloud usage before
free-trial credits are applied.

Cloudflare temporary frontend hosting can use Workers Builds with:

```text
Path: web
Build command: npm ci && npm run build
Deploy command: npx wrangler deploy
```

The required Workers static-assets config lives at `web/wrangler.jsonc`.

## Local App

Run the API:

```bash
cd stackcert_product
python -m pip install -e .
python -m uvicorn stackcert_service.main:app --host 127.0.0.1 --port 8000 --reload
```

Run the web app:

```bash
cd stackcert_product/web
npm ci
npm run dev -- --port 5173
```

The API uses the real CASS research artifacts when present and falls back to
`demo_data/` for clean clones and CI. See
`docs/11_local_dev_and_release_runbook.md` for Supabase, container, and release
gates.

The API keeps demo state in memory unless Supabase persistence is configured.
Set `SUPABASE_URL`, backend-only `SUPABASE_SECRET_KEY`, and
`STACKCERT_PERSISTENCE_BACKEND=supabase` to persist custom behavior drafts and
managed job records.

## Quick Smoke Test

```bash
cd stackcert_product
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 examples/paper_demo.py \
  --examples ../data/processed/examples_real_main_2000.jsonl \
  --outputs ../data/outputs/real_main_2000_8agent_outputs.jsonl \
  --weights-json ../configs/cass_real.json \
  --lambda-cost 5 \
  --budget-fraction 0.5 \
  --markdown-out /tmp/stackcert_release_evidence.md
```
