// StackCert UI — Overview screen
// The "what's the answer" screen. Anyone landing here should leave knowing:
//   1. Which stack is certified
//   2. Why (correlation penalty hides the wrong winner)
//   3. What the certificate covers and what it costs
//   4. What changed since last cert

function UOverview({ lam, go }) {
  const preset = LAMBDA_PRESETS[lam] || LAMBDA_PRESETS[5];
  const winner = STACKS.find(s => s.certified) || STACKS[1];
  const marginal = STACKS.find(s => !s.certified && s.firstOrder > 0.15) || STACKS[0];

  return (
    <UPage>
      <UPageHead title="Overview" sub="The certified guardrail stack for this run, with the evidence behind the call.">
        <UBtn ghost small>Share</UBtn>
        <UBtn ghost small icon={<DownloadIcon/>}>Export</UBtn>
        <UBtn primary onClick={() => go('cert')}>Open certificate →</UBtn>
      </UPageHead>

      <OverviewHero winner={winner} marginal={marginal} preset={preset} lam={lam} go={go}/>

      <div style={{ display:'grid', gridTemplateColumns:'1.55fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead
            title="Welfare by stack"
            sub="First-order (product of marginals) → full evaluation (with correlation)."
            right={<UChip mono>λ = {lam}</UChip>}/>
          <WelfareChart/>
          <ChartLegend/>
        </UCard>

        <UCard padding={20}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <UBadge tone="accent">Insight</UBadge>
            <span style={{ color: U.ink3, fontSize: 12 }}>Why this isn't obvious from marginals.</span>
          </div>
          <h3 style={{ fontFamily: U.display, fontSize: 17, fontWeight: 600, color: U.ink, margin: '12px 0 8px', letterSpacing: -0.3, lineHeight: 1.3 }}>
            Marginal scores pick the wrong stack at λ = {lam}
          </h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: U.ink2, margin: 0 }}>
            <span style={{ color: U.ink, fontWeight: 500 }}>L3-3B + LG3</span> wins first-order but loses on full evaluation: both guards miss the same adversarial examples (block correlation <strong style={{color:U.bad}}>+0.48</strong>), so stacking adds little real safety. <span style={{ color: U.ink, fontWeight: 500 }}>LG3 + Phi3</span> miss different attacks and clear the welfare bar with room to spare.
          </p>
          <hr style={{ border:0, borderTop:'1px solid '+U.line, margin: '16px 0' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
            <KvPair k="Welfare lift" v="+22.7%" tone="ok"/>
            <KvPair k="Adv co-miss penalty" v="-0.048"/>
            <KvPair k="Pair-cells measured" v="13 / 168"/>
            <KvPair k="Time to certify" v="14 min"/>
          </div>
          <UBtn ghost small style={{ marginTop: 16 }} onClick={() => go('corr')}>Inspect correlation matrix →</UBtn>
        </UCard>
      </div>

      <UCard>
        <UCardHead
          title="Scheduler comparison"
          sub="How cheaply does each method certify this run?"
          right={<UBadge tone="accent" dot>CASS recommended</UBadge>}/>
        <SchedulerTable/>
      </UCard>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead
            title="Recent activity"
            sub="Last 30 days · re-certifications and drift signals."
            right={<UBtn ghost small onClick={() => go('drift')}>Open drift →</UBtn>}/>
          <ActivityFeed/>
        </UCard>

        <UCard>
          <UCardHead title="Benchmark mixture" sub="2,000 examples · 6 cells"/>
          <BenchmarkMix/>
        </UCard>
      </div>
    </UPage>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero strip — single source of truth for "what got certified"
// ─────────────────────────────────────────────────────────────
function OverviewHero({ winner, marginal, preset, lam, go }) {
  return (
    <UCard style={{ overflow:'hidden' }}>
      <div style={{ padding: '22px 26px', display:'flex', flexDirection:'column', gap: 16, background:
          'radial-gradient(80% 100% at 0% 0%, '+U.accentSoft+'80 0%, transparent 70%), '+U.surface }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <UBadge tone="ok" dot>Certified</UBadge>
          <span style={{ color: U.ink3, fontSize: 12 }}>cert-2026-0524-001a</span>
          <span style={{ color: U.faint }}>·</span>
          <span style={{ color: U.ink3, fontSize: 12 }}>issued 24 May 2026, 11:08 UTC</span>
          <span style={{ color: U.faint }}>·</span>
          <span style={{ color: U.ink3, fontSize: 12 }}>expires 24 Jun 2026</span>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap: 22 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: U.display, fontSize: 36, fontWeight: 600, color: U.ink, letterSpacing: -0.9, lineHeight: 1, marginTop: 4 }}>
              {winner.stack[0]} <span style={{ color: U.faint, fontWeight: 400 }}>+</span> {winner.stack[1]}
            </div>
            <div style={{ color: U.ink3, fontSize: 13.5, marginTop: 8, maxWidth: 720, lineHeight: 1.55 }}>
              The recommended serial guardrail stack for <strong style={{ color: U.ink2 }}>acme-copilot · prod</strong> under λ = {lam} ({preset?.name?.toLowerCase()}). Certified to dominate every candidate competitor on the specified benchmark mixture.
            </div>
          </div>
          <div style={{ display:'flex', gap: 8, flexShrink: 0 }}>
            <UBtn ghost onClick={() => go('ranking')}>See ranking</UBtn>
            <UBtn primary onClick={() => go('cert')}>Open certificate →</UBtn>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid '+U.line, padding: '18px 26px', display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 22 }}>
        <UStat label="Welfare (full eval)" value="0.1363" accent={U.ok} size="lg" sub={`[+0.1245, +0.1481] · ±0.012`}/>
        <UStat label="Regret avoided" value="+0.0253" accent={U.ok} size="lg" sub="vs. marginal pick"/>
        <UStat label="Pair-cells used" value="13 / 168" size="lg" sub="92% measurement reduction"/>
        <UStat label="Competitor comparisons" value="27 / 27" accent={U.ok} size="lg" sub="all certified · 0 open"/>
        <UStat label="Marginal pick" value={marginal.stack.join(' + ')} sub="would lose 0.025 welfare" size="md"/>
      </div>
    </UCard>
  );
}

function KvPair({ k, v, tone }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: U.ink3 }}>{k}</div>
      <div style={{ fontFamily: U.mono, fontSize: 14, color: tone==='ok'?U.ok:U.ink, marginTop: 2, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>{v}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Welfare chart — dot-plot showing first-order → full eval movement
// ─────────────────────────────────────────────────────────────
function WelfareChart() {
  const [hover, setHover] = React.useState(null);
  const data = STACKS.slice().sort((a,b) => b.full - a.full);
  const max = Math.max(...data.map(d => Math.max(d.firstOrder, d.full)));
  const min = Math.min(0, ...data.map(d => Math.min(d.firstOrder, d.full)));
  const range = max - min;
  const W = 720, padL = 130, padR = 80, padT = 14, padB = 30, rowH = 30;
  const H = padT + padB + data.length * rowH;
  const innerW = W - padL - padR;
  const xZero = padL + ((-min)/range) * innerW;

  return (
    <div style={{ padding: '14px 20px', position:'relative' }}>
      <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[-0.05, 0, 0.05, 0.10, 0.15, 0.20].filter(v=>v>=min&&v<=max).map(v => {
          const x = padL + ((v-min)/range)*innerW;
          return (
            <g key={v}>
              <line x1={x} x2={x} y1={padT} y2={H-padB} stroke={v===0?U.line2:U.line} strokeWidth={v===0?1:1} strokeDasharray={v===0?'':'2 4'}/>
              <text x={x} y={H-10} fill={U.ink3} fontSize="10.5" fontFamily={U.mono} textAnchor="middle">{uFmt(v,2)}</text>
            </g>
          );
        })}
        {/* rows */}
        {data.map((d, i) => {
          const y = padT + i*rowH;
          const x1 = padL + ((d.firstOrder-min)/range)*innerW;
          const x2 = padL + ((d.full-min)/range)*innerW;
          const cert = d.certified;
          const fullColor = cert ? U.ok : (d.full < 0 ? U.bad : U.ink2);
          const isHover = hover === i;
          return (
            <g key={i} transform={`translate(0, ${y})`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ cursor:'pointer' }}>
              {isHover && <rect x={0} y={0} width={W} height={rowH} fill={U.surface3} opacity={0.6}/>}
              <text x={padL-12} y={rowH/2+4} fill={cert?U.ink:U.ink2} fontSize="12" fontFamily={U.sans} fontWeight={cert?500:400} textAnchor="end">
                {cert && '★ '}{d.stack.join(' + ')}
              </text>
              {/* movement arrow */}
              <line x1={x1} x2={x2} y1={rowH/2} y2={rowH/2} stroke={fullColor} strokeWidth="1.5" opacity="0.35"/>
              {/* first-order open ring */}
              <circle cx={x1} cy={rowH/2} r="4" fill={U.surface} stroke={U.ink3} strokeWidth="1.4"/>
              {/* full eval solid dot */}
              <circle cx={x2} cy={rowH/2} r="5" fill={fullColor}/>
              {/* trailing label */}
              {cert
                ? <text x={x2+10} y={rowH/2+4} fill={U.ok} fontSize="10.5" fontFamily={U.mono} fontWeight={500}>certified</text>
                : d.full < d.firstOrder - 0.02
                  ? <text x={x2+10} y={rowH/2+4} fill={U.bad} fontSize="10.5" fontFamily={U.mono}>{uFmt(d.full-d.firstOrder,3)}</text>
                  : null}
              {/* hover tooltip */}
              {isHover && (
                <g transform={`translate(${Math.min(W-180, Math.max(x1,x2)+24)}, ${-rowH/2+8})`}>
                  <rect x={0} y={0} width={172} height={48} rx={6} fill={U.ink} opacity={0.92}/>
                  <text x={12} y={18} fill="#fff" fontSize="11" fontFamily={U.mono}>1st-order: {uFmt2(d.firstOrder, 4)}</text>
                  <text x={12} y={36} fill="#fff" fontSize="11" fontFamily={U.mono}>full: {uFmt(d.full, 4)}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartLegend() {
  return (
    <div style={{ borderTop: '1px solid '+U.line, padding: '10px 20px', display:'flex', gap: 22, fontSize: 12, color: U.ink3 }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap: 7 }}>
        <svg width="10" height="10"><circle cx="5" cy="5" r="3.6" fill={U.surface} stroke={U.ink3} strokeWidth="1.4"/></svg>
        First-order (product of marginal block rates)
      </span>
      <span style={{ display:'inline-flex', alignItems:'center', gap: 7 }}>
        <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={U.ok}/></svg>
        Full evaluation (measured pair-cells with correlation)
      </span>
      <span style={{ marginLeft:'auto', fontStyle:'italic', color: U.dim }}>Hover for exact values</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scheduler comparison table
// ─────────────────────────────────────────────────────────────
function SchedulerTable() {
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {['Method','Selected stack','Cert. rate','Regret','Agent-cells','Pair-cells','Measurement coverage'].map((h, i) => (
            <th key={h} style={{ textAlign: i>=2 && i<=5 ? 'right' : 'left',
              padding:'12px 18px', fontWeight: 500, fontSize: 11.5, color: U.ink3, letterSpacing: 0.3,
              textTransform:'uppercase', borderBottom: '1px solid '+U.line, background: U.surface2 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {METHODS.map((m, i) => {
          const pct = m.pairCells/168;
          return (
            <tr key={m.method} style={{ borderBottom: i<METHODS.length-1?'1px solid '+U.line:'none', background: m.recommended ? U.accentSoft+'66' : 'transparent' }}>
              <td style={{ padding:'13px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 7 }}>
                  {m.recommended && <span style={{ width:6, height:6, borderRadius:3, background: U.accent }}/>}
                  <span style={{ color: m.recommended?U.ink:U.ink2, fontWeight: m.recommended?500:400 }}>{m.method}</span>
                </div>
              </td>
              <td style={{ padding:'13px 18px', fontFamily: U.mono, fontSize: 12, color: U.ink2 }}>{m.pick}</td>
              <td style={{ padding:'13px 18px', textAlign:'right' }}>
                {m.certRate > 0
                  ? <UBadge tone="ok" dot>{(m.certRate*100).toFixed(0)}%</UBadge>
                  : <span style={{ color: U.ink3, fontFamily: U.mono, fontSize: 12 }}>0%</span>}
              </td>
              <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: m.regret>0.001?U.bad:U.ok, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>{m.regret.toFixed(4)}</td>
              <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ink3, fontVariantNumeric:'tabular-nums' }}>{m.agentCells}</td>
              <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ink2, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>{m.pairCells}</td>
              <td style={{ padding:'13px 18px', width: 220 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <div style={{ position:'relative', height: 6, flex: 1, background: U.surface3, borderRadius: 3, overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset: 0, width: (pct*100)+'%', background: m.recommended ? U.accent : U.line3, borderRadius: 3 }}/>
                  </div>
                  <span style={{ fontFamily: U.mono, fontSize: 11, color: U.ink3, fontVariantNumeric:'tabular-nums', width: 32, textAlign:'right' }}>{(pct*100).toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity feed
// ─────────────────────────────────────────────────────────────
function ActivityFeed() {
  const items = [
    { kind: 'cert', sev: 'ok',   date: 'today, 11:08',  title: 'Certificate issued',           detail: 'LG3 + Phi3 · cass-greedy · 13 pair-cells' },
    { kind: 'drift', sev: 'high', date: '2d ago',       title: 'New attack family flagged',    detail: 'unicode-evade · 14 examples queued for labeling' },
    { kind: 'drift', sev: 'med',  date: '5d ago',       title: 'Traffic mixture drift',        detail: 'XSTest share +6 points · approaching 55% threshold' },
    { kind: 'cert', sev: 'ok',   date: '29 Apr',       title: 'Re-certified (auto)',          detail: 'guard version diff · LG3 + Phi3 confirmed' },
    { kind: 'drift', sev: 'low',  date: '12 May',       title: 'Phi3 prompt template updated', detail: 'v3 → v3.1 · +12% adv block rate on HarmBench' },
  ];
  return (
    <div>
      {items.map((a, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'14px 1fr 80px', alignItems:'center', gap: 12, padding:'12px 18px', borderTop: i?'1px solid '+U.line:'none' }}>
          <USeverity s={a.sev}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: U.ink, fontWeight: 500 }}>{a.title}</div>
            <div style={{ fontSize: 11.5, color: U.ink3, marginTop: 2 }}>{a.detail}</div>
          </div>
          <div style={{ fontSize: 11.5, color: U.ink3, fontFamily: U.mono, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{a.date}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Benchmark mixture bar
// ─────────────────────────────────────────────────────────────
function BenchmarkMix() {
  const total = CELLS.reduce((a,c) => a+c.n, 0);
  const advTotal = CELLS.filter(c => c.side==='adv').reduce((a,c) => a+c.n, 0);
  return (
    <div style={{ padding: '14px 18px 16px' }}>
      <div style={{ display:'flex', gap: 24, fontSize: 12, color: U.ink3, marginBottom: 10 }}>
        <span><span style={{ display:'inline-block', width: 10, height: 10, borderRadius: 2, background: U.amber, marginRight: 6, verticalAlign:'-1px' }}/>Adversarial · {advTotal.toLocaleString()}</span>
        <span><span style={{ display:'inline-block', width: 10, height: 10, borderRadius: 2, background: U.blue, marginRight: 6, verticalAlign:'-1px' }}/>Benign · {(total-advTotal).toLocaleString()}</span>
        <span style={{ marginLeft: 'auto' }}>n = {total.toLocaleString()}</span>
      </div>
      <div style={{ display:'flex', height: 22, background: U.surface3, borderRadius: 4, overflow:'hidden', marginBottom: 12 }}>
        {CELLS.map((c, i) => (
          <div key={c.id} title={`${c.id}: n=${c.n}, w=${c.weight.toFixed(2)}`}
            style={{ width: (c.n/total*100)+'%', background: c.side==='adv'? U.amber : U.blue,
              borderRight: i<CELLS.length-1 ? '1px solid '+U.surface : 'none' }}/>
        ))}
      </div>
      {CELLS.map(c => (
        <div key={c.id} style={{ display:'flex', alignItems:'center', gap: 8, padding:'4px 0', fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: c.side==='adv'?U.amber:U.blue, flexShrink: 0 }}/>
          <span style={{ color: U.ink2 }}>{c.id}</span>
          <div style={{ flex: 1 }}/>
          <span style={{ color: U.ink3, fontFamily: U.mono, fontSize: 11.5, fontVariantNumeric:'tabular-nums' }}>n {c.n}</span>
          <span style={{ color: U.ink3, fontFamily: U.mono, fontSize: 11.5, fontVariantNumeric:'tabular-nums', width: 50, textAlign:'right' }}>w {c.weight.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function DownloadIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2v6m-2.5-2L6 8.5 8.5 6M2 10h8"/></svg>;
}

Object.assign(window, { UOverview });
