import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fmtNumber, fmtPercent, fmtUsd } from '../lib/format';
import { Badge, ButtonLink, Card, ErrorState, ExternalButton, LoadingState, PageHeader, Stat } from '../components/Primitives';
import { BenchmarkMix, WelfareMovementChart } from '../components/Charts';

export function OverviewPage({ lambda }: { lambda: number }) {
  const overview = useQuery({ queryKey: ['overview', lambda], queryFn: () => api.overview(lambda) });
  const ranking = useQuery({ queryKey: ['ranking', lambda], queryFn: () => api.ranking(lambda) });

  if (overview.isLoading || ranking.isLoading) return <LoadingState />;
  if (overview.error || ranking.error) return <ErrorState error={overview.error || ranking.error} />;

  const data = overview.data!;
  const rows = ranking.data!.rows;

  return (
    <div className="page">
      <PageHeader
        title={`${data.recommended_stack.label} is the current certified recommendation`}
        subtitle="StackCert compares marginal scores with full correlated-failure evaluation, then issues a scoped certificate over the actual candidate set and benchmark mixture."
        actions={
          <>
            <ButtonLink to="../certificate" variant="primary">
              Open certificate
            </ButtonLink>
            <ButtonLink to="../co-failure">Inspect co-failure</ButtonLink>
          </>
        }
      />
      <div className="grid grid-4">
        <Stat label="Full welfare" value={fmtNumber(data.stats.welfare)} tone="ok" />
        <Stat label="Regret avoided" value={fmtNumber(data.stats.regret_avoided)} tone={data.stats.regret_avoided >= 0 ? 'ok' : 'bad'} />
        <Stat label="Comparisons" value={`${data.stats.certified_comparison_count}/${data.stats.comparison_count}`} tone="ok" />
        <Stat label="Cost avoided" value={fmtUsd(data.stats.cost_avoided_usd)} tone="ok" />
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <Badge tone={data.certificate.status} dot>
                {data.certificate.status}
              </Badge>
              <h2 style={{ margin: '12px 0 4px', fontSize: 24 }}>{data.recommended_stack.label}</h2>
              <p className="muted" style={{ margin: 0 }}>
                Naive marginal winner: <span className="mono">{data.marginal_stack.label}</span>
              </p>
            </div>
            <div className="mono" style={{ color: 'var(--sc-ink-3)', fontSize: 12 }}>
              λ={lambda}
            </div>
          </div>
          <WelfareMovementChart rows={rows} />
        </Card>
        <Card>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Benchmark mixture</h2>
          <BenchmarkMix rows={data.benchmark_mix} />
        </Card>
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Card>
          <div className="stat-label">Measurement cost</div>
          <div className="stat-value">{fmtUsd(data.stats.measurement_cost_usd)}</div>
          <p className="muted">CASS bundle-greedy measures only the evidence that can change the certificate.</p>
        </Card>
        <Card>
          <div className="stat-label">Pair-cell coverage</div>
          <div className="stat-value">
            {data.stats.pair_cells_measured}/{data.stats.pair_cells_total}
          </div>
          <p className="muted">Measured pair-cells drive the final comparison intervals.</p>
        </Card>
        <Card>
          <div className="stat-label">Exports</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <ExternalButton href={api.certificateMarkdownUrl(lambda)}>Markdown</ExternalButton>
            <ExternalButton href={api.certificateJsonUrl(lambda)}>JSON</ExternalButton>
            <ExternalButton href={api.rankingCsvUrl(lambda)}>Ranking CSV</ExternalButton>
          </div>
          <p className="muted">Exports are scoped evidence, not broad safety guarantees.</p>
        </Card>
      </div>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Activity</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {data.activity.map((item) => (
            <div key={item.message} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Badge tone={item.tone} dot>
                {item.kind}
              </Badge>
              <span className="muted">{item.message}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="notice" style={{ marginTop: 16 }}>
        Certificate scope: {data.certificate.scope} Current benchmark coverage is {fmtPercent(data.benchmark_mix.reduce((sum, row) => sum + row.weight, 0), 0)} of the certified mixture.
      </div>
    </div>
  );
}
