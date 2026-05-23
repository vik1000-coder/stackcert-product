# CASS Labs / StackCert: Company Strategy and Implementation Plan

**Working company name:** CASS Labs  
**Working product name:** StackCert  
**Document purpose:** Convert the CASS research paper into a concrete company, product, go-to-market, and implementation plan.  
**Source basis:** User-uploaded paper, *Correlation-Aware Selection and Certification of Serial Safety-Agent Ensembles Under Limited Evaluation*, plus current market references listed at the end.

---

## 1. Executive Summary

CASS can become a company if it is framed as an **AI guardrail-stack assurance platform**, not as another guardrail model.

The core business insight is simple:

> Companies are already stacking multiple AI safety systems — rules, lexical filters, model judges, Llama Guard-style classifiers, moderation APIs, PII filters, jailbreak detectors, and policy validators — but they often choose those stacks using marginal scores. Marginal scores are not enough because two strong guardrails can fail on the same harmful prompts or overblock different benign users. CASS provides the measurement, optimization, and evidence layer that tells teams which guardrails to run together and when that decision is certified on a defined benchmark.

The recommended company should sell:

> **StackCert: an evidence platform for selecting, certifying, and continuously re-certifying AI guardrail stacks under limited evaluation budgets.**

The initial product should be a **service-assisted B2B audit plus lightweight software**, then evolve into a recurring SaaS / enterprise platform. The first commercial wedge is a paid **Guardrail Stack Audit** for AI platform, AI security, model-risk, and governance teams.

The strongest paper-derived proof point is the high-safety-cost experiment. In a 2,000-example benchmark with eight safety agents, 28 size-two serial ensembles, and 168 possible pair-cells, marginal selection failed at `λ = 5`: it chose `L3-3B + LG3` with welfare `0.110966`, while full evaluation found `LG3 + Phi3` with welfare `0.136285`. CASS-greedy selected and certified the full-evaluation winner using only `10` agent-cells and `13` pair-cells, while uncertainty-greedy used `67` pair-cells and uniform-by-cell used `84` pair-cells without certifying in the same run.

The practical claim should be narrow and defensible:

> CASS certifies the best guardrail stack for a specified candidate set, benchmark mixture, serial aggregation rule, welfare tradeoff, and uncertainty model. It does not prove universal deployment safety.

That limitation is commercially useful. Because certificates are conditional on benchmark mixture and deployment conditions, customers need **continuous re-certification** when models, prompts, traffic, policies, attacks, or guardrail versions change.

---

## 2. Company Thesis

### 2.1 The company in one sentence

**CASS Labs helps enterprises choose, justify, and continuously re-certify the best AI guardrail stack under a fixed evaluation budget.**

### 2.2 The product in one sentence

**StackCert is the evidence layer for AI guardrail stacks: it identifies correlated failures, recommends the best serial ensemble, allocates evaluation budget, and produces a finite-benchmark certificate for internal risk review.**

### 2.3 Why this should be a company

The opportunity exists because several trends are colliding:

1. **Guardrail proliferation:** Enterprises are layering many protective systems around LLM applications.
2. **Operational uncertainty:** Teams do not know which guardrail combinations actually work together.
3. **Evaluation cost pressure:** Exhaustively evaluating every pair, benchmark cell, model version, and policy class is expensive.
4. **Common-cause failure:** Similar guardrails may miss the same adversarial prompts, so adding more layers can create a false sense of security.
5. **False-positive cost:** Serial stacks can overblock benign users, damaging user experience and business value.
6. **Governance pressure:** Security, compliance, and model-risk functions increasingly need evidence artifacts, not informal claims.

The company should exploit a category gap:

- Runtime guardrails enforce policies.
- Red-team tools discover attacks.
- Governance tools track controls.
- **CASS / StackCert decides which guardrail stack is best, what joint failures remain unresolved, and what evidence supports deployment.**

### 2.4 What not to build first

Do **not** start as a runtime blocking product. That market is crowded and operationally heavy. The first version should be an offline / nearline evaluation and certification product. Runtime integrations can come later.

Do **not** claim “certified safe.” The correct claim is “certified best among these candidates on this benchmark mixture under these assumptions.”

Do **not** begin with arbitrary agent workflows, routing graphs, or human-in-the-loop systems. Start with **small serial safety stacks**, especially size-two stacks, where the paper’s certificate is cleanest because the higher-order residual is exactly zero.

---

## 3. Research-to-Product Translation

### 3.1 What the paper contributes

The paper proposes **CASS: Correlation-Aware Selection and Certification** for serial safety-agent ensembles under limited joint evaluation.

The research problem is:

> Given a finite catalog of safety agents and a limited budget for pairwise co-failure measurements, choose the serial stack with the best welfare and certify that it beats alternatives when possible.

The paper’s six technical contributions are commercially important:

| Paper contribution | Product translation |
|---|---|
| Serial safety-agent selection as welfare optimization under limited joint evaluation | StackCert recommends a stack under a user-defined risk tradeoff. |
| Product-moment decomposition separating marginal means, pairwise correlations, and higher-order residuals | StackCert explains why marginal scores are insufficient and identifies correlated failure modes. |
| Benign/adversarial correlation asymmetry | StackCert distinguishes helpful benign error overlap from harmful adversarial co-miss overlap. |
| Residual-aware certificates | StackCert produces finite-benchmark evidence packets without overclaiming. |
| Adaptive measurement selection | StackCert tells customers which joint evaluations to buy next. |
| Empirical evaluation with finite-oracle, budgeted, bootstrap, pilot, source-shift, ablation, and audit examples | StackCert has an initial validation story and a roadmap for pilot metrics. |

### 3.2 The key technical intuition

In a serial guardrail stack, an input passes only if **every selected guardrail passes it**.

That changes how correlation should be interpreted:

| Side | Event | Positive correlation means | Welfare effect |
|---|---|---|---|
| Benign | False blocks overlap | The same benign prompts are blocked by multiple guards | Helpful, because errors are concentrated rather than spread across many benign users |
| Adversarial | Misses overlap | The same harmful prompts pass multiple guards | Harmful, because common-cause misses defeat redundancy |

The paper’s opening example is useful for customer education:

- Two guardrails each falsely block `10%` of benign inputs.
- If false blocks are independent, benign pass-through is `0.9 × 0.9 = 0.81`, so `19%` of benign inputs are blocked by at least one guardrail.
- If false blocks are perfectly aligned, benign pass-through is `90%`; the false blocks are concentrated on the same `10%` of inputs.
- On adversarial inputs, the sign reverses. If two guardrails each miss `20%` of attacks, independent misses yield a serial miss rate of `0.2 × 0.2 = 0.04`; perfectly aligned misses yield a `20%` miss rate.

This is the company’s core educational asset:

> More guardrails are not necessarily better. The right stack depends on which failures overlap.

### 3.3 The welfare objective

For a serial ensemble `S`, the paper defines:

- `P_w(S)`: weighted benign pass-through probability.
- `M_w(S)`: weighted adversarial miss-through probability.
- `λ`: cost of an adversarial miss relative to a benign false block.
- `π_A`: deployment prior probability of adversarial traffic.

The normalized objective is:

```text
V(S; Λ) = P_w(S) - Λ M_w(S)
Λ = λπ_A / (1 - π_A)
```

In product terms:

> The customer chooses how much they value allowing benign traffic versus blocking adversarial traffic. StackCert optimizes the stack under that explicit tradeoff.

The UI should expose this as a **risk tradeoff slider** or policy setting, not as a raw formula:

- “Balanced UX and safety”
- “High safety cost”
- “Regulated / zero-tolerance mode”
- Custom business-weighted policy profile

### 3.4 Why size-two ensembles are the initial product wedge

The paper decomposes serial pass probability into:

1. Product-of-means term.
2. Pairwise correlation terms.
3. Higher-order residual.

For size-two ensembles, the residual is exactly zero. That makes CASS’s certificate especially clean:

> For two-guard stacks, marginal means, variances, and pairwise correlation determine the serial pass probability exactly under valid intervals.

For larger ensembles, CASS remains useful but must carry conservative residual uncertainty. The paper’s `K = 3` residual stress test shows why the product must not pretend pairwise data are enough for all stack sizes.

