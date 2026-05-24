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
      'LLM app safety is becoming a release decision. StackCert is being built to make that decision measurable, reviewable, and repeatable.',
    date: 'May 24, 2026',
    readTime: '8 min read',
    audience: 'AI platform, safety, product, and risk teams',
    summary:
      'A plain-English overview of the product problem, the StackCert workflow, and why safety checks need to be evaluated as combinations.',
    takeaway:
      'The question is not whether a team has a guardrail. It is which safety-check combination is justified for this app, this risk profile, and this evidence budget.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'Imagine a team preparing to ship a support copilot. They have a moderation API, a custom policy rule set, a model judge, a guard model, and a stronger model they could route risky cases to. Each option looks reasonable when inspected alone. The release question is harder: which combination should actually sit in front of users?'
      },
      {
        type: 'paragraph',
        text:
          'This is the problem StackCert is built around. Production teams do not need another leaderboard of one-at-a-time safety scores. They need evidence for a scoped release decision: the application, the examples, the candidate checks, the risk profile, the recommendation, and the limits of what was tested.'
      },
      { type: 'heading', text: 'The release decision has changed' },
      {
        type: 'paragraph',
        text:
          'LLM applications are moving from demos into workflows where safety choices affect users, support operations, procurement, security review, and launch timelines. A safety check is no longer just a technical add-on. It changes false blocks, missed unsafe requests, latency, model spend, and the evidence a reviewer can rely on.'
      },
      {
        type: 'quote',
        text:
          'The question is no longer "do we have a guardrail?" It is "which safety-check combination is justified for this app?"'
      },
      {
        type: 'paragraph',
        text:
          'The usual shortcuts are attractive because they are simple. Pick the best single check. Use the strongest model available. Stack every check and hope redundancy helps. Or test every possible combination. Each shortcut can be useful in a narrow setting, but none is a general release workflow.'
      },
      { type: 'heading', text: 'The missing variable is overlap' },
      {
        type: 'paragraph',
        text:
          'Two checks can look strong individually and still fail together. If both miss the same unsafe examples, the stack gains less protection than the one-at-a-time scores imply. If two checks block different normal examples, the stack can create more user friction than expected. Overlap is not just a statistical detail. It is the thing that determines whether a combination gives useful redundancy or expensive repetition.'
      },
      {
        type: 'paragraph',
        text:
          'This is why StackCert treats the combination as the object of analysis. It looks at app examples, candidate safety checks, and the tradeoff the team cares about. Then it asks which additional overlap measurements can still change the recommendation.'
      },
      { type: 'heading', text: 'What StackCert does' },
      {
        type: 'list',
        items: [
          'Import or create app-specific unsafe and normal examples.',
          'Register candidate safety checks, including rules, classifiers, guard models, prompted judges, and stronger-model routes.',
          'Compare combinations rather than only individual checks.',
          'Recommend targeted overlap tests when the best combination is still uncertain.',
          'Produce scoped release evidence that records the recommendation, assumptions, limitations, and retest triggers.'
        ]
      },
      {
        type: 'paragraph',
        text:
          'The research method underneath is CASS, short for correlation-aware selection of safety-agent ensembles. The product wording is simpler: StackCert helps teams spend evaluation budget where the result can change the launch decision.'
      },
      {
        type: 'code',
        code:
          'App examples -> Candidate checks -> Targeted overlap tests -> Recommendation -> Release evidence -> Retest'
      },
      { type: 'heading', text: 'What our current evidence shows' },
      {
        type: 'paragraph',
        text:
          'The current empirical run is intentionally local and scoped. We evaluated 2,000 examples across eight local safety agents, producing 16,000 output rows with no missing rows, no execution errors, and no parse failures. In the safety-heavy setting, first-order marginal selection picked a different pair than the full pairwise oracle.'
      },
      {
        type: 'callout',
        title: 'Current headline result',
        body:
          'At lambda 5, the one-at-a-time top-marginal pair had finite-oracle regret of 0.025318. In the finite benchmark, CASS recovered and certified the zero-regret winner at both 25% and 50% measurement budgets.'
      },
      {
        type: 'paragraph',
        text:
          'We also tested a stronger feasible local model, Qwen3 8B. It was useful, and the expanded CASS pool selected it at lower safety penalties. But it did not make combination selection obsolete. In the safety-heavy setting, CASS selected a different pair with much lower adversarial miss-through.'
      },
      { type: 'heading', text: 'What release evidence does not mean' },
      {
        type: 'paragraph',
        text:
          'This language matters. StackCert evidence is scoped. It supports a decision for one app, one example mix, one candidate set, one risk profile, and one point in time. It is not a claim that the AI system is universally safe. It does not replace monitoring, incident response, human review, or future retesting.'
      },
      {
        type: 'paragraph',
        text:
          'That narrower claim is a feature, not a weakness. Teams already make release decisions under uncertainty. The goal is to make those decisions more explicit, more repeatable, and easier to review.'
      },
      { type: 'heading', text: 'Where the series goes next' },
      {
        type: 'paragraph',
        text:
          'The next posts unpack the business case, the theory, the CASS method, the 2,000-example empirical run, and the stronger-model comparison. The throughline is the same: safety-check selection should be evaluated as a scoped decision problem, not a generic race to add more checks.'
      }
    ]
  },
  {
    slug: 'best-single-guardrail-can-be-wrong',
    number: '02',
    category: 'Business',
    title: 'Why the Best Single Guardrail Can Be the Wrong Production Choice',
    dek:
      'One-at-a-time evaluation is cheap and legible. It can also hide the shared misses and scattered false blocks that determine production behavior.',
    date: 'May 24, 2026',
    readTime: '9 min read',
    audience: 'Security leaders, platform teams, product owners, and GRC reviewers',
    summary:
      'A business-oriented explanation of why teams need targeted combination testing instead of only independent guardrail scores.',
    takeaway:
      'Production systems ship combinations. The economic question is how to measure the overlap that matters without buying a giant test grid.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'A natural buyer question for StackCert is: "We already benchmarked each safety check. Why do we need another evaluation?" The short answer is that production does not run benchmark rows through safety checks one at a time. It ships a combination.'
      },
      {
        type: 'paragraph',
        text:
          'One-at-a-time evaluation is not foolish. It is cheap, fast, and easy to explain. It gives teams a first read on which checks are obviously weak. The problem begins when those independent scores become the whole release decision.'
      },
      { type: 'heading', text: 'Production behavior is joint behavior' },
      {
        type: 'paragraph',
        text:
          'A real LLM app might combine rules, classifiers, LLM judges, policy prompts, guard models, tool permissions, and stronger-model routes. In a serial stack, a request passes only when every selected check allows it. That means the combination is not the average of its parts.'
      },
      {
        type: 'paragraph',
        text:
          'Consider two checks that each catch 90% of unsafe examples. If they miss the same 10%, the combination is not much safer. If they miss different examples, the combination can be much stronger. The marginal score is identical. The production result is not.'
      },
      { type: 'heading', text: 'Shared misses are the business risk' },
      {
        type: 'paragraph',
        text:
          'The unsafe examples that survive the whole stack are the examples reviewers care about most. They shape legal exposure, security risk, user trust, and incident response. A team that only knows each component score still does not know whether the selected combination has a concentrated failure pocket.'
      },
      {
        type: 'paragraph',
        text:
          'This is especially important when the application has a specific risk profile. A support copilot, internal coding agent, security triage agent, and medical-summary assistant do not have the same failure costs. The right combination depends on what kinds of misses the organization is least willing to tolerate.'
      },
      { type: 'heading', text: 'Scattered false blocks are the product risk' },
      {
        type: 'paragraph',
        text:
          'There is a second side to the tradeoff. Safety checks can block normal requests. If two checks block different benign examples, the serial stack creates broader user friction. If their false blocks overlap, the damage is more concentrated. That can be less harmful for the product, even when the individual false-block rates are the same.'
      },
      {
        type: 'paragraph',
        text:
          'This asymmetry is why "more checks" is not automatically better. More checks can reduce unsafe pass-through, but they can also add latency, increase vendor spend, and block normal users. The release decision needs both sides of the ledger.'
      },
      {
        type: 'table',
        columns: ['Shortcut', 'Why teams use it', 'What it can miss'],
        rows: [
          ['Pick the best single check', 'Fast, cheap, easy to explain', 'Shared failures in the shipped combination'],
          ['Use a stronger model', 'Simple architecture and procurement story', 'Risk-profile-specific false positives and misses'],
          ['Stack everything', 'Feels conservative', 'Latency, cost, and benign false blocks'],
          ['Test every combination', 'Thorough once', 'Too slow and expensive for retests and release variants'],
          ['Target overlap tests', 'Decision-focused', 'Needs a principled scheduler and clear scope']
        ]
      },
      { type: 'heading', text: 'Targeted tests change the economics' },
      {
        type: 'paragraph',
        text:
          'The key observation behind StackCert is that not every missing measurement can change the answer. Some candidate combinations are already dominated by first-order data. Some overlap cells are irrelevant to the remaining close comparisons. A useful evaluation planner should spend budget on the unresolved comparisons, not on satisfying a desire for a complete matrix.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig02_budgeted_lambda5_methods.svg',
        alt: 'CASS budgeted lambda 5 methods comparison',
        caption:
          'In the lambda 5 finite run, CASS certified the zero-regret winner using 13 pair-cells, while broader measurement baselines used many more pair-cells without certifying.'
      },
      {
        type: 'paragraph',
        text:
          'This is not a promise that CASS always reduces cost or always certifies a winner. It is a more disciplined question: given the current evidence, which tests are most likely to resolve the release decision? Sometimes the answer is that more evidence is needed. That is still valuable, because it prevents teams from mistaking a convenient recommendation for a supported one.'
      },
      { type: 'heading', text: 'What buyers actually need' },
      {
        type: 'paragraph',
        text:
          'The artifact buyers need is not "the AI is safe." That claim is too broad. A better artifact says which candidate checks were considered, what examples were used, what risk profile was assumed, which combination was selected, which close alternatives were ruled out, and what should trigger a retest.'
      },
      {
        type: 'list',
        items: [
          'The selected safety-check combination.',
          'The app-specific example mix and weights.',
          'The measured overlap that mattered to the decision.',
          'The remaining limitations and unresolved assumptions.',
          'The cost, latency, and retest implications.'
        ]
      },
      {
        type: 'paragraph',
        text:
          'That is the business case for StackCert: better safety decisions per evaluation dollar, with evidence that platform, safety, product, and risk teams can discuss in the same room.'
      }
    ]
  },
  {
    slug: 'correlation-tax-safety-ensembles',
    number: '03',
    category: 'Theory',
    title: 'The Correlation Tax in Safety Ensembles',
    dek:
      'In serial safety stacks, marginal quality is not enough. Correlation determines whether redundancy helps or simply repeats the same mistakes.',
    date: 'May 24, 2026',
    readTime: '10 min read',
    audience: 'ML researchers, safety researchers, and senior AI platform engineers',
    summary:
      'A technical but readable explanation of why benign and adversarial correlations have different product meanings.',
    takeaway:
      'Positive correlation among adversarial misses is costly. Positive correlation among benign false blocks can be comparatively helpful.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'Two safety checks can have the same individual accuracy and very different value in a production stack. One pair catches different unsafe examples and creates useful redundancy. Another pair fails on the same examples and adds little protection. What changed is not the marginal score. It is the correlation structure.'
      },
      { type: 'heading', text: 'Serial ensembles create a product' },
      {
        type: 'paragraph',
        text:
          'StackCert focuses on serial safety-check combinations. A request passes the stack only if every selected check passes it. For unsafe inputs, this means a failure occurs when all selected checks miss the same unsafe input. For benign inputs, user friction occurs when any selected check blocks a normal input.'
      },
      {
        type: 'quote',
        text:
          'The system failure is not simply "agent A failed." It is "all selected checks passed the unsafe prompt."'
      },
      { type: 'heading', text: 'Welfare separates two kinds of mistakes' },
      {
        type: 'paragraph',
        text:
          'The theory uses a simple welfare objective. A selected set should preserve benign pass-through while penalizing adversarial miss-through. The parameter lambda controls how strongly the release decision penalizes unsafe pass-through relative to benign friction.'
      },
      {
        type: 'code',
        code: 'V(S; lambda) = weighted_benign_pass(S) - lambda * weighted_adversarial_miss(S)'
      },
      {
        type: 'paragraph',
        text:
          'This is not a universal moral formula. It is a decision surface. A low lambda setting is more tolerant of residual unsafe misses when benign usefulness matters more. A high lambda setting is safety-heavy. StackCert exposes this as a risk profile rather than asking every buyer to reason in research notation.'
      },
      { type: 'heading', text: 'The same correlation sign can mean opposite things' },
      {
        type: 'paragraph',
        text:
          'On the adversarial side, positive correlation among misses is bad. It means the checks tend to pass the same unsafe examples. A serial stack gets less benefit from redundancy when the misses are concentrated.'
      },
      {
        type: 'paragraph',
        text:
          'On the benign side, positive correlation among false blocks can be less harmful than scattered false blocks. If checks block the same normal examples, the total set of affected benign examples may be smaller than if each check blocks a different group.'
      },
      {
        type: 'callout',
        title: 'Correlation asymmetry',
        body:
          'For unsafe examples, shared passes are dangerous. For normal examples, shared blocks can concentrate friction. That is why the same mathematical correlation can have opposite product meaning depending on the benchmark side.'
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
          'At a high level, the serial pass probability decomposes into a first-order product of marginal pass rates, plus pairwise correction terms, plus a residual term for higher-order interactions. The first-order term is what one-at-a-time evaluation sees. The pairwise terms capture overlap. The residual captures what pairwise measurements alone cannot determine when the selected stack has three or more checks.'
      },
      {
        type: 'code',
        code:
          'serial pass probability = product of marginal pass rates + pairwise overlap terms + higher-order residual'
      },
      {
        type: 'paragraph',
        text:
          'This decomposition explains both the opportunity and the caution. Pairwise overlap can change the selected pair. But for K>=3, pairwise data is not magic. A credible method must keep residual uncertainty explicit instead of pretending the problem is solved.'
      },
      { type: 'heading', text: 'The correlation tax' },
      {
        type: 'paragraph',
        text:
          'The correlation tax is the welfare penalty paid when a team selects by marginal scores and ignores harmful overlap. In our 2,000-example run, this tax appears clearly in the safety-heavy lambda 5 setting: the top-marginal pair is not the full pairwise winner.'
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
          'A CASS certificate is a scoped comparison result. It says one candidate combination beats the alternatives under the stated benchmark, weights, risk profile, candidate set, and interval assumptions. It does not say the AI system is safe. It says a particular release recommendation is currently supported by the evidence.'
      },
      {
        type: 'paragraph',
        text:
          'The practical message is straightforward: if you combine safety checks, you need to measure the overlap that matters. Marginal quality is a start. It is not the release decision.'
      }
    ]
  },
  {
    slug: 'cass-targeted-overlap-tests',
    number: '04',
    category: 'Method',
    title: 'CASS: Choosing What To Measure When Safety Evaluation Is Expensive',
    dek:
      'CASS treats safety-check selection as an adaptive evaluation problem: maintain intervals, identify unresolved comparisons, and test where the answer can change.',
    date: 'May 24, 2026',
    readTime: '11 min read',
    audience: 'Evaluation engineers, safety researchers, and technical buyers',
    summary:
      'A method post explaining how CASS turns unknown overlap into candidate welfare intervals and targeted next tests.',
    takeaway:
      'CASS is not "test less and hope." It is "test the comparisons that can still matter."',
    blocks: [
      {
        type: 'paragraph',
        text:
          'If you have eight candidate safety checks and evaluate two-check combinations, there are 28 possible pairs. In our main setup, those pairs span 168 pair-by-benchmark overlap cells. Testing everything may be possible once. It is not a scalable release workflow when teams change models, add examples, adjust risk profiles, and retest after drift.'
      },
      {
        type: 'paragraph',
        text:
          'CASS asks a narrower question: which measurements can still change the recommendation?'
      },
      { type: 'heading', text: 'Start with what teams usually know' },
      {
        type: 'paragraph',
        text:
          'Most evaluation workflows can measure individual safety-check outcomes first. That gives marginal pass and block rates by benchmark cell, plus rough latency and cost. It also gives the product team a candidate set and a risk profile. What remains uncertain is whether checks fail together.'
      },
      {
        type: 'list',
        items: [
          'Do two checks miss the same unsafe prompts?',
          'Do two checks block the same normal prompts?',
          'Which overlaps can change the ranking of candidate combinations?',
          'Which comparisons are already decided by current evidence?'
        ]
      },
      { type: 'heading', text: 'Turn combinations into intervals' },
      {
        type: 'paragraph',
        text:
          'CASS uses the known first-order estimates and bounds the unknown overlap. Each candidate combination receives a lower and upper welfare value. Each head-to-head comparison receives a gap interval. If a candidate could still be best under the unresolved overlap, it remains active. If it cannot win, CASS can stop spending attention on it.'
      },
      {
        type: 'quote',
        text:
          'A combination is certified when its lower gap against every other candidate is positive.'
      },
      {
        type: 'paragraph',
        text:
          'This is conservative by design. A certificate is not awarded because the center estimate looks promising. It is awarded when the current interval evidence is strong enough to rule out the remaining alternatives.'
      },
      { type: 'heading', text: 'Choose measurements by width reduction' },
      {
        type: 'paragraph',
        text:
          'A subtle point matters here. CASS does not assume that a new measurement will move the center estimate in a helpful direction. It chooses measurements because they shrink uncertainty around active comparisons. That makes the procedure less like wishful sampling and more like an evaluation planner.'
      },
      {
        type: 'paragraph',
        text:
          'The paper describes exact and approximate planners. A small exact width-cover MILP can be used when the action space is manageable. A bundle-greedy fallback is practical when teams need a simpler scheduler. The product version can expose this as targeted test planning: show the next tests, why they matter, and what remains unresolved.'
      },
      { type: 'heading', text: 'What the method returns' },
      {
        type: 'list',
        items: [
          'The current recommended safety-check combination.',
          'Whether the recommendation is certified under the current evidence.',
          'The close alternatives that remain plausible.',
          'The targeted overlap tests most likely to resolve the decision.',
          'A release-evidence packet with scope, assumptions, limitations, and retest triggers.'
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
          'This is important for product trust. StackCert should not always return a confident-looking answer. If the interval evidence cannot distinguish the top candidates, the correct behavior is to say what remains unresolved and recommend the next measurements. That is more useful than hiding uncertainty behind a single score.'
      },
      {
        type: 'paragraph',
        text:
          'The method also has real limits. K=2 pairs are the cleanest case because pairwise overlap directly resolves the pairwise correction. K>=3 requires residual-aware intervals, which can become conservative. Source shift can weaken conclusions. Local prompted judges are not ground-truth safety classifiers. CASS helps organize the decision; it does not remove the need for good examples and careful interpretation.'
      },
      { type: 'heading', text: 'Why this matters for StackCert' },
      {
        type: 'paragraph',
        text:
          'The product promise is not that StackCert will always test less. The promise is that it will make the evaluation budget legible. A buyer should see which evidence is already enough, which evidence is missing, which tests would be wasteful, and why the selected combination is ready or not ready for review.'
      }
    ]
  },
  {
    slug: 'two-thousand-example-test',
    number: '05',
    category: 'Empirical',
    title: 'A 2,000-Example Test: When Marginal Selection Fails',
    dek:
      'The central empirical question was simple: does overlap actually change the best safety-check combination in a real local benchmark?',
    date: 'May 24, 2026',
    readTime: '12 min read',
    audience: 'Researchers, safety evaluation teams, and skeptical practitioners',
    summary:
      'The main empirical post with setup, validation, finite-oracle results, budgeted CASS behavior, bootstrap robustness, and limitations.',
    takeaway:
      'In the safety-heavy regime, marginal selection picked the wrong pair. CASS recovered and certified the full pairwise winner with targeted measurement.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'The theory says overlap can change the best safety-check combination. We wanted to know whether this happens in a real local benchmark, not only in synthetic examples. The answer from our current 2,000-example run is yes, in the safety-heavy setting.'
      },
      { type: 'heading', text: 'Experimental setup' },
      {
        type: 'paragraph',
        text:
          'The main run used 2,000 examples, six benchmark cells, eight local agents, and K=2 candidate pairs. That creates 28 candidate pairs in the original pool. We evaluated lambda values 1, 2, and 5, with lambda 5 representing the safety-heavy setting highlighted below.'
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
          'The output matrix was complete: 16,000 rows, no missing rows, no execution errors, and no parse failures. The benchmark was not perfectly balanced because the raw pool could not support a balanced 2,000-example slice. We report the finite-benchmark result directly rather than smoothing that away.'
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
          'At lambda 1 and lambda 2, top-marginal selection and the full pairwise oracle agree. That is an important negative result: CASS does not change every decision. At lambda 5, however, they diverge.'
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
          'The next question is whether CASS can recover the full pairwise winner without simply measuring everything. In the finite lambda 5 run, CASS selected the full best pair with zero regret and certified it at both 25% and 50% budget. The top-marginal baseline remained at 0.025318 regret.'
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
          'We also ran bootstrap resampling to test sensitivity within the benchmark sample. This is not proof of deployment generalization. It is a robustness diagnostic over the empirical setup. At lambda 5 and 50% budget, CASS had mean regret 0.0000 with a [0.0000, 0.0000] interval and certificate rate 1.0000 with a [1.0000, 1.0000] interval.'
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
          'First-order marginal rates were insufficient in the lambda 5 finite benchmark.',
          'Pairwise overlap changed the selected pair in the safety-heavy setting.',
          'Targeted measurement recovered and certified the full-best pair in the highlighted finite run.',
          'The central result was not caused by missing rows, execution errors, or parsing failures.'
        ]
      },
      { type: 'heading', text: 'What this does not prove' },
      {
        type: 'paragraph',
        text:
          'The evidence is not a blanket claim that CASS wins everywhere. Leave-one-source-out transfer remains brittle, especially under source shift. K=3 remains conservative because residual bounds are wider. Local prompted judges are not ground-truth safety classifiers. The dataset is imbalanced. And we have not yet run reproducible cloud frontier API baselines.'
      },
      {
        type: 'paragraph',
        text:
          'The result is still meaningful. It supports the central CASS claim at the scale we have tested so far: overlap can change the best combination, and targeted overlap testing can recover that combination without exhaustive measurement.'
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
    readTime: '9 min read',
    audience: 'Technical buyers, executives, investors, and model/platform teams',
    summary:
      'The strongest feasible local model comparison, including Qwen3 8B results and why cloud frontier baselines remain an open next step.',
    takeaway:
      'Qwen3 8B helped when added to the candidate pool, but it did not dominate CASS in the local benchmark.',
    blocks: [
      {
        type: 'paragraph',
        text:
          'A reasonable objection to StackCert is: if a stronger model is available, why not just use that as the safety judge? Sometimes that may be the right answer. But it should be an empirical answer, not an assumption.'
      },
      {
        type: 'paragraph',
        text:
          'A stronger model changes the candidate set. It may preserve more benign usefulness, catch more unsafe examples, or handle harder policy distinctions. It may also cost more, add latency, and produce a different false-positive or false-negative profile. The release question remains: does this model, alone or in combination, produce the best safety/usefulness tradeoff for this app and risk profile?'
      },
      { type: 'heading', text: 'What we tested' },
      {
        type: 'paragraph',
        text:
          'We ran Qwen3 8B locally through Ollama over all 2,000 examples. The run produced 2,000 rows, with no missing outputs, no execution errors, and no parse failures. Mean runtime was 3.9192 seconds per example in this local setup. We then evaluated Qwen as the strongest feasible single-model baseline and as an additional candidate in a 9-agent CASS pool.'
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
          'Qwen3 8B preserved benign pass-through well. Its side-normalized normal pass rate was 0.9187. But its adversarial miss-through was 0.1523, which made it less attractive in the safety-heavy lambda 5 setting. That does not make Qwen "bad." It makes it a tradeoff.'
      },
      {
        type: 'figure',
        src: '/blog/figures/fig05_safety_benign_tradeoff.svg',
        alt: 'Safety benign tradeoff for Qwen and selected CASS pairs',
        caption:
          'Qwen3 8B preserves benign pass-through but leaves more adversarial misses; the lambda 5 CASS pair sharply reduces adversarial miss-through.'
      },
      { type: 'heading', text: 'CASS versus the strongest feasible local single model' },
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
          'The interesting part is not that one method wins a local table. The interesting part is how the selected combination changes. In the expanded 9-agent pool, CASS uses Qwen at lambda 1 and lambda 2, selecting llama_guard3_1b + qwen3_8b_judge. At lambda 5, it avoids Qwen and selects llama_guard3_1b + phi3_mini_judge.'
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
          'For StackCert, this matters commercially. Stronger models should be first-class candidate safety checks. A customer should be able to compare them against cheaper checks and combinations, see when they are worth the spend, and avoid using them when they do not improve the scoped evidence.'
      },
      { type: 'heading', text: 'What remains open' },
      {
        type: 'list',
        items: [
          'Run reproducible cloud frontier baselines with configured API credentials.',
          'Add threshold and calibration sweeps rather than relying on one prompted judge setting.',
          'Test more source-diverse and customer-specific app datasets.',
          'Measure cost and latency under realistic deployment constraints.',
          'Repeat the comparison after model or policy updates.'
        ]
      },
      {
        type: 'paragraph',
        text:
          'The current result refutes a simple version of the stronger-model shortcut in our local setting. It does not prove that stronger models are unnecessary. It shows why StackCert should treat them as powerful options inside the same evidence-backed selection workflow.'
      }
    ]
  }
];

export function getBlogPost(slug: string | undefined) {
  return blogPosts.find((post) => post.slug === slug);
}
