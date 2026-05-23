import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CorrelationMatrix } from '../components/Charts';
import { Badge, Card, ErrorState, LoadingState, PageHeader } from '../components/Primitives';
import { api } from '../lib/api';
import { fmtNumber, fmtPercent } from '../lib/format';

export function CorrelationsPage({ lambda }: { lambda: number }) {
  const [side, setSide] = useState<'adversarial' | 'benign'>('adversarial');
  const [selected, setSelected] = useState<{ row: number; column: number } | null>(null);
  const query = useQuery({ queryKey: ['correlations', lambda, side], queryFn: () => api.correlations(lambda, side) });
  const selectedPair = useMemo(() => {
    if (!query.data || !selected) return query.data?.top_rows[0];
    const a = query.data.guards[selected.row]?.id;
    const b = query.data.guards[selected.column]?.id;
    if (!a || !b || a === b) return query.data.top_rows[0];
    return query.data.details.find((row) => row.guard_ids.includes(a) && row.guard_ids.includes(b)) ?? query.data.top_rows[0];
  }, [query.data, selected]);

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const data = query.data!;

  return (
    <div className="page">
      <PageHeader
        title="Co-failure map"
        subtitle="Inspect whether guards fail together on adversarial behaviors or over-block together on benign behaviors."
        actions={
          <>
            <button className={`btn ${side === 'adversarial' ? 'accent' : ''}`} onClick={() => setSide('adversarial')}>
              Adversarial
            </button>
            <button className={`btn ${side === 'benign' ? 'accent' : ''}`} onClick={() => setSide('benign')}>
              Benign
            </button>
          </>
        }
      />
      <div className="grid grid-2">
        <Card>
          <CorrelationMatrix payload={data} onSelect={(row, column) => setSelected({ row, column })} />
        </Card>
        <Card>
          <Badge tone={side === 'adversarial' ? 'bad' : 'ok'} dot>
            {side === 'adversarial' ? 'Co-miss focus' : 'False-block overlap'}
          </Badge>
          <h2 style={{ margin: '14px 0 8px', fontSize: 22 }}>{selectedPair?.label ?? 'Select a pair'}</h2>
          {selectedPair ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <Metric label="Cell" value={selectedPair.cell_id} />
              <Metric label="Correlation" value={fmtNumber(selectedPair.correlation)} />
              <Metric label={selectedPair.metric_label} value={fmtPercent(selectedPair.metric)} />
              <Metric label="Disagreement" value={fmtPercent(selectedPair.disagreement_rate)} />
              <Metric label="Examples" value={String(selectedPair.n_examples)} />
            </div>
          ) : null}
          <p className="muted" style={{ lineHeight: 1.55 }}>
            Positive adversarial correlation means the pair misses the same unsafe cases. Positive benign correlation
            can be useful when false blocks are concentrated instead of spread across users.
          </p>
        </Card>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Cell</th>
              <th className="right">Correlation</th>
              <th className="right">Metric</th>
              <th className="right">Disagreement</th>
              <th className="right">N</th>
            </tr>
          </thead>
          <tbody>
            {data.top_rows.map((row) => (
              <tr key={`${row.label}-${row.cell_id}`}>
                <td className="mono">{row.label}</td>
                <td className="mono">{row.cell_id}</td>
                <td className="mono right">{fmtNumber(row.correlation)}</td>
                <td className="mono right">{fmtPercent(row.metric)}</td>
                <td className="mono right">{fmtPercent(row.disagreement_rate)}</td>
                <td className="mono right">{row.n_examples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--sc-line)', paddingBottom: 8 }}>
      <span className="muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

