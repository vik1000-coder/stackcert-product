// StackCert UI — Co-failure screen
// Block-correlation matrix with hover tooltips, side panel for selected pair.

function UCorr() {
  const [side, setSide] = React.useState('adv');
  const [picked, setPicked] = React.useState(null);   // 'A|B'
  const M = side==='adv' ? CORR_ADV : CORR_BEN;

  // Default-pick the worst (most positive) off-diagonal pair on side change.
  React.useEffect(() => {
    const pairs = topPairsC(M).slice(0, 6);
    setPicked(pairs[0] ? pairs[0].a + '|' + pairs[0].b : null);
  }, [side]);

  return (
    <UPage>
      <UPageHead title="Co-failure" sub={side==='adv'
        ? 'Adversarial block correlations between guards. Positive = the same attacks slip past both — stacking buys little.'
        : 'Benign block correlations. Positive = the same harmless prompts are blocked by both — overblock is concentrated, not breadth-wise.'}>
        <UTabBar value={side} onChange={setSide} options={[
          { id: 'adv',    label: 'Adversarial' },
          { id: 'benign', label: 'Benign' },
        ]}/>
      </UPageHead>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead title="Block-correlation matrix"
            sub="8 guards × 8 guards. Color encodes magnitude; sign is shown numerically. Click a cell to inspect."
            right={<UBadge tone={side==='adv'?'bad':'neutral'} dot>{side==='adv'?'higher = worse':'higher = concentrated'}</UBadge>}/>
          <CorrMatrix M={M} side={side} picked={picked} onPick={setPicked}/>
          <CorrLegend side={side}/>
        </UCard>

        <div style={{ display:'flex', flexDirection:'column', gap: 20 }}>
          <UCard>
            <UCardHead title={side==='adv' ? 'Top co-misses' : 'Top benign overlaps'} sub="welfare-relevant pairs"/>
            <div>
              {topPairsC(M).slice(0, 8).map((p, i) => {
                const key = p.a+'|'+p.b;
                const active = picked === key;
                return (
                  <button key={key} onClick={() => setPicked(key)} className="u-row"
                    style={{ width:'100%', display:'flex', alignItems:'center', gap: 10,
                      padding: '10px 18px', borderTop: i?'1px solid '+U.line:'none',
                      background: active ? U.accentSoft+'80' : 'transparent',
                      border:'none', cursor:'pointer', textAlign:'left' }}>
                    <span style={{ color: active?U.accent:U.dim, width: 14, fontSize: 11.5, fontFamily: U.mono, fontVariantNumeric:'tabular-nums' }}>{i+1}</span>
                    <UChip mono active={active}>{p.a}</UChip>
                    <span style={{ color: U.faint }}>×</span>
                    <UChip mono active={active}>{p.b}</UChip>
                    <div style={{ flex:1 }}/>
                    <span style={{ fontFamily: U.mono, fontSize: 12, color: scoreColor(p.r, side), fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>{uFmt(p.r,3)}</span>
                  </button>
                );
              })}
            </div>
          </UCard>

          {picked && <PairDetail pairKey={picked} side={side}/>}
        </div>
      </div>
    </UPage>
  );
}

// ─────────────────────────────────────────────────────────────
// Matrix
// ─────────────────────────────────────────────────────────────
function CorrMatrix({ M, side, picked, onPick }) {
  const [hover, setHover] = React.useState(null);
  const g = GUARDS.map(x => x.id);
  const N = g.length, cell = 56;
  const W = cell*(N+1)+12, H = cell*(N+1)+12;
  const tint = side==='adv' ? [188, 42, 42] : [37, 99, 154];
  const colorOf = (r) => {
    if (r === 1) return U.surface3;
    const t = Math.max(-1, Math.min(1, r));
    if (t >= 0) {
      const a = Math.pow(t, 0.55) * 0.92;
      return `rgba(${tint[0]},${tint[1]},${tint[2]},${a})`;
    } else {
      const a = Math.pow(-t, 0.55) * 0.40;
      return `rgba(31,157,85,${a})`;
    }
  };
  const pickedSet = picked ? new Set(picked.split('|')) : null;
  return (
    <div style={{ padding: 18, position:'relative' }}>
      <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* axis labels */}
        {g.map((id, i) => (
          <text key={'h'+id} x={(i+1)*cell + cell/2} y={cell-14}
            fill={pickedSet?.has(id) ? U.accent : U.ink3}
            fontWeight={pickedSet?.has(id)?500:400}
            fontSize="11.5" fontFamily={U.mono} textAnchor="middle">{id}</text>
        ))}
        {g.map((id, i) => (
          <text key={'v'+id} x={cell-10} y={(i+1)*cell + cell/2 + 4}
            fill={pickedSet?.has(id) ? U.accent : U.ink3}
            fontWeight={pickedSet?.has(id)?500:400}
            fontSize="11.5" fontFamily={U.mono} textAnchor="end">{id}</text>
        ))}
        {/* cells */}
        {g.map((a, i) => g.map((b, j) => {
          const key = a+'|'+b;
          const r = M[key];
          const fill = colorOf(r);
          const x = (j+1)*cell + 2, y = (i+1)*cell + 2, sz = cell-4;
          const lightText = Math.abs(r) > 0.55;
          const isHover = hover === key;
          const isPicked = picked === key || picked === b+'|'+a;
          const lockedDiagonal = a === b;
          return (
            <g key={key}
              onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}
              onClick={() => { if (!lockedDiagonal) onPick(a < b ? a+'|'+b : b+'|'+a); }}
              style={{ cursor: lockedDiagonal ? 'default' : 'pointer' }}>
              <rect x={x} y={y} width={sz} height={sz} fill={fill} rx={5}
                stroke={isPicked ? U.ink : isHover ? U.ink2 : U.line}
                strokeWidth={isPicked ? 2 : isHover ? 1.5 : 1}/>
              {a !== b && (
                <text x={x+sz/2} y={y+sz/2+4}
                  fill={lightText?U.surface:U.ink2}
                  fontSize="11" fontFamily={U.mono} textAnchor="middle"
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.toFixed(2)}
                </text>
              )}
            </g>
          );
        }))}
      </svg>
    </div>
  );
}

