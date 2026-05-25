import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CorrelationMatrix } from '../components/Charts';
import { Badge, Card, ErrorState, Explainer, LoadingState, PageHeader } from '../components/Primitives';
import { api } from '../lib/api';
import { NoRunState, useStackCertApp } from '../lib/appContext';
import { fmtNumber, fmtPercent } from '../lib/format';

export function CorrelationsPage({ lambda }: { lambda: number }) {
  const { activeRunId, runsLoading } = useStackCertApp();
  const [side, setSide] = useState<'adversarial' | 'benign'>('adversarial');
  const [selected, setSelected] = useState<{ row: number; column: number } | null>(null);
  const query = useQuery({ queryKey: ['correlations', activeRunId, lambda, side], queryFn: () => api.correlations(activeRunId!, lambda, side), enabled: Boolean(activeRunId) });
  const selectedPair = useMemo(() => {
    if (!query.data || !selected) return query.data?.top_rows[0];
    const a = query.data.guards[selected.row]?.id;
    const b = query.data.guards[selected.column]?.id;
    if (!a || !b || a === b) return query.data.top_rows[0];
    return query.data.details.find((row) => row.guard_ids.includes(a) && row.guard_ids.includes(b)) ?? query.data.top_rows[0];
  }, [query.data, selected]);

  if (runsLoading && !activeRunId) return <LoadingState />;
  if (!activeRunId) return <NoRunState title="No overlap analysis yet" />;
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const data = query.data!;

  return (
    <div className="page">
      <PageHeader
        title="Overlap analysis"
        subtitle="See when two safety options miss the same risky examples or block the same normal examples."
        actions={
          <>
            <button className={`btn ${side === 'adversarial' ? 'accent' : ''}`} onClick={() => setSide('adversarial')}>
              Unsafe examples
            </button>
            <button className={`btn ${side === 'benign' ? 'accent' : ''}`} onClick={() => setSide('benign')}>
              Normal examples
            </button>
          </>
        }
      />
      <Explainer title={side === 'adversarial' ? 'Shared unsafe misses' : 'Shared false blocks'} tone={side === 'adversarial' ? 'warn' : 'ok'} style={{ marginBottom: 16 }}>
        <p>
          {side === 'adversarial'
            ? 'A high red cell means two checks are missing the same unsafe examples. Combining them may buy less safety than their one-at-a-time scores imply.'
            : 'A high benign cell means two checks are blocking the same safe examples. That can be useful when false blocks are concentrated, but harmful if it suppresses normal users.'}
        </p>
      </Explainer>
      <div className="grid grid-2">
        <Card>
          <CorrelationMatrix payload={data} onSelect={(row, column) => setSelected({ row, column })} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, color: 'var(--sc-ink-3)', fontSize: 12 }}>
            <span>Red cells: shared mistakes</span>
            <span>Green cells: useful disagreement</span>
            <span>Diagonal: same option</span>
          </div>
        </Card>
        <Card>
          <Badge tone={side === 'adversarial' ? 'bad' : 'ok'} dot>
            {side === 'adversarial' ? 'Shared miss focus' : 'False-block focus'}
          </Badge>
          <h2 style={{ margin: '14px 0 8px', fontSize: 22 }}>{selectedPair?.label ?? 'Select a pair'}</h2>
          {selectedPair ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <Metric label="Cell" value={selectedPair.cell_id} />
              <Metric label="Overlap score" value={fmtNumber(selectedPair.correlation)} />
              <Metric label={displayMetricLabel(selectedPair.metric_label)} value={fmtPercent(selectedPair.metric)} />
              <Metric label="Disagreement" value={fmtPercent(selectedPair.disagreement_rate)} />
              <Metric label="Examples" value={String(selectedPair.n_examples)} />
              <div className={`notice ${side === 'adversarial' ? 'bad' : ''}`}>
                {selectedPair.metric >= 0.5
                  ? 'These two checks often make the same decision on this example group, so the combination may be redundant.'
                  : 'These two checks disagree more often on this example group, which can make the combination less redundant.'}
              </div>
            </div>
          ) : null}
          <p className="muted" style={{ lineHeight: 1.55 }}>
            Positive overlap on unsafe examples means the pair misses the same risky cases. Positive overlap on normal
            examples means the pair blocks the same safe cases.
          </p>
        </Card>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Option pair</th>
              <th>Example group</th>
              <th className="right">Overlap score</th>
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

function displayMetricLabel(label: string) {
  return label.replace('co-miss', 'shared miss').replace('false-block', 'false block');
}
