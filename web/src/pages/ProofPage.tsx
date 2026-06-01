import { Link } from 'react-router-dom';
import proofBenchmark from '../data/proofBenchmark.json';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';
import { fmtNumber, fmtPercent, fmtUsd } from '../lib/format';
import { Footer } from './LandingPage';

type ProofRow = {
  id: string;
  label: string;
  agents: string[];
  benign_pass_rate: number;
  unsafe_miss_rate: number;
  goal_score: number;
  provider_cost_usd: number;
  mean_runtime_sec: number;
  release_decision: string;
  parse_failures: number;
  errors: number;
  includes_grok: boolean;
};

type ProofMetricRow = Omit<ProofRow, 'id' | 'label'> & Partial<Pick<ProofRow, 'id' | 'label'>>;

type ProofCellDetail = {
  cell_id: string;
  source: string;
  side: string;
  expected_decision: string;
  input_type: string;
  why_it_matters: string;
};

type ProofExampleOutput = {
  label: string;
  agents: string[];
  decision: string;
  vote_rule: string;
  member_decisions: Array<{
    agent: string;
    decision: string;
    score: number | null;
    parse_failed: boolean;
    missing_output: boolean;
  }>;
};

type ProofExamplePreview = {
  example_id: string;
  benchmark_cell: string;
  source: string;
  side: string;
  input_summary: string;
  expected_decision: string;
  outputs: ProofExampleOutput[];
};

type ProofTaskSlice = {
  id: string;
  label: string;
  question: string;
  benchmark_note: string;
  cells: string[];
  cell_details: ProofCellDetail[];
  total_examples: number;
  adversarial_examples: number;
  benign_examples: number;
  always_grok: ProofMetricRow;
  best_local_single: ProofMetricRow;
  best_local_pair: ProofMetricRow;
  best_local_triple: ProofMetricRow;
  best_same_decision_local: ProofMetricRow;
  top_same_decision_locals: ProofMetricRow[];
  same_decision_local_count: number;
  example_previews: ProofExamplePreview[];
};

const proof = proofBenchmark as unknown as {
  generated_at: string;
  live_grok_run: boolean;
  task: { name: string; description: string; instruction_boundary: string };
  sample: {
    total_examples: number;
    seed: number;
    per_cell: number;
    cells: Array<{ cell_id: string; side: string; examples: number; source: string }>;
  };
  model_config: {
    frontier_model: string;
    provider: string;
    provider_format: string;
    input_price_per_1m_tokens_usd: number;
    output_price_per_1m_tokens_usd: number;
    local_agents: string[];
  };
  summary: {
    claim_status: string;
    same_decision_lower_cost: boolean;
    primary_lambda: number;
    always_grok_cost_usd: number;
    stackcert_local_cost_usd: number;
    provider_savings_usd: number;
    provider_savings_percent: number;
    always_grok_decision: string;
    stackcert_local_decision: string;
    stackcert_local_agents: string[];
    always_grok_goal_score: number;
    stackcert_local_goal_score: number;
  };
  comparison_rows: ProofRow[];
  task_slices: ProofTaskSlice[];
  lambda_sensitivity: Array<{
    lambda: number;
    always_grok: ProofMetricRow;
    stackcert_local_pair: ProofMetricRow;
    stackcert_expanded_pair: ProofMetricRow;
  }>;
  limitations: string[];
  replication_commands: string[];
};

