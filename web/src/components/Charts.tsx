import type { CorrelationsPayload, RankingRow } from '../lib/api';
import { fmtNumber, fmtPercent } from '../lib/format';

export function WelfareMovementChart({ rows }: { rows: RankingRow[] }) {
  const top = rows.slice(0, 8);
  const values = top.flatMap((row) => [row.first_order_welfare, row.full_welfare]);
  const min = Math.min(-0.08, ...values);
  const max = Math.max(0.18, ...values);
  const xOf = (value: number) => ((value - min) / (max - min)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--sc-ink-3)', fontSize: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 6, border: '1.5px solid var(--sc-ink-3)', background: 'var(--sc-surface)' }} />
          first-order estimate
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 6, background: 'var(--sc-ink-2)' }} />
          CASS after co-failure
        </span>
      </div>
      {top.map((row) => {
        const color = row.status === 'certified' ? 'var(--sc-ok)' : row.full_welfare < 0 ? 'var(--sc-bad)' : 'var(--sc-ink-2)';
        const start = Math.min(xOf(row.first_order_welfare), xOf(row.full_welfare));
        const width = Math.abs(xOf(row.full_welfare) - xOf(row.first_order_welfare));
        return (
          <div key={row.architecture_id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 72px', gap: 12, alignItems: 'center' }}>
            <div className="mono" style={{ fontSize: 12, color: row.status === 'certified' ? 'var(--sc-ink)' : 'var(--sc-ink-3)' }}>
              {row.status === 'certified' ? '* ' : ''}
              {row.label}
            </div>
            <div style={{ position: 'relative', height: 18 }}>
              <div style={{ position: 'absolute', left: `${xOf(0)}%`, top: 2, bottom: 2, width: 1, background: 'var(--sc-line-2)' }} />
              <div style={{ position: 'absolute', left: `${start}%`, top: 8, height: 2, width: `${Math.max(1, width)}%`, background: color, opacity: 0.35 }} />
              <div style={{ position: 'absolute', left: `${xOf(row.first_order_welfare)}%`, top: 4, width: 10, height: 10, borderRadius: 6, marginLeft: -5, border: '1.5px solid var(--sc-ink-3)', background: 'var(--sc-surface)' }} />
              <div style={{ position: 'absolute', left: `${xOf(row.full_welfare)}%`, top: 3, width: 12, height: 12, borderRadius: 7, marginLeft: -6, background: color }} />
            </div>
            <div className="mono right" style={{ fontSize: 12, color }}>
              {fmtNumber(row.full_welfare)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BenchmarkMix({ rows }: { rows: Array<{ cell_id: string; side: string; weight: number; examples: number }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map((row) => (
        <div key={row.cell_id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--sc-ink-3)', marginBottom: 4 }}>
            <span className="mono">{row.cell_id}</span>
            <span>
              {fmtPercent(row.weight)} · {row.examples} examples
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--sc-surface-3)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(2, row.weight * 100)}%`,
                height: '100%',
                borderRadius: 4,
                background: row.side === 'adversarial' ? 'var(--sc-bad)' : 'var(--sc-ok)',
                opacity: 0.75
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CorrelationMatrix({ payload, onSelect }: { payload: CorrelationsPayload; onSelect: (row: number, column: number) => void }) {
  const size = 42;
  const labels = payload.guards;
  const colorFor = (value: number) => {
    if (value >= 0) return `rgba(188, 42, 42, ${Math.min(0.9, Math.pow(Math.abs(value), 0.55) * 0.9)})`;
    return `rgba(31, 157, 85, ${Math.min(0.55, Math.pow(Math.abs(value), 0.55) * 0.55)})`;
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={size * (labels.length + 1)} height={size * (labels.length + 1)} role="img" aria-label="Guard correlation matrix">
        {labels.map((guard, i) => (
          <text key={`h-${guard.id}`} x={(i + 1) * size + size / 2} y={size - 10} fill="var(--sc-ink-3)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            {guard.label}
          </text>
        ))}
        {labels.map((guard, i) => (
          <text key={`v-${guard.id}`} x={size - 8} y={(i + 1) * size + size / 2 + 4} fill="var(--sc-ink-3)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
            {guard.label}
          </text>
        ))}
        {payload.matrix.map((row, i) =>
          row.map((value, j) => (
            <g key={`${i}-${j}`} onClick={() => onSelect(i, j)} style={{ cursor: i === j ? 'default' : 'pointer' }}>
              <rect
                x={(j + 1) * size + 1}
                y={(i + 1) * size + 1}
                width={size - 2}
                height={size - 2}
                fill={i === j ? 'var(--sc-surface-3)' : colorFor(value)}
                stroke="var(--sc-line)"
                rx={4}
              />
              {i !== j ? (
                <text x={(j + 1) * size + size / 2} y={(i + 1) * size + size / 2 + 4} fill="var(--sc-ink)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
                  {value.toFixed(2)}
                </text>
              ) : null}
            </g>
          ))
        )}
      </svg>
    </div>
  );
}