Commercial implication:

- **MVP:** certify pairs and compare them against single guards.
- **V1:** support small size-three stacks with explicit residual warnings.
- **V2:** support routing, thresholds, escalation, and human review with separate architecture-specific math.

---

## 4. Empirical Proof Points from the Paper

### 4.1 Experiment scale

The paper’s finite benchmark is small enough to be understandable but large enough to demonstrate the real problem.

| Quantity | Value |
|---|---:|
| Examples | `2,000` |
| Candidate agents | `8` |
| Size-two candidate ensembles | `28` |
| Size-three candidate ensembles | `56` |
| Benchmark cells | `6` |
| Full first-order agent-cells | `48` |
| Full pairwise pair-cells for size-two ensembles | `168` |
| Saved output rows | `16,000` |
| Main random seeds | `50` |
| Bootstrap resamples per λ | `200` |

### 4.2 Benchmark mixture

The paper uses six benchmark cells: four adversarial and two benign.

| Cell | Examples | Source aggregate | Aggregate examples |
|---|---:|---|---:|
| `A/HarmBench` | `320` | `harmbench` | `320` |
| `A/StrongREJECT` | `313` | `strongreject` | `313` |
| `A/ToxicChat-toxic` | `362` | `toxicchat` | `917` |
| `A/XSTest-unsafe` | `200` | `xstest` | `450` |
| `N/ToxicChat-clean` | `555` | label side `A` | `1,195` |
| `N/XSTest-safe` | `250` | label side `N` | `805` |

The mixture is explicitly finite and not claimed to be deployment-representative. That distinction should carry into product language.

### 4.3 Candidate safety agents

| Short label | Agent name | Role in the experiment |
|---|---|---|
| `Rules` | `rules_policy` | Local transparent rule baseline |
| `Lex` | `lexical_guard` | Weighted lexical baseline; useful for correlated lexical behavior |
| `CR` | `cautious_rules_policy` | Overblocking rule variant stressing benign false-block behavior |
| `L3-1B` | `llama3_2_1b_judge` | Small prompted local judge |
| `L3-3B` | `llama3_2_3b_judge` | Larger prompted local judge |
| `Gemma` | `gemma3_1b_judge` | Prompted judge from a different model family |
| `Phi3` | `phi3_mini_judge` | Prompted judge from a different model family |
| `LG3` | `llama_guard3_1b` | Safety-specific local guard model |

The catalog deliberately mixes rules, lexical detectors, general prompted judges, and a specialized safety guard. This is a good product metaphor because enterprise customers usually have a similarly mixed stack.

### 4.4 Output validation

Every agent had exactly `2,000` rows, with no missing rows, no errors, and no parse failures.

| Agent | Rows | Missing | Blocks | Passes | Errors | Parse failures |
|---|---:|---:|---:|---:|---:|---:|
| `CR` | `2000` | `0` | `112` | `1888` | `0` | `0` |
| `Gemma` | `2000` | `0` | `1817` | `183` | `0` | `0` |
| `Lex` | `2000` | `0` | `99` | `1901` | `0` | `0` |
| `L3-1B` | `2000` | `0` | `658` | `1342` | `0` | `0` |
| `L3-3B` | `2000` | `0` | `1087` | `913` | `0` | `0` |
| `LG3` | `2000` | `0` | `1042` | `958` | `0` | `0` |
| `Phi3` | `2000` | `0` | `1217` | `783` | `0` | `0` |
| `Rules` | `2000` | `0` | `98` | `1902` | `0` | `0` |

Product implication:

> StackCert must treat data quality as part of certification. A certificate should include measurement completeness, parse-failure rates, and guardrail version metadata.

### 4.5 Where marginal selection fails

At low and medium safety cost, marginal selection works. At high safety cost, it fails.

| λ | Top marginal | Full best | Top welfare | Best welfare | Regret | Differs? |
|---:|---|---|---:|---:|---:|---|
| `1.0` | `L3-3B + LG3` | `L3-3B + LG3` | `0.242407` | `0.242407` | `0.000000` | `False` |
| `2.0` | `L3-3B + LG3` | `L3-3B + LG3` | `0.209547` | `0.209547` | `0.000000` | `False` |
| `5.0` | `L3-3B + LG3` | `LG3 + Phi3` | `0.110966` | `0.136285` | `0.025318` | `True` |

This is the key commercial story:

> When safety cost is high, the obvious marginal winner can be wrong. CASS finds the better stack by measuring correlation rather than trusting marginal scores.

### 4.6 Full architecture ranking at λ = 5

| Rank | Architecture | Interpretation | First-order welfare | Full-eval welfare |
|---:|---|---|---:|---:|
| `1` | `L3-3B + LG3` | Marginal winner | `0.159325` | `0.110966` |
| `2` | `LG3 + Phi3` | Full-evaluation winner | `0.155243` | `0.136285` |
| `3` | `L3-3B + Phi3` | Large correlation penalty | `0.122304` | `-0.047673` |
| `4` | `Gemma + LG3` | Moderate full welfare | `0.059355` | `0.064076` |
| `5` | `L3-1B + Phi3` | Negative full welfare | `0.046430` | `-0.087969` |
| `6` | `Gemma + L3-3B` | Low full welfare | `0.046030` | `0.023186` |
| `7` | `Gemma + Phi3` | Low full welfare | `0.041021` | `0.019982` |
| `8` | `Gemma + L3-1B` | Low full welfare | `0.037837` | `0.020049` |

The most useful sales example may be `L3-3B + Phi3`: it ranked third by first-order welfare but had negative full-evaluation welfare. That shows that marginally good components can combine badly.

### 4.7 Focus result: CASS certifies efficiently

Focus setting: `λ = 5`, budget `0.50`, prior radius `ρ = 0.60`.

| Method | n | Selected | Cert. rate | Regret | Agent-cells | Pair-cells |
|---|---:|---|---:|---:|---:|---:|
| Top marginal | `1` | `L3-3B + LG3` | `0.0000` | `0.025318` | `0.0` | `0.0` |
| Provider diversity | `1` | `L3-3B + LG3` | `0.0000` | `0.025318` | `0.0` | `0.0` |
| CASS-greedy | `1` | `LG3 + Phi3` | `1.0000` | `0.000000` | `10.0` | `13.0` |
| Uncertainty-greedy | `1` | `LG3 + Phi3` | `0.0000` | `0.000000` | `24.0` | `67.0` |
| Uniform-by-cell | `1` | `LG3 + Phi3` | `0.0000` | `0.000000` | `24.0` | `84.0` |
| Random | `50` | `LG3 + Phi3` | `0.0000` | `0.003038` | `24.0` | `41.3` |

Commercial interpretation:

- CASS avoided the wrong marginal winner.
- CASS certified the full-evaluation winner.
- CASS used `13` pair-cells, versus `67` for uncertainty-greedy and `84` for uniform-by-cell.
- Compared with full pairwise measurement over `168` pair-cells, `13` pair-cells is about `92%` fewer pair-cells.

### 4.8 Bootstrap robustness

At `λ = 5`, budget `0.50`, bootstrap resampling produced:

| Method | Regret mean [95%] | Cert. mean [95%] | Cells mean [95%] | Pairs mean [95%] |
|---|---:|---:|---:|---:|
| Top marginal | `0.0121 [0.0000, 0.0396]` | `0.0000 [0.0000, 0.0000]` | `0.0000 [0.0000, 0.0000]` | `0.0000 [0.0000, 0.0000]` |
| Provider diversity | `0.0121 [0.0000, 0.0396]` | `0.0000 [0.0000, 0.0000]` | `0.0000 [0.0000, 0.0000]` | `0.0000 [0.0000, 0.0000]` |
| CASS-greedy | `0.0000 [0.0000, 0.0000]` | `1.0000 [1.0000, 1.0000]` | `13.0350 [9.9500, 20.0000]` | `17.2150 [12.9750, 28.0250]` |
| Uncertainty-greedy | `0.0001 [0.0000, 0.0011]` | `0.2900 [0.0000, 1.0000]` | `23.9700 [23.0000, 24.0000]` | `66.6300 [65.0000, 77.0000]` |
| Uniform-by-cell | `0.0090 [0.0000, 0.0614]` | `0.0000 [0.0000, 0.0000]` | `24.0000 [24.0000, 24.0000]` | `84.0000 [84.0000, 84.0000]` |
| Random | `0.0101 [0.0000, 0.0438]` | `0.0000 [0.0000, 0.0000]` | `24.0000 [24.0000, 24.0000]` | `44.0000 [44.0000, 44.0000]` |

