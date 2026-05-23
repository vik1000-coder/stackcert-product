// StackCert UI — Stack Ranking screen
// Sortable table of all candidates + λ-sensitivity curve.

function URanking({ lam }) {
  const [sortKey, setSortKey] = React.useState('full');
  const [sortDir, setSortDir] = React.useState('desc');
  const [filter, setFilter]   = React.useState('all');  // all | certified | open | negative

  const filtered = STACKS.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'certified') return s.certified;
    if (filter === 'negative') return s.full < 0;
    if (filter === 'open') return !s.certified && s.full >= 0;
    return true;
  });

  const sorted = filtered.slice().sort((a,b) => {
    const A = a[sortKey], B = b[sortKey];
    if (typeof A === 'string') return sortDir==='asc' ? A.localeCompare(B) : B.localeCompare(A);
    return sortDir==='asc' ? A-B : B-A;
  });

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  return (
    <UPage>
      <UPageHead title="Stack ranking" sub="All 28 size-2 serial candidates, scored at the active λ. Welfare intervals reflect K = 2 exact decomposition (residual radius 0.000).">
        <UChip mono>λ = {lam}</UChip>
        <UChip mono>ρ = 0.60</UChip>
        <UChip mono>K = 2</UChip>
        <UBtn ghost small icon={<ExportIcon/>}>Export CSV</UBtn>
      </UPageHead>

      {/* filter chips row */}
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: U.ink3, marginRight: 4 }}>Show:</span>
        {[
          ['all',       'All',           STACKS.length],
          ['certified', 'Certified',     STACKS.filter(s=>s.certified).length],
          ['open',      'Open',          STACKS.filter(s=>!s.certified && s.full>=0).length],
          ['negative',  'Neg. welfare', STACKS.filter(s=>s.full<0).length],
        ].map(([k, label, n]) => (
          <FilterChip key={k} active={filter===k} onClick={() => setFilter(k)} count={n}>{label}</FilterChip>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 12, color: U.ink3 }}>Showing {sorted.length} of {STACKS.length}</span>
      </div>

      <UCard>
        <table style={{ width: '100%', borderCollapse:'collapse', fontFamily: U.sans, fontSize: 13 }}>
          <thead>
            <tr>
              <SortableTh label="#"             active={false}/>
              <SortableTh label="Stack"         active={sortKey==='rank'} dir={sortDir} onClick={() => toggleSort('rank')}/>
              <SortableTh label="First-order"   align="right" active={sortKey==='firstOrder'} dir={sortDir} onClick={() => toggleSort('firstOrder')}/>
              <SortableTh label="Full eval"     align="right" active={sortKey==='full'}       dir={sortDir} onClick={() => toggleSort('full')}/>
              <SortableTh label="Δ Marginal→Full" align="right"/>
              <SortableTh label="Interval"      align="center"/>
              <SortableTh label="Status"/>
              <SortableTh label="Note"/>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => <RankRow key={s.stack.join('-')} s={s} idx={i}/>)}
          </tbody>
        </table>
        <div style={{ padding: '12px 18px', borderTop: '1px solid '+U.line, fontSize: 12, color: U.ink3, display:'flex', alignItems:'center', gap: 12, background: U.surface2 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><svg width="10" height="10"><circle cx="5" cy="5" r="3.6" fill={U.surface} stroke={U.ink3} strokeWidth="1.4"/></svg> first-order</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={U.ok}/></svg> full eval</span>
          <div style={{ flex: 1 }}/>
          <span>Interval shows ±radius around the full-eval point estimate.</span>
        </div>
      </UCard>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead title="Regret across λ" sub="Marginal selection vs. CASS certification, swept across the welfare-tradeoff parameter."/>
          <div style={{ padding: 20 }}><RegretChart lam={lam}/></div>
        </UCard>
        <UCard padding={20}>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: U.accent, textTransform:'uppercase', letterSpacing: 0.5 }}>Reading the curve</div>
          <h3 style={{ fontFamily: U.display, fontSize: 16, fontWeight: 600, color: U.ink, margin: '8px 0 10px', letterSpacing: -0.3 }}>
            The penalty appears at λ ≥ 4
          </h3>
          <ul style={{ paddingLeft: 18, margin: 0, color: U.ink2, fontSize: 13.5, lineHeight: 1.65 }}>
            <li><strong style={{ color: U.ink }}>λ ≤ 2:</strong> Marginal and CASS pick the same stack — measurement adds nothing.</li>
            <li><strong style={{ color: U.ink }}>λ ≥ 4:</strong> Ranking flips. Marginal regret stabilises around <UChip mono>0.030</UChip>.</li>
            <li><strong style={{ color: U.ink }}>CASS:</strong> Holds 0 regret across the candidate set under the certified mixture.</li>
          </ul>
          <div style={{ marginTop: 16, padding: 14, background: U.accentSoft, borderRadius: 8, border: '1px solid '+U.accentSoft2 }}>
            <div style={{ fontSize: 12.5, color: U.accent, fontWeight: 500, marginBottom: 4 }}>Recommendation</div>
            <div style={{ fontSize: 13, color: U.ink2, lineHeight: 1.55 }}>
              If your deployment uses λ ≥ 5 — most regulated copilots do — adopt CASS-greedy and re-certify on every drift signal. The cost of the wrong winner is roughly twice the cost of certification itself.
            </div>
          </div>
        </UCard>
      </div>
    </UPage>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, count, children }) {
  return (
    <button onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap: 6, padding:'4px 10px',
        background: active ? U.ink : U.surface, color: active ? U.surface : U.ink2,
        border: '1px solid ' + (active ? U.ink : U.line), borderRadius: 6,
        fontFamily: U.sans, fontSize: 12, fontWeight: 500, cursor:'pointer', transition: 'all .1s' }}>
      {children}
      <span style={{ color: active ? 'rgba(255,255,255,.5)' : U.dim, fontFamily: U.mono, fontSize: 11, fontVariantNumeric:'tabular-nums' }}>{count}</span>
    </button>
  );
}

