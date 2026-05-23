// Direction B — "Ledger"
// Light, editorial, paper-like. Looks like an audit document that's been
// turned into software. Big serif type, restrained color, mostly typographic.

const L = {
  paper:   '#f6f3ec',
  paper2:  '#ede9df',
  card:    '#fdfcf8',
  ink:     '#1f1d18',
  ink2:    '#46423b',
  ink3:    '#6e6a60',
  dim:     '#9a9588',
  hair:    '#d8d2c2',
  hair2:   '#bdb6a3',
  accent:  '#7a2426',   // oxblood
  accent2: '#3a4d3a',   // forest
  warn:    '#a3631a',
  ok:      '#3a5d3a',
  bad:     '#8a2e2e',
  serif:   '"Source Serif Pro","Source Serif 4","Iowan Old Style",Georgia,serif',
  sans:    '"Inter","Helvetica Neue",system-ui,sans-serif',
  mono:    '"IBM Plex Mono","JetBrains Mono",ui-monospace,Menlo,monospace',
};

const lFmt = (n,d=3) => (n>=0?'+':'') + n.toFixed(d);
const lFmt2 = (n,d=3) => n.toFixed(d);

function LedgerApp() {
  const [route, setRoute] = React.useState('overview');
  const [persona, setPersona] = React.useState('grc');
  const [lam, setLam] = React.useState(5);
  const tabs = [
    { id: 'overview',  label: 'Findings' },
    { id: 'ranking',   label: 'Stack ranking' },
    { id: 'corr',      label: 'Co-failure' },
    { id: 'planner',   label: 'Measurements' },
    { id: 'cert',      label: 'Certificate' },
    { id: 'drift',     label: 'Re-certification' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: L.paper, color: L.ink, fontFamily: L.sans, fontSize: 13, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <LMast persona={persona} setPersona={setPersona} lam={lam} setLam={setLam}/>
      <LTabs tabs={tabs} route={route} setRoute={setRoute}/>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {route === 'overview' && <LOverview lam={lam} go={setRoute}/>}
        {route === 'ranking'  && <LRanking lam={lam}/>}
        {route === 'corr'     && <LCorr/>}
        {route === 'planner'  && <LPlanner/>}
        {route === 'cert'     && <LCertificate lam={lam}/>}
        {route === 'drift'    && <LDrift/>}
      </div>
    </div>
  );
}

function LMast({ persona, setPersona, lam, setLam }) {
  const personas = [
    { id: 'platform', label: 'Platform' },
    { id: 'security', label: 'Security' },
    { id: 'grc',      label: 'Model Risk' },
  ];
  return (
    <div style={{ padding: '14px 28px 10px', borderBottom: '1px solid '+L.hair, background: L.paper, display:'flex', alignItems:'flex-end', gap: 20 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <LWordmark/>
          <span style={{ color: L.dim, fontSize: 11.5 }}>·</span>
          <span style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 13.5 }}>Evidence layer for AI guardrail stacks</span>
        </div>
        <div style={{ fontFamily: L.serif, fontSize: 23, fontWeight: 500, color: L.ink, marginTop: 8, letterSpacing: -0.2 }}>
          Acme Copilot · Q2 2026 evaluation
        </div>
        <div style={{ display:'flex', gap: 22, fontSize: 12, color: L.ink3, marginTop: 6 }}>
          <span>Run <span style={{color:L.ink}}>cert-2026-0524-001a</span></span>
          <span>Issued <span style={{color:L.ink}}>24 May 2026</span></span>
          <span>n = <span style={{color:L.ink}}>2,000</span></span>
          <span>K = <span style={{color:L.ink}}>2</span></span>
          <span>ρ = <span style={{color:L.ink}}>0.60</span></span>
        </div>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap: 8 }}>
        <div style={{ display:'flex', gap: 0, border: '1px solid '+L.hair2, borderRadius: 1 }}>
          {personas.map(p => (
            <button key={p.id} onClick={()=>setPersona(p.id)}
              style={{ background: persona===p.id ? L.ink : 'transparent', color: persona===p.id ? L.paper : L.ink2,
                border:'none', padding:'5px 12px', fontFamily: L.sans, fontSize: 11.5, cursor:'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 10, fontSize: 12 }}>
          <span style={{ color: L.ink3 }}>Welfare tradeoff λ</span>
          <input type="range" min="1" max="20" step="1" value={lam} onChange={e=>setLam(parseInt(e.target.value))}
            style={{ width: 110, accentColor: L.accent }}/>
          <span style={{ width: 48, fontFamily: L.mono, fontSize: 12, color: L.ink, textAlign:'right' }}>{lam.toFixed(1)}</span>
          <span style={{ color: L.dim, fontStyle:'italic', fontFamily: L.serif, fontSize: 13 }}>{LAMBDA_PRESETS[lam]?.name || 'custom'}</span>
        </div>
      </div>
    </div>
  );
}

function LWordmark() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <rect x="0.5" y="0.5" width="21" height="21" fill="none" stroke={L.accent} strokeWidth="1.3"/>
        <line x1="5" y1="11" x2="9.5" y2="15.5" stroke={L.accent} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="9.5" y1="15.5" x2="17" y2="7" stroke={L.accent} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <span style={{ fontFamily: L.serif, fontSize: 18, fontWeight: 600, letterSpacing: -0.2, color: L.ink }}>StackCert</span>
    </div>
  );
}

function LTabs({ tabs, route, setRoute }) {
  return (
    <div style={{ padding: '0 28px', borderBottom: '1px solid '+L.hair, background: L.paper, display:'flex', gap: 4 }}>
      {tabs.map((t,i) => (
        <button key={t.id} onClick={()=>setRoute(t.id)}
          style={{ background:'transparent', border:'none', padding:'10px 14px', fontFamily: L.sans, fontSize: 12.5,
            color: route===t.id?L.ink:L.ink3, cursor:'pointer', position:'relative',
            borderBottom: '2px solid '+(route===t.id?L.accent:'transparent'),
            marginBottom: -1 }}>
          <span style={{ color: L.dim, fontFamily: L.mono, fontSize: 10.5, marginRight: 6 }}>§{i+1}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable
// ─────────────────────────────────────────────────────────────
function LSection({ kicker, title, sub, children, style }) {
  return (
    <section style={{ marginBottom: 32, ...style }}>
      {kicker && <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 1, color: L.accent, textTransform:'uppercase', marginBottom: 6 }}>{kicker}</div>}
      {title && <h2 style={{ fontFamily: L.serif, fontSize: 22, fontWeight: 500, color: L.ink, margin: 0, letterSpacing: -0.2 }}>{title}</h2>}
      {sub && <p style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, marginTop: 4, marginBottom: 0, fontSize: 14 }}>{sub}</p>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function LCard({ children, style }) {
  return <div style={{ background: L.card, border: '1px solid '+L.hair, padding: 20, ...style }}>{children}</div>;
}

function LStat({ label, value, accent, big }) {
  return (
    <div>
      <div style={{ fontFamily: L.sans, color: L.ink3, fontSize: 11, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontFamily: L.serif, color: accent || L.ink, fontSize: big?28:18, marginTop: 2, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Overview / Findings
// ─────────────────────────────────────────────────────────────
function LOverview({ lam, go }) {
  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 1180, margin: '0 auto' }}>
      <LSection kicker="Headline finding" title="Marginal selection chooses the wrong stack at λ = 5"
        sub="The serial guardrail stack that ranks first on marginal scores ranks second on full evaluation. CASS-greedy certifies the correct winner using a fraction of the pair-cell budget.">
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1fr', gap: 0, border:'1px solid '+L.hair, background: L.card }}>
          <FindingTile
            kicker="Marginal pick"
            stack={['L3-3B','LG3']}
            welfare="0.1110"
            tone="warn"
            note="Wrong winner. Negative correlation surplus hidden by product-of-means."
          />
          <FindingTile
            kicker="CASS-certified"
            stack={['LG3','Phi3']}
            welfare="0.1363"
            tone="ok"
            note="Welfare gap [+0.0094, +0.0412]. Certified vs. every competitor."
            star
          />
          <div style={{ padding: 22, display:'flex', flexDirection:'column', justifyContent:'center', gap: 16, borderLeft:'1px solid '+L.hair, background: L.paper2 }}>
            <LStat label="Regret avoided" value="+0.0253" big accent={L.ok}/>
            <LStat label="Pair-cells used" value="13 of 168" accent={L.ok}/>
            <LStat label="Measurement budget" value="0.26 of 0.50"/>
            <button onClick={() => go('cert')} style={{ marginTop: 4, background: L.ink, color: L.paper, border: 'none', padding: '10px 14px', fontFamily: L.sans, fontSize: 12.5, cursor:'pointer', letterSpacing: 0.2 }}>
              Read certificate →
            </button>
          </div>
        </div>
      </LSection>

      <LSection kicker="Why this matters" title="A reading of the welfare gap">
        <div style={{ columnCount: 2, columnGap: 32, fontFamily: L.serif, fontSize: 15, lineHeight: 1.55, color: L.ink2 }}>
          <p style={{ marginTop: 0 }}>
            At λ = 5, an adversarial miss is five times more costly than a benign false block.
            Marginal welfare ranks <em>L3-3B + LG3</em> first because each guard, evaluated independently,
            looks strong on adversarial cells. The catch is that the two guards <em>miss the same attacks</em>:
            their block decisions are positively correlated on the adversarial side, so stacking them serially
            adds little redundancy where it counts.
          </p>
          <p>
            CASS measures the joint distribution at thirteen carefully chosen pair-cells and finds the
            correlation penalty. <em>LG3 + Phi3</em>, which looked marginally weaker, comes from different model
            families and misses different attacks. Its full-evaluation welfare is 23% higher than the
            marginal pick, and the gap is large enough to certify under the customer's measurement budget.
          </p>
        </div>
      </LSection>

      <LSection kicker="Evidence at a glance" title="What is in the certificate">
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 24 }}>
          <LCard style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px 6px', borderBottom: '1px solid '+L.hair, display:'flex', alignItems:'baseline', gap: 8 }}>
              <span style={{ fontFamily: L.serif, fontSize: 14, color: L.ink }}>Welfare by stack</span>
              <span style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 12.5 }}>first-order ⇢ full-evaluation</span>
            </div>
            <LWelfareChart/>
          </LCard>
          <LCard>
            <div style={{ fontFamily: L.serif, fontSize: 14, color: L.ink, marginBottom: 12 }}>What the certificate states</div>
            <ul style={{ paddingLeft: 18, margin: 0, fontFamily: L.serif, fontSize: 14, lineHeight: 1.6, color: L.ink2 }}>
              <li>LG3 + Phi3 is the certified winner under the stated assumptions.</li>
              <li>Twenty-seven competitor comparisons resolved; zero unresolved.</li>
              <li>Conditional on the 6-cell benchmark mixture and λ = 5.</li>
              <li>Re-certify on guard-version, prompt, traffic-mixture, or new attack-family change.</li>
              <li>K = 2 — exact decomposition, residual radius 0.000.</li>
            </ul>
            <hr style={{ border: 0, borderTop: '1px solid '+L.hair, margin: '14px 0' }}/>
            <div style={{ fontFamily: L.serif, fontStyle:'italic', fontSize: 13.5, color: L.ink3, lineHeight: 1.55 }}>
              “Certified on the specified benchmark mixture under the stated candidate set, welfare profile, measurement intervals, and version metadata.”
            </div>
          </LCard>
        </div>
      </LSection>

      <LSection kicker="Method comparison" title="Cost of certification">
        <table style={{ width: '100%', borderCollapse:'collapse', fontFamily: L.sans, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid '+L.hair2 }}>
              <th style={{ textAlign:'left', padding:'10px 12px', fontWeight: 500, color: L.ink3 }}>Method</th>
              <th style={{ textAlign:'left', padding:'10px 12px', fontWeight: 500, color: L.ink3 }}>Selected stack</th>
              <th style={{ textAlign:'right', padding:'10px 12px', fontWeight: 500, color: L.ink3 }}>Cert. rate</th>
              <th style={{ textAlign:'right', padding:'10px 12px', fontWeight: 500, color: L.ink3 }}>Regret</th>
              <th style={{ textAlign:'right', padding:'10px 12px', fontWeight: 500, color: L.ink3 }}>Agent-cells</th>
              <th style={{ textAlign:'right', padding:'10px 12px', fontWeight: 500, color: L.ink3 }}>Pair-cells</th>
              <th style={{ width: 140, padding: '10px 12px', fontWeight: 500, color: L.ink3, textAlign:'left' }}>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {METHODS.map((m, i) => (
              <tr key={m.method} style={{ borderBottom: i<METHODS.length-1 ? '1px solid '+L.hair : 'none', background: m.recommended ? L.paper2 : 'transparent' }}>
                <td style={{ padding:'10px 12px', color: m.recommended ? L.ink : L.ink2, fontFamily: L.serif, fontSize: 14 }}>
                  {m.recommended && <span style={{ color: L.accent, marginRight: 6 }}>★</span>}{m.method}
                </td>
                <td style={{ padding:'10px 12px', color: L.ink2, fontFamily: L.mono, fontSize: 12 }}>{m.pick}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color: m.certRate>0?L.ok:L.ink3, fontFamily: L.mono, fontSize: 12 }}>{m.certRate.toFixed(2)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color: m.regret>0.001?L.bad:L.ok, fontFamily: L.mono, fontSize: 12 }}>{m.regret.toFixed(4)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color: L.ink2, fontFamily: L.mono, fontSize: 12 }}>{m.agentCells}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color: L.ink2, fontFamily: L.mono, fontSize: 12 }}>{m.pairCells}</td>
                <td style={{ padding:'10px 12px' }}>
                  <CoverageBar pct={m.pairCells/168}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 14, fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 13.5 }}>
          Of 168 possible pair-cells, CASS-greedy uses 13 — an 92% reduction — and is the only method to certify the winner in this run.
        </p>
      </LSection>
    </div>
  );
}

