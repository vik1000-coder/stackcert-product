# StackCert Testing And CI/CD Plan

## Testing Philosophy

StackCert has three correctness layers:

1. Mathematical correctness of CASS and certificates.
2. Product/data correctness across API, DB, jobs, and exports.
3. UI correctness and workflow fidelity.

All three must be tested. A pretty dashboard with incorrect certificate logic is
dangerous; a correct engine with broken auth or exports is not sellable.

## Test Pyramid

### Python Core Tests

Purpose:

- Validate CASS math, data validation, scheduling, and certificate logic.

Current baseline:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Add:

- pytest migration if useful.
- Golden certificate fixtures.
- Property tests for interval bounds and monotonicity.
- Scheduler edge cases.
- Import/validation tests for malformed customer files.

### API Tests

Use:

- pytest
- httpx AsyncClient
- test database or local Supabase

Cover:

- Auth required.
- Workspace authorization.
- Project/run CRUD.
- Benchmark/custom behavior CRUD.
- Run summary endpoints.
- Certificate issue/export.
- Job creation/cancel/retry.
- Cost estimate endpoints.

### Database And RLS Tests

Use:

- Supabase local CLI.
- SQL fixtures for users/workspaces/projects.
- SQL or API tests that impersonate roles.

Cover:

- RLS enabled on exposed tables.
- Non-member cannot read or write workspace data.
- Viewer cannot mutate.
- Platform/security can create runs as allowed.
- Risk reviewer can sign off but cannot edit adapters.
- Storage policies prevent cross-workspace access.

### Frontend Tests

Use:

- Vitest.
- React Testing Library.
- MSW or API fixture layer.

Cover:

- Landing nav and CTA behavior.
- Auth route handling.
- App shell navigation.
- Tables, filters, selected state.
- Custom behavior builder.
- Cost estimate display.
- Export button behavior.
- Error/loading/empty states.

### End-To-End Tests

Use:

- Playwright.
- Local Supabase + API + Vite.

Core paths:

- Public landing loads.
- Sign in.
- Open seeded demo project.
- Read overview certified status.
- Open ranking and sort/filter.
- Open co-failure and inspect a cell.
- Queue measurements.
- Export certificate.
- Trigger drift recertification.
- Create a custom behavior and include it in a draft suite.

### Visual And Accessibility Tests

Use:

- Playwright screenshots for high-value pages.
- axe or equivalent accessibility checks.

Visual baselines:

- Landing top.
- Landing long scroll.
- Overview.
- Ranking.
- Co-failure.
- Measurements.
- Certificate.
- Drift.

Accessibility:

- Keyboard navigation.
- Focus states.
- Dialog labels.
- Form labels.
- Color contrast for semantic statuses.

### Performance And Load Tests

Use later:

- k6, Locust, or a simple Python load harness.

Measure:

- Dashboard summary p95 latency.
- Ranking/correlation endpoint p95 latency.
- Job throughput with fake providers.
- Worker concurrency and provider rate limiting.
- Large benchmark import time.

## Periodic Test Cadence

During development:

- After backend/core edit: Python targeted tests.
- After API endpoint edit: API targeted tests.
- After migration edit: DB reset/apply and RLS tests.
- After frontend feature edit: typecheck, unit tests, build.
- After workflow edit: Playwright path.
- Before handoff: full relevant local test suite.

Never batch all verification to the end of a phase.

## GitHub Actions Workflows

### `.github/workflows/ci.yml`

Runs on pull request and main.

Jobs:

- Python core and service tests.
- Frontend lint/type/test/build.
- Hosted static build check with hash routing.
- Supabase local migration reset/status check.
- Supabase Edge Function presence check.

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  python-core:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m pip install --upgrade pip
      - run: python -m pip install -e .
      - run: |
          python -m unittest discover -s tests -p 'test_*.py' -v
          python -m unittest discover -s tests_service -p 'test_*.py' -v
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: |
          if [ -f web/package.json ]; then
            cd web
            npm ci
            npm run lint
            npm run typecheck
            npm test -- --run
            npm run build
            VITE_ROUTER_MODE=hash VITE_PUBLIC_BASE=./ VITE_API_BASE_URL=https://example.invalid/functions/v1/stackcert-api VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=example npm run build
          else
            echo "web/package.json not present yet; skipping frontend checks"
          fi
```

### Deployment Smoke

Use `scripts/deployment_smoke.py` against the hosted environment after every
free-tier deploy. It verifies:

- public web shell;
- public API health;
- unauthenticated API denial;
- Supabase password sign-in;
- authenticated project read.

For the current hosted target:

```bash
export STACKCERT_SMOKE_SUPABASE_ANON_KEY="<publishable-or-anon-key>"
scripts/deployment_smoke.py \
  --web-url "https://vik1000-coder.github.io/stackcert-product/" \
  --api-url "https://cgwiwmfzpektpyquiveg.supabase.co/functions/v1/stackcert-api" \
  --supabase-url "https://cgwiwmfzpektpyquiveg.supabase.co" \
  --email demo@stackcert.dev \
  --password stackcert-demo
```

Repo-level deployment contract coverage lives in
`tests_service/test_deployment_readiness.py`.

### `.github/workflows/db.yml`

Runs migration and RLS checks.

Jobs:

- Start local Supabase.
- Apply migrations.
- Run DB tests.
- Generate DB types if used.
- Fail if schema drift is detected.

### `.github/workflows/e2e.yml`

Runs Playwright after app foundation exists.

Jobs:

- Start Supabase.
- Start FastAPI.
- Start Vite preview.
- Run Playwright tests.
- Upload screenshots/videos on failure.

### `.github/workflows/security.yml`

Runs on pull request, scheduled nightly, and before release.

Jobs:

- Secret scanning.
- Dependency review.
- npm audit or better dependency scanner.
- pip-audit.
- Bandit.
- Semgrep.
- Docker/image scan when containers exist.

### `.github/workflows/nightly.yml`

Runs slower confidence checks.

Jobs:

- Golden certificate replay.
- Longer import/eval smoke.
- Load test with fake providers.
- Browser visual snapshots.
- Supabase backup/restore rehearsal periodically.

### `.github/workflows/release.yml`

Runs on tags or protected release branch.

Jobs:

- Full test matrix.
- Build API image.
- Build worker image.
- Build frontend artifact.
- Run image scans.
- Apply Supabase migrations after approval.
- Deploy Cloud Run API and worker.
- Deploy frontend.
- Run production smoke tests.

## Branch Protection

Before production:

- Require `ci.yml`.
- Require DB checks.
- Require security scan.
- Require e2e on protected branches.
- Require code review.
- Block merge on unresolved migration drift.

## Release Gates

A release cannot ship unless:

- All tests pass.
- Migrations are reviewed.
- RLS policies are tested.
- API OpenAPI contract is updated.
- Frontend build succeeds.
- Worker image builds.
- Smoke test passes against deployed environment.
- Rollback instructions are known.
