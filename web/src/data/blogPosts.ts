export type BlogBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'callout'; title: string; body: string }
  | { type: 'table'; columns: string[]; rows: string[][]; note?: string }
  | { type: 'figure'; src: string; alt: string; caption: string }
  | { type: 'code'; code: string };

export type BlogPost = {
  slug: string;
  number: string;
  category: 'Overview' | 'Business' | 'Theory' | 'Method' | 'Empirical';
  title: string;
  dek: string;
  date: string;
  readTime: string;
  audience: string;
  summary: string;
  takeaway: string;
  blocks: BlogBlock[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'choosing-the-right-safety-checks',
    number: '01',
    category: 'Overview',
    title: 'Choosing the Right Safety Checks for Your LLM App',
    dek:
      'Shipping an LLM app now means choosing a safety stack. StackCert turns that choice into a measured release decision.',
    date: 'May 24, 2026',
    readTime: '7 min read',
    audience: 'AI platform, safety, product, and risk teams',
    summary:
      'A plain-English walkthrough of the StackCert workflow: bring app examples, compare safety-check combinations, and produce scoped release evidence.',
    takeaway:
      'The hard question is not whether you have a guardrail. It is which combination is justified for this app, this risk profile, and this evidence budget.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'Imagine a team about to launch a support copilot. They can add a moderation API, custom policy rules, a model judge, a guard model, or a stronger model for risky cases. Each option looks reasonable by itself. The release decision is harder: which combination should actually sit in front of users?'
      },
      {
        type: 'paragraph',
        text:
          'That is the problem StackCert is built for. Teams do not need another leaderboard of isolated guardrail scores. They need evidence for one scoped decision: the app, the examples, the candidate checks, the risk profile, the recommendation, and the limits of the test.'
      },
      { type: 'heading', text: 'The decision changed' },
      {
        type: 'paragraph',
        text:
          'Safety checks used to feel like engineering add-ons. Now they affect launch timing, support quality, security review, procurement, cost, latency, and user trust. A false block can hurt the product. A missed unsafe request can create real exposure.'
      },
      {
        type: 'quote',
        text:
          'The release question is no longer "do we have a guardrail?" It is "which safety-check combination is justified for this app?"'
      },
      {
        type: 'paragraph',
        text:
          'The usual shortcuts are tempting. Pick the best single check. Use the strongest model. Stack every check. Test every possible combination. Each shortcut can help in a narrow case, but none is a dependable release workflow.'
      },
      { type: 'heading', text: 'Overlap decides whether a stack helps' },
      {
        type: 'paragraph',
        text:
          'Two checks can look strong on their own and still fail together. If both miss the same unsafe examples, the stack adds less protection than the one-at-a-time scores suggest. If both block different normal examples, the stack creates more user friction than expected.'
      },
      {
        type: 'paragraph',
        text:
          'StackCert treats the combination as the thing to evaluate. It starts with app examples and candidate checks, then measures the overlaps that can still change the recommendation.'
      },
      { type: 'heading', text: 'What StackCert does' },
      {
        type: 'list',
        items: [
          'Import or create unsafe and normal examples from the app.',
          'Register candidate checks: rules, classifiers, guard models, model judges, and stronger-model routes.',
          'Compare deployable combinations, not just individual checks.',
          'Recommend targeted overlap tests when the answer is still uncertain.',
          'Produce release evidence with the recommendation, assumptions, limitations, and retest triggers.'
        ]
      },
      {
        type: 'paragraph',
        text:
          'The research method underneath is CASS: atom-aware, correlation-aware search over safety-agent committees. The legacy K<=2 serial interval certificate is now named old_cass and remains useful as an auditable evidence layer.'
      },
      {
        type: 'code',
        code:
          'App examples -> Candidate checks -> Targeted overlap tests -> Recommendation -> Release evidence -> Retest'
      },
      { type: 'heading', text: 'What the current evidence shows' },
      {
        type: 'paragraph',
        text:
          'Our current empirical run is local and scoped. We evaluated 2,000 examples against eight local safety agents, producing 16,000 output rows with no missing rows, execution errors, or parse failures. In the safety-heavy setting, the best pair from one-at-a-time scores was not the best pair after overlap was measured.'
      },
      {
        type: 'callout',
        title: 'Headline result',
        body:
          'At lambda 5, the top-marginal pair had finite-oracle regret of 0.025318. In this finite benchmark, old_cass recovered and certified the zero-regret K<=2 serial winner at both 25% and 50% measurement budgets.'
      },
      {
        type: 'paragraph',
        text:
          'We also added Qwen3 8B as a stronger feasible local model. It helped at lower safety penalties, but it did not make combination selection obsolete. In the safety-heavy setting, the CASS search frame chose a different pair with much lower adversarial miss-through.'
      },
      { type: 'heading', text: 'What release evidence does not mean' },
      {
        type: 'paragraph',
        text:
          'StackCert evidence is scoped. It supports a decision for one app, one example mix, one candidate set, one risk profile, and one point in time. It is not a claim that the whole AI system is safe. It does not replace monitoring, incident response, human review, or retesting.'
      },
      {
        type: 'paragraph',
        text:
          'That narrower claim is the point. Teams already make release decisions under uncertainty. StackCert makes the evidence behind those decisions explicit and reviewable.'
      },
      { type: 'heading', text: 'What comes next' },
      {
        type: 'paragraph',
        text:
          'The rest of this series covers the business case, the theory, CASS as the new committee-search frame, old_cass as the retained interval audit layer, the 2,000-example run, and the stronger-model comparison. The throughline is simple: safety-check selection is a scoped decision problem, not a race to add more checks.'
      }
    ]
  },
  {
    slug: 'best-single-guardrail-can-be-wrong',
    number: '02',
    category: 'Business',
    title: 'Why the Best Single Guardrail Can Be the Wrong Production Choice',
    dek:
      'One-at-a-time evals are useful. They can also hide the shared misses and scattered false blocks that decide production behavior.',
    date: 'May 24, 2026',
    readTime: '8 min read',
    audience: 'Security leaders, platform teams, product owners, and GRC reviewers',
    summary:
      'Why teams need targeted combination testing instead of a release decision based only on independent guardrail scores.',
    takeaway:
      'Production systems ship combinations. The business question is how to measure the overlap that matters without buying a giant test grid.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'A natural buyer question is: "We already benchmarked each safety check. Why run another evaluation?" Because production does not ship checks one at a time. It ships a stack.'
      },
      {
        type: 'paragraph',
        text:
          'Independent evaluation is still useful. It is cheap, fast, and easy to explain. It helps teams eliminate weak checks early. The mistake is treating those independent scores as the whole release decision.'
      },
      { type: 'heading', text: 'Production behavior is joint behavior' },
      {
        type: 'paragraph',
        text:
          'An LLM app might combine rules, classifiers, model judges, policy prompts, guard models, tool permissions, and stronger-model routes. In a serial stack, a request passes only when every selected check allows it. The result is not the average of the parts.'
      },
      {
        type: 'paragraph',
        text:
          'Take two checks that each catch 90% of unsafe examples. If they miss the same 10%, the combination is barely safer. If they miss different examples, the combination can be much stronger. The individual score is the same. The release risk is not.'
      },
      { type: 'heading', text: 'Shared misses are the safety risk' },
      {
        type: 'paragraph',
        text:
          'The unsafe examples that pass the whole stack are the ones reviewers care about most. They shape legal exposure, security risk, user trust, and incident response. A team that only knows component scores still does not know where the shipped stack fails.'
      },
      {
        type: 'paragraph',
        text:
          'The risk profile also matters. A support copilot, coding agent, security triage agent, and medical-summary assistant do not carry the same failure cost. The right stack depends on which misses the organization is least willing to tolerate.'
      },
      { type: 'heading', text: 'Scattered false blocks are the product risk' },
      {
        type: 'paragraph',
        text:
          'Safety checks can also block normal users. If two checks block different benign requests, the stack creates broader friction. If their false blocks overlap, the affected user set may be smaller even when the individual false-block rates are identical.'
      },
      {
        type: 'paragraph',
        text:
          'That is why "add more checks" is not automatically conservative. More checks can reduce unsafe pass-through, but they can also add cost, latency, and unnecessary refusals.'
      },
      {
        type: 'table',
        columns: ['Shortcut', 'Why teams use it', 'What it can miss'],
        rows: [
          ['Pick the best single check', 'Fast, cheap, easy to explain', 'Shared failures in the shipped stack'],
          ['Use a stronger model', 'Simple architecture and procurement story', 'Risk-specific false positives and misses'],
          ['Stack everything', 'Feels conservative', 'Latency, cost, and benign false blocks'],
          ['Test every combination', 'Thorough once', 'Too slow for retests and release variants'],
          ['Target overlap tests', 'Decision-focused', 'Needs a clear scheduler and scope']
        ]
      },
      { type: 'heading', text: 'Targeted tests change the economics' },
      {
        type: 'paragraph',
        text:
          'Not every missing measurement can change the decision. Some combinations are already dominated. Some overlap cells are irrelevant to the close comparisons. A useful evaluation planner spends budget on unresolved decisions, not on filling a complete matrix for its own sake.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig02_budgeted_lambda5_methods.svg',
        alt: 'CASS budgeted lambda 5 methods comparison',
        caption:
          'In the lambda 5 finite run, old_cass certified the zero-regret K<=2 winner using 13 pair-cells. Broader measurement baselines used many more pair-cells without certifying.'
      },
      {
        type: 'paragraph',
        text:
          'This is not a promise that CASS always cuts cost or always certifies a winner. It asks a better question: given the evidence we have now, which tests are most likely to resolve the release decision?'
      },
      { type: 'heading', text: 'What buyers actually need' },
      {
        type: 'paragraph',
        text:
          'The useful artifact is not "the AI is safe." That claim is too broad. A useful artifact says which checks were considered, what examples were used, what risk profile was assumed, which combination was selected, which alternatives were ruled out, and what should trigger a retest.'
      },
      {
        type: 'list',
        items: [
          'The selected safety-check combination.',
          'The app-specific example mix and weights.',
          'The measured overlap that mattered to the decision.',
          'The remaining limitations and assumptions.',
          'The cost, latency, and retest implications.'
        ]
      },
      {
        type: 'paragraph',
        text:
          'That is the business case for StackCert: clearer safety decisions per evaluation dollar, with evidence platform, safety, product, and risk teams can review together.'
      }
    ]
  },
  {
    slug: 'correlation-tax-safety-ensembles',
    number: '03',
    category: 'Theory',
    title: 'The Correlation Tax in Safety Ensembles',
    dek:
      'In serial safety stacks, marginal quality is not enough. Correlation decides whether redundancy helps or repeats the same mistakes.',
    date: 'May 24, 2026',
    readTime: '9 min read',
    audience: 'ML researchers, safety researchers, and senior AI platform engineers',
    summary:
      'A readable explanation of why adversarial and benign correlations mean different things for product risk.',
    takeaway:
      'Shared adversarial misses are costly. Shared benign false blocks can be less harmful than scattered false blocks.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'Two checks can have the same individual accuracy and very different value in production. One pair catches different unsafe prompts. Another pair misses the same prompts. The marginal score is unchanged; the overlap is not.'
      },
      { type: 'heading', text: 'Serial stacks create joint failures' },
      {
        type: 'paragraph',
        text:
          'StackCert focuses on serial combinations. A request passes only if every selected check passes it. For unsafe inputs, the dangerous case is all selected checks missing the same prompt. For benign inputs, user friction appears when any selected check blocks a normal prompt.'
      },
      {
        type: 'quote',
        text:
          'The system failure is not "one check failed." It is "the whole selected stack let the unsafe prompt through."'
      },
      { type: 'heading', text: 'Welfare separates two mistakes' },
      {
        type: 'paragraph',
        text:
          'The welfare objective balances benign pass-through against adversarial miss-through. Lambda controls how strongly the release decision penalizes unsafe pass-through compared with normal-user friction.'
      },
      {
        type: 'code',
        code: 'V(S; lambda) = weighted_benign_pass(S) - lambda * weighted_adversarial_miss(S)'
      },
      {
        type: 'paragraph',
        text:
          'This is not a moral formula. It is a decision surface. Low lambda values favor usefulness. High lambda values are more safety-heavy. StackCert exposes this as a risk profile so buyers do not need to reason in research notation.'
      },
      { type: 'heading', text: 'The same sign can mean opposite things' },
      {
        type: 'paragraph',
        text:
          'On adversarial examples, positive correlation among misses is bad. It means the checks tend to pass the same unsafe prompts, so redundancy helps less.'
      },
      {
        type: 'paragraph',
        text:
          'On benign examples, positive correlation among false blocks can be less damaging. If checks block the same normal prompts, friction is concentrated. If each check blocks different normal prompts, the affected user set grows.'
      },
      {
        type: 'callout',
        title: 'Correlation asymmetry',
        body:
          'For unsafe prompts, shared passes are dangerous. For normal prompts, shared blocks can concentrate friction. The same mathematical sign has different product meaning on each side of the benchmark.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig05_safety_benign_tradeoff.svg',
        alt: 'Benign pass-through and adversarial miss-through for selected methods',
        caption:
          'Qwen3 8B preserves benign pass-through but leaves more adversarial misses; the lambda 5 CASS pair sharply reduces adversarial miss-through.'
      },
      { type: 'heading', text: 'A product-moment view' },
      {
        type: 'paragraph',
        text:
          'At a high level, serial pass probability splits into a first-order product of marginal pass rates, pairwise overlap terms, and a residual term for higher-order interactions. One-at-a-time evaluation sees the first-order term. Pairwise tests reveal overlap.'
      },
      {
        type: 'code',
        code:
          'serial pass probability = product of marginal pass rates + pairwise overlap terms + higher-order residual'
      },
      {
        type: 'paragraph',
        text:
          'This explains both the opportunity and the caution. Pairwise overlap can change the selected pair. For K>=3, pairwise data still leaves residual uncertainty, so the method must keep that uncertainty visible.'
      },
      { type: 'heading', text: 'The correlation tax' },
      {
        type: 'paragraph',
        text:
          'The correlation tax is the welfare penalty a team pays when it selects by marginal scores and ignores harmful overlap. In our 2,000-example run, that tax appears clearly at lambda 5: the top-marginal pair is not the full pairwise winner.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig01_finite_oracle_gap.svg',
        alt: 'Finite oracle gap for lambda settings',
        caption:
          'At lambda 5, top-marginal selection picks the wrong pair; the full pairwise oracle improves welfare by 0.025318.'
      },
      { type: 'heading', text: 'What a certificate means' },
      {
        type: 'paragraph',
        text:
          'A StackCert report is a scoped comparison result. Under today\'s implementation, CASS supplies the committee-search frame and old_cass supplies the auditable K<=2 interval evidence. The report says one candidate combination beats the alternatives under the stated benchmark, weights, risk profile, candidate set, and interval assumptions.'
      },
      {
        type: 'paragraph',
        text:
          'It does not say the AI system is safe. It says the release recommendation is currently supported by the available evidence.'
      }
    ]
  },
  {
    slug: 'cass-targeted-overlap-tests',
    number: '04',
    category: 'Method',
    title: 'CASS: Choosing What To Measure When Safety Evaluation Is Expensive',
    dek:
      'CASS keeps uncertainty explicit, then tests the overlap cells that can still change the recommendation.',
    date: 'May 24, 2026',
    readTime: '10 min read',
    audience: 'Evaluation engineers, safety researchers, and technical buyers',
    summary:
      'How CASS turns unknown overlap into welfare intervals, close comparisons, and targeted next tests.',
    takeaway:
      'CASS is not "test less and hope." It is "test the comparisons that can still matter."',
    blocks: [
      {
        type: 'paragraph',
        text:
          'With eight candidate safety checks and two-check stacks, there are 28 possible pairs. In our main setup, those pairs span 168 pair-by-benchmark overlap cells. Measuring all of them may be possible once. It is not a good workflow for model changes, new examples, policy updates, and retests.'
      },
      {
        type: 'paragraph',
        text:
          'CASS asks a narrower question: which measurements can still change the recommendation?'
      },
      { type: 'heading', text: 'Start with what teams already know' },
      {
        type: 'paragraph',
        text:
          'Most teams can first measure individual safety-check outcomes. That gives pass and block rates by benchmark cell, plus rough cost and latency. It also gives the candidate set and risk profile. What remains unknown is whether checks fail together.'
      },
      {
        type: 'list',
        items: [
          'Do two checks miss the same unsafe prompts?',
          'Do two checks block the same normal prompts?',
          'Which overlaps can change the ranking?',
          'Which comparisons are already decided?'
        ]
      },
      { type: 'heading', text: 'Turn combinations into intervals' },
      {
        type: 'paragraph',
        text:
          'CASS now describes the broader atom-aware, correlation-aware search policy. The retained old_cass evidence layer combines known first-order estimates with bounds on unknown overlap. Each candidate combination gets a lower and upper welfare value. Each head-to-head comparison gets a gap interval. If a candidate can no longer win, StackCert stops spending attention on it.'
      },
      {
        type: 'quote',
        text:
          'A combination is certified when its lower gap against every other candidate is positive.'
      },
      {
        type: 'paragraph',
        text:
          'That rule is intentionally conservative. CASS does not certify a recommendation because the center estimate looks good. It certifies only when the current interval evidence rules out the remaining alternatives.'
      },
      { type: 'heading', text: 'Choose tests that shrink uncertainty' },
      {
        type: 'paragraph',
        text:
          'CASS does not assume a new measurement will move the score in a helpful direction. It chooses measurements because they shrink uncertainty around active comparisons. That makes it an evaluation planner, not a wishful sampler.'
      },
      {
        type: 'paragraph',
        text:
          'The research version includes exact and approximate planners. A small width-cover MILP can be used when the action space is manageable. A bundle-greedy fallback is practical when teams need a simpler scheduler. In the product, this becomes a test plan: what to run next, why it matters, and what remains unresolved.'
      },
      { type: 'heading', text: 'What the method returns' },
      {
        type: 'list',
        items: [
          'The current recommended safety-check combination.',
          'Whether the recommendation is certified.',
          'The close alternatives that remain plausible.',
          'The overlap tests most likely to resolve the decision.',
          'A release report with scope, assumptions, limitations, and retest triggers.'
        ]
      },
      {
        type: 'figure',
        src: '/blog/figures/fig02_budgeted_lambda5_methods.svg',
        alt: 'CASS resolves lambda 5 decision with few pair-cells',
        caption:
          'At lambda 5 and 50% budget, CASS certifies the zero-regret winner with 13 pair-cells. Uniform and uncertainty-greedy baselines spend more pair-cells in the finite run without certifying.'
      },
      { type: 'heading', text: 'The method can say "not enough evidence"' },
      {
        type: 'paragraph',
        text:
          'This is important for trust. StackCert should not always return a confident-looking answer. If the evidence cannot distinguish the top candidates, the right output is to say what is unresolved and recommend the next measurements.'
      },
      {
        type: 'paragraph',
        text:
          'The method also has limits. old_cass K=2 pairs are the cleanest auditable interval case. K>=3, quota rules, context recipes, and external priors need separate validation. Source shift can weaken conclusions. Local prompted judges are not ground-truth safety classifiers. CASS organizes the decision; it does not replace good examples or careful review.'
      },
      { type: 'heading', text: 'Why this matters for StackCert' },
      {
        type: 'paragraph',
        text:
          'StackCert is not promising to always test less. It promises to make the evaluation budget legible. A buyer should see which evidence is enough, which evidence is missing, which tests would be wasteful, and why the selected combination is ready or not ready for review.'
      }
    ]
  },
  {
    slug: 'two-thousand-example-test',
    number: '05',
    category: 'Empirical',
    title: 'A 2,000 Example Test: When Marginal Selection Fails',
    dek:
      'The central empirical question was direct: does overlap actually change the best safety-check combination in a real local benchmark?',
    date: 'May 24, 2026',
    readTime: '11 min read',
    audience: 'Researchers, safety evaluation teams, and skeptical practitioners',
    summary:
      'The main empirical post: setup, validation, finite-oracle result, budgeted CASS behavior, bootstrap robustness, and limits.',
      takeaway:
      'In the safety-heavy regime, marginal selection picked the wrong pair. old_cass recovered and certified the full pairwise winner with targeted tests.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'The theory says overlap can change the best safety-check combination. We wanted to know if that happens in a real local benchmark, not only in synthetic examples. In our current 2,000-example run, the answer is yes in the safety-heavy setting.'
      },
      { type: 'heading', text: 'Experimental setup' },
      {
        type: 'paragraph',
        text:
          'The main run used 2,000 examples, six benchmark cells, eight local agents, and K=2 candidate pairs. That creates 28 candidate pairs in the original pool. We evaluated lambda values 1, 2, and 5; lambda 5 is the safety-heavy setting highlighted below.'
      },
      {
        type: 'table',
        columns: ['Item', 'Value'],
        rows: [
          ['Examples', '2,000'],
          ['Benchmark cells', '6'],
          ['Agents in main pool', '8'],
          ['Candidate pairs', '28'],
          ['Output rows', '16,000'],
          ['Lambda values', '1, 2, 5'],
          ['Highlighted budgets', '25% and 50%'],
          ['Bootstrap resamples', '200 for lambda 1 and lambda 5 summaries']
        ]
      },
      { type: 'heading', text: 'Data validation' },
      {
        type: 'paragraph',
        text:
          'The output matrix was complete: 16,000 rows, no missing rows, no execution errors, and no parse failures. The benchmark was not perfectly balanced because the raw pool could not support a balanced 2,000-example slice. We report the finite-benchmark result directly instead of smoothing that away.'
      },
      {
        type: 'table',
        columns: ['Cell', 'Examples'],
        rows: [
          ['A/HarmBench', '320'],
          ['A/StrongREJECT', '313'],
          ['A/ToxicChat-toxic', '362'],
          ['A/XSTest-unsafe', '200'],
          ['N/ToxicChat-clean', '555'],
          ['N/XSTest-safe', '250']
        ],
        note:
          'A denotes adversarial or unsafe examples. N denotes normal or benign examples.'
      },
      { type: 'heading', text: 'Finite-oracle result' },
      {
        type: 'paragraph',
        text:
          'At lambda 1 and lambda 2, top-marginal selection and the full pairwise oracle agree. That matters: CASS does not change every decision. At lambda 5, they diverge.'
      },
      {
        type: 'table',
        columns: ['Lambda', 'Top marginal', 'Full best', 'Regret'],
        rows: [
          ['1', 'llama3_2_3b_judge + llama_guard3_1b', 'same', '0.000000'],
          ['2', 'llama3_2_3b_judge + llama_guard3_1b', 'same', '0.000000'],
          ['5', 'llama3_2_3b_judge + llama_guard3_1b', 'llama_guard3_1b + phi3_mini_judge', '0.025318']
        ]
      },
      {
        type: 'figure',
        src: '/blog/figures/fig01_finite_oracle_gap.svg',
        alt: 'Finite oracle gap across lambda values',
        caption:
          'At lambda 5, top-marginal selection picks the wrong pair; the full pairwise oracle improves welfare by 0.025318.'
      },
      { type: 'heading', text: 'Budgeted CASS result' },
      {
        type: 'paragraph',
        text:
          'The next question is whether CASS can recover the full pairwise winner without measuring everything. In the finite lambda 5 run, CASS selected the full best pair with zero regret and certified it at both 25% and 50% budget. The top-marginal baseline stayed at 0.025318 regret.'
      },
      {
        type: 'table',
        columns: ['Method', 'Budget', 'Selected pair', 'Regret', 'Certified', 'Pair-cells'],
        rows: [
          ['Top marginal', '0%', 'llama3_2_3b_judge + llama_guard3_1b', '0.025318', 'No', '0'],
          ['CASS greedy', '25%', 'llama_guard3_1b + phi3_mini_judge', '0.000000', 'Yes', '13'],
          ['CASS greedy', '50%', 'llama_guard3_1b + phi3_mini_judge', '0.000000', 'Yes', '13'],
          ['Uncertainty greedy', '50%', 'llama_guard3_1b + phi3_mini_judge', '0.000000', 'No', '67'],
          ['Uniform by cell', '50%', 'llama_guard3_1b + phi3_mini_judge', '0.000000', 'No', '84']
        ]
      },
      {
        type: 'figure',
        src: '/blog/figures/fig02_budgeted_lambda5_methods.svg',
        alt: 'Budgeted lambda 5 method comparison',
        caption:
          'CASS resolves the lambda 5 decision with few pair-cells, while broader measurement spends more without certifying in the finite run.'
      },
      { type: 'heading', text: 'Bootstrap robustness' },
      {
        type: 'paragraph',
        text:
          'We also ran bootstrap resampling to check sensitivity inside this benchmark sample. This is not proof of deployment generalization. It is a robustness diagnostic. At lambda 5 and 50% budget, CASS had mean regret 0.0000 with a [0.0000, 0.0000] interval and certificate rate 1.0000 with a [1.0000, 1.0000] interval.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig03_bootstrap_lambda5_regret.svg',
        alt: 'Bootstrap lambda 5 regret comparison',
        caption:
          'Across bootstrap resamples, CASS at 50% budget has mean regret 0 with a [0, 0] interval, unlike top-marginal and random baselines.'
      },
      { type: 'heading', text: 'What this supports' },
      {
        type: 'list',
        items: [
          'First-order marginal rates were not enough in the lambda 5 finite benchmark.',
          'Pairwise overlap changed the selected pair in the safety-heavy setting.',
          'Targeted measurement recovered and certified the full-best pair in the highlighted finite run.',
          'The central result was not caused by missing rows, execution errors, or parse failures.'
        ]
      },
      { type: 'heading', text: 'What this does not prove' },
      {
        type: 'paragraph',
        text:
          'This is not a blanket claim that CASS wins everywhere. Leave-one-source-out transfer remains brittle, especially under source shift. K=3 remains conservative because residual bounds are wider. Local prompted judges are not ground-truth safety classifiers. The dataset is imbalanced. We have not yet run reproducible cloud frontier API baselines.'
      },
      {
        type: 'paragraph',
        text:
          'The result still supports the central claim at the scale tested so far: overlap can change the best combination, and targeted overlap testing can recover that combination without exhaustive measurement.'
      }
    ]
  },
  {
    slug: 'stronger-models-and-safety-selection',
    number: '06',
    category: 'Empirical',
    title: 'Do Stronger Models Make Safety-Check Selection Obsolete?',
    dek:
      'A stronger model can be a very good safety check. It is still a candidate to compare, not an automatic replacement for scoped selection.',
    date: 'May 24, 2026',
    readTime: '8 min read',
    audience: 'Technical buyers, executives, investors, and model/platform teams',
    summary:
      'The strongest feasible local model comparison: Qwen3 8B results, what it improves, and why cloud frontier baselines remain a next step.',
    takeaway:
      'Qwen3 8B helped when added to the candidate pool, but it did not dominate CASS in the local benchmark.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'A fair objection to StackCert is: if a stronger model is available, why not use it as the safety judge? Sometimes that may be right. But it should be an empirical answer, not an assumption.'
      },
      {
        type: 'paragraph',
        text:
          'A stronger model changes the candidate set. It may preserve more benign usefulness, catch more unsafe prompts, or understand policy better. It may also cost more, add latency, and make different mistakes. The release question remains: does this model, alone or in a combination, create the best tradeoff for this app and risk profile?'
      },
      { type: 'heading', text: 'What we tested' },
      {
        type: 'paragraph',
        text:
          'We ran Qwen3 8B locally through Ollama on all 2,000 examples. The run produced 2,000 rows with no missing outputs, execution errors, or parse failures. Mean runtime was 3.9192 seconds per example in this local setup. We then evaluated Qwen as a single-model baseline and as an added candidate in a 9-agent CASS pool.'
      },
      {
        type: 'callout',
        title: 'Scope note',
        body:
          'This is a strong local-model comparison, not a full cloud-frontier comparison. gpt-oss:20b timed out on a one-example JSON diagnostic locally. OpenAI and xAI API baselines were not run because reproducible API credentials were not configured.'
      },
      { type: 'heading', text: 'Qwen had a clear profile' },
      {
        type: 'paragraph',
        text:
          'Qwen3 8B preserved benign pass-through well. Its side-normalized normal pass rate was 0.9187. Its adversarial miss-through was 0.1523, which made it less attractive in the safety-heavy lambda 5 setting. That does not make Qwen bad. It makes Qwen a tradeoff.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig05_safety_benign_tradeoff.svg',
        alt: 'Safety benign tradeoff for Qwen and selected CASS pairs',
        caption:
          'Qwen3 8B preserves benign pass-through but leaves more adversarial misses; the lambda 5 CASS pair sharply reduces adversarial miss-through.'
      },
      { type: 'heading', text: 'CASS versus the strongest feasible local model' },
      {
        type: 'table',
        columns: ['Lambda', 'Qwen single', '8-agent CASS', '9-agent CASS'],
        rows: [
          ['1', '0.2333', '0.2424', '0.2679'],
          ['2', '0.1358', '0.2095', '0.2319'],
          ['5', '-0.1565', '0.1363', '0.1363']
        ],
        note:
          'Values are welfare scores in the local benchmark. The 9-agent pool adds Qwen3 8B to the original eight candidates.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig04_strong_local_model_comparison.svg',
        alt: 'Qwen single model comparison against 8-agent and 9-agent CASS',
        caption:
          'Qwen3 8B is the best feasible strong single model, but CASS beats it at every lambda; the expanded pool improves further at lambda 1 and 2.'
      },
      {
        type: 'paragraph',
        text:
          'The useful part is not that one method wins a local table. It is how the selected combination changes. In the expanded 9-agent pool, CASS uses Qwen at lambda 1 and lambda 2, selecting llama_guard3_1b + qwen3_8b_judge. At lambda 5, it avoids Qwen and selects llama_guard3_1b + phi3_mini_judge.'
      },
      { type: 'heading', text: 'The stronger-model lesson' },
      {
        type: 'quote',
        text:
          'CASS is not a claim that small ensembles always beat strong models. It is a method for deciding when a strong model, a guard, a rule, or a combination is best for the scoped risk profile.'
      },
      {
        type: 'paragraph',
        text:
          'For StackCert, stronger models should be first-class candidate checks. A customer should be able to compare them against cheaper checks and combinations, see when they are worth the spend, and avoid using them when they do not improve the scoped evidence.'
      },
      { type: 'heading', text: 'What remains open' },
      {
        type: 'list',
        items: [
          'Run reproducible cloud frontier baselines with configured API credentials.',
          'Add threshold and calibration sweeps instead of relying on one prompted judge setting.',
          'Test more source-diverse and customer-specific app datasets.',
          'Measure cost and latency under realistic deployment constraints.',
          'Repeat the comparison after model or policy updates.'
        ]
      },
      {
        type: 'paragraph',
        text:
          'The current result refutes a simple version of the stronger-model shortcut in our local setting. It does not prove stronger models are unnecessary. It shows why StackCert should treat them as powerful options inside the same evidence-backed selection workflow.'
      }
    ]
  }
];

export function getBlogPost(slug: string | undefined) {
  return blogPosts.find((post) => post.slug === slug);
}