function FindingTile({ kicker, stack, welfare, tone, note, star }) {
  const toneColor = tone === 'ok' ? L.ok : tone === 'warn' ? L.warn : L.ink2;
  return (
    <div style={{ padding: 22, position:'relative' }}>
      <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.6, color: toneColor, textTransform:'uppercase' }}>{star && '★ '}{kicker}</div>
      <div style={{ fontFamily: L.serif, fontSize: 30, color: L.ink, marginTop: 6, letterSpacing: -0.4, fontWeight: 500 }}>{stack[0]} <span style={{ color: L.dim }}>+</span> {stack[1]}</div>
      <div style={{ fontFamily: L.mono, color: L.ink2, fontSize: 13, marginTop: 8 }}>welfare {welfare}</div>
      <div style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

function CoverageBar({ pct }) {
  return (
    <div style={{ position:'relative', height: 6, background: L.paper2, border: '1px solid '+L.hair }}>
      <div style={{ position:'absolute', inset:0, width: (pct*100)+'%', background: L.ink2 }}/>
    </div>
  );
}

function LWelfareChart() {
  const data = STACKS.slice().sort((a,b) => b.full - a.full);
  const max = Math.max(...data.map(d => Math.max(d.firstOrder, d.full)));
  const min = Math.min(0, ...data.map(d => Math.min(d.firstOrder, d.full)));
  const range = max - min;
  const W = 580, padL = 130, padR = 14, padT = 12, padB = 24, rowH = 26;
  const H = padT + padB + data.length * rowH;
  const innerW = W - padL - padR;
  const xZero = padL + ((-min)/range) * innerW;
  return (
    <div style={{ padding: 12 }}>
      <svg width={W} height={H}>
        {[-0.05, 0, 0.05, 0.10, 0.15, 0.20].filter(v=>v>=min&&v<=max).map(v => {
          const x = padL + ((v-min)/range)*innerW;
          return <g key={v}>
            <line x1={x} x2={x} y1={padT} y2={H-padB} stroke={v===0?L.ink3:L.hair} strokeWidth={v===0?1:0.6} strokeDasharray={v===0?'':'2 3'}/>
            <text x={x} y={H-8} fill={L.ink3} fontSize="10.5" fontFamily={L.mono} textAnchor="middle">{lFmt(v,2)}</text>
          </g>;
        })}
        {data.map((d, i) => {
          const y = padT + i*rowH;
          const x1 = padL + ((d.firstOrder-min)/range)*innerW;
          const x2 = padL + ((d.full-min)/range)*innerW;
          const cert = d.certified;
          const fullColor = cert ? L.ok : (d.full < 0 ? L.bad : L.ink2);
          return (
            <g key={i} transform={`translate(0, ${y})`}>
              <text x={padL-10} y={rowH/2+4} fill={cert?L.accent:L.ink2} fontSize="12" fontFamily={cert?L.serif:L.sans} textAnchor="end">{cert?'★ ':''}{d.stack.join(' + ')}</text>
              {/* connector */}
              <line x1={x1} x2={x2} y1={rowH/2} y2={rowH/2} stroke={fullColor} strokeWidth="1.2" opacity="0.5"/>
              {/* first-order tick */}
              <circle cx={x1} cy={rowH/2} r="3" fill="none" stroke={L.ink3} strokeWidth="1.2"/>
              {/* full-eval tick */}
              <circle cx={x2} cy={rowH/2} r="4" fill={fullColor}/>
              {/* annotate movement */}
              {d.full < d.firstOrder - 0.01 && (
                <text x={Math.max(x1,x2)+8} y={rowH/2+4} fill={L.ink3} fontSize="10" fontFamily={L.mono}>{lFmt(d.full-d.firstOrder,3)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display:'flex', gap: 18, marginTop: 4, paddingLeft: 12, fontFamily: L.serif, fontSize: 12.5, color: L.ink3 }}>
        <span><span style={{ display:'inline-block', width: 8, height: 8, borderRadius: 4, border:'1.4px solid '+L.ink3, verticalAlign:'middle', marginRight: 6 }}/>First-order</span>
        <span><span style={{ display:'inline-block', width: 8, height: 8, borderRadius: 4, background: L.ok, verticalAlign:'middle', marginRight: 6 }}/>Full evaluation</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Stack Ranking
// ─────────────────────────────────────────────────────────────
function LRanking({ lam }) {
  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 1180, margin: '0 auto' }}>
      <LSection kicker="§2  Stack ranking" title="Size-2 serial candidates"
        sub={`Twenty-eight size-2 ensembles considered; eight surfaced. Welfare is reported at λ = ${lam.toFixed(1)} with K = 2 (residual radius 0.000).`}>
        <LCard style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse:'collapse', fontFamily: L.sans, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.4px solid '+L.hair2 }}>
                <th style={{ textAlign:'left',  padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>Rank</th>
                <th style={{ textAlign:'left',  padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>Stack</th>
                <th style={{ textAlign:'right', padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>First-order</th>
                <th style={{ textAlign:'right', padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>Full</th>
                <th style={{ textAlign:'center',padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>Interval</th>
                <th style={{ textAlign:'left',  padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>Note</th>
                <th style={{ textAlign:'right', padding:'12px 16px', fontWeight: 500, color: L.ink3, fontSize: 11.5, letterSpacing: 0.5, textTransform:'uppercase' }}>Cert.</th>
              </tr>
            </thead>
            <tbody>
              {STACKS.slice().sort((a,b)=>b.full-a.full).map((s,i) => (
                <tr key={i} style={{ borderBottom: '1px solid '+L.hair }}>
                  <td style={{ padding:'14px 16px', color: L.ink3, fontFamily: L.mono, fontSize: 12, fontVariantNumeric:'tabular-nums' }}>{i+1}</td>
                  <td style={{ padding:'14px 16px', fontFamily: L.serif, fontSize: 15, color: s.certified?L.ink:L.ink2 }}>
                    {s.certified && <span style={{ color: L.accent, marginRight: 6 }}>★</span>}
                    {s.stack[0]} <span style={{ color: L.dim }}>+</span> {s.stack[1]}
                  </td>
                  <td style={{ padding:'14px 16px', textAlign:'right', fontFamily: L.mono, fontSize: 12.5, fontVariantNumeric:'tabular-nums', color: L.ink3 }}>{lFmt2(s.firstOrder,4)}</td>
                  <td style={{ padding:'14px 16px', textAlign:'right', fontFamily: L.mono, fontSize: 12.5, fontVariantNumeric:'tabular-nums', color: s.certified?L.ok:(s.full<0?L.bad:L.ink) }}>{lFmt(s.full,4)}</td>
                  <td style={{ padding:'14px 16px', textAlign:'center' }}><LInterval full={s.full} cert={s.certified}/></td>
                  <td style={{ padding:'14px 16px', color: L.ink3, fontFamily: L.serif, fontStyle:'italic', fontSize: 13 }}>{s.note || '—'}</td>
                  <td style={{ padding:'14px 16px', textAlign:'right' }}>
                    {s.certified ? <span style={{ color: L.ok, fontFamily: L.mono, fontSize: 11.5, letterSpacing: 0.5 }}>CERTIFIED</span> : <span style={{ color: L.dim }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LCard>
      </LSection>

      <LSection kicker="Sensitivity" title="Regret across welfare tradeoffs"
        sub="As the cost of an adversarial miss increases, marginal selection diverges from the certified winner.">
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 24 }}>
          <LCard style={{ padding: 16 }}><LRegretChart/></LCard>
          <LCard>
            <div style={{ fontFamily: L.serif, fontSize: 14, color: L.ink, marginBottom: 12 }}>Reading the curve</div>
            <ul style={{ paddingLeft: 18, margin: 0, fontFamily: L.serif, fontSize: 14, lineHeight: 1.6, color: L.ink2 }}>
              <li>At λ ≤ 2, marginal and CASS picks agree — no measurement needed.</li>
              <li>At λ ≥ 4, the ranking flips. Marginal regret stabilises near 0.03.</li>
              <li>CASS regret remains at 0 across the range under the certified candidate set.</li>
            </ul>
            <hr style={{ border:0, borderTop:'1px solid '+L.hair, margin: '14px 0' }}/>
            <p style={{ fontFamily: L.serif, fontStyle:'italic', fontSize: 13.5, color: L.ink3, margin: 0, lineHeight: 1.55 }}>
              A regulated deployment that adopts λ ≥ 5 without correlation-aware selection will pay measurable welfare. The certificate quantifies what that cost is.
            </p>
          </LCard>
        </div>
      </LSection>
    </div>
  );
}

function LInterval({ full, cert }) {
  const min = -0.15, max = 0.20, W = 140, H = 14, r = 0.018;
  const x0 = ((0-min)/(max-min))*W;
  const x = ((full-min)/(max-min))*W;
  const rad = (r/(max-min))*W;
  const color = cert ? L.ok : full<0 ? L.bad : L.ink2;
  return (
    <svg width={W} height={H}>
      <line x1={0} x2={W} y1={H/2} y2={H/2} stroke={L.hair}/>
      <line x1={x0} x2={x0} y1={1} y2={H-1} stroke={L.ink3} strokeWidth="0.7"/>
      <line x1={x-rad} x2={x+rad} y1={H/2} y2={H/2} stroke={color} strokeWidth="1.6"/>
      <circle cx={x} cy={H/2} r="3" fill={color}/>
    </svg>
  );
}

function LRegretChart() {
  const W = 480, H = 220, padL = 38, padR = 10, padT = 14, padB = 34;
  const lamPts = [1,2,3,4,5,6,8,10,12,15,20];
  const marg = [0,0,0.004,0.012,0.025,0.029,0.030,0.032,0.034,0.036,0.038];
  const cass = lamPts.map(()=>0);
  const yMax = 0.045;
  const xOf = i => padL + (i/(lamPts.length-1))*(W-padL-padR);
  const yOf = v => padT + (1-v/yMax)*(H-padT-padB);
  return (
    <svg width={W} height={H} style={{ display:'block' }}>
      {[0,0.01,0.02,0.03,0.04].map(v => (
        <g key={v}>
          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={L.hair}/>
          <text x={padL-6} y={yOf(v)+3} textAnchor="end" fill={L.ink3} fontSize="10" fontFamily={L.mono}>{v.toFixed(2)}</text>
        </g>
      ))}
      {lamPts.map((l,i)=> <text key={l} x={xOf(i)} y={H-15} textAnchor="middle" fill={L.ink3} fontSize="10" fontFamily={L.mono}>{l}</text>)}
      <text x={W/2} y={H-2} textAnchor="middle" fill={L.ink3} fontFamily={L.serif} fontStyle="italic" fontSize="11.5">λ (cost of an adversarial miss)</text>
      <path d={marg.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={L.bad} strokeWidth="1.6"/>
      <path d={cass.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={L.ok} strokeWidth="1.6"/>
      {marg.map((v,i) => v>0.001 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2.5" fill={L.bad}/>)}
      <text x={xOf(9)} y={yOf(marg[9])-7} textAnchor="middle" fontFamily={L.serif} fontStyle="italic" fontSize="11.5" fill={L.bad}>marginal</text>
      <text x={xOf(2)} y={yOf(0)+13} textAnchor="middle" fontFamily={L.serif} fontStyle="italic" fontSize="11.5" fill={L.ok}>CASS</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Co-failure
// ─────────────────────────────────────────────────────────────
function LCorr() {
  const [side, setSide] = React.useState('adv');
  const M = side==='adv' ? CORR_ADV : CORR_BEN;
  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 1180, margin: '0 auto' }}>
      <LSection kicker="§3  Co-failure diagnostics" title={side==='adv' ? 'Adversarial co-misses — where redundancy fails' : 'Benign co-blocks — where overblock concentrates'}
        sub={side==='adv'
          ? 'A positive block-correlation on adversarial cells means two guards miss the same attacks. Stacking them serially is worth less than the marginal scores suggest.'
          : 'A positive block-correlation on benign cells is helpful — the same users are blocked twice rather than twice as many users being blocked once.'}>

        <div style={{ display:'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={()=>setSide('adv')} style={{ background: side==='adv' ? L.accent : 'transparent', color: side==='adv'?L.paper:L.ink2, border:'1px solid '+(side==='adv'?L.accent:L.hair2), padding:'7px 14px', fontFamily: L.sans, fontSize: 12, cursor:'pointer' }}>Adversarial</button>
          <button onClick={()=>setSide('benign')} style={{ background: side==='benign' ? L.accent2 : 'transparent', color: side==='benign'?L.paper:L.ink2, border:'1px solid '+(side==='benign'?L.accent2:L.hair2), padding:'7px 14px', fontFamily: L.sans, fontSize: 12, cursor:'pointer' }}>Benign</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 24 }}>
          <LCard style={{ padding: 0 }}>
            <LMatrix M={M} side={side}/>
          </LCard>
          <div>
            <LCard>
              <div style={{ fontFamily: L.serif, fontSize: 14, color: L.ink, marginBottom: 6 }}>Top {side==='adv' ? 'co-misses' : 'overlapping blocks'}</div>
              <div style={{ marginTop: 12 }}>
                {topPairsL(M).map((p,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', padding: '8px 0', borderBottom: i<5?'1px dashed '+L.hair:'none' }}>
                    <span style={{ width: 16, color: L.dim, fontFamily: L.mono, fontSize: 11 }}>{i+1}</span>
                    <span style={{ fontFamily: L.serif, fontSize: 14, color: L.ink2, flex: 1 }}>{p.a} × {p.b}</span>
                    <span style={{ fontFamily: L.mono, fontSize: 12.5, color: side==='adv' ? L.accent : L.accent2, fontVariantNumeric:'tabular-nums' }}>{lFmt(p.r, 3)}</span>
                  </div>
                ))}
              </div>
            </LCard>

            <LCard style={{ marginTop: 16 }}>
              <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.6, color: L.accent, textTransform:'uppercase' }}>Annotation</div>
              <p style={{ fontFamily: L.serif, fontSize: 14.5, lineHeight: 1.6, color: L.ink2, margin: '8px 0 0' }}>
                {side==='adv' ? (
                  <>On <em>A/XSTest-unsafe</em>, <strong>Lex × Rules</strong> both pass 95.0% of examples with block correlation +0.946. Stacking these guards yields essentially no additional adversarial coverage — the redundancy is illusory.</>
                ) : (
                  <>On <em>N/XSTest-safe</em>, <strong>Gemma × Phi3</strong> both block 48.0% of examples. Overblock concentrates on one cluster of benign users; the stack's effective false-block rate is much lower than the marginal scores predict.</>
                )}
              </p>
            </LCard>
          </div>
        </div>
      </LSection>
    </div>
  );
}

function LMatrix({ M, side }) {
  const g = GUARDS.map(x => x.id);
  const N = g.length, cell = 44;
  const W = cell*(N+1), H = cell*(N+1);
  const tint = side==='adv' ? [122,36,38] : [58,77,58]; // oxblood / forest
  const colorOf = (r) => {
    if (r === 1) return L.paper2;
    const t = Math.max(-1, Math.min(1, r));
    if (t >= 0) {
      const a = Math.pow(t, 0.6) * 0.92;
      return `rgba(${tint[0]},${tint[1]},${tint[2]},${a})`;
    } else {
      const a = Math.pow(-t, 0.6) * 0.4;
      return `rgba(58,77,58,${a})`;
    }
  };
  return (
    <div style={{ padding: 18, overflow:'auto' }}>
      <svg width={W} height={H} style={{ display:'block' }}>
        {g.map((id, i) => (
          <text key={'h'+id} x={(i+1)*cell + cell/2} y={cell-12} fill={L.ink2} fontSize="11" fontFamily={L.mono} textAnchor="middle">{id}</text>
        ))}
        {g.map((id, i) => (
          <text key={'v'+id} x={cell-8} y={(i+1)*cell + cell/2 + 4} fill={L.ink2} fontSize="11" fontFamily={L.mono} textAnchor="end">{id}</text>
        ))}
        {g.map((a, i) => g.map((b, j) => {
          const r = M[a+'|'+b];
          const fill = colorOf(r);
          const x = (j+1)*cell + 1, y = (i+1)*cell + 1, sz = cell-2;
          const lightText = Math.abs(r) > 0.5;
          return (
            <g key={a+'|'+b}>
              <rect x={x} y={y} width={sz} height={sz} fill={fill} stroke={L.hair}/>
              {a !== b && <text x={x+sz/2} y={y+sz/2+3.5} fill={lightText?L.paper:L.ink2} fontSize="10.5" fontFamily={L.mono} textAnchor="middle">{r.toFixed(2)}</text>}
            </g>
          );
        }))}
      </svg>
    </div>
  );
}

function topPairsL(M) {
  const g = GUARDS.map(x => x.id);
  const out = [];
  for (let i=0;i<g.length;i++) for (let j=i+1;j<g.length;j++) {
    out.push({ a: g[i], b: g[j], r: M[g[i]+'|'+g[j]] });
  }
  out.sort((a,b) => b.r - a.r);
  return out.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// Screen: Measurements
// ─────────────────────────────────────────────────────────────
function LPlanner() {
  const [sel, setSel] = React.useState(new Set(['m-001','m-002']));
  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selArr = MEASUREMENTS.filter(m => sel.has(m.id));
  const totalRad = selArr.reduce((a,m)=>a+m.radiusΔ,0);
  const totalCost = selArr.reduce((a,m)=>a+m.cost,0);
  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 1180, margin: '0 auto' }}>
      <LSection kicker="§4  Measurement plan" title="What CASS recommends measuring next"
        sub="Bundle-greedy selection of pair-cell evaluations, ranked by expected radius reduction per unit cost. Selecting more closes more unresolved comparisons but costs evaluation budget.">
        <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap: 24 }}>
          <LCard style={{ padding: 0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily: L.sans, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom:'1.4px solid '+L.hair2 }}>
                  <th style={{ padding:'12px 14px', width: 30 }}></th>
                  <th style={{ textAlign:'left', padding:'12px 14px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Pair</th>
                  <th style={{ textAlign:'left', padding:'12px 14px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Cell</th>
                  <th style={{ textAlign:'left', padding:'12px 14px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Reason</th>
                  <th style={{ textAlign:'right', padding:'12px 14px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Δ-radius</th>
                  <th style={{ textAlign:'right', padding:'12px 14px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {MEASUREMENTS.map((m,i) => (
                  <tr key={m.id} onClick={()=>toggle(m.id)} style={{ borderBottom: i<MEASUREMENTS.length-1?'1px solid '+L.hair:'none', cursor:'pointer', background: sel.has(m.id) ? L.paper2 : 'transparent' }}>
                    <td style={{ padding:'13px 14px' }}>
                      <span style={{ color: sel.has(m.id)?L.accent:L.dim, fontFamily: L.serif, fontSize: 15 }}>{sel.has(m.id) ? '●' : '○'}</span>
                    </td>
                    <td style={{ padding:'13px 14px', fontFamily: L.serif, fontSize: 14, color: L.ink }}>{m.pair[0]} <span style={{color:L.dim}}>×</span> {m.pair[1]}</td>
                    <td style={{ padding:'13px 14px', fontFamily: L.mono, fontSize: 12, color: L.ink2 }}>{m.cell}</td>
                    <td style={{ padding:'13px 14px', fontFamily: L.serif, fontStyle:'italic', fontSize: 13, color: L.ink3 }}>{m.reason}</td>
                    <td style={{ padding:'13px 14px', textAlign:'right', fontFamily: L.mono, fontSize: 12, color: L.ok, fontVariantNumeric:'tabular-nums' }}>−{m.radiusΔ.toFixed(4)}</td>
                    <td style={{ padding:'13px 14px', textAlign:'right', fontFamily: L.mono, fontSize: 12, color: L.ink2, fontVariantNumeric:'tabular-nums' }}>${m.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LCard>

          <div>
            <LCard>
              <div style={{ fontFamily: L.serif, fontSize: 14, color: L.ink, marginBottom: 8 }}>Selection summary</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, marginTop: 14 }}>
                <LStat label="Selected" value={sel.size+' / '+MEASUREMENTS.length}/>
                <LStat label="Δ-radius" value={'−'+totalRad.toFixed(4)} accent={L.ok}/>
                <LStat label="Est. cost" value={'$'+totalCost}/>
                <LStat label="Time" value={(sel.size*1.4).toFixed(1)+' h'}/>
              </div>
              <hr style={{ border:0, borderTop:'1px solid '+L.hair, margin: '16px 0' }}/>
              <p style={{ fontFamily: L.serif, fontSize: 13.5, lineHeight: 1.55, color: L.ink3, margin: 0 }}>
                Running the selected bundle closes the two remaining unresolved comparisons and refreshes the certificate within about <strong style={{color:L.ink2}}>{(sel.size*1.4).toFixed(0)} hours</strong>.
              </p>
              <button style={{ marginTop: 16, width: '100%', background: L.accent, color: L.paper, border:'none', padding:'10px', fontFamily: L.sans, fontSize: 13, cursor:'pointer' }}>
                Queue {sel.size} measurements
              </button>
            </LCard>

            <LCard style={{ marginTop: 16 }}>
              <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.6, color: L.accent, textTransform:'uppercase' }}>Alternative schedulers</div>
              <div style={{ marginTop: 10 }}>
                {[
                  { name:'Uncertainty-greedy', cells: 67 },
                  { name:'Uniform-by-cell',    cells: 84 },
                  { name:'MIP width-cover',    cells: 22 },
                ].map(a => (
                  <div key={a.name} style={{ display:'flex', alignItems:'center', padding:'7px 0', borderBottom:'1px dashed '+L.hair, fontFamily: L.serif, fontSize: 13.5, color: L.ink2 }}>
                    <span>{a.name}</span><div style={{flex:1}}/>
                    <span style={{ fontFamily: L.mono, fontSize: 12, color: L.ink3 }}>{a.cells} cells</span>
                  </div>
                ))}
              </div>
            </LCard>
          </div>
        </div>
      </LSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Certificate (the artifact)
// ─────────────────────────────────────────────────────────────
function LCertificate({ lam }) {
  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ background: L.card, border: '1px solid '+L.hair2, padding: 56, position:'relative', boxShadow: '0 1px 0 '+L.hair }}>
        <div style={{ position:'absolute', top: 18, right: 24, fontFamily: L.mono, fontSize: 10.5, color: L.dim, letterSpacing: 0.5 }}>
          cert-2026-0524-001a
        </div>

        <div style={{ borderBottom: '2px solid '+L.ink, paddingBottom: 18 }}>
          <div style={{ fontFamily: L.mono, fontSize: 11, letterSpacing: 1.2, color: L.accent }}>CERTIFICATE OF SERIAL GUARDRAIL STACK</div>
          <h1 style={{ fontFamily: L.serif, fontSize: 36, fontWeight: 500, color: L.ink, margin: '10px 0 4px', letterSpacing: -0.6 }}>
            LG3 + Phi3
          </h1>
          <div style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 15 }}>
            Certified to dominate every candidate competitor on the specified benchmark mixture.
          </div>
        </div>

        <div style={{ marginTop: 26, display:'grid', gridTemplateColumns:'160px 1fr', rowGap: 11, fontFamily: L.serif, fontSize: 14.5 }}>
          <LField k="Application" v="acme-copilot · production · region us-east"/>
          <LField k="Candidate set" v="8 guards · 28 size-2 serial ensembles"/>
          <LField k="Aggregation" v="serial · K = 2 · residual radius 0.000"/>
          <LField k="Benchmark mixture" v="2,000 examples · 4 adversarial cells (1,195) · 2 benign cells (805)"/>
          <LField k="Welfare profile" v={`λ = ${lam.toFixed(1)} · π_A inferred · uniform source weights`}/>
          <LField k="Measurement coverage" v="10 agent-cells · 13 pair-cells · 0 parse failures · 0 errors"/>
          <LField k="Welfare estimate" v="0.1363   [+0.1245, +0.1481]" accent={L.ok}/>
          <LField k="Competitor comparisons" v="27 of 27 certified · 0 unresolved" accent={L.ok}/>
        </div>

        <div style={{ marginTop: 28, padding: 18, border: '1px solid '+L.hair, background: L.paper2 }}>
          <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.8, color: L.ink3, textTransform:'uppercase' }}>Statement</div>
          <p style={{ fontFamily: L.serif, fontSize: 15, lineHeight: 1.6, color: L.ink, margin: '8px 0 0' }}>
            Under the candidate set, benchmark mixture, serial aggregation rule, welfare profile, and uncertainty model
            specified above, the stack <em>LG3 + Phi3</em> has welfare 0.1363 with a 95% interval of [+0.1245, +0.1481],
            and a strictly positive lower bound on its welfare gap against every candidate competitor.
            This certificate is conditional on the stated assumptions and does not constitute a deployment-general guarantee of safety.
          </p>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.8, color: L.ink3, textTransform:'uppercase' }}>Limitations</div>
          <ul style={{ paddingLeft: 22, marginTop: 8, fontFamily: L.serif, fontSize: 14, lineHeight: 1.65, color: L.ink2 }}>
            <li>Leave-one-source-out testing yielded hold-out regret of 1.078 when HarmBench was excluded; re-certify if traffic shifts away from the certified mixture.</li>
            <li>Applies to K = 2 serial composition only. For K ≥ 3, residual uncertainty must be carried.</li>
            <li>Source weights, λ, and π_A are customer-supplied and were not independently validated against business outcomes.</li>
            <li>This certificate covers selection and joint failure modes, not enforcement at runtime.</li>
          </ul>
        </div>

        <div style={{ marginTop: 22, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.8, color: L.ink3, textTransform:'uppercase' }}>Versions</div>
            <div style={{ fontFamily: L.mono, fontSize: 12.5, marginTop: 10, color: L.ink2, lineHeight: 1.7 }}>
              LG3        llama-guard3-1B · 3-1B<br/>
              Phi3       phi3-mini · mini<br/>
              Policy     acme-tos@v4.2<br/>
              Prompt     cass-judge@v1.7
            </div>
          </div>
          <div>
            <div style={{ fontFamily: L.mono, fontSize: 10.5, letterSpacing: 0.8, color: L.ink3, textTransform:'uppercase' }}>Re-certify on</div>
            <ul style={{ fontFamily: L.serif, fontSize: 13.5, color: L.ink2, paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
              <li>Guard version diff</li>
              <li>Traffic mixture shift &gt; 8%</li>
              <li>New attack family observed</li>
              <li>Policy or prompt update</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 36, borderTop: '1px solid '+L.hair2, paddingTop: 18, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ borderBottom: '1px solid '+L.ink3, width: 220, height: 24 }}/>
            <div style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 12.5, marginTop: 4 }}>Reviewer signature</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid '+L.ink3, width: 140, height: 24 }}/>
            <div style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 12.5, marginTop: 4 }}>Issued 24 May 2026</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid '+L.ink3, width: 140, height: 24 }}/>
            <div style={{ fontFamily: L.serif, fontStyle:'italic', color: L.ink3, fontSize: 12.5, marginTop: 4 }}>Expires 24 Jun 2026</div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap: 12, marginTop: 16, justifyContent:'flex-end' }}>
        <button style={{ background:'transparent', color: L.ink2, border:'1px solid '+L.hair2, padding:'8px 14px', fontFamily: L.sans, fontSize: 12.5, cursor:'pointer' }}>Export JSON</button>
        <button style={{ background:'transparent', color: L.ink2, border:'1px solid '+L.hair2, padding:'8px 14px', fontFamily: L.sans, fontSize: 12.5, cursor:'pointer' }}>Export Markdown</button>
        <button style={{ background:'transparent', color: L.ink2, border:'1px solid '+L.hair2, padding:'8px 14px', fontFamily: L.sans, fontSize: 12.5, cursor:'pointer' }}>Print PDF</button>
        <button style={{ background: L.ink, color: L.paper, border:'none', padding:'8px 14px', fontFamily: L.sans, fontSize: 12.5, cursor:'pointer' }}>Submit to GRC</button>
      </div>
    </div>
  );
}

function LField({ k, v, accent }) {
  return (
    <>
      <div style={{ color: L.ink3, fontStyle: 'italic', fontFamily: L.serif }}>{k}</div>
      <div style={{ color: accent || L.ink, fontFamily: L.mono, fontSize: 13, fontVariantNumeric:'tabular-nums' }}>{v}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Re-certification
// ─────────────────────────────────────────────────────────────
function LDrift() {
  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 1180, margin: '0 auto' }}>
      <LSection kicker="§6  Re-certification" title="Drift signals and triggers"
        sub="The certificate is conditional on the model, prompt, policy, and traffic distribution that were measured. These signals trigger automatic re-certification.">
        <LCard style={{ padding: 0 }}>
          {DRIFT.map((d,i) => (
            <div key={i} style={{ padding: '18px 22px', borderBottom: i<DRIFT.length-1 ? '1px solid '+L.hair : 'none', display:'grid', gridTemplateColumns:'12px 2fr 2fr 1.4fr 100px', gap: 18, alignItems:'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5,
                background: d.severity==='high'?L.bad : d.severity==='med'?L.warn : d.severity==='low'?L.ink2 : L.ok }}/>
              <div>
                <div style={{ fontFamily: L.serif, fontSize: 16, color: L.ink }}>{d.signal}</div>
                <div style={{ fontFamily: L.serif, fontStyle:'italic', fontSize: 12.5, color: L.ink3, marginTop: 2 }}>monitored since 1 April 2026</div>
              </div>
              <div style={{ fontFamily: L.mono, fontSize: 12, color: L.ink2 }}>{d.change}</div>
              <div style={{ fontFamily: L.serif, fontStyle:'italic', fontSize: 13.5, color: d.severity==='ok'?L.ok:L.warn }}>{d.delta}</div>
              <button style={{ background: d.severity==='ok'?'transparent':L.ink, color: d.severity==='ok'?L.ink2:L.paper, border: d.severity==='ok'?'1px solid '+L.hair2:'none', padding:'7px 10px', fontFamily: L.sans, fontSize: 12, cursor:'pointer' }}>
                {d.severity==='ok' ? 'No action' : 'Re-certify'}
              </button>
            </div>
          ))}
        </LCard>
      </LSection>

      <LSection kicker="History" title="Re-certification timeline">
        <LCard style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: L.sans, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.4px solid '+L.hair2 }}>
                <th style={{ textAlign:'left', padding: '11px 16px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Date</th>
                <th style={{ textAlign:'left', padding: '11px 16px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Triggered by</th>
                <th style={{ textAlign:'left', padding: '11px 16px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Method</th>
                <th style={{ textAlign:'left', padding: '11px 16px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Stack</th>
                <th style={{ textAlign:'right', padding: '11px 16px', fontWeight: 500, fontSize: 11.5, letterSpacing: 0.4, textTransform:'uppercase', color: L.ink3 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: '24 May 2026', trig: 'Scheduled monthly',  method: 'cass-greedy', stack: 'LG3 + Phi3',  status: 'Certified' },
                { date: '29 Apr 2026', trig: 'Guard version diff', method: 'cass-greedy', stack: 'LG3 + Phi3',  status: 'Certified' },
                { date: '2 Apr 2026',  trig: 'Manual',             method: 'manual',      stack: 'L3-3B + LG3', status: 'Certified' },
                { date: '5 Mar 2026',  trig: 'Attack family',      method: 'cass-greedy', stack: 'L3-3B + LG3', status: 'Certified' },
                { date: '8 Feb 2026',  trig: 'Scheduled monthly',  method: 'cass-greedy', stack: 'L3-3B + LG3', status: 'Expired' },
              ].map((r,i) => (
                <tr key={i} style={{ borderBottom: '1px solid '+L.hair }}>
                  <td style={{ padding:'13px 16px', fontFamily: L.mono, fontSize: 12, color: L.ink3, fontVariantNumeric:'tabular-nums' }}>{r.date}</td>
                  <td style={{ padding:'13px 16px', fontFamily: L.serif, fontStyle:'italic', color: L.ink2 }}>{r.trig}</td>
                  <td style={{ padding:'13px 16px', fontFamily: L.mono, fontSize: 12, color: L.ink2 }}>{r.method}</td>
                  <td style={{ padding:'13px 16px', fontFamily: L.serif, fontSize: 14, color: L.ink }}>{r.stack}</td>
                  <td style={{ padding:'13px 16px', textAlign:'right', fontFamily: L.mono, fontSize: 11.5, letterSpacing: 0.4, color: r.status==='Certified'?L.ok:L.dim }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </LCard>
      </LSection>
    </div>
  );
}

Object.assign(window, { LedgerApp });
