import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fmtNumber, fmtPercent, fmtUsd } from '../lib/format';
import { Badge, ButtonLink, Card, ErrorState, Explainer, ExternalButton, LoadingState, PageHeader, Stat } from '../components/Primitives';
import { PilotReadinessPanel } from '../components/PilotReadinessPanel';
import { BenchmarkMix, WelfareMovementChart } from '../components/Charts';
import { useStackCertApp } from '../lib/appContext';

export function OverviewPage({ lambda }: { lambda: number }) {
  const { projectId, activeRunId } = useStackCertApp();
  const readiness = useQuery({ queryKey: ['pilot-readiness', projectId, lambda], queryFn: () => api.pilotReadiness(projectId, lambda) });
  const overview = useQuery({ queryKey: ['overview', activeRunId, lambda], queryFn: () => api.overview(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const ranking = useQuery({ queryKey: ['ranking', activeRunId, lambda], queryFn: () => api.ranking(activeRunId!, lambda), enabled: Boolean(activeRunId) });

  if (!activeRunId) {
    return (
      <div className="page">
        {readiness.data ? <PilotReadinessPanel readiness={readiness.data.readiness} /> : null}
        <Card>
          <h1 style={{ marginTop: 0, fontSize: 26 }}>No recommendation yet</h1>
          <p className="muted" style={{ lineHeight: 1.55 }}>
            Follow the pilot path in app setup. Once examples and safety-check outputs are in place, StackCert will
            rank combinations, estimate remaining tests, and prepare release evidence for this app.
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
  const appDescription = data.project.description || 'Compare tested safety options against your uploaded examples and release goals.';
  const recommendationChanged = data.recommended_stack.architecture_id !== data.marginal_stack.architecture_id;
  const subtitle = appDescription.toLowerCase().startsWith(projectName.toLowerCase())
    ? appDescription
    : `${projectName}: ${appDescription}`;

  return (
    <div className="page">
      <PageHeader
        title={`Recommended safety combination: ${data.recommended_stack.label}`}
        subtitle={subtitle}
        actions={
          <>
            <ButtonLink to="../certificate" variant="primary">
              Open release evidence
            </ButtonLink>
            <ButtonLink to="../co-failure">Inspect overlap</ButtonLink>
          </>
        }
      />
      <Explainer title="What this run is deciding" tone="accent" style={{ marginBottom: 16 }}>
        <p>
          {projectName} has {data.run.guards} safety options and {data.run.candidate_stacks} candidate combinations in
          this run. If you test options one at a time, <strong>{data.marginal_stack.label}</strong> looks best.{' '}
          {recommendationChanged
            ? 'The overlap evidence changes that launch decision, so StackCert recommends '
            : 'The uploaded outputs keep that option ahead after available overlap evidence, so StackCert recommends '}
          <strong>{data.recommended_stack.label}</strong> for this app. It ran{' '}
          <strong>{data.stats.pair_cells_measured}/{data.stats.pair_cells_total}</strong> useful overlap tests and
          avoided <strong>{fmtUsd(data.stats.cost_avoided_usd)}</strong> of estimated testing spend.
        </p>
      </Explainer>
      {readiness.data ? <PilotReadinessPanel readiness={readiness.data.readiness} compact /> : null}
      <div className="grid grid-4">
        <Stat label="Goal score" value={fmtNumber(data.stats.welfare)} tone="ok" description="Higher is better: more normal requests pass and fewer unsafe requests slip through." />
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
              Risk weight {lambda}
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
            <ExternalButton href={api.certificateMarkdownUrl(activeRunId, lambda)}>Evidence Markdown</ExternalButton>
            <ExternalButton href={api.certificateJsonUrl(activeRunId, lambda)}>Evidence JSON</ExternalButton>
            <ExternalButton href={api.rankingCsvUrl(activeRunId, lambda)}>Options CSV</ExternalButton>
          </div>
          <p className="muted">Exports are app-specific evidence, not broad safety guarantees.</p>
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
        Evidence scope: this app, this example mix, the tested safety options, and risk weight {lambda}. Current example coverage is {fmtPercent(data.benchmark_mix.reduce((sum, row) => sum + row.weight, 0), 0)} of the tested mix.
      </div>
    </div>
  );
}

function displayActivityKind(kind: string) {
  if (kind === 'certificate') return 'evidence';
  if (kind === 'planner') return 'test plan';
  return kind;
}

function displayEvidenceStatus(status: string) {
  if (status === 'valid') return 'ready for review';
  if (status === 'certified') return 'ready for review';
  if (status === 'open') return 'needs more evidence';
  if (status === 'negative') return 'not recommended';
  return status;
}

function displayActivityMessage(message: string) {
  return message
    .replace('Scoped certificate generated from CASS engine.', 'Release evidence generated from the tested app examples.')
    .replace('measurement actions', 'targeted tests')
    .replace('Certificate will require recertification', 'Release evidence will require retesting')
    .replace('guard/model/prompt drift', 'safety option, model, or prompt drift');
}
