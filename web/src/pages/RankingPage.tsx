import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type RankingRow } from '../lib/api';
import { fmtNumber, fmtUsd } from '../lib/format';
import { Badge, Card, ErrorState, Explainer, ExternalButton, LoadingState, PageHeader } from '../components/Primitives';

type SortKey = 'full_welfare' | 'first_order_welfare' | 'movement' | 'estimated_latency_ms' | 'estimated_cost_usd_per_1k';

export function RankingPage({ lambda }: { lambda: number }) {
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<SortKey>('full_welfare');
  const query = useQuery({ queryKey: ['ranking', lambda], queryFn: () => api.ranking(lambda) });
  const rows = useMemo(() => {
    const source = query.data?.rows ?? [];
    return source
      .filter((row) => status === 'all' || row.status === status)
      .slice()
      .sort((a, b) => Number(b[sort]) - Number(a[sort]));
  }, [query.data?.rows, sort, status]);

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;

  return (
    <div className="page">
      <PageHeader
        title="Stack ranking"
        subtitle="Compare first-order marginal welfare against CASS full welfare, including intervals, movement, latency, and cost."
        actions={<ExternalButton href={api.rankingCsvUrl(lambda)}>Export CSV</ExternalButton>}
      />
      <Explainer title="How to read this table" tone="accent" style={{ marginBottom: 16 }}>
        <p>
          This is the flip test. <strong>1st-order</strong> is the shortcut many teams use: rank stacks from individual
          guard pass and miss rates. <strong>Full</strong> is CASS after shared failures and false blocks are included.
          Movement shows how much the shortcut was wrong.
        </p>
      </Explainer>
      <Card style={{ marginBottom: 14 }}>
        <div className="definition-list">
          <div className="definition-row">
            <div className="definition-term">1st-order</div>
            <div className="definition-copy">The estimate you would get before measuring whether guards fail together.</div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Full</div>
            <div className="definition-copy">The CASS welfare score after correlated misses, false blocks, cost, and latency are included.</div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Interval</div>
            <div className="definition-copy">The uncertainty range used to decide whether the certificate can call a winner.</div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Movement</div>
            <div className="definition-copy">How far the stack moved when composition evidence replaced the shortcut estimate.</div>
          </div>
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'certified', 'open', 'negative'].map((item) => (
          <button key={item} className={`btn ${status === item ? 'accent' : ''}`} onClick={() => setStatus(item)}>
            {item}
          </button>
        ))}
        <select className="btn" value={sort} onChange={(event) => setSort(event.currentTarget.value as SortKey)}>
          <option value="full_welfare">Sort by full welfare</option>
          <option value="first_order_welfare">Sort by first-order welfare</option>
          <option value="movement">Sort by movement</option>
          <option value="estimated_latency_ms">Sort by latency</option>
          <option value="estimated_cost_usd_per_1k">Sort by cost</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Stack</th>
              <th>Status</th>
              <th className="right">1st-order</th>
              <th className="right">Full</th>
              <th className="right">Interval</th>
              <th className="right">Movement</th>
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
                    {row.status}
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
