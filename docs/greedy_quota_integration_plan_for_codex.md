# Greedy-Quota Integration Plan for StackCert

**Purpose of this document**: Self-contained plan that can be handed to Codex (or equivalent coding agent) in a future session. It defines *exactly* what to build, where, success criteria, style constraints, and pitfalls. No implementation work is to be done now.

**Context** (reference these files in the repo):
- `docs/cass_greedy_quota_report.pdf` (original 30-page report)
- `docs/cass_greedy_quota_extracted_and_organized.md` (full extraction, definitions, theorems, exact pseudocode of the algorithm)
- `docs/cass_greedy_quota_vs_stackcert_comparison.md` (detailed gap analysis vs current `CassEngine`, pairwise K≤2 focus, release gates, UI, job system)
- `implementation_log.md` (latest entry from 29 May 2026)
- Existing core: `stackcert/cass/certificates.py` (`CassEngine`, `max_k=2`, `build_candidate_architectures`, pair statistics, welfare, intervals), `stackcert/cass/*`, release gates (`stackcert_service/services/release_gates.py`), measurement jobs, Supabase schema, React UI (Ranking, Certificate, Measurements, Drift), demo data from 2,000-example CASS run.

## Goal
Add Greedy-Quota as an **upstream constructive selection layer** that generates candidate stacks, prefixes, quota rules, and (optionally) weighted/compressed variants. These feed into the *existing* `CassEngine`, measurement plans, ranking, certificate logic, release gates, and UI without disrupting current K≤2 pairwise flows.

The result should feel like a natural extension: users in the Setup UI can choose “Greedy-Quota Construction” as an alternative to manual candidate definition, producing evidence packets that the existing certificate/ranking/drift system understands.

**Do not**:
- Change the default `max_k=2` behavior.
- Remove or deprecate any current pairwise/correlation/co-failure logic.
- Add new UI screens unless explicitly scoped below.
- Implement production deployment changes (Cloud Run, Supabase schema changes only if strictly required for new job type).

## Required Output Style & Conventions
- Match existing codebase exactly: same dataclass patterns, type hints, test structure (`unittest`), docstrings, Supabase repository pattern (memory + persistent backends), logging style.
- Use existing modules where possible (`stackcert.cass.*`, `stackcert_service/services/*`).
- All new code must pass existing test suites plus new targeted tests.
- Keep changes minimal and additive.
- Include clear comments referencing the report sections (e.g. “Theorem 3.3 greedy guarantee”, “Section 4.2 offline construction”).

## Phased Implementation Tasks (Do in this order)

### Phase 1: Core Algorithm Module (new file)
Create `stackcert/cass/greedy_quota.py`:
- Implement exact algorithm from report Section 4.2 (atoms = model×context, greedy residual ratio selection with budgets, prefix retention, quota scanning, optional weighted cross-fit, optional Hoeffding compression).
- Pure functions where possible: `run_greedy_construction(...) -> GreedyQuotaOutput`.
- `GreedyQuotaOutput` dataclass containing prefixes, quota candidates, weighted variants, compressed stacks, metadata (marginal gains, UCBs, etc.).
- Reuse existing schemas (`Guard`, `BenchmarkCell`, `GuardOutput`, `WelfareProfile`).
- Include Hoeffding utilities and submodularity checks (reference Theorems 3.2–3.5, 3.11).
- Add unit tests in `tests/test_greedy_quota.py` using the existing fixture patterns from `test_certificate_logic.py`.

### Phase 2: Integration with CassEngine
- Extend `CassEngine` (in `certificates.py`) with optional `greedy_output: GreedyQuotaOutput | None = None`.
- Add method `from_greedy_output(...)` that converts greedy candidates into architectures for existing pair statistics / interval / certificate logic.
- Support `max_k > 2` only when greedy_output is provided (keep default behavior unchanged).
- Update `certified_winner()` and `build_certificate()` to incorporate quota rules and compression metadata in the output packet.
- Add minimal tests showing greedy-generated candidates produce valid certificates.

### Phase 3: Job & Service Layer
- Add new job type `construction-job` (alongside `evaluation-job` and `measurement-plan`).
- Extend job service (`stackcert_service/services/`) to run Greedy-Quota construction (using the new module) and persist results as evidence artifacts.
- Add API endpoint `POST /api/projects/{project_id}/construction-jobs` (mirrors existing job patterns).
- Update release gates to recognize `greedy_quota` evidence packets (update assumptions text, status mapping, context binding).

### Phase 4: UI & Benchmarking (Minimal)
- Add “Greedy-Quota” option to Setup UI construction controls (dropdown or toggle). Do **not** redesign screens.
- Wire it to call the new construction job endpoint.
- Add a benchmark script (`scripts/benchmark_greedy_vs_pairwise.py`) that runs both approaches on the seeded demo data and outputs comparison metrics (coverage, benign loss, certificate status, cost, K used).
- Update `docs/15_current_state_and_next_steps.md` (or equivalent) with one paragraph summarizing the integration.

### Phase 5: Tests, Docs & Verification
- All new code must pass `python -m unittest discover -s tests -p 'test_*.py'` and service tests.
- Add 2–3 Playwright checks for the Setup UI toggle (non-breaking).
- Update `implementation_log.md` with exact commands used and verification results.
- Ensure release gates still pass all existing smoke tests with and without greedy evidence.

## Success Criteria
- Existing K≤2 pairwise flows are 100% unchanged (regression tests pass).
- New construction job produces output that `CassEngine` can certify and the UI can display in Ranking/Certificate screens.
- Benchmark script shows meaningful complementarity (greedy finds different candidates with comparable or better welfare under budgets).
- No new dependencies. All code uses existing patterns.
- Documentation in the three new `docs/` files is referenced.

## Pitfalls to Avoid (Explicit)
- Do not assume conditional independence for weighted quota in production paths (preserve current correlation-aware logic).
- Union bounds in empirical greedy are loose — surface this in logs/UI rather than hiding it.
- Performance: greedy on large |M|×|H| must be efficient (reuse logged outputs, incremental residuals).
- K>2 certificates must clearly document expanded scope in evidence packets and gates.
- Do not touch Cloud Run, Docker, or Supabase schema unless absolutely required for the new job type.

**When handing to Codex**: Provide this file + the three reference docs. Instruct it to implement **Phase 1 first**, then pause for review before continuing. Use the existing `stackcert` editable package structure.

This plan is complete, self-contained, and ready for a future Codex session. No action is to be taken on it in the current turn.

---
*Created 29 May 2026. References `docs/cass_greedy_quota_*` files added to the repository earlier today.*