export function ProofPage() {
  const alwaysGrok = proof.comparison_rows.find((row) => row.id === 'always_grok');
  const bestLocalSingle = proof.comparison_rows.find((row) => row.id === 'best_local_single');
  const localPair = proof.comparison_rows.find((row) => row.id === 'stackcert_local_pair');
  const supported = proof.summary.same_decision_lower_cost;
  const headline = supported
    ? 'Same release decision without always calling Grok.'
    : 'A concrete frontier comparison for one scoped release decision.';
  const statusTone = supported ? 'ok' : 'warn';
  const savingsCopy = supported
    ? 'external provider spend saved for the matching local-pair decision'
    : 'provider spend delta versus always-Grok; release-decision match required for the savings claim';
  const comparisonTitle = supported
    ? 'Grok is strong, but not always necessary for the release decision.'
    : 'The cheaper-same-decision claim was not supported in this run.';
  const comparisonCopy = supported
    ? 'The local pair has a lower goal score than always calling Grok, but reaches the same pass/warn/block release decision with no external provider calls in this scoped run.'
    : 'Use the table to see where local options differ from Grok, then admit Grok, retest, or narrow the release scope before claiming provider savings.';

  return (
    <div className="landing marketing-shell proof-page">
      <header className="landing-nav">
        <div className="landing-container marketing-nav">
          <Link to="/" className="sidebar-brand">
            <LogoMark size={22} />
            <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
          </Link>
          <div style={{ flex: 1 }} />
          <ButtonLink to="/demo">Demo</ButtonLink>
          <ButtonLink to="/onboarding" variant="primary">
            Start pilot
          </ButtonLink>
        </div>
      </header>

      <main>
        <section className="proof-hero">
          <div className="landing-container proof-hero-grid">
            <div>
              <Badge tone={statusTone}>Frontier proof benchmark</Badge>
              <h1 className="section-title">{headline}</h1>
              <p className="hero-copy">
                We ran a 240-example support-copilot safety task against xAI Grok 4.3 and local safety checks. The
                result is intentionally narrow: prompt safety classification for one release question, with provider
                spend and scope visible.
              </p>
              <div className="proof-actions">
                <ButtonLink to="/demo" variant="primary">
                  Open guided demo
                </ButtonLink>
                <ButtonLink to="/replication-kit">Replication kit</ButtonLink>
              </div>
            </div>

            <div className="proof-summary-panel">
              <div className="proof-summary-top">
                <span>Primary result</span>
                <Badge tone={statusTone}>{proof.summary.claim_status.replace('_', ' ')}</Badge>
              </div>
              <div className="proof-summary-result">
                <strong>{fmtPercent(proof.summary.provider_savings_percent / 100, 0)}</strong>
                <span>{savingsCopy}</span>
              </div>
              <div className="proof-summary-grid">
                <ProofMetric label="Examples" value={proof.sample.total_examples.toLocaleString()} />
                <ProofMetric label="Grok spend" value={fmtUsd(proof.summary.always_grok_cost_usd, 3)} />
                <ProofMetric label="Local-pair spend" value={fmtUsd(proof.summary.stackcert_local_cost_usd, 3)} />
                <ProofMetric label="Decision" value={proof.summary.stackcert_local_decision} />
              </div>
            </div>
          </div>
        </section>

        <section className="proof-section proof-section-muted">
          <div className="landing-container">
            <div className="proof-section-head">
              <div>
                <div className="section-eyebrow">Task scope</div>
                <h2 className="section-title">Small enough to be real, concrete enough to judge.</h2>
              </div>
              <p>{proof.task.description} {proof.task.instruction_boundary}</p>
            </div>
            <div className="grid grid-3">
              <Card>
                <div className="stat-label">Frontier baseline</div>
                <h3 className="proof-card-title">{proof.model_config.provider} {proof.model_config.frontier_model}</h3>
                <p className="muted">
                  OpenAI-compatible chat, JSON decision output, and published pricing of {fmtUsd(proof.model_config.input_price_per_1m_tokens_usd, 2)}/M input tokens plus {fmtUsd(proof.model_config.output_price_per_1m_tokens_usd, 2)}/M output tokens.
                </p>
              </Card>
              <Card>
                <div className="stat-label">Local candidate pool</div>
                <h3 className="proof-card-title">{proof.model_config.local_agents.length} checks</h3>
                <p className="muted">
                  Includes rules, guard models, small local judges, and Qwen3 8B as a stronger local baseline. StackCert compares combinations instead of assuming one model dominates.
                </p>
              </Card>
              <Card>
                <div className="stat-label">Release goal weighting</div>
                <h3 className="proof-card-title">Lambda {fmtNumber(proof.summary.primary_lambda, 0)}</h3>
                <p className="muted">
                  Safety-heavy setting: missed unsafe prompts are weighted more heavily than benign friction when ranking candidate checks.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className="proof-section">
          <div className="landing-container">
            <div className="proof-section-head">
              <div>
                <div className="section-eyebrow">Comparison</div>
                <h2 className="section-title">{comparisonTitle}</h2>
              </div>
              <p>{comparisonCopy}</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Checks</th>
                    <th className="right">Benign pass</th>
                    <th className="right">Unsafe miss</th>
                    <th className="right">Goal score</th>
                    <th className="right">Provider spend</th>
                    <th className="right">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {proof.comparison_rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.label}</strong>
                        {row.errors || row.parse_failures ? (
                          <div className="muted" style={{ fontSize: 12 }}>{row.errors} provider errors counted conservatively</div>
                        ) : null}
                      </td>
                      <td>{row.agents.join(' + ')}</td>
                      <td className="right mono">{fmtPercent(row.benign_pass_rate, 1)}</td>
                      <td className="right mono">{fmtPercent(row.unsafe_miss_rate, 1)}</td>
                      <td className="right mono">{fmtNumber(row.goal_score, 4)}</td>
                      <td className="right mono">{fmtUsd(row.provider_cost_usd, 4)}</td>
                      <td className="right"><Badge tone={decisionTone(row.release_decision)}>{row.release_decision}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {alwaysGrok && bestLocalSingle && localPair ? (
              <div className="proof-mechanism-grid" aria-label="How the combination works">
                <Card>
                  <div className="section-eyebrow">Single-check baseline</div>
                  <h3 className="proof-card-title">The best local model still underperforms alone.</h3>
                  <p className="muted">
                    {bestLocalSingle.agents.join(' + ')} is the strongest local single check here, but it lands at a{' '}
                    <strong>{bestLocalSingle.release_decision}</strong> release decision with an unsafe miss rate of{' '}
                    <strong>{fmtPercent(bestLocalSingle.unsafe_miss_rate, 1)}</strong>.
                  </p>
                </Card>
                <Card>
                  <div className="section-eyebrow">StackCert combination</div>
                  <h3 className="proof-card-title">Together, the selected checks clear the release bar.</h3>
                  <p className="muted">
                    {localPair.agents.join(' + ')} lowers unsafe misses to{' '}
                    <strong>{fmtPercent(localPair.unsafe_miss_rate, 1)}</strong> and improves the release goal score
                    from <strong>{fmtNumber(bestLocalSingle.goal_score, 4)}</strong> to{' '}
                    <strong>{fmtNumber(localPair.goal_score, 4)}</strong>, reaching the same{' '}
                    <strong>{alwaysGrok.release_decision}</strong> decision as Grok in this scoped run.
                  </p>
                </Card>
                <Card>
                  <div className="section-eyebrow">Voting rule</div>
                  <h3 className="proof-card-title">Any selected check can veto.</h3>
                  <p className="muted">
                    A prompt passes a StackCert combination only when every selected check passes it. If any selected
                    check says block or escalate, the combined option blocks. That fail-closed rule reduces unsafe misses
                    here, while lowering benign pass from {fmtPercent(bestLocalSingle.benign_pass_rate, 1)} to{' '}
                    {fmtPercent(localPair.benign_pass_rate, 1)}.
                  </p>
                </Card>
              </div>
            ) : null}
          </div>
        </section>

        <section className="proof-section proof-section-muted">
          <div className="landing-container">
            <div className="proof-section-head">
              <div>
                <div className="section-eyebrow">More small benchmarks</div>
                <h2 className="section-title">Task-specific slices show when combinations matter.</h2>
              </div>
              <p>
                These are narrower 80-example views cut from the same 240-example live run. They are not new universal
                claims; they show which local combinations reach the same scoped release decision as Grok for each task.
              </p>
            </div>
            <div className="proof-slice-grid">
              {proof.task_slices.map((slice) => (
                <Card key={slice.id}>
                  <div className="proof-slice-head">
                    <div>
                      <div className="section-eyebrow">{slice.benchmark_note}</div>
                      <h3 className="proof-card-title">{slice.label}</h3>
                    </div>
                    <Badge tone={decisionTone(slice.best_same_decision_local.release_decision)}>
                      {slice.best_same_decision_local.release_decision}
                    </Badge>
                  </div>
                  <p className="muted">{slice.question}</p>
                  <div className="proof-slice-counts">
                    <span>{slice.total_examples} examples</span>
                    <span>{slice.adversarial_examples} unsafe</span>
                    <span>{slice.benign_examples} benign</span>
                  </div>
                  <div className="proof-cell-detail-list">
                    <h4>Benchmark cells used</h4>
                    {slice.cell_details.map((cell) => (
                      <div key={cell.cell_id}>
                        <div>
                          <strong>{cell.cell_id}</strong>
                          <small>{cell.source} · {cell.side}</small>
                        </div>
                        <Badge tone={decisionTone(cell.expected_decision)}>{cell.expected_decision}</Badge>
                        <p>{cell.input_type}. {cell.why_it_matters}</p>
                      </div>
                    ))}
                  </div>
                  <div className="proof-slice-rows">
                    <ProofSliceRow
                      label="Grok 4.3"
                      row={slice.always_grok}
                      detail={`${fmtUsd(slice.always_grok.provider_cost_usd, 4)} provider spend`}
                    />
                    <ProofSliceRow label="Best local single" row={slice.best_local_single} />
                    <ProofSliceRow
                      label="Best same-decision local"
                      row={slice.best_same_decision_local}
                      detail={`${slice.same_decision_local_count} local combo${slice.same_decision_local_count === 1 ? '' : 's'} matched Grok's release decision`}
                    />
                  </div>
                  <div className="proof-example-preview-list">
                    <h4>Redacted example inputs and outputs</h4>
                    <p>Prompts are summarized to avoid publishing harmful instructions; outputs show the release-check decisions used by the benchmark.</p>
                    {slice.example_previews.map((example) => (
                      <div key={example.example_id} className="proof-example-preview">
                        <div className="proof-example-head">
                          <div>
                            <strong>{example.input_summary}</strong>
                            <small>{example.example_id} · {example.benchmark_cell}</small>
                          </div>
                          <Badge tone={decisionTone(example.expected_decision)}>
                            expected {example.expected_decision}
                          </Badge>
                        </div>
                        <div className="proof-example-output-list">
                          {example.outputs.map((output) => (
                            <ProofExampleOutputRow key={output.label} output={output} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="proof-section proof-section-muted">
          <div className="landing-container proof-two-col">
            <Card>
              <div className="section-eyebrow">Sample design</div>
              <h2 className="proof-card-title">240 stratified examples across six cells.</h2>
              <div className="proof-cell-list">
                {proof.sample.cells.map((cell) => (
                  <div key={cell.cell_id}>
                    <span>{cell.cell_id}</span>
                    <strong>{cell.examples}</strong>
                  </div>
                ))}
              </div>
              <p className="muted">
                Seed {proof.sample.seed}. {proof.live_grok_run ? 'This fixture was generated during a live Grok run.' : 'This fixture was generated from saved live Grok outputs.'} The repo still keeps the broader 2,000-example local baseline for replication.
              </p>
            </Card>
            <Card>
              <div className="section-eyebrow">Sensitivity</div>
              <h2 className="proof-card-title">The local pair keeps the same decision at both tested weightings.</h2>
              <div className="proof-sensitivity-list">
                {proof.lambda_sensitivity.map((row) => (
                  <div key={row.lambda}>
                    <span>Lambda {fmtNumber(row.lambda, 0)}</span>
                    <strong>{row.stackcert_local_pair.release_decision}</strong>
                    <small>
                      local pair {fmtNumber(row.stackcert_local_pair.goal_score, 4)} vs Grok {fmtNumber(row.always_grok.goal_score, 4)}
                    </small>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="proof-section">
          <div className="landing-container proof-two-col">
            <Card>
              <div className="section-eyebrow">Limitations</div>
              <h2 className="proof-card-title">What this does not prove.</h2>
              <ul className="proof-list">
                {proof.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="section-eyebrow">Replication</div>
              <h2 className="proof-card-title">Run the fixture path or spend provider budget intentionally.</h2>
              <div className="proof-command-list">
                {proof.replication_commands.map((command) => (
                  <code key={command}>{command}</code>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ProofSliceRow({ label, row, detail }: { label: string; row: ProofMetricRow; detail?: string }) {
  return (
    <div>
      <div>
        <span>{label}</span>
        <strong>{row.agents.join(' + ')}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
      <div className="proof-slice-metrics">
        <Badge tone={decisionTone(row.release_decision)}>{row.release_decision}</Badge>
        <span>{fmtPercent(row.unsafe_miss_rate, 1)} unsafe miss</span>
        <span>{fmtPercent(row.benign_pass_rate, 1)} benign pass</span>
      </div>
    </div>
  );
}

function ProofExampleOutputRow({ output }: { output: ProofExampleOutput }) {
  return (
    <div>
      <div>
        <span>{output.label}</span>
        <strong>{output.decision}</strong>
        <small>{output.agents.join(' + ')} · {output.vote_rule}</small>
      </div>
      {output.member_decisions.length > 1 ? (
        <div className="proof-member-decision-list" aria-label={`${output.label} member decisions`}>
          {output.member_decisions.map((member) => (
            <span key={member.agent}>
              {member.agent}: {member.decision}
              {member.score !== null ? ` (${fmtNumber(member.score, 2)})` : ''}
              {member.parse_failed ? ' · parsed fail-closed' : ''}
              {member.missing_output ? ' · missing output' : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function decisionTone(decision: string) {
  if (decision === 'pass') return 'ok';
  if (decision === 'warn') return 'warn';
  return 'bad';
}
