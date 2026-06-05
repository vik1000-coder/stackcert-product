import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type RankingRow } from '../lib/api';
import { fmtNumber, fmtUsd } from '../lib/format';
import { Badge, Card, ErrorState, Explainer, ExternalButton, LoadingState, PageHeader } from '../components/Primitives';
import { NoRunState, useStackCertApp } from '../lib/appContext';

type SortKey = 'full_welfare' | 'first_order_welfare' | 'movement' | 'estimated_latency_ms' | 'estimated_cost_usd_per_1k';

export function RankingPage({ lambda }: { lambda: number }) {
  const { activeRunId, projectName, runsLoading } = useStackCertApp();
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<SortKey>('full_welfare');
  const query = useQuery({ queryKey: ['ranking', activeRunId, lambda], queryFn: () => api.ranking(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const rows = useMemo(() => {
    const source = query.data?.rows ?? [];
    return source
      .filter((row) => status === 'all' || row.status === status)
      .slice()
      .sort((a, b) => Number(b[sort]) - Number(a[sort]));
  }, [query.data?.rows, sort, status]);

  if (runsLoading && !activeRunId) return <LoadingState />;
  if (!activeRunId) return <NoRunState title="No options to compare yet" />;
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;

  return (
    <div className="page">
      <PageHeader
        title="Options compared"
        subtitle={`Compare the safety-check combinations ${projectName} could ship, including the one-at-a-time shortcut, final app score, confidence range, latency, and cost.`}
        actions={<ExternalButton href={api.rankingCsvUrl(activeRunId, lambda)}>Export options CSV</ExternalButton>}
      />
      <Explainer title="How to read this table" tone="accent" style={{ marginBottom: 16 }}>
        <p>
          This table answers: <strong>which combination should this app ship?</strong> The shortcut is to score each
          safety option on its own and combine those scores. StackCert also checks whether options fail together, which
          is why the obvious pick can move down. CASS is the atom-aware, correlation-aware search layer; old_cass remains
          the auditable K&lt;=2 interval evidence layer for this current report.
        </p>
      </Explainer>
      <Card style={{ marginBottom: 14 }}>
        <div className="definition-list">
          <div className="definition-row">
            <div className="definition-term">Alone</div>
            <div className="definition-copy">The score you would expect from testing safety options one at a time.</div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Together</div>
            <div className="definition-copy">The app score after shared unsafe misses, shared false blocks, cost, and latency are included.</div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Confidence</div>
            <div className="definition-copy">The range StackCert uses to decide whether a recommendation is clear enough for a release report.</div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Change</div>
            <div className="definition-copy">How much the combination moved when overlap testing replaced the shortcut estimate.</div>
          </div>
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['all', 'all'],
          ['certified', 'recommended'],
          ['open', 'close'],
          ['negative', 'poor fit']
        ].map(([value, label]) => (
          <button key={value} className={`btn ${status === value ? 'accent' : ''}`} onClick={() => setStatus(value)}>
            {label}
          </button>
        ))}
        <select className="btn" value={sort} onChange={(event) => setSort(event.currentTarget.value as SortKey)}>
          <option value="full_welfare">Sort by together score</option>
          <option value="first_order_welfare">Sort by alone score</option>
          <option value="movement">Sort by change</option>
          <option value="estimated_latency_ms">Sort by latency</option>
          <option value="estimated_cost_usd_per_1k">Sort by cost</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Combination</th>
              <th>Result</th>
              <th className="right">Alone</th>
              <th className="right">Together</th>
              <th className="right">Confidence</th>
              <th className="right">Change</th>
              <th className="right">Latency</th>
              <th className="right">Cost / 1k</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: RankingRow) => (
              <tr key={row.architecture_id}>
                <td className="mono">{row.label}</td>
                <td>
                  <Badge tone={row.status} dot={row.status === 'certified'}>
                    {displayStatus(row.status)}
                  </Badge>
                </td>
                <td className="mono right">{fmtNumber(row.first_order_welfare)}</td>
                <td className="mono right">{fmtNumber(row.full_welfare)}</td>
                <td className="mono right">
                  [{fmtNumber(row.welfare_low)}, {fmtNumber(row.welfare_high)}]
                </td>
                <td className="mono right" style={{ color: row.movement >= 0 ? 'var(--sc-ok)' : 'var(--sc-bad)' }}>
                  {fmtNumber(row.movement)}
                </td>
                <td className="mono right">{row.estimated_latency_ms}ms</td>
                <td className="mono right">{fmtUsd(row.estimated_cost_usd_per_1k, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function displayStatus(status: string) {
  if (status === 'certified') return 'recommended';
  if (status === 'open') return 'close';
  if (status === 'negative') return 'poor fit';
  return status;
}
