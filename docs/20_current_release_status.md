# Current Release Status

Last updated: 2026-06-05

This is the concise status page for the deployed StackCert staging system. Use
it when checking whether local code, GitHub, Supabase, Cloud Run, and
Cloudflare agree.

## Source And CI

- Repository: `vik1000-coder/stackcert-product`
- Branch: `codex/design-partner-deployability-discovery` for the current
  deployability PR; `main` remains the release base.
- Current branch work adopts CASS v2 positioning and product surfaces while
  preserving `old_cass` as the legacy K<=2 serial interval evidence engine.
- Use `git log -1 --oneline`, `gcloud run services describe stackcert-api`, and
  `npx wrangler deployments list --name stackcert-staging` for exact live
  commit, Cloud Run revision/image, and Cloudflare Worker version IDs.
- Release path: pushes to `main` run `ci`, the GitHub Pages fallback deploy,
  and then the Cloudflare Worker deploy after CI succeeds.
- Latest audit result:
  - local frontend/backend gates: success on 2026-06-05;
  - local Browser smoke: success for `/proof`, `/pilot-readiness`, and mobile
    setup anchor behavior;
  - Cloudflare Worker dry-run: success for the current static-header worker;
  - same-origin public deployment smoke: success;
  - direct Cloud Run public API smoke: success;
  - authenticated hosted uploaded-output, webhook, worker, and Supabase-auth
    smokes: success on 2026-06-05;
  - non-Sentry operations evidence gate: ready with evidence file
    `artifacts/design-partner-ops-evidence.json`.
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
  audit from commit `f7c7f86` plus local Worker/header changes.
- Current verified version ID:
  `9a8a81e3-9825-4e60-8926-587a81b0f32f`
- Behavior: serves `web/dist` static assets and proxies `/api/*` plus
  `/api/mcp` and `/openapi.json` to Cloud Run.

Cloud Run API:

- Service: `stackcert-api`
- Region: `us-central1`
- Latest ready revision: `stackcert-api-00023-rvx`
- Image:
  `us-central1-docker.pkg.dev/project-e7840c42-f298-4bd9-bff/stackcert/stackcert-api:f7c7f86-staging-202606051620-amd64`
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
  workbench are live. The landing page now leads with cheaper, safer agentic
  workflow release evidence.
- Public `/proof` page is live with the support-copilot prompt-safety proof
  pack, Grok 4.3 baseline, local-combination comparison, explicit voting rule,
  task-specific benchmark slices, example input/output summaries, cost
  simulator, and honest fallback language.
- Public design-partner pages are live for pilot readiness, integrations,
  procurement, support, security/privacy positioning, sitemap, and `llms.txt`.
- CASS-backed recommendation, ranking, overlap, measurement, cost, release
  evidence, and retest views are live for the demo project. Public methodology
  and app surfaces distinguish current `cass-v2-atom-correlation-search` from
  historical `old_cass-k2-serial-interval-v1`.
- Uploaded-output pilot flow persists benchmark suites, outputs, runs,
  readiness, and issued evidence.
- Safe sample pilot templates can be duplicated into private projects. Current
  templates cover customer support, internal assistants, and agentic workflows
  with 12 examples and 5 candidate checks each, including small-model judges and
  frontier fallback routes. Seeded fixture runs are marked `template_seeded` and
  the app warns buyers to replace sample evidence before relying on a release
  claim.
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
uv run python -m unittest discover -s tests_service -p 'test_*.py' -v
  -> 139 tests passed

uv run python -m unittest discover -s tests -p 'test_*.py' -v
  -> 19 tests passed

npm --prefix web test -- --run
  -> 52 tests passed

npm run build
  -> OK; route chunks split and the previous >500 kB Vite warning is gone.
     Main JS chunk is about 285 kB.

npx wrangler deploy --dry-run
  -> OK; reads 42 static asset files and validates the Worker bindings.

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev
  -> deployment smoke OK

uv run python scripts/cloud_run_api_smoke.py --api-url https://stackcert-api-oaw2bwdgyq-uc.a.run.app
  -> cloud run api smoke OK

uv run python scripts/deployment_smoke.py --web-url https://stackcert-staging.savikk129.workers.dev --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted>
  -> deployment smoke OK, including authenticated /api/projects and MCP checks

uv run python scripts/mcp_client_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted>
  -> mcp client smoke OK

uv run python scripts/hosted_uploaded_output_pilot_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted>
  -> hosted uploaded-output pilot smoke OK:
     project=84749071-5221-4df8-8cea-bbf47d3184c0 run=run_a1d690445ed5

uv run python scripts/release_gate_webhook_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --project-id proj_acme_copilot
  -> release-gate webhook smoke OK: decision=pass

uv run python scripts/cloud_run_worker_smoke.py --api-url https://stackcert-staging.savikk129.workers.dev --supabase-url <redacted> --email demo@stackcert.dev --password <redacted> --project-id project-e7840c42-f298-4bd9-bff --region us-central1
  -> cloud run worker smoke OK: job_46bc4f7b2749 complete

uv run python scripts/design_partner_ops_check.py --evidence-json artifacts/design-partner-ops-evidence.json --strict
  -> status ready
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
  -> OK, with the historical Vite >500 kB chunk warning

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

Current local Browser pass:
  /proof at 1280x720
  /pilot-readiness at 390x844
  /app/ws_demo/proj_acme_copilot/setup at 390x844
  -> no console warnings/errors; no horizontal overflow; setup first heading
     visible in about 0.5s on a cold local API process; the `#import-examples`
     CTA lands below the sticky mobile header.

Hosted desktop/mobile:
  /proof
  /pilot-readiness
  /integrations
  /procurement
  /support
  -> no horizontal overflow; no console errors.
```

Latest hosted behavior checked through smoke tests:

- unauthenticated app API calls are denied;
- Cloudflare same-origin `/api/health` returns OK;
- direct Cloud Run `/api/health` returns OK;
- hosted public pages render the proof and design-partner readiness content;
- hosted browser sign-in with the smoke user reaches `/onboarding?resume=1`;
- authenticated `/api/projects`, MCP, uploaded-output pilot, release-gate
  webhook, and Cloud Run worker paths pass.

## Remaining Production Work

The app is solid staging/design-partner infrastructure, but still needs these
before it can be sold as production-ready for real customer data:

1. Execute one real design-partner pilot under signed terms. Agree data mode,
   redaction, retention, deletion/export owner, and allowed artifact types
   before upload.
2. Configure production-grade Supabase Auth sender domain/SMTP and reviewed
   invite/password lifecycle email templates. The staging policy is recorded in
   the ops evidence, but custom sender/templates are not yet configured.
3. First customer-specific deployment adapter on top of the signed generic
   release-gate webhook.
4. Provider throttling observation in hosted operations after the new provider
   health admin view has real managed-run traffic.

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
- Static Cloudflare asset responses now add CSP, HSTS, frame, referrer,
  permissions, and content-type security headers.
- Google Cloud alert policies now route to notification channel
  `projects/project-e7840c42-f298-4bd9-bff/notificationChannels/12163037838207638915`.
- Repeatable Supabase restore rehearsal tooling now covers
  `public,private,storage` plus Storage metadata.
- Frontend routes are code-split, removing the previous Vite >500 kB chunk
  warning.
- Mobile setup anchors use a sticky-header-safe scroll offset, and demo bundle
  cold-load access is serialized per lambda cost so concurrent first requests
  do not duplicate the expensive cache fill.
- Design-partner pilot checklist: `docs/21_design_partner_pilot_checklist.md`.
