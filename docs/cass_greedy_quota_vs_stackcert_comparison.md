# CASS-Greedy-Quota vs Current StackCert Implementation: Compare & Contrast

**Date**: 29 May 2026
**Source materials**: `docs/cass_greedy_quota_report.pdf` + parsed extraction + current `stackcert_product/` codebase, `implementation_log.md`, `stackcert/cass/certificates.py`, release gates, UI, Supabase schema.

## Summary
The Greedy-Quota report provides a **constructive upstream selection layer** for the CASS foundation. Current StackCert has mature **downstream productization** (UI, API, persistence, certificates, ranking, drift, release gates, jobs). They are highly complementary. Integrating the report's greedy + quota pipeline would significantly strengthen candidate generation while leveraging existing certificate/ranking/measurement machinery.

## Similarities (Strong Overlap on CASS Foundations)
- Both center on **CASS theory**: welfare (harmful coverage F(S) vs benign loss L(S)), cells/strata, limited evaluation budget, statistical certificates with Hoeffding-style bounds, adaptive measurement/racing, holdout certification to control adaptive data reuse, audit/logging for drift and learning.
- **Correlation awareness**: Report notes limitations of independence assumptions for weighted quota. Current implementation has explicit `Co-Failure` screen, `test_correlation_asymmetry.py`, `rho_prior`, pairwise statistics, and correlation-aware interval certificates.
- **Production features**: Cost-aware planning, staged serving, timeouts/fallbacks, comprehensive logging (versions, hashes, outcomes), monitoring/drift signals, shadow/canary, release evidence gates. Report's Section 6 maps almost directly onto implemented FastAPI + Supabase + React + Cloud Run architecture.
- **Evidence & Gates**: Report emphasizes "deployment decision record" with intervals, baseline comparison, recertification triggers. Current system has rich `CassEngine.certified_winner()`, `StackCertificate`, statuses (`certified_winner`, `provisional`, `needs_measurement`), release gates checking evidence packets, versions, benchmark suites, context hashes, and strict blocking logic.
- **Demo data**: Both use the same style of CASS benchmark runs (2,000-example seeded demo data in StackCert).

## Key Differences
**Ensemble Scale & Selection**
- Report: Explicitly scales to larger K using **greedy residual coverage** (submodular guarantee `(1-1/e)`) on atoms (model × small explicit context recipes H). Ratio-greedy for cost/benign budgets. Retains all prefixes.
- Current: `max_k=2` default in `CassEngine`. Builds pairwise candidate architectures (`build_candidate_architectures`), computes first-order + pair statistics. Selection via measurement plans and `certified_winner()` logic. More "measure-what-you-need" than constructive greedy.

**Aggregation**
- Report: Powerful reduction to **quota rules** (`∑ Qi ≥ q`). Proof that anonymous monotone rules are exactly thresholds. Optional weighted quota (Bayes derivation) + cross-fitting. Sparse compression from large weighted committee.
- Current: Pairwise/serial logic, welfare profiles, co-failure metrics. Strong on correlation but less emphasis on full quota scanning or large-K compression.

**Evaluation & Certification**
- Report: Integrated pipeline (greedy → quota scan → optional weighted/compress → adaptive racing of shortlist → fresh holdout). Finite-candidate bound benefits from small post-greedy K.
- Current: Mature `CassEngine` with pair intervals (`pair_interval_for`, residuals), measurement jobs, "needs_measurement" status, rich UI (Ranking, Measurements, Certificate, Drift), release gates with strict evidence requirements and context binding checks. Assumes "K<=2 serial CASS comparison" in current gate assumptions.

**Product Maturity**
- Report: Theoretical + pseudocode + implementation notes. No UI/API.
- Current: Production-grade (FastAPI service, Supabase schema/persistence/RLS, React/Vite UI with all 6 evidence screens, job queuing, guard connectors, benchmark import, Cloud Run deployment, Docker, observability, Playwright/CI coverage, release gates with MCP integration). Implementation log shows systematic phased delivery.

**Handling of Correlation & Assumptions**
- Report: Acknowledges real correlations violate weighted-quota independence; relies on robust submodularity for serial veto.
- Current: More explicit correlation tooling (`rho`, asymmetry tests, co-failure UI). Certificates designed around pairwise correlation.

## Gaps & Synergies
**Gaps in Current StackCert**:
- Limited to K≤2 pairwise by default. No built-in greedy submodular selection or quota scanning for larger ensembles.
- Candidate generation is measurement-driven rather than constructively greedy.
- Release gate assumptions explicitly scope to "K<=2 serial CASS comparison" — would need update.

**Gaps in Report**:
- Theoretical; no production code, UI, or persistence layer (already solved in StackCert).
- Union bounds in empirical greedy are combinatorially loose.
- Sparse compression is validation-table only (needs holdout certification, which current system provides).

**High-Leverage Integration Points**:
1. Add Greedy-Quota as new `construction-job` type that outputs candidate stacks/prefixes/quotas → feeds existing `CassEngine` and measurement plans.
2. Extend `max_k`, add quota rule evaluator, and greedy atom selector in `stackcert/cass/`.
3. Use report's sparse compression for offline analysis while keeping deployed K small (perfectly aligns with current philosophy).
4. Update release gates, evidence packets, and UI to surface "greedy-quota" construction metadata.
5. Benchmark greedy-generated candidates against current pairwise certificates on the 2,000-example run (directly supports current priority #2).
6. Add "Construction" view to Setup UI showing greedy prefixes and quota candidates.

**Recommendation**: Treat the Greedy-Quota report as the natural next theoretical input for StackCert v2. The product layer is ready to consume it. Prioritize implementing the greedy selector + quota scanner as the immediate bridge.

**Files in this directory**:
- `docs/cass_greedy_quota_report.pdf` (original)
- `docs/cass_greedy_quota_extracted_and_organized.md` (full extraction + algorithm)
- This file (comparison + integration plan)

Update `implementation_log.md` and `docs/15_current_state_and_next_steps.md` (or equivalent) to reference these. Next step: implement the greedy construction module.

*Generated from parsed PDF + codebase inspection (29 May 2026).*
