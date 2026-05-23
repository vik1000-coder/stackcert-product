// StackCert UI — Measurement Planner screen
// Pair-cell evaluation planner with checkbox table + budget summary + alternative schedulers.

function UPlanner() {
  const [sel, setSel] = React.useState(new Set(['m-001','m-002']));
  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSel(s => s.size === MEASUREMENTS.length ? new Set() : new Set(MEASUREMENTS.map(m => m.id)));

  const selArr    = MEASUREMENTS.filter(m => sel.has(m.id));
  const totalRad  = selArr.reduce((a,m)=>a+m.radiusΔ,0);
  const totalCost = selArr.reduce((a,m)=>a+m.cost,0);
  const totalTime = selArr.length * 1.4;

  const startingRadius = 0.026;
  const projectedRadius = Math.max(0, startingRadius - totalRad);
  const blockedComparisons = 2;
  const willClose = selArr.filter(m => m.blockedBy && m.blockedBy.length).length;

  return (
    <UPage>
      <UPageHead title="Measurements"
        sub="Pair-cell evaluations queued by CASS bundle-greedy, ranked by expected radius reduction per dollar. Tick the ones to include in the next run.">
        <UBtn ghost small icon={<RefreshIcon/>}>Re-rank</UBtn>
        <UBtn ink onClick={()=>{}} disabled={selArr.length===0}>
          Queue {selArr.length} {selArr.length === 1 ? 'measurement' : 'measurements'} →
        </UBtn>
      </UPageHead>

      <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead
            title="Recommended measurements"
            sub={`${MEASUREMENTS.length} queued · ${sel.size} selected`}
            right={
              <button onClick={toggleAll} style={{ background:'transparent', border:'none', cursor:'pointer', color: U.accent, fontSize: 12, fontWeight: 500, padding: '4px 6px', borderRadius: 5 }}>
                {sel.size === MEASUREMENTS.length ? 'Clear all' : 'Select all'}
              </button>
            }/>
          <table style={{ width: '100%', borderCollapse:'collapse', fontFamily: U.sans, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle({ width: 36 })}>{}</th>
                <th style={thStyle()}>Pair</th>
                <th style={thStyle()}>Cell</th>
                <th style={thStyle()}>Reason</th>
                <th style={thStyle({ align:'right' })}>Δ-radius</th>
                <th style={thStyle({ align:'right' })}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {MEASUREMENTS.map((m, i) => {
                const isSel = sel.has(m.id);
                return (
                  <tr key={m.id} onClick={() => toggle(m.id)} className={'u-row '+(isSel?'u-selected':'')}
                    style={{ borderBottom: i<MEASUREMENTS.length-1?'1px solid '+U.line:'none', cursor:'pointer' }}>
                    <td style={{ padding:'13px 18px' }}>
                      <CheckBox checked={isSel}/>
                    </td>
                    <td style={{ padding:'13px 18px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                        <UChip mono>{m.pair[0]}</UChip>
                        <span style={{ color: U.faint }}>×</span>
                        <UChip mono>{m.pair[1]}</UChip>
                      </div>
                    </td>
                    <td style={{ padding:'13px 18px', fontFamily: U.mono, fontSize: 11.5, color: U.ink2 }}>{m.cell}</td>
                    <td style={{ padding:'13px 18px', color: U.ink3, fontSize: 12.5 }}>
                      {m.reason}
                      {m.blockedBy && m.blockedBy.length > 0 && (
                        <div style={{ fontSize: 11, color: U.warn, marginTop: 3, display:'flex', alignItems:'center', gap: 4 }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="5" cy="5" r="3.5"/><path d="M5 3v2.5M5 7v.5"/></svg>
                          unblocks vs. {m.blockedBy.join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ok, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>−{m.radiusΔ.toFixed(4)}</td>
                    <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ink2, fontVariantNumeric:'tabular-nums' }}>{uCurr(m.cost)}</td>
                  </tr>
                );
              })}
              {/* totals row */}
              <tr style={{ background: U.surface2, borderTop: '2px solid '+U.line }}>
                <td colSpan={4} style={{ padding:'12px 18px', fontSize: 12.5, color: U.ink2, fontWeight: 500 }}>
                  Selected total ({sel.size} {sel.size===1?'measurement':'measurements'})
                </td>
                <td style={{ padding:'12px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 13, color: totalRad>0?U.ok:U.ink3, fontVariantNumeric:'tabular-nums', fontWeight: 600 }}>
                  {totalRad > 0 ? '−' : ''}{totalRad.toFixed(4)}
                </td>
                <td style={{ padding:'12px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 13, color: U.ink, fontVariantNumeric:'tabular-nums', fontWeight: 600 }}>
                  {uCurr(totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>

        <div style={{ display:'flex', flexDirection:'column', gap: 20 }}>
          {/* impact card */}
          <UCard>
            <UCardHead title="Run summary" sub="If you queue the selected set"/>
            <div style={{ padding: 20, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 18 }}>
              <UStat label="Selected" value={sel.size+' / '+MEASUREMENTS.length}/>
              <UStat label="Δ-radius" value={'−'+totalRad.toFixed(4)} accent={U.ok}/>
              <UStat label="Est. cost" value={uCurr(totalCost)}/>
              <UStat label="Wall time" value={totalTime.toFixed(1)+' h'}/>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ fontSize: 11.5, color: U.ink3, marginBottom: 8 }}>Welfare gap radius</div>
              <RadiusBar start={startingRadius} end={projectedRadius}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily: U.mono, fontSize: 11.5, color: U.ink3, marginTop: 6, fontVariantNumeric:'tabular-nums' }}>
                <span>now {startingRadius.toFixed(4)}</span>
                <span style={{ color: U.ok }}>after {projectedRadius.toFixed(4)}</span>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop:'1px solid '+U.line, background: U.surface2, fontSize: 12.5, color: U.ink2, lineHeight: 1.55, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
              Closes {willClose} of {blockedComparisons} unresolved comparisons and refreshes the certificate in <strong style={{color:U.ink}}>~{totalTime.toFixed(0)} hours</strong>.
            </div>
          </UCard>

          {/* budget */}
          <UCard padding={18}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: U.ink }}>Measurement budget</div>
                <div style={{ fontSize: 12, color: U.ink3, marginTop: 2 }}>this run, vs. K=2 exhaustive</div>
              </div>
              <span style={{ fontFamily: U.mono, fontSize: 18, color: U.ink, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>
                0.26 <span style={{ color: U.ink3, fontSize: 13 }}>/ 0.50</span>
              </span>
            </div>
            <div style={{ position:'relative', height: 8, background: U.surface3, borderRadius: 4, marginTop: 14, overflow:'hidden' }}>
              <div style={{ position:'absolute', inset: 0, width: '52%', background: U.accent, borderRadius: 4 }}/>
              <div style={{ position:'absolute', top: 0, bottom: 0, left: '52%', width: '6%', background: U.accentSoft2, opacity: 0.8 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color: U.ink3, marginTop: 6 }}>
              <span>0 cells</span>
              <span>84 cells used + 10 queued</span>
              <span>168 cells (full K=2)</span>
            </div>
          </UCard>

          {/* alternatives */}
          <UCard>
            <UCardHead title="Alternative schedulers" sub="how other strategies would spend the budget"/>
            <div>
              {[
                { name:'CASS bundle-greedy', cells: 13, recommended: true },
                { name:'Uncertainty-greedy', cells: 67 },
                { name:'Uniform-by-cell',    cells: 84 },
                { name:'MIP width-cover',    cells: 22 },
                { name:'Random',             cells: 41 },
              ].map((a, i) => (
                <div key={a.name} style={{ display:'flex', alignItems:'center', padding:'10px 18px', borderTop: i?'1px solid '+U.line:'none', fontSize: 13, background: a.recommended?U.accentSoft+'66':'transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 7 }}>
                    {a.recommended && <span style={{ width:6, height:6, borderRadius:3, background: U.accent, flexShrink:0 }}/>}
                    <span style={{ color: a.recommended?U.ink:U.ink2, fontWeight: a.recommended?500:400 }}>{a.name}</span>
                  </div>
                  <div style={{ flex: 1, margin: '0 14px', height: 4, background: U.surface3, borderRadius: 2, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset: 0, width: (a.cells/84*100)+'%', background: a.recommended?U.accent:U.line3, borderRadius: 2 }}/>
                  </div>
                  <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.ink3, fontVariantNumeric:'tabular-nums', width: 56, textAlign:'right' }}>{a.cells} cells</span>
                </div>
              ))}
            </div>
          </UCard>
        </div>
      </div>
    </UPage>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function thStyle({ align='left', width } = {}) {
  return {
    textAlign: align,
    padding: '12px 18px',
    fontWeight: 500,
    fontSize: 11.5,
    color: U.ink3,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    borderBottom: '1px solid '+U.line,
    background: U.surface2,
    ...(width && { width }),
  };
}

function CheckBox({ checked }) {
  return (
    <span style={{ display:'inline-flex', width: 16, height: 16, borderRadius: 4, border:'1.5px solid '+(checked?U.accent:U.line2), background: checked?U.accent:U.surface, alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
      {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={U.surface} strokeWidth="2" strokeLinecap="round"><path d="M2 5l2 2 4-4.5"/></svg>}
    </span>
  );
}

function RadiusBar({ start, end }) {
  const max = 0.04;
  const startPct = Math.min(100, start/max*100);
  const endPct   = Math.min(100, end/max*100);
  return (
    <div style={{ position:'relative', height: 16, background: U.surface3, borderRadius: 8 }}>
      <div style={{ position:'absolute', inset: 0, width: startPct+'%', background: U.line3, borderRadius: 8, opacity: 0.5 }}/>
      <div style={{ position:'absolute', inset: 0, width: endPct+'%', background: U.ok, borderRadius: 8 }}/>
      {/* tick line at end */}
      <div style={{ position:'absolute', left: endPct+'%', top: -3, bottom: -3, width: 2, background: U.ok, borderRadius: 1 }}/>
    </div>
  );
}

function RefreshIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4A4 4 0 102 6m0-4v4h4M2 8a4 4 0 008-2"/></svg>;
}

Object.assign(window, { UPlanner });