function CorrLegend({ side }) {
  const stops = [-1, -0.5, 0, 0.5, 1];
  const tint = side==='adv' ? '188,42,42' : '37,99,154';
  return (
    <div style={{ borderTop:'1px solid '+U.line, padding:'12px 20px', display:'flex', alignItems:'center', gap: 18, fontSize: 12, color: U.ink3 }}>
      <span style={{ color: U.ink2 }}>Block correlation:</span>
      <div style={{ display:'flex', height: 12, flex: 1, maxWidth: 260, borderRadius: 3, overflow:'hidden' }}>
        {Array.from({length:41}, (_,i) => {
          const r = -1 + i*0.05;
          const c = r>=0 ? `rgba(${tint},${Math.pow(r,0.55)*0.92})` : `rgba(31,157,85,${Math.pow(-r,0.55)*0.4})`;
          return <div key={i} style={{ flex: 1, background: c }}/>;
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', flex: 1, maxWidth: 260, fontFamily: U.mono, fontSize: 11 }}>
        {stops.map(s => <span key={s}>{uFmt(s,1)}</span>)}
      </div>
      <span style={{ marginLeft:'auto', fontStyle:'italic', color: U.dim }}>Diagonal locked at 1.0</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pair detail panel
// ─────────────────────────────────────────────────────────────
function PairDetail({ pairKey, side }) {
  const [a, b] = pairKey.split('|');
  const r = (side==='adv' ? CORR_ADV : CORR_BEN)[pairKey] ?? 0;
  const gA = GUARDS.find(g => g.id === a);
  const gB = GUARDS.find(g => g.id === b);

  // Hand-tuned cell-level decomposition for the headline pairs.
  const hotspot = side==='adv' && a==='Lex'    && b==='Rules'  ? 'A/XSTest-unsafe · 95.0% pass-through both'
              : side==='adv' && (pairKey==='L3-3B|Phi3' || pairKey==='Phi3|L3-3B') ? 'A/HarmBench · 41% co-miss'
              : side==='benign' && (pairKey==='Gemma|Phi3' || pairKey==='Phi3|Gemma') ? 'N/XSTest-safe · 48% co-block'
              : 'Distributed across cells';
  const verdict = side==='adv'
    ? (r >= 0.4 ? 'Stacking these guards adds little adversarial coverage. Consider replacing one with a structurally different model family.'
        : r >= 0.15 ? 'Mild adversarial overlap. Combined coverage benefits from a 3rd guard.'
        : r >= -0.05 ? 'Largely independent — good candidate pair under safety priority.'
        : 'Strongly diverse — misses spread out, ideal for K = 2 stacking.')
    : (r >= 0.4 ? 'Overblock concentrates on a single benign cluster. Good for UX, bad for breadth — flag for hold-out check.'
        : r >= 0.15 ? 'Mild benign overlap. Worth examining the affected source.'
        : 'Independent false-block patterns. Standard stacking behaviour.');

  return (
    <UCard>
      <UCardHead title={`${a} × ${b}`} sub={`${gA?.name} × ${gB?.name}`}/>
      <div style={{ padding: 18, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 18 }}>
        <UStat label={`Block correlation (${side})`} value={uFmt(r,3)} accent={scoreColor(r, side)} size="lg"/>
        <UStat label="Status" value={r>=0.4 ? 'Hotspot' : r>=0.15 ? 'Watch' : 'Independent'} accent={r>=0.4 ? U.bad : r>=0.15 ? U.warn : U.ok}/>
      </div>
      <div style={{ padding: '0 18px 16px' }}>
        <div style={{ fontSize: 11.5, color: U.ink3, marginBottom: 6 }}>Worst contributing cell</div>
        <UChip mono>{hotspot}</UChip>
      </div>
      <div style={{ padding: '0 18px 18px' }}>
        <div style={{ fontSize: 11.5, color: U.ink3, marginBottom: 6 }}>Verdict</div>
        <div style={{ fontSize: 13, color: U.ink2, lineHeight: 1.55 }}>{verdict}</div>
      </div>
      <div style={{ borderTop: '1px solid '+U.line, padding: '12px 18px', display:'flex', gap: 8 }}>
        <UBtn ghost small>View in ranking</UBtn>
        <UBtn ghost small>Queue measurement</UBtn>
      </div>
    </UCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Simple tab bar (used by this screen's adv/benign toggle)
// ─────────────────────────────────────────────────────────────
function UTabBar({ value, onChange, options }) {
  return (
    <div style={{ display:'flex', background: U.surface3, padding: 2, borderRadius: 7 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{ background: value===o.id?U.surface:'transparent',
            boxShadow: value===o.id?'0 1px 2px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)':'none',
            color: value===o.id?U.ink:U.ink3,
            border:'none', padding:'5px 12px', fontFamily: U.sans, fontSize: 12.5, fontWeight: 500, cursor:'pointer', borderRadius: 5, transition: 'all .1s' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function topPairsC(M) {
  const g = GUARDS.map(x => x.id);
  const out = [];
  for (let i=0;i<g.length;i++) for (let j=i+1;j<g.length;j++) {
    out.push({ a: g[i], b: g[j], r: M[g[i]+'|'+g[j]] });
  }
  out.sort((a,b) => b.r - a.r);
  return out;
}

function scoreColor(r, side) {
  if (r >= 0.5) return U.bad;
  if (r >= 0.2) return U.warn;
  if (r >= -0.05) return U.ink2;
  return U.ok;
}

Object.assign(window, { UCorr, UTabBar });