Product implication:

> The dashboard should show not only point estimates but resampling robustness: regret distributions, certificate stability, and measurement-cost distributions.

### 4.9 Pilot first-order simulation

The paper also tests a more realistic setting where first-order estimates come from a cheap pilot sample.

At `λ = 5`, budget `0.50`:

| Method | Budget | n | Full regret | Match rate | Pilot cert. | Pair-cells |
|---|---:|---:|---:|---:|---:|---:|
| CASS-greedy | `0.50` | `10` | `0.002532` | `0.9000` | `1.0000` | `19.2` |
| Top marginal | `0.50` | `10` | `0.022787` | `0.1000` | `0.0000` | `0.0` |
| Uncertainty-greedy | `0.50` | `10` | `0.005064` | `0.8000` | `0.3000` | `67.3` |
| Uniform-by-cell | `0.50` | `10` | `0.026726` | `0.5000` | `0.0000` | `84.0` |
| Random | `0.50` | `50` | `0.020496` | `0.8000` | `0.0000` | `44.0` |

Product implication:

> StackCert can start with partial customer data, not only complete benchmark matrices. This matters for real pilots.

### 4.10 Limitations that must become product features

#### Source shift

The paper’s leave-one-source-out experiment shows that training-mixture certificates do not automatically transfer to held-out benchmark sources.

At `λ = 5`, budget `0.50`, when HarmBench was held out, CASS certified on the training mixture but had holdout regret `1.078125`.

This is not a reason to abandon the company. It is the reason for **continuous re-certification** and **source-specific reporting**.

Product requirements:

- Every certificate must state the benchmark mixture.
- The product must support source-specific slices.
- The product must warn when deployment traffic deviates from the certified mixture.
- Re-certification should trigger on traffic drift, model version changes, prompt-template changes, guardrail changes, and new attack families.

#### Higher-order residuals

The `K = 3` residual stress test found:

- Rows: `336`
- Max absolute residual: `0.0706`
- Max bound: `0.2238`
- Max residual/bound ratio: `0.9766`

Product requirement:

> For stacks larger than two, StackCert must carry residual uncertainty and label such certificates as conservative, not exact.

#### Co-failure diagnostics

The paper found that correlations are operationally real:

- On adversarial cells, rule and lexical variants had high co-miss rates; for example, `Lex + Rules` both passed `95.00%` of `A/XSTest-unsafe` examples with block correlation `0.9462`.
- On benign cells, `Gemma + Phi3` both blocked `48.00%` of `N/XSTest-safe` examples.

Product requirement:

> Show co-miss and false-block overlap diagnostics as first-class artifacts. They help buyers understand why the recommendation changed.

---

## 5. Market and Competitive Positioning

### 5.1 Category position

StackCert should be positioned as an **AI safety-stack evidence layer**.

It should not try to replace runtime guardrails, red-team systems, or governance platforms. It should connect to them.

| Category | Examples | What they do | StackCert positioning |
|---|---|---|---|
| Runtime guardrails | NVIDIA NeMo Guardrails, Lakera Guard, Guardrails AI | Enforce policies, block unsafe inputs/outputs, redact data, orchestrate rails | StackCert evaluates which guards should be combined and certifies the selected stack. |
| Red-team / eval tools | Promptfoo, internal eval harnesses, Inspect, custom red-team pipelines | Generate attacks, run tests, score vulnerabilities | StackCert converts eval results into stack decisions, joint-failure maps, and measurement plans. |
| AI security platforms | Cisco AI Defense / Robust Intelligence lineage, Check Point / Lakera lineage | Secure AI systems across lifecycle and runtime | StackCert can be an analytics module, integration partner, or acquisition target. |
| GRC / model-risk platforms | Internal governance systems, enterprise GRC tooling | Track controls, approvals, documentation, audits | StackCert supplies quantitative evidence packets and re-certification triggers. |

### 5.2 Competitive wedge

The wedge is not “we block unsafe prompts better.”

The wedge is:

> “We tell you which combination of your existing guards actually performs best, which joint failures remain, what to measure next, and what evidence supports deployment.”

### 5.3 Why competitors may not do this immediately

Runtime guardrail companies are incentivized to sell their own enforcement layer. Red-team companies are incentivized to produce more tests and vulnerabilities. Governance tools are often too abstract to optimize safety-stack choices.

StackCert’s wedge is the cross-product decision layer:

- Vendor-neutral.
- Measurement-budget aware.
- Correlation-aware.
- Certificate-oriented.
- Built for internal AI risk review.

### 5.4 Strategic signals

Recent AI-security market activity supports the idea that AI security and assurance are becoming strategic categories. Check Point announced an agreement to acquire Lakera in September 2025 to deliver end-to-end AI security for enterprises. Cisco states that Robust Intelligence was acquired in 2024 and became foundational to Cisco AI Defense and Cisco Foundation AI.

The implication is not that StackCert should try to be a full-stack security platform immediately. The implication is that a specialized quantitative assurance layer can become strategically valuable if it becomes embedded in enterprise AI deployment workflows.

---

## 6. Target Customers

### 6.1 Ideal customer profile

The best early customers have all of the following:

1. Production or near-production LLM applications.
2. Multiple guardrails or safety filters already in use.
3. Meaningful cost from false positives, such as blocked users, blocked workflows, support escalations, or lost revenue.
4. Meaningful cost from false negatives, such as safety incidents, security risk, regulatory exposure, or reputational harm.
5. A security, governance, platform, or model-risk team that needs evidence before deployment.

### 6.2 Priority verticals

| Priority | Vertical | Why it fits |
|---:|---|---|
| 1 | Enterprise copilots | Multiple guardrails, internal data, security review, rapid model changes |
| 2 | Financial-services AI assistants | High risk tolerance constraints, model-risk governance, strong audit culture |
| 3 | Healthcare-adjacent assistants | High safety sensitivity, over-refusal problems, compliance scrutiny |
| 4 | Customer-support automation | False positives hurt UX; false negatives create brand and legal risk |
| 5 | Coding agents | Tool-use risk, data exposure, prompt injection, insecure output handling |
| 6 | Education platforms | Over-refusal and misuse prevention both matter |
| 7 | AI security teams / consultancies | Can use StackCert as part of AI red-team and deployment-readiness engagements |

### 6.3 Buyer personas

| Persona | Pain | StackCert value |
|---|---|---|
| Head of AI Platform | Needs to ship LLM apps safely without slowing teams | Standardized guardrail-stack evaluation and reusable integrations |
| AI Security Lead | Needs to reduce prompt injection, jailbreak, data exposure, and unsafe action risk | Co-failure diagnostics, red-team integration, evidence packet |
| Model Risk / Governance Lead | Needs documented controls, signoff evidence, and re-testing triggers | Certificates, audit trail, model/guard version history |
| Product Owner | Needs fewer false blocks and fewer safety incidents | Risk tradeoff tuning and UX/safety optimization |
| Compliance / Legal | Needs defensible claims and limitation language | Finite-benchmark certificate with explicit assumptions |

### 6.4 Anti-ICP

Avoid early customers who:

- Have only one guardrail and no budget for evaluation.
- Are pre-product and lack real logs or benchmark data.
- Want a generic “AI safety score” without implementation ownership.
- Expect the product to certify universal safety.
- Require immediate full runtime enforcement.

---

## 7. Product Strategy

### 7.1 Initial SKU: Guardrail Stack Audit

**Format:** service-assisted pilot plus reusable software package.  
**Duration:** 4–8 weeks.  
**Commercial hypothesis:** `$25k–$100k` per pilot, depending on scope.  
**Goal:** produce a stack recommendation and finite-benchmark evidence packet.

