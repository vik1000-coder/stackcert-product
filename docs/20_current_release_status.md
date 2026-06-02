# Current Release Status

Last updated: 2026-06-02 19:21 UTC

This is the concise status page for the deployed StackCert staging system. Use
it when checking whether local code, GitHub, Supabase, Cloud Run, and
Cloudflare agree.

## Source And CI

- Repository: `vik1000-coder/stackcert-product`
- Branch: `codex/design-partner-deployability-discovery` for the current
  deployability PR; `main` remains the release base.
- Latest pushed hosted-pilot hardening commit: `b0b5219` (`Harden hosted pilot
  workflow`).
- Latest deployed API image from this branch:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:b0b5219-staging-202606021930-amd64`.
- Latest manual Cloudflare staging deploy from this branch before the
  deployment-status docs refresh: Worker version
  `c9e4c39a-c20b-4635-baee-4a7bdfcfe0a0`. Use
  `npx wrangler deployments list --name stackcert-staging` for the newest live
  version ID, because this docs refresh can create a later static deployment.
- Release path: pushes to `main` run `ci`, the GitHub Pages fallback deploy,
  and then the Cloudflare Worker deploy after CI succeeds.
- Latest audit result:
  - local frontend/backend gates: success;
  - local and hosted Playwright smoke: success for public/pilot-readiness
    pages;
  - manual Cloudflare deploy: success;
  - same-origin public deployment smoke: success;
  - direct Cloud Run public API smoke: success;
  - authenticated hosted uploaded-output smoke: not run in the latest pass
    because Supabase smoke credentials were not exported in the shell.
- Exact run and commit IDs are intentionally not hard-coded here because docs
  updates create new commits and Cloudflare version IDs change on every deploy.
  Use `gh run list --branch main --limit 6` and
  `npx wrangler deployments list --name stackcert-staging` for the live IDs.

## Hosted URLs

- Cloudflare app and same-origin API:
  `https://stackcert-staging.savikk129.workers.dev/`
- Sign-in route:
  `https://stackcert-staging.savikk129.workers.dev/auth/sign-in`
- Cloud Run API:
  `https://stackcert-api-oaw2bwdgyq-uc.a.run.app`
- Fallback GitHub Pages app:
  `https://vik1000-coder.github.io/stackcert-product/#/auth/sign-in`

Demo credentials:

```text
Email: demo@stackcert.dev
Password: stackcert-demo
```

## Deployed Services

Cloudflare Workers:

- Worker: `stackcert-staging`
- Deployment status: verified through direct `wrangler deploy` during this
  audit from commit `b0b5219`.
- Current verified version ID before the docs-refresh redeploy:
  `c9e4c39a-c20b-4635-baee-4a7bdfcfe0a0`
- Behavior: serves `web/dist` static assets and proxies `/api/*` plus
  `/api/mcp` and `/openapi.json` to Cloud Run.

Cloud Run API:

- Service: `stackcert-api`
- Region: `us-central1`
- Latest ready revision: `stackcert-api-00020-7qm`
- Image:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:b0b5219-staging-202606021930-amd64`
- Traffic: 100% to latest revision
- Scale guardrails: min instances `0`, max instances `3`, concurrency `40`
- GCP budget guardrail: `StackCert staging $50`

Cloud Run worker job:

- Job: `stackcert-worker`
- Region: `us-central1`
- Tasks: `1`
- Parallelism: `1`
- Max retries: `0`
- Timeout: `900s`

Supabase:

- Auth is active for the hosted app.
- Local and linked remote migrations match through
  `20260602162000_report_versions_and_hardening.sql`.
- Recent Supabase changelog check noted the current Data API exposure change;
  current migrations explicitly grant access and enable RLS for exposed public
  tables.

## Current Product Capabilities

- Public landing pages, auth, guided onboarding, project setup, and the app
  workbench are live.
- Public `/proof` page is live with the support-copilot prompt-safety proof
  pack, Grok 4.3 baseline, local-combination comparison, explicit voting rule,
  task-specific benchmark slices, example input/output summaries, cost
  simulator, and honest fallback language.
- Public design-partner pages are live for pilot readiness, integrations,
  procurement, support, security/privacy positioning, sitemap, and `llms.txt`.
- CASS-backed recommendation, ranking, overlap, measurement, cost, release
  evidence, and retest views are live for the demo project.
- Uploaded-output pilot flow persists benchmark suites, outputs, runs,
  readiness, and issued evidence.
- Safe sample pilot templates can be duplicated into private projects. Seeded
  fixture runs are marked `template_seeded` and the app warns buyers to replace
  sample evidence before relying on a release claim.
- Private pilot setup now leads with uploaded-output tasks: matching example
  and output templates, stable `external_id`/`example_id` contract,
  output-coverage preview, release-context fields, run creation, report/gate
  next steps, and advanced connector/worker controls below the first-pilot
  path.
- REST/model-judge connectors require an explicit live test before
  worker-backed provider runs; the stored `last_test` summary is redacted and
  expires after seven days.
- Release reports now have durable report versions and Markdown/JSON/PDF export
  controls. Draft exports resolve to the latest report version for a run.
- Project permissions expose buyer-facing Admin, Editor, Reviewer, and Viewer
  capabilities; restricted controls render disabled with explanatory copy.
- Admin retention controls can preview or apply raw-example/provider-response
  deletion and redaction actions for the selected app.
- Setup includes a compact YAML config-as-code preview/apply utility for pilot
  profile, safety options, examples references, combination rules, and release
  context.
- Worker-backed deterministic, REST, and model-judge evaluation paths are
  implemented and tested.
- Connector secrets use redacted metadata and backend-only secret references.
- Release-gate REST and MCP surfaces are authenticated, project-scoped, and
  smoke-tested.
- Admin operations includes worker health, spend, usage, audit trail,
  retry/cancel controls, dead-letter review, and persisted workspace/project
  budget policies.

## Verification Run

Most recent local verification from this status update:

```text
uv run python -m compileall stackcert_service
  -> OK