function SortableTh({ label, align='left', active, dir, onClick }) {
  return (
    <th onClick={onClick} style={{ textAlign: align, padding: '12px 18px',
      fontWeight: 500, fontSize: 11.5, color: active?U.ink:U.ink3, letterSpacing: 0.3,
      textTransform: 'uppercase', borderBottom: '1px solid '+U.line, background: U.surface2,
      cursor: onClick?'pointer':'default', userSelect:'none', whiteSpace:'nowrap' }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}>
        {label}
        {onClick && (
          <span style={{ display:'inline-flex', flexDirection:'column', gap: 1, opacity: active?1:0.35 }}>
            <svg width="7" height="4" viewBox="0 0 7 4" fill={active && dir==='asc' ? U.ink : U.dim}><path d="M3.5 0L0 4h7z"/></svg>
            <svg width="7" height="4" viewBox="0 0 7 4" fill={active && dir==='desc' ? U.ink : U.dim}><path d="M3.5 4L0 0h7z"/></svg>
          </span>
        )}
      </span>
    </th>
  );
}

function RankRow({ s, idx }) {
  const delta = s.full - s.firstOrder;
  const status = s.certified ? 'cert' : s.full < 0 ? 'neg' : 'open';
  return (
    <tr className="u-row" style={{ borderBottom: '1px solid '+U.line, background: s.certified ? U.accentSoft+'80' : 'transparent' }}>
      <td style={{ padding:'14px 18px', color: U.ink3, fontFamily: U.mono, fontSize: 11.5, fontVariantNumeric:'tabular-nums', width: 36 }}>
        {idx+1}
      </td>
      <td style={{ padding:'14px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          {s.certified && <span style={{ color: U.accent, fontSize: 14, lineHeight: 1 }}>★</span>}
          <UChip mono style={{ borderColor: s.certified?U.ok:U.line }}>{s.stack[0]}</UChip>
          <span style={{ color: U.faint }}>+</span>
          <UChip mono style={{ borderColor: s.certified?U.ok:U.line }}>{s.stack[1]}</UChip>
        </div>
      </td>
      <td style={{ padding:'14px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ink3, fontVariantNumeric:'tabular-nums' }}>{uFmt2(s.firstOrder,4)}</td>
      <td style={{ padding:'14px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 13, color: s.certified?U.ok:(s.full<0?U.bad:U.ink), fontVariantNumeric:'tabular-nums', fontWeight: s.certified?500:400 }}>{uFmt(s.full,4)}</td>
      <td style={{ padding:'14px 18px', textAlign:'right' }}>
        <UDelta v={delta}/>
      </td>
      <td style={{ padding:'14px 18px' }}><UInterval full={s.full} cert={s.certified}/></td>
      <td style={{ padding:'14px 18px' }}>
        {status==='cert' && <UBadge tone="ok" dot>Certified</UBadge>}
        {status==='neg'  && <UBadge tone="bad" dot>Negative welfare</UBadge>}
        {status==='open' && <UBadge tone="neutral">Open</UBadge>}
      </td>
      <td style={{ padding:'14px 18px', color: U.ink3, fontSize: 12.5, fontStyle: s.note?'normal':'italic' }}>{s.note || '—'}</td>
    </tr>
  );
}

function UDelta({ v }) {
  if (Math.abs(v) < 0.005) return <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.dim }}>~0</span>;
  const tone = v < -0.02 ? U.bad : v > 0.005 ? U.ok : U.ink3;
  const arrow = v < 0 ? '↓' : '↑';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: 4, fontFamily: U.mono, fontSize: 11.5, color: tone, fontVariantNumeric:'tabular-nums' }}>
      <span>{arrow}</span>{Math.abs(v).toFixed(3)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Regret chart
// ─────────────────────────────────────────────────────────────
function RegretChart({ lam }) {
  const W = 560, H = 220, padL = 40, padR = 20, padT = 16, padB = 38;
  const lamPts = [1,2,3,4,5,6,8,10,12,15,20];
  const marg = [0,0,0.004,0.012,0.025,0.029,0.030,0.032,0.034,0.036,0.038];
  const cass = lamPts.map(()=>0);
  const yMax = 0.045;
  const xOf = i => padL + (i/(lamPts.length-1))*(W-padL-padR);
  const yOf = v => padT + (1-v/yMax)*(H-padT-padB);
  const currentIdx = lamPts.indexOf(lam);
  return (
    <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }}>
      {/* y gridlines */}
      {[0, 0.01, 0.02, 0.03, 0.04].map(v => (
        <g key={v}>
          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={U.line}/>
          <text x={padL-8} y={yOf(v)+3} textAnchor="end" fill={U.ink3} fontSize="10" fontFamily={U.mono}>{v.toFixed(2)}</text>
        </g>
      ))}
      {/* x ticks */}
      {lamPts.map((l,i) => (
        <text key={l} x={xOf(i)} y={H-18} textAnchor="middle" fill={l===lam?U.ink:U.ink3} fontWeight={l===lam?500:400} fontSize="10.5" fontFamily={U.mono}>{l}</text>
      ))}
      <text x={(W-padR+padL)/2} y={H-2} textAnchor="middle" fill={U.ink3} fontFamily={U.sans} fontSize="11">λ — adversarial-miss cost</text>

      {/* current-λ vertical guide */}
      {currentIdx >= 0 && (
        <line x1={xOf(currentIdx)} x2={xOf(currentIdx)} y1={padT} y2={H-padB} stroke={U.accent} strokeWidth="1.2" strokeDasharray="3 3" opacity={0.5}/>
      )}

      {/* curves */}
      <path d={marg.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={U.bad} strokeWidth="2"/>
      <path d={cass.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={U.ok} strokeWidth="2"/>

      {marg.map((v,i) => v>0.001 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2.5" fill={U.bad}/>)}

      {/* curve labels */}
      <g transform={`translate(${xOf(9)+10}, ${yOf(marg[9])-2})`}>
        <rect x={-2} y={-12} width={62} height={16} fill={U.surface} stroke={U.bad} rx={3}/>
        <text x={30} y={0} textAnchor="middle" fontFamily={U.sans} fontSize="11" fontWeight="500" fill={U.bad}>Marginal</text>
      </g>
      <g transform={`translate(${xOf(2)+10}, ${yOf(0)+14})`}>
        <rect x={-2} y={-12} width={42} height={16} fill={U.surface} stroke={U.ok} rx={3}/>
        <text x={20} y={0} textAnchor="middle" fontFamily={U.sans} fontSize="11" fontWeight="500" fill={U.ok}>CASS</text>
      </g>

      {currentIdx >= 0 && (
        <g transform={`translate(${xOf(currentIdx)+8}, ${padT+12})`}>
          <rect x={0} y={0} width={90} height={20} rx={4} fill={U.accent}/>
          <text x={8} y={14} fill="#fff" fontSize="11" fontFamily={U.mono}>λ = {lam} (active)</text>
        </g>
      )}
    </svg>
  );
}

function ExportIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 7.5V1.5m-2 2.5L6 1.5l2 2.5M2 8.5v1a1 1 0 001 1h6a1 1 0 001-1v-1"/></svg>;
}

Object.assign(window, { URanking });