#### Deliverables

| Deliverable | Description |
|---|---|
| Guardrail inventory | Catalog of all candidate guards, versions, thresholds, policies, inputs/outputs, and costs |
| Benchmark mixture definition | Customer-specific benign/adversarial cells with weights and source labels |
| Marginal performance report | Per-guard pass/block rates, false-block rates, miss rates, latency/cost metadata |
| Correlated failure map | Co-miss and false-block overlap heatmaps by source, policy class, and user segment |
| CASS stack recommendation | Best candidate stack under customer-defined welfare tradeoff |
| Measurement plan | Which joint measurements to run next and why |
| Certificate packet | Finite-benchmark certificate, unresolved comparisons, assumptions, limitations, version metadata |
| Re-certification plan | Triggers, monitoring metrics, and recommended cadence |

### 7.2 Software product modules

| Module | MVP | V1 | V2 |
|---|---|---|---|
| Guardrail connectors | Python adapters for local guards, REST guards, model judges | Common enterprise connectors | Marketplace / SDK |
| Benchmark manager | CSV/JSONL import, labels, source cells, weights | Log sampling, redaction, stratification | Active benchmark generation |
| Evaluation runner | Batch execution and pass/block capture | Parallel execution, cost controls | Continuous CI/CD evaluation |
| CASS optimizer | K=2 exact certificates | K=3 residual-aware certificates | Routing / thresholds / escalation |
| Measurement scheduler | Bundle-greedy fallback | MIP solver option | Budget-aware experiment planning |
| Diagnostics | Co-miss and false-block heatmaps | Slice analysis, cluster analysis | Root-cause failure families |
| Certificate exporter | Markdown/PDF/JSON evidence packet | GRC integrations | Customer-facing trust reports |
| Drift monitor | Manual re-run triggers | Traffic-mix and version triggers | Automated recertification workflows |

### 7.3 Product UX principles

1. **Show why the marginal winner failed.** The product must make correlation visible, not just output a ranking.
2. **Separate selection from certification.** A stack can be recommended but not certified. That distinction is valuable.
3. **Make uncertainty actionable.** Every unresolved comparison should point to the next measurement action.
4. **Never overclaim.** The certificate must state candidate set, benchmark mixture, welfare tradeoff, intervals, residual assumptions, and version IDs.
5. **Support slices.** Customers need to know if a stack is certified overall but weak on a source, region, policy class, language, user segment, or attack type.
6. **Connect to workflows.** Export to security review, model registry, pull requests, GRC systems, or internal launch gates.

---

## 8. Product Requirements: MVP

### 8.1 MVP objective

Build a product that can answer:

> Given a customer’s benchmark mixture, candidate guardrails, and safety/UX tradeoff, which size-two serial guardrail stack should they deploy, what joint failures matter, and is the winner certified against the alternatives?

### 8.2 MVP scope

#### In scope

- Offline batch evaluation.
- Binary pass/block outputs.
- Deterministic and stochastic guards converted into pass/block or calibrated pass probability.
- Candidate stacks of size `1` and `2`.
- User-defined benchmark cells and weights.
- Welfare objective `P_w(S) - ΛM_w(S)`.
- Marginal means, standard deviations, pairwise correlations.
- Correlation intervals.
- Exact K=2 comparison certificates.
- Bundle-greedy measurement selection.
- Markdown/PDF/JSON certificate export.
- Basic dashboard or notebook interface.

#### Out of scope for MVP

- Runtime blocking.
- Full arbitrary agent graphs.
- Majority voting / routing / human escalation.
- Automated adversarial prompt generation.
- Claims of deployment-general safety.
- Fully self-serve onboarding.

### 8.3 MVP success criteria

| Metric | Target |
|---|---:|
| Paid pilots | `3–5` |
| Pilot duration | `≤ 8 weeks` |
| Customer guardrails supported per pilot | `3–10` |
| Benchmark cells supported | `4–20` |
| Pairwise measurement reduction versus exhaustive K=2 evaluation | `≥ 50%` in at least `3` pilots |
| Evidence packet accepted by internal risk/security reviewer | `≥ 2` pilots |
| Re-certification trigger adopted | `≥ 2` pilots |
| Conversion to annual contract | `≥ 1` pilot |

---

## 9. Technical Architecture

### 9.1 High-level architecture

```text
Customer guardrails + benchmark data
        |
        v
[Guardrail Connector Layer]
        |
        v
[Evaluation Runner] ---> [Output Store]
        |                       |
        v                       v
[Statistics Engine] ---> [CASS Optimizer]
        |                       |
        v                       v
[Measurement Scheduler] <--- [Certificate Engine]
        |
        v
[Dashboard + Evidence Export]
        |
        v
[Re-certification Monitor]
```

### 9.2 Data inputs

| Input | Required fields | Notes |
|---|---|---|
| Guardrail catalog | `guard_id`, `name`, `version`, `type`, `threshold`, `latency`, `cost`, `input_scope`, `output_scope` | Must preserve versions for auditability |
| Benchmark examples | `example_id`, `source`, `cell`, `side`, `policy_category`, `prompt_or_redacted_prompt`, `weight` | Harmful prompts should be redacted in reports when needed |
| Guard outputs | `example_id`, `guard_id`, `pass_probability`, `block_probability`, `binary_decision`, `raw_score`, `timestamp` | Raw model completions are optional and may be sensitive |
| Candidate architecture policy | `max_K`, allowed guard combinations, forbidden combinations, mandatory guards | Enterprise customers may have constraints |
| Welfare profile | `lambda`, `pi_A`, source weights, segment weights, business constraints | Should be named and versioned |

### 9.3 Minimal database schema

```sql
CREATE TABLE guards (
  guard_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT,
  guard_type TEXT NOT NULL,
  version TEXT NOT NULL,
  threshold DOUBLE PRECISION,
  latency_ms DOUBLE PRECISION,
  unit_cost_usd DOUBLE PRECISION,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE benchmark_cells (
  cell_id TEXT PRIMARY KEY,
  side TEXT CHECK (side IN ('benign', 'adversarial')),
  source TEXT NOT NULL,
  policy_category TEXT,
  weight DOUBLE PRECISION NOT NULL
);

CREATE TABLE examples (
  example_id TEXT PRIMARY KEY,
  cell_id TEXT REFERENCES benchmark_cells(cell_id),
  prompt_hash TEXT NOT NULL,
  prompt_redacted TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE guard_outputs (
  run_id TEXT NOT NULL,
  example_id TEXT REFERENCES examples(example_id),
  guard_id TEXT REFERENCES guards(guard_id),
  pass_probability DOUBLE PRECISION NOT NULL,
  block_probability DOUBLE PRECISION NOT NULL,
  binary_pass BOOLEAN NOT NULL,
  raw_score DOUBLE PRECISION,
  output_metadata JSONB,
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (run_id, example_id, guard_id)
);

CREATE TABLE candidate_architectures (
  architecture_id TEXT PRIMARY KEY,
  guard_ids TEXT[] NOT NULL,
  architecture_type TEXT DEFAULT 'serial',
  max_k INT NOT NULL,
  constraints JSONB
);

CREATE TABLE pair_statistics (
  run_id TEXT NOT NULL,
  cell_id TEXT NOT NULL,
  guard_id_a TEXT NOT NULL,
  guard_id_b TEXT NOT NULL,
  correlation DOUBLE PRECISION,
  interval_low DOUBLE PRECISION,
  interval_high DOUBLE PRECISION,
  both_pass_rate DOUBLE PRECISION,
  both_block_rate DOUBLE PRECISION,
  n_examples INT NOT NULL,
  PRIMARY KEY (run_id, cell_id, guard_id_a, guard_id_b)
);

CREATE TABLE welfare_estimates (
  run_id TEXT NOT NULL,
  architecture_id TEXT NOT NULL,
  welfare_center DOUBLE PRECISION NOT NULL,
  welfare_low DOUBLE PRECISION,
  welfare_high DOUBLE PRECISION,
  benign_pass_center DOUBLE PRECISION,
  adversarial_miss_center DOUBLE PRECISION,
  lambda DOUBLE PRECISION NOT NULL,
  residual_radius DOUBLE PRECISION DEFAULT 0,
  PRIMARY KEY (run_id, architecture_id)
);

CREATE TABLE comparison_certificates (
  certificate_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  incumbent_architecture_id TEXT NOT NULL,
  competitor_architecture_id TEXT NOT NULL,
  gap_center DOUBLE PRECISION NOT NULL,
  gap_radius DOUBLE PRECISION NOT NULL,
  gap_low DOUBLE PRECISION NOT NULL,
  gap_high DOUBLE PRECISION NOT NULL,
  certified BOOLEAN NOT NULL,
  assumptions JSONB,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE measurement_actions (
  action_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  guard_ids TEXT[] NOT NULL,
  cell_id TEXT NOT NULL,
  expected_radius_reduction DOUBLE PRECISION,
  cost_estimate DOUBLE PRECISION,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### 9.4 Core algorithm

#### Step 1: Define candidate set

```text
Input: guard catalog M, maximum stack size K, customer constraints
Output: candidate architectures S

