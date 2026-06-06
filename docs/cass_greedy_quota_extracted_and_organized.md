# CASS-Greedy-Quota Report - Extracted, Organized, and Structured

**Source**: `docs/cass_greedy_quota_report.pdf` (30 pages, LaTeX/pdfTeX, May 2026). Parsed with enhanced `extract_pdf.py --structured`.

## Metadata
- Title: CASS-Greedy-Quota: A Constructive Theory and Implementation Plan for Cost-Effective Small-Model Committees
- Creator: LaTeX with hyperref
- Date: 2026-05-29
- Pages: 30
- Goal: Give practitioners a mathematically justified constructive procedure to build small committees without exponential combinatorial search or validation-set overfitting.

## Table of Contents (Reconstructed)
1. Problem statement + what the report is *not* claiming
2. Basic setup (episodes, cells, atoms, serial veto/quota rules, utility/cost)
3. Constructive theory (submodularity, greedy, empirical bounds, benign budgets, quota rules, weighted quota, sparse compression, paired eval, certification, adaptive racing)
4. CASS-Greedy-Quota algorithm (inputs, steps, outputs)
5. Implementation details (schema, efficient computation, quota scanning, weighted impl)
6. Scaling & production (architecture, serving, logging, monitoring, shadow/canary)
7. Conclusion

## Core Definitions
- **Episode (x)**: Task instance (request+context or QA pair).
- **Cell c(x)**: Stratum (benign vs adversarial, or correct/incorrect). Enables non-uniform weighting.
- **Atom a = (m, h)**: Model m from catalog M combined with explicit small context recipe h from H (e.g. raw prompt, instruction, policy snippet, retrieved K).
- **Stack S**: Subset of atoms.
- **Serial veto**: Block if any atom blocks (`max ba(x)`). Equivalent to unanimous allow votes.
- **Quota rule**: Allow iff ∑ allow votes Qi ≥ q (q = 1…k+1). Covers OR, majority, unanimous.
- **Harmful coverage F(S)**: Expected weighted blocked harmful mass (submodular under serial veto).
- **Benign overblock L(S)**: Expected weighted blocked benign mass.
- **Singleton benign loss ℓa**: Per-atom benign false-positive rate.

**Key constraint**: Maximize F(S) subject to |S|≤k, L(S)≤β, Cost(S)≤B.

## Key Theorems (Statements + Notes)
- **Thm 3.2**: Serial-veto harmful coverage is monotone submodular. (Clean proof via marginal "newly covered" mass.)
- **Thm 3.3**: Greedy achieves (1−1/e) approximation to optimal k-coverage (classic submodular result).
- **Thm 3.4 / Cor 3.5**: Empirical greedy with Hoeffding marginal error η adds 2kη additive loss. Union bound over ~k|A|^k marginals is loose in practice.
- **Thm 3.7**: Conservative union-bound on benign loss via singleton UCBs (`bℓa + ρ`). Auditable but ignores overlap.
- **Thm 3.9**: Anonymous monotone binary aggregation rules = quota thresholds. *Powerful reduction* (collapses exponential rule space).
- **Thm 3.10**: Weighted quota from Bayes/log-likelihood under conditional independence. **Major caveat** noted in report: real models violate independence.
- **Thm 3.11**: Hoeffding sparse compression from large weighted committee (validation-table guarantee).
- **Thm 3.14**: Finite-candidate holdout certification gives tight uniform deviation after structural search reduces candidate count.
- **Thm 3.15**: Adaptive racing (successive elimination with confidence bounds) never eliminates true best w.h.p.

**Honest gaps**: Proofs are solid where presented. Union bounds loose. Submodularity proven for serial veto (deployed rule may differ). Correlation explicitly acknowledged as open.

## The CASS-Greedy-Quota Algorithm (Exact Pseudocode from Report)
**Inputs**: M (models), H (small context recipes), DA/DN (paired validation), optional cell weights, k, β (benign budget), B (cost budget), Dcert (fresh holdout).

**Steps**:
1. Atoms A = M × H. Log all ba(x), Qa(x), costs, latencies, versions, hashes.
2. Compute benign singleton UCBs (`bℓa + ρ`).
3. Greedy ratio selection: add atom maximizing marginal coverage per cost, subject to cumulative UCB≤β and cost≤B. Retain all prefixes S1…Sk.
4. For each prefix, scan quota thresholds q=1…t.
5. (Optional) Cross-fit weighted quotas on large validation.
6. (Optional) Compress large weighted committee via Hoeffding sampling.
7. Adaptive race shortlist (baseline + greedy prefixes + quota variants + weighted + compressed).
8. Certify final candidate(s) on fresh holdout vs single-model baseline. Output full decision record (atoms, rule, estimates, intervals, monitoring plan).

**Outputs**: Deployment record + evidence for StackCert gates.

## Proposed Approaches (Organized)
**Selection**: Greedy residual coverage (submodular) or budgeted ratio-greedy on atoms. Explicit small H. Efficient incremental residuals via logging.

**Aggregation**: Quota scanning (majority, unanimous, learned thresholds). Weighted when reliabilities estimable.

**Compression**: Offline large weighted → small sampled committee (Hoeffding on validation table).

**Evaluation**: Paired evaluation (variance reduction), adaptive racing on shortlist, finite-candidate holdout certification (small K after greedy = tighter bounds).

**Production**: Staged/parallel/serial serving, timeouts/fallbacks, comprehensive logging (hashes, versions, outcomes), drift monitoring, shadow/canary releases, cell-aware routing.

**Data Schema Emphasis**: Store per-atom-per-example signals, costs, versions, hashes for reproducibility and online improvement.

This material is now persisted in the StackCert repository for direct reference during integration.

---

*Extracted and organized by Hermes Agent using enhanced PDF tooling (May 2026). Original PDF at `docs/cass_greedy_quota_report.pdf`. See companion file `cass_greedy_quota_vs_stackcert_comparison.md` for detailed gap analysis vs current implementation.*