uv run python -m unittest tests_service.test_api_demo -v
  -> 59 tests passed

uv run python -m unittest tests_service.test_sellable_ready_controls -v
  -> 4 tests passed

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run src/App.test.tsx src/FirstPilotClarity.test.tsx src/WorkflowPolish.test.tsx
  -> 48 tests passed

npm run build
  -> OK, with the existing Vite >500 kB chunk warning

supabase db push --linked --dry-run
  -> would apply 20260602143000 and 20260602162000

supabase db push --linked --yes
  -> applied 20260602143000 and 20260602162000

Cloud Run API deploy
  -> revision stackcert-api-00020-7qm serving 100% traffic

npm run deploy
  -> Cloudflare Worker stackcert-staging deployed as version
     c9e4c39a-c20b-4635-baee-4a7bdfcfe0a0

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> cloud run api smoke OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev
  -> deployment smoke OK
```

Most recent full pre-deploy baseline from the previous status update:

```text
uv run python -m unittest discover -s tests_service -p 'test_*.py' -v
  -> 131 tests passed

npm --prefix web run typecheck
  -> OK

npm --prefix web test -- --run
  -> 40 tests passed

npm --prefix web run build
  -> OK, with the existing Vite >500 kB chunk warning

npm run deploy
  -> Cloudflare Worker `stackcert-staging` deployed as version
     `80f1b282-fac3-469a-b8c6-e2856cc24f90`

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev
  -> deployment smoke OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> cloud run api smoke OK
```

Most recent Playwright verification:

```text
Local hosted-pilot workflow:
  / landing page sample pilot duplication
  / private duplicated overview with template-evidence warning
  / release report with report-version selector and PDF export
  / setup config-as-code preview
  / admin retention/deletion preview
  / 390px mobile setup overflow check
  -> no console warnings/errors; no horizontal overflow.

Local desktop/mobile:
  /proof
  /pilot-readiness
  /integrations
  /procurement
  /support
  /app/ws_demo/proj_acme_copilot/setup
  -> no horizontal overflow; no console errors; setup loads with API present;
     uploaded-output path renders before advanced connectors/workers.

Hosted desktop/mobile:
  /proof
  /pilot-readiness
  /integrations
  /procurement
  /support
  -> no horizontal overflow; no console errors.
```

Latest unauthenticated hosted behavior checked through smoke tests:

- unauthenticated app API calls are denied;
- Cloudflare same-origin `/api/health` returns OK;
- direct Cloud Run `/api/health` returns OK;
- hosted public pages render the proof and design-partner readiness content.

Authenticated smoke coverage exists in the scripts, but the latest manual pass
did not run the Supabase-authenticated project, MCP, release-gate webhook,
worker, or hosted uploaded-output smoke paths because the required Supabase
smoke environment variables were not exported locally.

## Remaining Production Work

The app is solid staging/design-partner infrastructure, but still needs these
before it can be sold as production-ready for real customer data:

1. Fill and pass the non-Sentry operations evidence gate:
   `scripts/design_partner_ops_check.py --evidence-json ... --strict`.
   Required evidence includes uptime checks, Cloud Run log-based alerts,
   Supabase restore rehearsal, Auth email setup, customer data contract, and
   support owner. Sentry is intentionally skipped for the current hardening
   pass.
2. Backup/restore rehearsal for Supabase Postgres and Storage artifacts.
3. Auth sender-domain setup, email templates, and invite/account lifecycle
   policy.
4. Re-run authenticated hosted smoke with exported Supabase smoke credentials,
   including:
   - `scripts/deployment_smoke.py` with Supabase auth;
   - `scripts/hosted_uploaded_output_pilot_smoke.py`;
   - `scripts/release_gate_webhook_smoke.py`;
   - `scripts/cloud_run_worker_smoke.py`.
5. First customer-specific deployment adapter on top of the signed generic
   release-gate webhook.
6. Provider throttling observation in hosted operations after the new provider
   health admin view has real managed-run traffic.
7. Code-split the frontend bundle or raise the warning threshold once the app
   shell is otherwise stable; the current build succeeds but Vite still warns
   about a >500 kB chunk.

Design-partner v1 is intentionally uploaded-output first. StackCert does not
need to host customer local models for the first deployable workflow; customer
or local models should appear as uploaded outputs, customer-hosted REST
endpoints, or a later customer-run worker.

Completed in the current implementation branch:

- Reviewed trace-import commits now turn trace previews into draft benchmark
  suites through `POST /api/projects/{project_id}/trace-imports`.
- First-pilot clarity now uses “Release report” as the primary artifact name
  and makes the demo/private-pilot boundary explicit.
- Frontier proof page now shows the narrow task, Grok 4.3 comparison, local
  pair/triple behavior, voting rule, example input/output summaries, benchmark
  slices, replication commands, and a buyer-readable cost simulator.
- Private pilot setup now prioritizes uploaded-output pilots before managed
  connector/worker controls.
- Design-partner public/support pages, sitemap, and `llms.txt` now reflect the
  uploaded-output-first pilot posture.
- Non-Sentry operations readiness checker and design-partner checklist are in
  place.
- Signed generic release-gate webhook endpoint:
  `POST /api/projects/{project_id}/release-gates/webhook`.
- Provider health admin view derived from jobs, retries, dead letters, and
  usage events.
- Design-partner pilot checklist: `docs/21_design_partner_pilot_checklist.md`.