For MVP:
  S = all single guards + all allowed size-two serial pairs
```

#### Step 2: Estimate first-order terms

For each guard `m`, benchmark cell `j`, and side `⋆`:

```text
μ_m,j^⋆ = mean block probability
q̄_m,j^⋆ = 1 - μ_m,j^⋆
s_m,j^⋆ = standard deviation of block probability
```

#### Step 3: Initialize pairwise intervals

For unmeasured pairs:

```text
I_u,j^⋆ = [-ρ, ρ]
```

For measured pairs:

```text
I_u,j^⋆ = Fisher-transformed Pearson interval
or bootstrap interval with simultaneous correction
```

#### Step 4: Compute serial pass/miss estimates

For size-two stack `S = {m, m'}`:

```text
E[serial pass] = q̄_m q̄_m' + r_{m,m'} s_m s_m'
```

For larger stacks:

```text
E[serial pass] = product-of-means + pairwise terms + residual
```

The MVP should use exact K=2 estimates and reserve K≥3 for later.

#### Step 5: Compute welfare

```text
V(S; Λ) = P_w(S) - Λ M_w(S)
```

#### Step 6: Compute comparison intervals

For each ordered pair `(S, T)`:

```text
centered_gap = estimated V(S) - estimated V(T)
gap_radius = pairwise interval uncertainty + residual uncertainty
gap_low = centered_gap - gap_radius
gap_high = centered_gap + gap_radius
```

#### Step 7: Certify winner if possible

```text
S* is certified if gap_low(S*, T) > 0 for every competitor T.
```

If no winner is certified, report:

- Current incumbent.
- Active unresolved competitors.
- Which uncertainty terms prevent certification.
- Recommended measurements.

#### Step 8: Allocate measurement budget

Bundle-greedy fallback:

```pseudo
while no winner certified and budget remains:
    active_comparisons = comparisons where incumbent gap_low <= 0
    candidate_bundles = guard-cell runs that induce useful pair measurements
    for bundle in candidate_bundles:
        estimate radius reduction across active comparisons
        score = radius_reduction / cost
    run highest-score bundle
    update pair intervals
    recompute certificates
```

For small catalogs, V1 can solve the width-cover mixed-integer program from the paper.

---

## 10. Certificate Specification

### 10.1 Certificate purpose

A StackCert certificate is not a guarantee of universal safety. It is an evidence artifact stating:

> Under this benchmark mixture, candidate set, serial aggregation rule, welfare profile, guard versions, and uncertainty model, architecture `S*` is certified to beat every candidate competitor.

### 10.2 Required certificate fields

| Field | Description |
|---|---|
| Certificate ID | Unique ID and timestamp |
| Product / application | Customer application being evaluated |
| Candidate set | All guards and allowed serial combinations |
| Guard versions | Exact versions, thresholds, prompts, model IDs, policy versions |
| Benchmark mixture | Sources, cells, side labels, counts, weights |
| Welfare profile | `λ`, `π_A` if used, source weights, business rationale |
| Measurement coverage | Agent-cells, pair-cells, missing cells, parse failures, errors |
| Recommended stack | Certified or incumbent stack |
| Competitor comparisons | Gap centers, radii, lower bounds, certification status |
| Co-failure diagnostics | Top adversarial co-misses and benign false-block overlaps |
| Residual treatment | Zero for K=2; conservative residual for K≥3 |
| Limitations | Benchmark conditionality, source-shift caveat, unsupported architectures |
| Re-certification triggers | Model update, guard update, prompt change, traffic drift, attack shift |
| Signoff metadata | Reviewer, owner, expiration, next review date |

### 10.3 Certificate status taxonomy

| Status | Meaning | Customer action |
|---|---|---|
| `Certified winner` | Lower gap is positive against every competitor | Eligible for deployment under stated assumptions |
| `Recommended, not certified` | Highest center welfare but unresolved comparisons remain | Run recommended measurements or accept risk |
| `No clear winner` | Multiple stacks overlap materially | Run more measurements or revise welfare/benchmark |
| `Source-fragile` | Overall winner performs poorly on key slices | Reweight benchmark, add source-specific controls, or certify per-slice |
| `Expired` | Versions or traffic distribution changed | Re-run certification |

### 10.4 Certificate language

Use this language:

> “Certified on the specified benchmark mixture under the stated candidate set, welfare profile, measurement intervals, and version metadata.”

Avoid this language:

> “Certified safe.”

> “Guaranteed to block attacks.”

> “Deployment-proof.”

> “Best guardrail stack for all future traffic.”

---

## 11. Implementation Roadmap

### 11.1 Phase 0: Research packaging, 2–4 weeks

Goal: Convert paper code and methodology into a reproducible internal prototype.

Deliverables:

- Reproducible notebook or CLI that runs the paper’s workflow.
- Test fixture using the paper-style 2,000-example matrix.
- Core CASS library for K=2.
- Markdown certificate template.
- Internal demo: show marginal failure and CASS certification.

Engineering tasks:

- Implement `Guard`, `BenchmarkCell`, `Architecture`, `WelfareProfile`, `PairInterval`, and `Certificate` objects.
- Implement exact size-two welfare computation.
- Implement comparison interval calculation.
- Implement greedy measurement scheduler.
- Add unit tests for correlation asymmetry and K=2 residual zero.

### 11.2 Phase 1: Design partner pilots, 4–8 weeks

Goal: Run paid or serious design-partner pilots with real customer guardrails.

Deliverables:

- Guardrail Stack Audit report.
- Customer-specific benchmark mixture.
- Co-failure heatmaps.
- Stack recommendation.
- Certificate or unresolved comparison report.
- Re-certification plan.

Engineering tasks:

- Build CSV/JSONL import.
- Add REST guardrail adapter.
- Add local Python guardrail adapter.
- Add model-judge adapter.
- Add export to Markdown and PDF.
- Add basic dashboard or Streamlit app.

Commercial tasks:

- Recruit 10–15 design partners.
- Convert 3–5 to paid pilots.
- Use pilots to validate buyer, budget, and evidence value.

### 11.3 Phase 2: MVP platform, 8–16 weeks

Goal: Convert pilot tooling into repeatable SaaS / enterprise software.

Deliverables:

- Multi-project web app.
- Guardrail connector SDK.
- Persistent output store.
- Certificate history.
- Role-based access controls.
- CI/CD evaluation hook.
- Re-certification trigger registry.

Engineering tasks:

- Build backend API.
- Add Postgres schema.
- Add object storage for benchmark artifacts.
- Add authentication and access control.
- Add job queue for evaluations.
- Add dashboard views:
  - Stack ranking.
  - Co-miss heatmap.
  - False-block overlap heatmap.
  - Active comparisons.
  - Measurement recommendations.
  - Certificate packet.

### 11.4 Phase 3: Enterprise hardening, 16–32 weeks

Goal: Sell annual platform contracts.

Deliverables:

- SOC 2 readiness path.
- VPC / private deployment option.
- SSO / SCIM.
- Audit logs.
- Data retention controls.
- GRC export.
- Model registry integrations.
- SLA and support workflows.

Product tasks:

- Add source-specific certificates.
- Add traffic-drift detection.
- Add model and guard version diffing.
- Add threshold analysis.
- Add K=3 residual-aware support.

### 11.5 Phase 4: Expansion, 6–18 months

Goal: Expand beyond serial K=2 while preserving mathematical honesty.

Expansion paths:

| Expansion | Description | Caution |
|---|---|---|
| K=3 stacks | Residual-aware certification for three-guard serial stacks | Must label residual uncertainty clearly |
| Threshold tuning | Optimize score thresholds jointly with stack choice | Requires calibration and validation |
| Routing | Evaluate policy-dependent routing and fallback | Needs different decomposition |
| Human escalation | Include human-review cost and coverage | Requires operational metrics |
| Runtime monitor | Observe deployed traffic drift and incident labels | Must handle privacy and sampling bias |
| Benchmark generation | Add red-team generation and benign counterexamples | Avoid becoming generic red-team product too early |

---

## 12. Go-to-Market Strategy

### 12.1 Beachhead offer

**Guardrail Stack Audit**

Pitch:

> “You already have multiple AI guardrails. We will determine which stack performs best under your risk tradeoff, identify correlated failures, reduce unnecessary pairwise evaluation, and produce an evidence packet your security or model-risk team can review.”

### 12.2 Sales motion

1. **Target accounts** with visible LLM deployment activity and security/governance maturity.
2. **Lead with a diagnostic question:** “How do you know your guardrails are complementary rather than failing together?”
3. **Offer a scoped audit** with a clear 4–8 week timeline and evidence deliverables.
4. **Convert to recurring platform** for re-certification across model versions, product lines, and policy updates.

### 12.3 Buying trigger events

| Trigger | Why it creates demand |
|---|---|
| Launching an enterprise copilot | Needs launch-gate safety evidence |
| Adding a second or third guardrail | Needs stack selection and false-positive analysis |
| Switching model providers or model versions | Prior certification becomes stale |
| Security incident / jailbreak finding | Needs co-failure root-cause analysis |
| Regulatory or internal AI governance review | Needs evidence packet |
| High over-refusal complaints | Needs benign false-block overlap analysis |
| Red-team report with many findings | Needs prioritization and stack remediation |

### 12.4 Pricing hypothesis

#### Pilot pricing

| Customer size | Pilot price hypothesis | Notes |
|---|---:|---|
| Startup / mid-market | `$25k–$50k` | Limited guard catalog and benchmark |
| Enterprise team | `$50k–$100k` | More integrations, security review, custom reporting |
| Regulated enterprise | `$100k+` | VPC, legal review, custom certificate format |

#### Annual platform pricing

| Tier | Price hypothesis | Target |
|---|---:|---|
| Team | `$60k–$120k/year` | One product, limited guardrails |
| Business | `$120k–$300k/year` | Multiple applications, recurring certification |
| Enterprise | `$300k+/year` | VPC, SSO, GRC integration, custom support |

Pricing should be validated with pilots. The anchor should be avoided risk, avoided wasted evaluation, faster launch approval, and reduced overblocking.

### 12.5 Sales assets

Create these early:

1. **One-page explainer:** “Why marginal guardrail scores fail.”
2. **Demo notebook:** Replicate the `λ = 5` failure and CASS certification.
3. **Sample certificate:** Show what an evidence packet looks like.
4. **ROI calculator:** Estimate avoided pairwise measurement and launch-review time.
5. **Security review template:** Map certificate fields to AI risk review requirements.
6. **Design partner SOW:** Fixed-scope audit agreement.

---

## 13. Pilot Implementation Plan

### 13.1 Pilot structure

| Week | Workstream | Output |
|---:|---|---|
| 1 | Intake and scoping | Guardrail catalog, target application, risk profile, benchmark plan |
| 2 | Data ingestion | Benchmark import, source/cell definitions, redaction policy |
| 3 | Marginal evaluation | Per-guard pass/block metrics, initial ranking |
| 4 | Pairwise targeted measurement | Co-failure map, active comparison list |
| 5 | CASS optimization | Stack recommendation, certificate attempt |
| 6 | Evidence packet | Draft report and review with technical owner |
| 7 | Security/governance review | Adjust benchmark weights, answer reviewer questions |
| 8 | Final decision | Final certificate or unresolved-comparison plan; renewal proposal |

### 13.2 Required customer inputs

- Candidate guardrails and access method.
- Existing benchmark or logs.
- Label taxonomy for benign/adversarial examples.
- Business weights or risk preferences.
- Version metadata for models, prompts, and policies.
- Security constraints for data handling.
- Deployment decision timeline.

### 13.3 Pilot outputs

The final pilot report should include:

1. Executive recommendation.
2. Candidate guardrail inventory.
3. Benchmark mixture and representativeness assessment.
4. Marginal evaluation.
5. Correlation and co-failure diagnostics.
6. Stack welfare ranking.
7. Certificate status.
8. Unresolved comparisons.
9. Recommended additional measurements.
10. Re-certification triggers.
11. Deployment caveats.
12. Appendix with reproducibility details.

### 13.4 Pilot acceptance criteria

A successful pilot is not necessarily one where CASS certifies a winner. A successful pilot is one where the customer learns something decision-relevant.

Valid success outcomes:

- CASS certifies a better stack than the customer’s current stack.
- CASS shows that the current stack is certified under the customer’s benchmark.
- CASS finds a high-risk co-miss pattern that changes deployment plans.
- CASS shows that the benchmark is not representative enough for launch approval.
- CASS identifies a small set of measurements needed to resolve the decision.

---

## 14. Dashboard Requirements

### 14.1 Main dashboard pages

| Page | Purpose |
|---|---|
| Overview | Current recommended stack, certificate status, benchmark scope |
| Guardrail Catalog | Versions, thresholds, costs, latency, supported policies |
| Benchmark Mixture | Cells, sources, labels, weights, counts, representativeness notes |
| Marginal Metrics | Per-guard block/pass rates by side and source |
| Stack Ranking | Welfare centers and intervals for candidate stacks |
| Active Comparisons | Which competitors still block certification |
| Co-Failure Diagnostics | Adversarial co-misses and benign false-block overlaps |
| Measurement Planner | Recommended next measurements and expected impact |
| Certificate Export | Evidence packet preview and download |
| Drift Monitor | Version changes, traffic shift, incident-triggered re-certification |

### 14.2 Most important visualizations

1. **First-order vs full-evaluation welfare bar chart.**
   - Shows why marginal rankings can change.
2. **Adversarial co-miss heatmap.**
   - Shows harmful common-cause failures.
3. **Benign false-block overlap heatmap.**
   - Shows whether overblocking is concentrated or spread.
4. **Gap interval chart.**
   - Shows certified and unresolved comparisons.
5. **Measurement ROI chart.**
   - Shows expected radius reduction per dollar or per evaluation run.
6. **Source-slice regret / risk chart.**
   - Shows whether an overall certificate hides source-specific weakness.

---

## 15. Engineering Details

### 15.1 Core Python package layout

```text
stackcert/
  __init__.py
  data/
    schemas.py
    importers.py
    validation.py
  guards/
    base.py
    rest_adapter.py
    python_adapter.py
    model_judge_adapter.py
  eval/
    runner.py
    output_store.py
    sampling.py
  cass/
    moments.py
    welfare.py
    intervals.py
    certificates.py
    scheduler.py
    residuals.py
  reporting/
    markdown.py
    pdf.py
    json_export.py
  dashboard/
    app.py
  tests/
    test_k2_exact.py
    test_correlation_asymmetry.py
    test_certificate_logic.py
    test_scheduler.py
```

### 15.2 Core classes

```python
@dataclass
class Guard:
    guard_id: str
    name: str
    version: str
    guard_type: str
    threshold: float | None = None
    metadata: dict = field(default_factory=dict)

@dataclass
class BenchmarkCell:
    cell_id: str
    side: Literal["benign", "adversarial"]
    source: str
    weight: float
    policy_category: str | None = None

@dataclass
class WelfareProfile:
    name: str
    lambda_cost: float
    adversarial_prior: float | None = None
    source_weights: dict[str, float] = field(default_factory=dict)

@dataclass
class Architecture:
    architecture_id: str
    guard_ids: tuple[str, ...]
    aggregation: Literal["serial"] = "serial"

@dataclass
class PairInterval:
    guard_a: str
    guard_b: str
    cell_id: str
    side: str
    low: float
    high: float
    center: float
    radius: float
    measured: bool

@dataclass
class ComparisonCertificate:
    incumbent: Architecture
    competitor: Architecture
    gap_center: float
    gap_radius: float
    gap_low: float
    gap_high: float
    certified: bool
```

### 15.3 Test cases

Minimum unit tests:

1. **K=2 exactness:** for a pair, computed serial pass probability equals product-of-means plus correlation term.
2. **Residual zero:** residual radius is zero for `K=2`.
3. **Benign correlation sign:** increasing benign correlation increases welfare.
4. **Adversarial correlation sign:** increasing adversarial correlation decreases welfare.
5. **Certificate logic:** if lower gap is positive against every competitor, winner is certified.
6. **No overclaiming:** if one competitor has non-positive lower gap, certificate status is not certified.
7. **Scheduler focus:** greedy scheduler prioritizes measurements that reduce active comparison intervals.
8. **Data completeness:** missing guard outputs prevent certification or trigger a warning.
9. **Version change:** guard version changes invalidate prior certificate.
10. **Source shift:** traffic distribution drift flags re-certification.

### 15.4 Model and guardrail adapter requirements

Each guard adapter must implement:

```python
class GuardAdapter(Protocol):
    def score(self, example: BenchmarkExample) -> GuardOutput:
        ...

@dataclass
class GuardOutput:
    pass_probability: float
    block_probability: float
    binary_pass: bool
    raw_score: float | None
    metadata: dict
```

Guard output normalization rules:

- If guard returns `block/pass`, map directly.
- If guard returns `safe/unsafe`, map `safe -> pass`, `unsafe -> block`.
- If guard returns a score, require threshold and calibration metadata.
- If guard is stochastic, either run repeated samples or record probability estimate.
- If guard fails, record error and exclude or flag affected cells.

### 15.5 Security and privacy requirements

Because customer prompts may contain sensitive information, StackCert must be designed for enterprise data handling from the beginning.

MVP controls:

- Prompt hashing.
- Optional prompt redaction.
- No raw prompt storage by default when not required.
- Customer-controlled benchmark export.
- Access logs.
- Encryption at rest and in transit.
- Minimal retention policy.
- Separation between raw examples and aggregate metrics.

Enterprise controls:

- VPC deployment.
- SSO/SAML.
- SCIM.
- Role-based access control.
- Audit logs.
- Customer-managed keys.
- Data residency options.
- SOC 2 Type II roadmap.
- Vendor/security questionnaire package.

---

## 16. Re-Certification Strategy

### 16.1 Why re-certification is central

The paper’s source-shift result makes this a core product requirement. A certificate on one benchmark mixture may fail on another. Therefore, the product should sell continuous assurance, not one-time scoring.

### 16.2 Re-certification triggers

| Trigger | Why it matters | Action |
|---|---|---|
| Base LLM version changes | Downstream behavior may change | Re-run representative cells |
| Guardrail model changes | Pass/block behavior changes | Invalidate old guard outputs |
| Guard prompt changes | Prompted judge behavior changes | Re-run affected guards |
| Threshold changes | Calibration changes | Recompute outputs and welfare |
| Traffic mix shifts | Benchmark weights may be stale | Reweight and re-certify |
| New attack class appears | Co-miss structure may change | Add benchmark cell |
| Policy taxonomy changes | Labels and utility weights may change | Rebuild welfare profile |
| Incident occurs | Existing benchmark missed a failure | Add incident-derived tests |
| Latency/cost constraints change | Feasible stacks change | Re-optimize candidate set |

### 16.3 Certificate expiration

Default expiration hypothesis:

- High-risk production system: `30–90 days`.
- Medium-risk production system: `90–180 days`.
- Internal low-risk application: `180–365 days`.
- Any material model/guard/policy change: immediate invalidation.

---

## 17. Business Model

### 17.1 Phase 1: Services-led pilots

Purpose:

- Validate buyer pain.
- Build integrations.
- Gather requirements.
- Generate case studies.
- Learn certificate formats that real reviewers accept.

Revenue:

- Fixed-fee Guardrail Stack Audit.
- Optional implementation add-on.
- Optional quarterly re-certification retainer.

### 17.2 Phase 2: Platform subscription

Purpose:

- Recurring revenue.
- Repeated certification across applications.
- Seat-based review workflows.
- Evaluation-volume expansion.

Pricing axes:

- Number of applications.
- Number of guardrails.
- Number of benchmark examples.
- Number of pairwise measurements.
- Number of certificates.
- Deployment mode: SaaS vs VPC.
- Support tier.

### 17.3 Phase 3: Enterprise assurance platform

Purpose:

- Become part of AI launch governance.
- Integrate with CI/CD, model registries, SIEM, GRC, and AI gateways.
- Support continuous monitoring and re-certification.

Expansion revenue:

- Additional product lines.
- More benchmark sources.
- Runtime drift monitoring.
- Custom compliance reports.
- Professional services for benchmark design.

---

## 18. Moat Strategy

### 18.1 Technical moat

The math is useful but not sufficient as a moat. The defendable technical moat is the system around it:

- Reliable guardrail adapters.
- Certification logic with strong auditability.
- Measurement scheduler tuned on real deployments.
- Source-slice and traffic-drift analytics.
- Benchmark construction tools.
- Conservative treatment of uncertainty.

### 18.2 Data moat

Potential data advantages:

- Anonymized patterns of guardrail co-failure by risk class.
- Benchmarks for benign over-refusal and adversarial co-miss behavior.
- Vendor-neutral guardrail performance metadata.
- Historical re-certification outcomes under model changes.

Privacy caveat:

> Data-network effects must be opt-in, aggregated, and privacy-preserving. Enterprise trust matters more than raw data accumulation.

### 18.3 Workflow moat

The strongest moat is becoming embedded in AI launch gates:

- “No LLM app ships without a StackCert evidence packet.”
- “Every guardrail change triggers StackCert re-certification.”
- “Every red-team finding is mapped into StackCert benchmark cells.”
- “Every model-risk review uses StackCert certificates.”

### 18.4 Trust moat

Honest limitations can become a differentiator. Many AI safety products overclaim. StackCert should win trust by being precise:

- Conditional certificate.
- Explicit benchmark mixture.
- Explicit source-shift warning.
- Explicit residual treatment for K≥3.
- Clear unresolved comparisons.

---

## 19. Risk Register

| Risk | Severity | Why it matters | Mitigation |
|---|---:|---|---|
| Buyer sees product as nice-to-have analytics | High | No budget owner | Sell to launch gates, security review, model risk, and incident response |
| Incumbents add similar feature | High | Runtime/eval platforms could copy surface-level stack comparison | Move fast on workflow, certificate format, integrations, and trust |
| Method initially narrow | Medium | Real systems use routing, thresholds, escalation | Start with serial stacks; expand only with explicit architecture assumptions |
| Overclaiming creates liability | High | “Certified safe” would be dangerous | Use precise certificate language and legal review |
| Customer benchmarks are weak | High | Bad benchmark gives false confidence | Include benchmark-quality assessment and source-shift warnings |
| Data privacy blocks adoption | High | Logs/prompts may be sensitive | Offer redaction, hashing, VPC, customer-controlled storage |
| Evaluation cost still high | Medium | Running guards may be expensive | Budget-aware scheduler, sampling, caching, staged pilots |
| Hard to prove ROI | Medium | Benefits are risk-reduction and avoided waste | Track pair-cell reduction, launch-cycle time, overblock reduction, incidents avoided |
| Certificates fail under source shift | High | Paper explicitly shows this can happen | Make source-specific certificates and drift monitoring core features |
| K≥3 residual too conservative | Medium | Larger stacks may not certify | Use K=2 wedge; develop additional assumptions carefully |

---

## 20. Key Metrics

### 20.1 Product metrics

| Metric | Meaning |
|---|---|
| Certified winner rate | Fraction of projects with certified stack under current budget |
| Measurement reduction | Pair-cells avoided versus exhaustive evaluation |
| Regret versus full evaluation | Used when full evaluation is run for validation |
| Active unresolved comparisons | Remaining blockers to certification |
| Source-slice fragility | Whether winner changes across benchmark slices |
| Re-certification frequency | How often customers need updated evidence |
| Guardrail drift rate | How often guard outputs change materially after version updates |

### 20.2 Business metrics

| Metric | Target signal |
|---|---|
| Paid pilot conversion | Confirms budgeted pain |
| Pilot-to-platform conversion | Confirms recurring value |
| Time to first certificate | Operational efficiency |
| Number of applications per customer | Expansion potential |
| Renewal after re-certification cycle | Recurring assurance value |
| Security-review acceptance rate | Evidence value |
| Gross margin after automation | SaaS scalability |

### 20.3 Customer ROI metrics

| ROI category | Measurement |
|---|---|
| Reduced evaluation spend | Pair-cells avoided, compute/API cost saved |
| Faster launch review | Days from evaluation start to safety signoff |
| Better safety decision | Avoided marginal-winner regret or incident class |
| Reduced overblocking | Benign pass-through improvement |
| Improved governance | Evidence packet accepted without custom analysis |

---

## 21. First 10 Hires / Roles

| Role | Timing | Why |
|---|---|---|
| Founder / CEO | Day 0 | Customer discovery, fundraising, narrative |
| Founder / CTO | Day 0 | Own CASS algorithm and platform architecture |
| Research engineer | Early | Convert paper into robust implementation |
| Full-stack engineer | Early | Dashboard, APIs, exports |
| Solutions engineer | Early | Pilots, guardrail adapters, customer data |
| AI security lead | After pilots | Map product to security buyer workflows |
| Enterprise sales lead | After first conversions | Convert design partners to annual contracts |
| Product designer | After MVP | Make uncertainty and certificates understandable |
| Compliance/security owner | Enterprise phase | SOC 2, VPC, data controls |
| Customer success / technical account manager | Enterprise phase | Re-certification programs and expansion |

---

## 22. Fundraising Narrative

### 22.1 Seed-stage narrative

> Enterprises are deploying LLMs behind stacks of guardrails, but they choose those stacks using marginal scores and intuition. That fails when guardrails miss the same attacks or overblock different benign users. CASS is a correlation-aware evidence layer that selects, certifies, and continuously re-certifies guardrail stacks under limited evaluation budgets. We start with paid guardrail-stack audits and expand into the launch-gate platform for enterprise AI assurance.

### 22.2 Why the paper matters to investors

The paper provides:

- A non-obvious technical insight: benign and adversarial correlation have opposite welfare signs.
- A mathematically precise certificate for size-two serial ensembles.
- A measurement allocation strategy that reduces expensive pairwise evaluation.
- An empirical case where marginal selection fails and CASS certifies the full-evaluation winner.
- Honest limitations that justify continuous re-certification.

### 22.3 What must be proven before a strong seed round

| Proof point | Evidence needed |
|---|---|
| Buyer pain | 30+ customer interviews, repeated pain around guardrail-stack selection |
| Budget | 3–5 paid pilots |
| Technical repeatability | CASS improves or certifies decisions on multiple customer datasets |
| Evidence value | Internal security/model-risk teams accept the certificate packet |
| Recurrence | Customers want re-certification after model/guard/policy changes |
| Integration feasibility | Product connects to common guardrails and eval workflows |

---

## 23. Open Questions

### 23.1 Product questions

1. What certificate format do model-risk and security teams actually accept?
2. How much benchmark construction help do customers need?
3. Do customers prefer offline audit, CI/CD integration, or governance dashboard first?
4. How should the product expose `λ` without confusing non-technical buyers?
5. What level of source-slice fragility blocks deployment?
6. Which guardrail connectors are most important in the first 10 pilots?

### 23.2 Technical questions

1. How stable are pairwise correlations under realistic model/traffic drift?
2. How should simultaneous correlation intervals be constructed for small or imbalanced cells?
3. How conservative are residual bounds in real K=3 enterprise stacks?
4. Can threshold optimization be incorporated without compromising interpretability?
5. How should stochastic judge variability be separated from input-level correlation?
6. How should the system handle abstain/escalate decisions instead of binary pass/block?

### 23.3 Business questions

1. Is the economic buyer security, AI platform, model risk, or product?
2. Is the first recurring budget tied to launch review, runtime monitoring, or compliance?
3. Does the product sell better as software, audit, or bundled assurance program?
4. Which vertical has the highest willingness to pay?
5. Are incumbents more likely to partner, copy, or acquire?

---

## 24. Recommended Immediate Next Steps

### 24.1 Week 1

- Choose company/product naming for external conversations.
- Create a 10-slide customer deck.
- Build a simple demo reproducing the paper’s `λ = 5` story.
- Draft a one-page Guardrail Stack Audit offer.
- Identify 50 target design partners.

### 24.2 Weeks 2–4

- Conduct 20 customer discovery calls.
- Implement the K=2 CASS prototype as a reusable library.
- Build sample certificate export.
- Build a small dashboard or notebook demo.
- Recruit 3 design partners.

### 24.3 Weeks 5–8

- Run first pilot.
- Add necessary guardrail adapters.
- Refine benchmark intake process.
- Validate certificate language with security/model-risk reviewers.
- Convert findings into a case study, anonymized if required.

### 24.4 Weeks 9–16

- Run 2–4 additional pilots.
- Decide whether primary buyer is security, AI platform, or model risk.
- Formalize pricing.
- Build persistent backend and dashboard.
- Prepare seed fundraising or bootstrap enterprise sales path.

---

## 25. Final Strategic Recommendation

CASS should become a company, but only with a precise wedge.

The right company is not a generic AI safety company and not another moderation model. The right company is an **enterprise AI guardrail-stack assurance platform**.

The first product should be **StackCert Guardrail Stack Audit**:

- Ingest customer guardrails and benchmark examples.
- Measure marginal and targeted pairwise behavior.
- Identify adversarial co-misses and benign false-block overlap.
- Recommend the best serial stack under a stated welfare profile.
- Certify the winner when comparison intervals support it.
- Produce an audit-ready evidence packet.
- Trigger re-certification when deployment conditions change.

The paper supports a strong initial claim:

> In the high-cost finite benchmark where marginal selection failed, CASS selected and certified the full-evaluation winner with dramatically fewer targeted pairwise measurements.

The product must also preserve the paper’s humility:

> A CASS certificate is conditional on the benchmark mixture and assumptions. It is not a universal deployment guarantee.

That combination — useful evidence without overclaiming — is the basis for a credible enterprise company.

---

## 26. Source Notes and References

### Uploaded paper

- *Correlation-Aware Selection and Certification of Serial Safety-Agent Ensembles Under Limited Evaluation*. User-uploaded PDF: `cass_paper_revised.pdf`.

### Market and product references consulted

- NVIDIA NeMo Guardrails — official developer/product pages: <https://developer.nvidia.com/nemo-guardrails> and <https://docs.nvidia.com/nemo/guardrails/latest/index.html>
- Lakera Guard — official product page: <https://www.lakera.ai/lakera-guard>
- Guardrails AI — official product page: <https://guardrailsai.com/>
- Promptfoo — official product/docs pages: <https://www.promptfoo.dev/> and <https://www.promptfoo.dev/docs/red-team/>
- NIST AI Risk Management Framework — official page: <https://www.nist.gov/itl/ai-risk-management-framework>
- EU AI Act — European Commission digital strategy page: <https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai>
- OWASP Top 10 for Large Language Model Applications — official project page: <https://owasp.org/www-project-top-10-for-large-language-model-applications/>
- Check Point acquisition of Lakera — official press release: <https://www.checkpoint.com/press-releases/check-point-acquires-lakera-to-deliver-end-to-end-ai-security-for-enterprises/>
- Cisco / Robust Intelligence — official Cisco page: <https://www.cisco.com/site/us/en/products/security/ai-defense/robust-intelligence-is-part-of-cisco/index.html>
