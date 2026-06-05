import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fmtNumber, fmtPercent, fmtUsd } from '../lib/format';
import { Badge, ButtonLink, Card, ErrorState, Explainer, ExternalButton, LoadingState, PageHeader, Stat } from '../components/Primitives';
import { PilotReadinessPanel } from '../components/PilotReadinessPanel';
import { FirstReportJourney } from '../components/FirstReportJourney';
import { BenchmarkMix, WelfareMovementChart } from '../components/Charts';
import { useStackCertApp } from '../lib/appContext';

export function OverviewPage({ lambda }: { lambda: number }) {
  const { projectId, activeRunId, runsLoading } = useStackCertApp();
  const readiness = useQuery({ queryKey: ['pilot-readiness', projectId, lambda], queryFn: () => api.pilotReadiness(projectId, lambda) });
  const overview = useQuery({ queryKey: ['overview', activeRunId, lambda], queryFn: () => api.overview(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const ranking = useQuery({ queryKey: ['ranking', activeRunId, lambda], queryFn: () => api.ranking(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const runExamples = useQuery({ queryKey: ['run-examples', activeRunId, lambda], queryFn: () => api.runExamples(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const runFailures = useQuery({ queryKey: ['run-failures', activeRunId, lambda], queryFn: () => api.runFailures(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const runStability = useQuery({ queryKey: ['run-stability', activeRunId, lambda], queryFn: () => api.runStability(activeRunId!, lambda), enabled: Boolean(activeRunId) });

  if (runsLoading && !activeRunId) return <LoadingState />;
  if (!activeRunId) {
    return (
      <div className="page">
        {readiness.data ? <PilotReadinessPanel readiness={readiness.data.readiness} /> : null}
        <Card>
          <h1 style={{ marginTop: 0, fontSize: 26 }}>No recommendation yet</h1>
          <p className="muted" style={{ lineHeight: 1.55 }}>
            Follow the pilot path in app setup. Once examples and safety-check outputs are in place, StackCert will
            rank combinations, estimate remaining tests, and prepare a release report for this app.
          </p>
          <ButtonLink to="../setup" variant="primary">
            Go to app setup
          </ButtonLink>
        </Card>
      </div>
    );
  }
  if (overview.isLoading || ranking.isLoading) return <LoadingState />;
  if (overview.error || ranking.error) return <ErrorState error={overview.error || ranking.error} />;

  const data = overview.data!;
  const rows = ranking.data!.rows;
  const projectName = data.project.name || 'This app';
  const appDescription = displayProjectDescription(
    data.project.description || 'Compare tested safety options against your uploaded examples and release goals.'
  );
  const recommendationChanged = data.recommended_stack.architecture_id !== data.marginal_stack.architecture_id;
  const subtitle = appDescription.toLowerCase().startsWith(projectName.toLowerCase())
    ? appDescription
    : `${projectName}: ${appDescription}`;
  const releaseDecision = releaseDecisionSummary(data.certificate.status, data.stats.certified_comparison_count, data.stats.comparison_count);
  const confidence = confidenceSummary(data.stats.certified_comparison_count, data.stats.comparison_count);

  return (
    <div className="page">
      <PageHeader
        title={`Recommended safety combination: ${data.recommended_stack.label}`}
        subtitle={subtitle}
        actions={
          <>
            <ButtonLink to="../certificate" variant="primary">
              Open release report
            </ButtonLink>
            <ButtonLink to="../co-failure">Inspect overlap</ButtonLink>
          </>
        }
      />
      {data.run.source === 'template_seeded' ? (
        <Explainer title="Template evidence" tone="warn" style={{ marginBottom: 16 }}>
          <p>
            This duplicated sample run uses StackCert fixture examples and outputs. It is useful for learning the
            workflow, but replace it with your private examples and safety-check outputs before using a release report
            for a buyer decision.
          </p>
        </Explainer>
      ) : null}
      {projectId === 'proj_acme_copilot' ? (
        <FirstReportJourney
          title="Demo guide: follow the first release-report path"
          intro="This sample walkthrough shows the same path a private pilot follows. Start with the release question, then inspect why the recommendation changes and what the report can actually support."
          activeStep="recommendation"
          links={{
            scope: '../overview',
            examples: '../setup#import-examples',
            options: '../ranking',
            run: '../measurements',
            recommendation: '../overview',
            report: '../certificate',
            retest: '../drift'
          }}
        />
      ) : null}
      <Explainer title="What this run is deciding" tone="accent" style={{ marginBottom: 16 }}>
        <p>
          {projectName} has {data.run.guards} safety options and {data.run.candidate_stacks} candidate combinations in
          this run. If you test options one at a time, <strong>{data.marginal_stack.label}</strong> looks best.{' '}
          {recommendationChanged
            ? 'The overlap results change that launch decision, so StackCert recommends '
            : 'The uploaded outputs keep that option ahead after the available overlap checks, so StackCert recommends '}
          <strong>{data.recommended_stack.label}</strong> for this app. It ran{' '}
          <strong>{data.stats.pair_cells_measured}/{data.stats.pair_cells_total}</strong> useful overlap tests and
          avoided <strong>{fmtUsd(data.stats.cost_avoided_usd)}</strong> of estimated testing spend.
        </p>
      </Explainer>
      <Explainer title="Method audit trail" tone="neutral" style={{ marginBottom: 16 }}>
        <p>
          {data.run.methodology?.display_name ?? 'CASS'} now means atom-aware, correlation-aware committee search for
          scoped release evidence. This run also records{' '}
          <strong>{data.run.methodology?.evidence_engine?.display_name ?? 'old_cass'}</strong>, the retained K&lt;=2
          serial interval layer used for the current finite-sample audit packet.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          {data.run.methodology?.external_benchmark_priors?.applied
            ? `${data.run.methodology.external_benchmark_priors.count ?? 0} source-backed external prior(s) are labeled in this run.`
            : 'No closed-source or large-scale benchmark prior is applied unless source-backed priors are explicitly provided.'}
        </p>
      </Explainer>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card>
          <div className="stat-label">Release posture</div>
          <div style={{ marginTop: 10 }}>
            <Badge tone={releaseDecision.tone} dot>
              {releaseDecision.label}
            </Badge>
          </div>
          <p className="muted" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>{releaseDecision.body}</p>
        </Card>
        <Card>
          <div className="stat-label">Why not the obvious pick</div>
          <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            {recommendationChanged
              ? `${data.marginal_stack.label} looked best one check at a time, but shared failures changed the launch decision.`
              : `${data.marginal_stack.label} stayed ahead after the available overlap checks, so the recommendation is not relying on marginal scores alone.`}
          </p>
        </Card>
        <Card>
          <div className="stat-label">Confidence</div>
          <div style={{ marginTop: 10 }}>
            <Badge tone={confidence.tone}>{confidence.label}</Badge>
          </div>
          <p className="muted" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>{confidence.body}</p>
        </Card>
        <Card>
          <div className="stat-label">Remaining risk</div>
          <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            Untested prompts, tools, retrieval, policy changes, and traffic shifts remain outside this report until a
            retest updates the evidence.
          </p>
        </Card>
      </div>
      {readiness.data ? <PilotReadinessPanel readiness={readiness.data.readiness} compact /> : null}
      <div className="grid grid-4">
        <Stat label="App fit score" value={fmtNumber(data.stats.welfare)} tone="ok" description="Higher is better: more normal requests pass and fewer unsafe requests slip through." />
        <Stat label="Better than obvious pick" value={fmtNumber(data.stats.regret_avoided)} tone={data.stats.regret_avoided >= 0 ? 'ok' : 'bad'} description="Lift over the combination you would choose from one-at-a-time testing." />
        <Stat label="Options ruled out" value={`${data.stats.certified_comparison_count}/${data.stats.comparison_count}`} tone="ok" description="Head-to-head comparisons where this recommendation is no longer ambiguous." />
        <Stat label="Testing saved" value={fmtUsd(data.stats.cost_avoided_usd)} tone="ok" description="Estimated testing spend saved versus checking every overlap." />
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <Badge tone={data.certificate.status} dot>
                {displayEvidenceStatus(data.certificate.status)}
              </Badge>
              <h2 style={{ margin: '12px 0 4px', fontSize: 24 }}>{data.recommended_stack.label}</h2>
              <p className="muted" style={{ margin: 0 }}>
                Obvious one-at-a-time pick: <span className="mono">{data.marginal_stack.label}</span>
              </p>
            </div>
            <div className="mono" style={{ color: 'var(--sc-ink-3)', fontSize: 12 }}>
              Release goal {lambda}
            </div>
          </div>
          <WelfareMovementChart rows={rows} />
          <p className="muted" style={{ margin: '14px 0 0', lineHeight: 1.5 }}>
            Hollow dots show what each combination looks like from one-at-a-time testing. Filled dots show the score
            after StackCert checks whether the safety options fail on the same examples.
          </p>
        </Card>
        <Card>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Example mix</h2>
          <BenchmarkMix rows={data.benchmark_mix} />
        </Card>
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Card>
          <div className="stat-label">Testing spend</div>
          <div className="stat-value">{fmtUsd(data.stats.measurement_cost_usd)}</div>
          <p className="muted">StackCert runs only tests that can change which combination wins.</p>
        </Card>
        <Card>
          <div className="stat-label">Overlap tests run</div>
          <div className="stat-value">
            {data.stats.pair_cells_measured}/{data.stats.pair_cells_total}
          </div>
          <p className="muted">These tests check whether pairs of safety options fail on the same example groups.</p>
        </Card>
        <Card>
          <div className="stat-label">Exports</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <ExternalButton href={api.certificateMarkdownUrl(activeRunId, lambda)}>Report Markdown</ExternalButton>
            <ExternalButton href={api.certificateJsonUrl(activeRunId, lambda)}>Report JSON</ExternalButton>
            <ExternalButton href={api.rankingCsvUrl(activeRunId, lambda)}>Options CSV</ExternalButton>
          </div>
          <p className="muted">Exports are app-specific release reports, not broad safety guarantees.</p>
        </Card>
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Recommendation stability</h2>
          {runStability.data ? (
            <>
              <div className="stat-value">{fmtNumber(runStability.data.stability_pct)}%</div>
              <p className="muted" style={{ lineHeight: 1.5 }}>
                Heuristic stability check across recommendation confidence, class balance, and underrepresented risk slices.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {runStability.data.guardrails.length ? runStability.data.guardrails.slice(0, 3).map((item) => (
                  <div key={item.code} className="notice">{item.message}</div>
                )) : <Badge tone="ok">no blocking guardrails</Badge>}
              </div>
            </>
          ) : <p className="muted">Loading stability checks...</p>}
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Failure clusters</h2>
          {runFailures.data ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {runFailures.data.clusters.slice(0, 4).map((cluster) => (
                <div key={cluster.id} style={{ borderTop: '1px solid var(--sc-line)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong>{cluster.title}</strong>
                    <Badge tone={cluster.count ? cluster.severity : 'neutral'}>{cluster.count}</Badge>
                  </div>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    {cluster.count ? `${cluster.examples[0]?.risk_category_label ?? 'Examples'} need review.` : 'No examples in this cluster.'}
                  </p>
                </div>
              ))}
            </div>
          ) : <p className="muted">Loading failure clusters...</p>}
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Example drilldown</h2>
          {runExamples.data ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="notice">
                {runExamples.data.summary.failures} failures and {runExamples.data.summary.affected_recommendation} recommendation-affecting examples across {runExamples.data.summary.examples} reviewed examples.
              </div>
              {runExamples.data.examples.slice(0, 3).map((example) => (
                <div key={example.example_id} style={{ borderTop: '1px solid var(--sc-line)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge tone={example.recommendation_failure ? 'warn' : 'ok'}>{example.final_decision}</Badge>
                    <span className="mono muted">{example.example_id}</span>
                  </div>
                  <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.45 }}>{truncate(example.input, 150)}</p>
                </div>
              ))}
            </div>
          ) : <p className="muted">Loading examples...</p>}
        </Card>
      </div>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Activity</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {data.activity.map((item) => (
            <div key={item.message} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Badge tone={item.tone} dot>
                {displayActivityKind(item.kind)}
              </Badge>
              <span className="muted">{displayActivityMessage(item.message)}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="notice" style={{ marginTop: 16 }}>
        Report scope: this app, this example mix, the tested safety options, and release goal weighting {lambda}. Current example coverage is {fmtPercent(data.benchmark_mix.reduce((sum, row) => sum + row.weight, 0), 0)} of the tested mix.
      </div>
    </div>
  );
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function releaseDecisionSummary(status: string, certified: number, total: number) {
  if (status === 'negative') {
    return {
      label: 'block',
      tone: 'bad',
      body: 'The current run does not support shipping this combination. Review blockers and add evidence before release.'
    };
  }
  if (certified < total) {
    return {
      label: 'warn',
      tone: 'warn',
      body: 'The recommendation is useful for review, but some comparisons remain unresolved. Treat the gate as warn-only unless reviewers accept the boundary.'
    };
  }
  return {
    label: 'pass for scoped review',
    tone: 'ok',
    body: 'The tested comparisons support a release review for this exact app scope, assumptions, and release goal.'
  };
}

function confidenceSummary(certified: number, total: number) {
  if (total <= 0 || certified <= 0) {
    return {
      label: 'needs evidence',
      tone: 'warn',
      body: 'Run or upload more safety-check outputs before relying on this recommendation.'
    };
  }
  const fraction = certified / total;
  if (fraction >= 0.9) {
    return {
      label: 'high within scope',
      tone: 'ok',
      body: 'Most decision-relevant comparisons are no longer ambiguous for the current example mix.'
    };
  }
  if (fraction >= 0.5) {
    return {
      label: 'moderate',
      tone: 'warn',
      body: 'The result is reviewable, but targeted tests can still tighten the report boundary.'
    };
  }
  return {
    label: 'low',
    tone: 'bad',
    body: 'The current evidence is thin. Add targeted tests before treating this as a release gate.'
  };
}

function displayActivityKind(kind: string) {
  if (kind === 'certificate') return 'report';
  if (kind === 'planner') return 'test plan';
  return kind;
}

function displayEvidenceStatus(status: string) {
  if (status === 'valid') return 'ready for review';
  if (status === 'certified') return 'ready for review';
  if (status === 'open') return 'needs more test output';
  if (status === 'negative') return 'not recommended';
  return status;
}

function displayProjectDescription(description: string) {
  return description
    .replace('CASS 2,000-example benchmark mixture', '2,000-example sample run')
    .replace('Seeded guardrail-stack certification run over the 2,000-example sample run.', 'Seeded safety-check comparison with 2,000 sample examples.')
    .replace('certification run', 'release-review run')
    .replace('benchmark mixture', 'example mix')
    .replace('CASS', 'StackCert');
}

function displayActivityMessage(message: string) {
  return message
    .replace('CASS evidence generated; old_cass interval layer recorded for audit.', 'Release report generated with CASS method metadata and old_cass audit accounting.')
    .replace('CASS evidence generated from uploaded safety-check outputs; old_cass interval layer recorded for audit.', 'Release report generated from uploaded safety-check outputs with old_cass audit accounting.')
    .replace('Scoped certificate generated from CASS engine.', 'Release report generated from the tested app examples.')
    .replace('Release evidence generated from uploaded safety-check outputs.', 'Release report generated from uploaded safety-check outputs.')
    .replace('measurement actions', 'targeted tests')
    .replace('Certificate will require recertification', 'Release report will require retesting')
    .replace('guard/model/prompt drift', 'safety option, model, or prompt drift');
}
