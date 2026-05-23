// Direction C — "UI"
// Modern SaaS product UI. Light, neutral, restrained. Linear / Vercel / Anthropic Console feel.
// Same data, same six screens as Terminal and Ledger.

const U = {
  bg:       '#f7f7f8',
  surface:  '#ffffff',
  surface2: '#fbfbfc',
  surface3: '#f1f1f3',
  line:     '#e7e7ea',
  line2:    '#d8d8dd',
  ink:      '#111114',
  ink2:     '#3a3a42',
  ink3:     '#6a6a74',
  dim:      '#9a9aa3',
  faint:    '#c2c2c9',
  accent:   '#5b5bd6',    // electric indigo
  accentSoft: '#eeeefb',
  ok:       '#1f9d55',
  okSoft:   '#e6f5ec',
  warn:     '#b56a14',
  warnSoft: '#fbf1e1',
  bad:      '#c92a2a',
  badSoft:  '#fbebeb',
  sans:     '"Inter","SF Pro Text",system-ui,-apple-system,sans-serif',
  mono:     '"JetBrains Mono","IBM Plex Mono",ui-monospace,Menlo,monospace',
};

const uFmt = (n, d=3) => (n>=0?'+':'') + n.toFixed(d);
const uFmt2 = (n, d=3) => n.toFixed(d);

// ─────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────
function UIApp() {
  const [route, setRoute] = React.useState('overview');
  const [persona, setPersona] = React.useState('security');
  const [lam, setLam] = React.useState(5);
  const lamPreset = LAMBDA_PRESETS[lam] || LAMBDA_PRESETS[5];

  const nav = [
    { id: 'overview',  label: 'Overview',     count: null },
    { id: 'ranking',   label: 'Stack ranking',count: 28 },
    { id: 'corr',      label: 'Co-failure',   count: null },
    { id: 'planner',   label: 'Measurements', count: 5, badge: 'new' },
    { id: 'cert',      label: 'Certificate',  count: null },
    { id: 'drift',     label: 'Drift',        count: 4 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: U.bg, color: U.ink, fontFamily: U.sans, fontSize: 13, display: 'flex', minHeight: 0 }}>
      <USide nav={nav} route={route} setRoute={setRoute}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <UTop persona={persona} setPersona={setPersona} lam={lam} setLam={setLam} lamPreset={lamPreset} route={route} nav={nav}/>
        <div style={{ flex: 1, overflow: 'auto', background: U.bg }}>
          {route === 'overview' && <UOverview lam={lam} go={setRoute}/>}
          {route === 'ranking'  && <URanking lam={lam}/>}
          {route === 'corr'     && <UCorr/>}
          {route === 'planner'  && <UPlanner/>}
          {route === 'cert'     && <UCertificate lam={lam}/>}
          {route === 'drift'    && <UDrift/>}
        </div>
      </div>
    </div>
  );
}

function USide({ nav, route, setRoute }) {
  return (
    <div style={{ width: 220, background: U.surface2, borderRight: '1px solid '+U.line, padding: '14px 10px', display:'flex', flexDirection:'column', flexShrink: 0 }}>
      {/* Workspace switcher */}
      <button style={{ display:'flex', alignItems:'center', gap: 9, padding:'8px 10px', background:'transparent', border:'1px solid '+U.line, borderRadius: 8, cursor:'pointer', textAlign:'left' }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: U.ink, color: U.surface, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600, letterSpacing: -0.2 }}>A</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: U.ink, lineHeight: 1.2 }}>Acme</div>
          <div style={{ fontSize: 11, color: U.ink3, lineHeight: 1.2 }}>copilot · prod</div>
        </div>
        <UChevron/>
      </button>

      <div style={{ marginTop: 18 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setRoute(n.id)}
            style={{ display:'flex', alignItems:'center', gap: 10, width:'100%', padding:'7px 10px',
              background: route===n.id ? U.surface3 : 'transparent',
              border:'none', borderRadius: 6, cursor:'pointer', textAlign:'left',
              color: route===n.id ? U.ink : U.ink2, fontSize: 13, fontWeight: route===n.id?500:400, marginBottom: 1 }}>
            <UNavIcon id={n.id} active={route===n.id}/>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge && <span style={{ fontSize: 10, padding:'1px 6px', background: U.accentSoft, color: U.accent, borderRadius: 4, fontWeight: 500 }}>{n.badge}</span>}
            {n.count != null && <span style={{ fontSize: 11, color: U.dim, fontVariantNumeric:'tabular-nums' }}>{n.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18, padding: '0 10px' }}>
        <div style={{ fontSize: 10.5, color: U.dim, letterSpacing: 0.4, textTransform:'uppercase', marginBottom: 8 }}>Run</div>
        <div style={{ fontSize: 12, color: U.ink2, lineHeight: 1.7 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{color:U.ink3}}>id</span><span style={{ fontFamily: U.mono, fontSize: 11.5 }}>run-0c3f</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{color:U.ink3}}>seed</span><span style={{ fontFamily: U.mono, fontSize: 11.5 }}>1729</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{color:U.ink3}}>K · ρ</span><span style={{ fontFamily: U.mono, fontSize: 11.5 }}>2 · 0.60</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{color:U.ink3}}>n</span><span style={{ fontFamily: U.mono, fontSize: 11.5 }}>2,000</span></div>
        </div>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ display:'flex', alignItems:'center', gap: 9, padding:'8px 10px', borderTop: '1px solid '+U.line, marginTop: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: 'linear-gradient(135deg, #c2b3f5, #5b5bd6)', flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: U.ink, lineHeight: 1.2 }}>Iris Mendel</div>
          <div style={{ fontSize: 11, color: U.ink3, lineHeight: 1.2 }}>AI Security</div>
        </div>
      </div>
    </div>
  );
}

function UTop({ persona, setPersona, lam, setLam, lamPreset, route, nav }) {
  const current = nav.find(n => n.id === route);
  const personas = [
    { id: 'platform', label: 'Platform' },
    { id: 'security', label: 'Security' },
    { id: 'grc',      label: 'Risk' },
  ];
  return (
    <div style={{ height: 56, borderBottom: '1px solid '+U.line, background: U.surface, display:'flex', alignItems:'center', padding:'0 22px', gap: 16, flexShrink: 0 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: U.ink3 }}>StackCert</span>
        <span style={{ color: U.faint }}>/</span>
        <span style={{ color: U.ink, fontWeight: 500 }}>{current?.label}</span>
      </div>
      <div style={{ flex: 1 }}/>
      {/* λ slider */}
      <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'5px 10px 5px 12px', border: '1px solid '+U.line, borderRadius: 8, background: U.surface2 }}>
        <span style={{ color: U.ink3, fontSize: 12 }}>Welfare λ</span>
        <input type="range" min="1" max="20" step="1" value={lam}
          onChange={e => setLam(parseInt(e.target.value))}
          style={{ width: 100, accentColor: U.accent }}/>
        <span style={{ fontFamily: U.mono, color: U.ink, fontSize: 12, width: 28, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{lam.toFixed(0)}</span>
        <span style={{ color: U.ink3, fontSize: 11.5, fontStyle:'italic' }}>{lamPreset?.name || 'custom'}</span>
      </div>
      {/* persona segmented */}
      <div style={{ display:'flex', background: U.surface3, padding: 2, borderRadius: 7 }}>
        {personas.map(p => (
          <button key={p.id} onClick={() => setPersona(p.id)}
            style={{ background: persona===p.id ? U.surface : 'transparent', color: persona===p.id ? U.ink : U.ink3,
              boxShadow: persona===p.id ? '0 1px 2px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)' : 'none',
              border: 'none', padding: '4px 10px', fontFamily: U.sans, fontSize: 12, fontWeight: 500, cursor:'pointer', borderRadius: 5 }}>
            {p.label}
          </button>
        ))}
      </div>
      <button style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid '+U.line, background: U.surface, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={U.ink2} strokeWidth="1.6" strokeLinecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
      </button>
    </div>
  );
}

function UNavIcon({ id, active }) {
  const c = active ? U.ink : U.ink3;
  const stroke = { stroke: c, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" {...stroke}>
      {id==='overview' && <><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="8" y="2" width="5" height="5" rx="1"/><rect x="2" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></>}
      {id==='ranking'  && <><path d="M2 4h11M2 7.5h11M2 11h7"/></>}
      {id==='corr'     && <><rect x="2" y="2" width="11" height="11" rx="1"/><path d="M2 7h11M7.5 2v11"/></>}
      {id==='planner'  && <><path d="M3 12V6M7.5 12V3M12 12V8"/></>}
      {id==='cert'     && <><path d="M7.5 1.5l5 2.5v3.5c0 2.8-2 5.2-5 6-3-0.8-5-3.2-5-6V4z"/><path d="M5.5 7.5l1.5 1.5L10 6"/></>}
      {id==='drift'    && <><path d="M2 9c1.5-3 3-3 4.5 0s3 3 4.5 0 1.5-3 2-3"/></>}
    </svg>
  );
}

function UChevron() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={U.ink3} strokeWidth="1.5" strokeLinecap="round"><path d="M2 4.5l3.5 3 3.5-3M2 7.5l3.5 3 3.5-3" opacity=".5"/></svg>;
}

// ─────────────────────────────────────────────────────────────
// Reusable
// ─────────────────────────────────────────────────────────────
function UCard({ children, style, padding = 0 }) {
  return <div style={{ background: U.surface, border: '1px solid '+U.line, borderRadius: 10, ...(padding && { padding }), ...style }}>{children}</div>;
}
function UCardHead({ title, sub, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom: '1px solid '+U.line, gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: U.ink }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: U.ink3, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}
function UBadge({ tone='neutral', children, dot, style }) {
  const tones = {
    ok:      { bg: U.okSoft,   color: U.ok,     dot: U.ok },
    warn:    { bg: U.warnSoft, color: U.warn,   dot: U.warn },
    bad:     { bg: U.badSoft,  color: U.bad,    dot: U.bad },
    accent:  { bg: U.accentSoft, color: U.accent, dot: U.accent },
    neutral: { bg: U.surface3, color: U.ink2,   dot: U.ink3 },
  };
  const t = tones[tone];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: 6, padding:'2px 8px', background: t.bg, color: t.color, borderRadius: 999, fontSize: 11.5, fontWeight: 500, ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: t.dot }}/>}
      {children}
    </span>
  );
}
function UChip({ children, style, mono }) {
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', background: U.surface3, border:'1px solid '+U.line, borderRadius: 5, fontSize: 11.5, color: U.ink2, fontFamily: mono?U.mono:U.sans, fontVariantNumeric:'tabular-nums', ...style }}>{children}</span>;
}
function UBtn({ children, primary, ghost, small, style, onClick }) {
  const base = {
    border:'none', cursor:'pointer', fontFamily: U.sans, fontSize: 12.5, fontWeight: 500, padding: small?'5px 10px':'7px 13px', borderRadius: 7, display:'inline-flex', alignItems:'center', gap: 6,
  };
  const v = primary ? { background: U.ink, color: U.surface }
        : ghost   ? { background: 'transparent', color: U.ink2, border:'1px solid '+U.line }
        : { background: U.surface, color: U.ink2, border:'1px solid '+U.line };
  return <button onClick={onClick} style={{ ...base, ...v, ...style }}>{children}</button>;
}
function UStat({ label, value, accent, sub, large }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: U.ink3, letterSpacing: 0.1 }}>{label}</div>
      <div style={{ fontFamily: U.mono, color: accent || U.ink, fontSize: large?26:18, marginTop: 4, fontVariantNumeric:'tabular-nums', fontWeight: 500, letterSpacing: -0.4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: U.ink3, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Overview
// ─────────────────────────────────────────────────────────────
function UOverview({ lam, go }) {
  return (
    <div style={{ padding: 22, display:'grid', gridTemplateColumns:'1.55fr 1fr', gap: 16 }}>
      {/* Hero */}
      <UCard style={{ gridColumn: '1 / 3' }}>
        <div style={{ padding: 22, display:'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems:'center' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
              <UBadge tone="ok" dot>Certified</UBadge>
              <span style={{ color: U.ink3, fontSize: 12 }}>cert-2026-0524-001a · issued 24 May 2026</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap: 14, marginTop: 14 }}>
              <div style={{ fontSize: 30, fontWeight: 600, color: U.ink, letterSpacing: -0.6 }}>LG3 + Phi3</div>
              <span style={{ color: U.ink3, fontSize: 13 }}>recommended serial stack · K = 2</span>
            </div>
            <div style={{ color: U.ink3, marginTop: 8, fontSize: 13, lineHeight: 1.55, maxWidth: 640 }}>
              Certified to dominate every candidate competitor under the 6-cell mixture, λ = {lam.toFixed(0)} welfare, and the customer's measurement budget. Marginal selection picks <span style={{ color: U.ink2 }}>L3-3B + LG3</span> — wrong winner — because of a +0.48 adversarial co-miss.
            </div>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <UBtn ghost>Export</UBtn>
            <UBtn primary onClick={() => go('cert')}>View certificate →</UBtn>
          </div>
        </div>
        <div style={{ borderTop: '1px solid '+U.line, padding: '16px 22px', display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 18 }}>
          <UStat label="Welfare (full)" value="0.1363" accent={U.ok}/>
          <UStat label="Regret avoided" value="+0.0253" accent={U.ok} sub="vs. marginal pick"/>
          <UStat label="95% interval" value="±0.012" sub="[+0.1245, +0.1481]"/>
          <UStat label="Pair-cells used" value="13 / 168" sub="92% reduction"/>
          <UStat label="Comparisons" value="27 / 27" accent={U.ok} sub="all certified"/>
        </div>
      </UCard>

      <UCard>
        <UCardHead title="Welfare by stack" sub="first-order → full evaluation"
          right={<UChip mono>λ = {lam.toFixed(0)}</UChip>}/>
        <UWelfareChart/>
      </UCard>

      <UCard>
        <UCardHead title="Measurement budget" sub="pair-cells per scheduler"
          right={<UBadge tone="accent">CASS recommended</UBadge>}/>
        <div style={{ padding: '14px 18px' }}>
          {METHODS.map((m, i) => {
            const pct = m.pairCells/168;
            return (
              <div key={m.method} style={{ display:'grid', gridTemplateColumns:'1.3fr 50px 1fr', alignItems:'center', gap: 12, padding:'7px 0', borderTop: i?'1px solid '+U.line:'none', fontSize: 12.5 }}>
                <span style={{ color: m.recommended ? U.ink : U.ink2, fontWeight: m.recommended?500:400, display:'flex', alignItems:'center', gap: 6 }}>
                  {m.recommended && <span style={{ width:6, height:6, borderRadius:3, background: U.accent }}/>}
                  {m.method}
                </span>
                <span style={{ fontFamily: U.mono, color: U.ink, fontSize: 12, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{m.pairCells}</span>
                <div style={{ position:'relative', height: 6, background: U.surface3, borderRadius: 3 }}>
                  <div style={{ position:'absolute', inset: 0, width: (pct*100)+'%', background: m.recommended ? U.accent : U.line2, borderRadius: 3 }}/>
                </div>
              </div>
            );
          })}
        </div>
      </UCard>

      <UCard style={{ gridColumn: '1 / 3' }}>
        <UCardHead title="Recent activity" sub="re-certification triggers and drift signals"
          right={<UBtn ghost small onClick={() => go('drift')}>Open drift monitor →</UBtn>}/>
        <div>
          {DRIFT.map((d, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns: '14px 1.4fr 1.6fr 1fr 100px', alignItems:'center', gap: 14, padding:'13px 18px', borderTop: i?'1px solid '+U.line:'none' }}>
              <USeverity s={d.severity}/>
              <div>
                <div style={{ color: U.ink, fontSize: 13, fontWeight: 500 }}>{d.signal}</div>
                <div style={{ color: U.ink3, fontSize: 11.5, marginTop: 2 }}>monitored since 1 Apr 2026</div>
              </div>
              <div style={{ color: U.ink2, fontSize: 12.5, fontFamily: U.mono }}>{d.change}</div>
              <div style={{ color: d.severity==='ok'?U.ok:d.severity==='high'?U.bad:U.warn, fontSize: 12.5 }}>{d.delta}</div>
              <UBtn small ghost>{d.severity==='ok' ? 'OK' : 'Re-certify'}</UBtn>
            </div>
          ))}
        </div>
      </UCard>
    </div>
  );
}

function USeverity({ s }) {
  const c = s==='high' ? U.bad : s==='med' ? U.warn : s==='low' ? U.accent : U.ok;
  return <span style={{ width: 9, height: 9, borderRadius: 5, background: c, boxShadow: '0 0 0 3px '+c+'22' }}/>;
}

function UWelfareChart() {
  const data = STACKS.slice().sort((a,b) => b.full - a.full);
  const max = Math.max(...data.map(d => Math.max(d.firstOrder, d.full)));
  const min = Math.min(0, ...data.map(d => Math.min(d.firstOrder, d.full)));
  const range = max - min;
  const W = 640, padL = 130, padR = 30, padT = 12, padB = 30, rowH = 26;
  const H = padT + padB + data.length * rowH;
  const innerW = W - padL - padR;
  const xZero = padL + ((-min)/range) * innerW;
  return (
    <div style={{ padding: '14px 16px' }}>
      <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }}>
        {[-0.05, 0, 0.05, 0.10, 0.15, 0.20].filter(v=>v>=min&&v<=max).map(v => {
          const x = padL + ((v-min)/range)*innerW;
          return <g key={v}>
            <line x1={x} x2={x} y1={padT} y2={H-padB} stroke={v===0?U.line2:U.line} strokeWidth={v===0?1:1} strokeDasharray={v===0?'':'2 4'}/>
            <text x={x} y={H-10} fill={U.ink3} fontSize="10.5" fontFamily={U.mono} textAnchor="middle">{uFmt(v,2)}</text>
          </g>;
        })}
        {data.map((d, i) => {
          const y = padT + i*rowH;
          const x1 = padL + ((d.firstOrder-min)/range)*innerW;
          const x2 = padL + ((d.full-min)/range)*innerW;
          const cert = d.certified;
          const fullColor = cert ? U.ok : (d.full < 0 ? U.bad : U.ink2);
          return (
            <g key={i} transform={`translate(0, ${y})`}>
              <text x={padL-10} y={rowH/2+4} fill={cert?U.ink:U.ink2} fontSize="12" fontFamily={U.sans} fontWeight={cert?500:400} textAnchor="end">{d.stack.join(' + ')}</text>
              <line x1={Math.min(x1,x2)} x2={Math.max(x1,x2)} y1={rowH/2} y2={rowH/2} stroke={fullColor} strokeWidth="1.2" opacity="0.4"/>
              <circle cx={x1} cy={rowH/2} r="3.5" fill={U.surface} stroke={U.ink3} strokeWidth="1.4"/>
              <circle cx={x2} cy={rowH/2} r="4.5" fill={fullColor}/>
              {cert && <text x={x2+10} y={rowH/2+4} fill={U.ok} fontSize="10.5" fontFamily={U.mono}>certified</text>}
              {d.full < d.firstOrder - 0.02 && <text x={x2+10} y={rowH/2+4} fill={U.bad} fontSize="10.5" fontFamily={U.mono}>{uFmt(d.full-d.firstOrder,3)}</text>}
            </g>
          );
        })}
      </svg>
      <div style={{ display:'flex', gap: 18, marginTop: 6, paddingLeft: 16, fontSize: 11.5, color: U.ink3 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><svg width="9" height="9"><circle cx="4.5" cy="4.5" r="3.5" fill={U.surface} stroke={U.ink3} strokeWidth="1.4"/></svg>First-order (marginal)</span>
        <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><svg width="11" height="11"><circle cx="5.5" cy="5.5" r="4.5" fill={U.ok}/></svg>Full evaluation</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Stack Ranking
// ─────────────────────────────────────────────────────────────
function URanking({ lam }) {
  const data = STACKS.slice().sort((a,b)=>b.full-a.full);
  return (
    <div style={{ padding: 22, display:'flex', flexDirection:'column', gap: 16 }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: U.ink, margin: 0, letterSpacing: -0.4 }}>Stack ranking</h1>
          <p style={{ color: U.ink3, fontSize: 13, margin: '4px 0 0' }}>28 size-2 serial candidates · {data.length} surfaced · K=2 exact (residual radius 0.000)</p>
        </div>
        <div style={{ flex: 1 }}/>
        <UChip mono>λ = {lam.toFixed(0)}</UChip>
        <UChip mono>ρ = 0.60</UChip>
        <UBtn ghost small>Export CSV</UBtn>
      </div>

      <UCard>
        <table style={{ width: '100%', borderCollapse:'collapse', fontFamily: U.sans, fontSize: 13 }}>
          <thead>
            <tr>
              {['#','Stack','First-order','Full','Interval','Status','Note'].map((h,i) => (
                <th key={h} style={{ textAlign: i>=2 && i<=4 ? (i===4?'center':'right') : 'left',
                  padding: '12px 18px', fontWeight: 500, fontSize: 11.5, color: U.ink3, letterSpacing: 0.3,
                  textTransform: 'uppercase', borderBottom: '1px solid '+U.line, background: U.surface2 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((s,i) => (
              <tr key={i} style={{ borderBottom: i<data.length-1?'1px solid '+U.line:'none', background: s.certified ? U.accentSoft+'80' : 'transparent' }}>
                <td style={{ padding:'13px 18px', color: U.ink3, fontFamily: U.mono, fontSize: 11.5, fontVariantNumeric:'tabular-nums', width: 40 }}>{i+1}</td>
                <td style={{ padding:'13px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                    <UChip mono style={{ background: U.surface, borderColor: s.certified?U.ok:U.line }}>{s.stack[0]}</UChip>
                    <span style={{ color: U.faint }}>+</span>
                    <UChip mono style={{ background: U.surface, borderColor: s.certified?U.ok:U.line }}>{s.stack[1]}</UChip>
                  </div>
                </td>
                <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ink3, fontVariantNumeric:'tabular-nums' }}>{uFmt2(s.firstOrder,4)}</td>
                <td style={{ padding:'13px 18px', textAlign:'right', fontFamily: U.mono, fontSize: 12.5, color: s.certified?U.ok:(s.full<0?U.bad:U.ink), fontVariantNumeric:'tabular-nums', fontWeight: s.certified?500:400 }}>{uFmt(s.full,4)}</td>
                <td style={{ padding:'13px 18px' }}><UInterval full={s.full} cert={s.certified}/></td>
                <td style={{ padding:'13px 18px' }}>
                  {s.certified ? <UBadge tone="ok" dot>Certified</UBadge>
                    : s.full < 0 ? <UBadge tone="bad" dot>Negative welfare</UBadge>
                    : <UBadge tone="neutral">Open</UBadge>}
                </td>
                <td style={{ padding:'13px 18px', color: U.ink3, fontSize: 12.5 }}>{s.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </UCard>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 16 }}>
        <UCard>
          <UCardHead title="Regret across λ" sub="marginal selection vs. CASS certification"/>
          <div style={{ padding: 16 }}><URegretChart/></div>
        </UCard>
        <UCard>
          <UCardHead title="Reading the curve"/>
          <div style={{ padding: 18 }}>
            <ul style={{ paddingLeft: 18, margin: 0, color: U.ink2, fontSize: 13, lineHeight: 1.65 }}>
              <li>At λ ≤ 2, both methods pick the same winner — no measurement needed.</li>
              <li>At λ ≥ 4 the ranking flips. Marginal regret stabilises near 0.03.</li>
              <li>CASS regret stays at 0 across the certified candidate set.</li>
            </ul>
            <div style={{ marginTop: 14, padding: 12, background: U.accentSoft, border: '1px solid '+U.accent+'22', borderRadius: 8, color: U.ink2, fontSize: 12.5, lineHeight: 1.55 }}>
              <strong style={{ color: U.accent }}>Recommendation.</strong> If your deployment uses λ ≥ 5 — most regulated copilots do — adopt CASS-greedy and re-certify on every drift signal. The cost of the wrong winner here is roughly twice the cost of the certification itself.
            </div>
          </div>
        </UCard>
      </div>
    </div>
  );
}

function UInterval({ full, cert }) {
  const min = -0.15, max = 0.20, W = 120, H = 16, r = 0.018;
  const x0 = ((0-min)/(max-min))*W;
  const x = ((full-min)/(max-min))*W;
  const rad = (r/(max-min))*W;
  const color = cert ? U.ok : full<0 ? U.bad : U.ink2;
  return (
    <svg width={W} height={H} style={{ display:'block', margin:'0 auto' }}>
      <line x1={0} x2={W} y1={H/2} y2={H/2} stroke={U.line2}/>
      <line x1={x0} x2={x0} y1={2} y2={H-2} stroke={U.ink3} strokeWidth="0.8"/>
      <rect x={x-rad} y={H/2-2} width={rad*2} height={4} fill={color} rx={1}/>
      <circle cx={x} cy={H/2} r="3.2" fill={color} stroke={U.surface} strokeWidth="1.2"/>
    </svg>
  );
}

function URegretChart() {
  const W = 540, H = 200, padL = 36, padR = 14, padT = 12, padB = 30;
  const lamPts = [1,2,3,4,5,6,8,10,12,15,20];
  const marg = [0,0,0.004,0.012,0.025,0.029,0.030,0.032,0.034,0.036,0.038];
  const cass = lamPts.map(()=>0);
  const yMax = 0.045;
  const xOf = i => padL + (i/(lamPts.length-1))*(W-padL-padR);
  const yOf = v => padT + (1-v/yMax)*(H-padT-padB);
  return (
    <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }}>
      {[0,0.01,0.02,0.03,0.04].map(v => (
        <g key={v}>
          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={U.line}/>
          <text x={padL-8} y={yOf(v)+3} textAnchor="end" fill={U.ink3} fontSize="10" fontFamily={U.mono}>{v.toFixed(2)}</text>
        </g>
      ))}
      {lamPts.map((l,i)=> <text key={l} x={xOf(i)} y={H-14} textAnchor="middle" fill={U.ink3} fontSize="10" fontFamily={U.mono}>{l}</text>)}
      <text x={W/2} y={H-2} textAnchor="middle" fill={U.ink3} fontFamily={U.sans} fontSize="11">λ — adversarial-miss cost</text>
      <path d={marg.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={U.bad} strokeWidth="2"/>
      <path d={cass.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={U.ok} strokeWidth="2"/>
      {marg.map((v,i) => v>0.001 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2.5" fill={U.bad}/>)}
      <text x={xOf(9)} y={yOf(marg[9])-9} textAnchor="middle" fontFamily={U.sans} fontSize="11.5" fontWeight="500" fill={U.bad}>Marginal</text>
      <text x={xOf(2)} y={yOf(0)+14} textAnchor="middle" fontFamily={U.sans} fontSize="11.5" fontWeight="500" fill={U.ok}>CASS</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Co-failure
// ─────────────────────────────────────────────────────────────
function UCorr() {
  const [side, setSide] = React.useState('adv');
  const M = side==='adv' ? CORR_ADV : CORR_BEN;
  return (
    <div style={{ padding: 22, display:'flex', flexDirection:'column', gap: 16 }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: U.ink, margin: 0, letterSpacing: -0.4 }}>Co-failure</h1>
          <p style={{ color: U.ink3, fontSize: 13, margin: '4px 0 0' }}>
            {side==='adv' ? 'Adversarial co-miss correlations — where stacking buys nothing.' : 'Benign co-block correlations — where overblock concentrates.'}
          </p>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display:'flex', background: U.surface3, padding: 2, borderRadius: 7 }}>
          {[['adv','Adversarial'], ['benign','Benign']].map(([id,label]) => (
            <button key={id} onClick={()=>setSide(id)}
              style={{ background: side===id?U.surface:'transparent', boxShadow: side===id?'0 1px 2px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)':'none',
                color: side===id?U.ink:U.ink3, border:'none', padding:'5px 12px', fontFamily: U.sans, fontSize: 12, fontWeight: 500, cursor:'pointer', borderRadius: 5 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 16 }}>
        <UCard>
          <UCardHead title="Block-correlation matrix" sub="8 guards × 8 guards · color = magnitude · sign at sign"/>
          <UMatrix M={M} side={side}/>
        </UCard>
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          <UCard>
            <UCardHead title={side==='adv' ? 'Top co-misses' : 'Top benign overlaps'}/>
            <div>
              {topPairsU(M).slice(0,6).map((p,i) => (
                <div key={i} style={{ padding:'10px 18px', borderTop: i?'1px solid '+U.line:'none', display:'flex', alignItems:'center', gap: 10 }}>
                  <span style={{ color: U.dim, width: 14, fontSize: 11.5, fontFamily: U.mono }}>{i+1}</span>
                  <UChip mono>{p.a}</UChip>
                  <span style={{ color: U.faint }}>×</span>
                  <UChip mono>{p.b}</UChip>
                  <div style={{ flex:1 }}/>
                  <UBadge tone={p.r>0.5?'bad':p.r>0.2?'warn':'neutral'} dot>{uFmt(p.r,3)}</UBadge>
                </div>
              ))}
            </div>
          </UCard>
          <UCard padding={18}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: U.accent, textTransform:'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Hotspot</div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: U.ink2 }}>
              {side==='adv'
                ? <><strong>Lex × Rules</strong> both pass <strong>95.0%</strong> of <em>A/XSTest-unsafe</em> with block correlation <strong style={{color:U.bad}}>+0.946</strong>. Stacking these guards adds essentially no adversarial coverage — the redundancy is illusory.</>
                : <><strong>Gemma × Phi3</strong> both block <strong>48.0%</strong> of <em>N/XSTest-safe</em>. Overblock concentrates on one benign cluster — the stack's effective false-block rate is much lower than marginal scores suggest.</>
              }
            </p>
          </UCard>
        </div>
      </div>
    </div>
  );
}

function UMatrix({ M, side }) {
  const g = GUARDS.map(x => x.id);
  const N = g.length, cell = 50;
  const W = cell*(N+1)+10, H = cell*(N+1)+10;
  const tint = side==='adv' ? [201, 42, 42] : [37, 99, 154];
  const colorOf = (r) => {
    if (r === 1) return U.surface3;
    const t = Math.max(-1, Math.min(1, r));
    if (t >= 0) {
      const a = Math.pow(t, 0.6) * 0.9;
      return `rgba(${tint[0]},${tint[1]},${tint[2]},${a})`;
    } else {
      const a = Math.pow(-t, 0.6) * 0.35;
      return `rgba(31,157,85,${a})`;
    }
  };
  return (
    <div style={{ padding: 18, overflow:'auto' }}>
      <svg width={W} height={H} style={{ display:'block' }}>
        {g.map((id, i) => (
          <text key={'h'+id} x={(i+1)*cell + cell/2} y={cell-12} fill={U.ink3} fontSize="11" fontFamily={U.mono} textAnchor="middle">{id}</text>
        ))}
        {g.map((id, i) => (
          <text key={'v'+id} x={cell-10} y={(i+1)*cell + cell/2 + 4} fill={U.ink3} fontSize="11" fontFamily={U.mono} textAnchor="end">{id}</text>
        ))}
        {g.map((a, i) => g.map((b, j) => {
          const r = M[a+'|'+b];
          const fill = colorOf(r);
          const x = (j+1)*cell + 2, y = (i+1)*cell + 2, sz = cell-4;
          const lightText = Math.abs(r) > 0.55;
          return (
            <g key={a+'|'+b}>
              <rect x={x} y={y} width={sz} height={sz} fill={fill} rx={4} stroke={U.line}/>
              {a !== b && <text x={x+sz/2} y={y+sz/2+4} fill={lightText?U.surface:U.ink2} fontSize="10.5" fontFamily={U.mono} textAnchor="middle" fontVariantNumeric="tabular-nums">{r.toFixed(2)}</text>}
            </g>
          );
        }))}
      </svg>
    </div>
  );
}

function topPairsU(M) {
  const g = GUARDS.map(x => x.id);
  const out = [];
  for (let i=0;i<g.length;i++) for (let j=i+1;j<g.length;j++) {
    out.push({ a: g[i], b: g[j], r: M[g[i]+'|'+g[j]] });
  }
  out.sort((a,b) => b.r - a.r);
  return out;
}

// ─────────────────────────────────────────────────────────────
// Screen: Measurements
// ─────────────────────────────────────────────────────────────
function UPlanner() {
  const [sel, setSel] = React.useState(new Set(['m-001','m-002']));
  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selArr = MEASUREMENTS.filter(m => sel.has(m.id));
  const totalRad = selArr.reduce((a,m)=>a+m.radiusΔ,0);
  const totalCost = selArr.reduce((a,m)=>a+m.cost,0);
  return (
    <div style={{ padding: 22, display:'flex', flexDirection:'column', gap: 16 }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: U.ink, margin: 0, letterSpacing: -0.4 }}>Measurements</h1>
          <p style={{ color: U.ink3, fontSize: 13, margin: '4px 0 0' }}>Bundle-greedy pair-cell evaluations queued by CASS. Toggle rows to plan a run.</p>
        </div>
        <div style={{ flex: 1 }}/>
        <UBadge tone="neutral">{sel.size} selected</UBadge>
        <UBtn primary>Queue {sel.size} measurements →</UBtn>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap: 16 }}>
        <UCard>
          <table style={{ width: '100%', borderCollapse:'collapse', fontFamily: U.sans, fontSize: 13 }}>
            <thead>
              <tr>
                {['','Pair','Cell','Reason','Δ-radius','Cost'].map((h, i) => (
                  <th key={i} style={{ textAlign: i>=4?'right':'left', padding:'12px 16px', fontWeight: 500, fontSize: 11.5, color: U.ink3, letterSpacing: 0.3, textTransform:'uppercase', borderBottom:'1px solid '+U.line, background: U.surface2, width: i===0?32:undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEASUREMENTS.map((m, i) => (
                <tr key={m.id} onClick={()=>toggle(m.id)}
                  style={{ borderBottom: i<MEASUREMENTS.length-1?'1px solid '+U.line:'none', cursor:'pointer', background: sel.has(m.id) ? U.accentSoft+'80' : 'transparent' }}>
                  <td style={{ padding:'13px 16px' }}>
                    <span style={{ display:'inline-flex', width: 16, height: 16, borderRadius: 4, border:'1.5px solid '+(sel.has(m.id)?U.accent:U.line2), background: sel.has(m.id)?U.accent:U.surface, alignItems:'center', justifyContent:'center' }}>
                      {sel.has(m.id) && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={U.surface} strokeWidth="2" strokeLinecap="round"><path d="M2 5l2 2 4-4.5"/></svg>}
                    </span>
                  </td>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                      <UChip mono>{m.pair[0]}</UChip>
                      <span style={{ color: U.faint }}>×</span>
                      <UChip mono>{m.pair[1]}</UChip>
                    </div>
                  </td>
                  <td style={{ padding:'13px 16px', fontFamily: U.mono, fontSize: 11.5, color: U.ink2 }}>{m.cell}</td>
                  <td style={{ padding:'13px 16px', color: U.ink3, fontSize: 12.5 }}>{m.reason}</td>
                  <td style={{ padding:'13px 16px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ok, fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>−{m.radiusΔ.toFixed(4)}</td>
                  <td style={{ padding:'13px 16px', textAlign:'right', fontFamily: U.mono, fontSize: 12, color: U.ink2, fontVariantNumeric:'tabular-nums' }}>${m.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </UCard>

        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          <UCard>
            <UCardHead title="Selection summary"/>
            <div style={{ padding: 18, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 18 }}>
              <UStat label="Selected" value={sel.size+' / '+MEASUREMENTS.length}/>
              <UStat label="Δ-radius" value={'−'+totalRad.toFixed(4)} accent={U.ok}/>
              <UStat label="Est. cost" value={'$'+totalCost}/>
              <UStat label="Time" value={(sel.size*1.4).toFixed(1)+' h'}/>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{ padding: 12, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8, color: U.ink2, fontSize: 12.5, lineHeight: 1.55 }}>
                Running the selected bundle closes the two remaining unresolved comparisons and refreshes the certificate in about <strong style={{color:U.ink}}>{(sel.size*1.4).toFixed(0)} hours</strong>.
              </div>
            </div>
          </UCard>
          <UCard>
            <UCardHead title="Alternative schedulers" sub="for comparison"/>
            <div>
              {[
                { name:'Uncertainty-greedy', cells: 67 },
                { name:'Uniform-by-cell',    cells: 84 },
                { name:'MIP width-cover',    cells: 22 },
              ].map((a, i) => (
                <div key={a.name} style={{ display:'flex', alignItems:'center', padding:'10px 18px', borderTop: i?'1px solid '+U.line:'none', fontSize: 13 }}>
                  <span style={{ color: U.ink2 }}>{a.name}</span>
                  <div style={{flex:1}}/>
                  <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.ink3 }}>{a.cells} cells</span>
                </div>
              ))}
            </div>
          </UCard>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Certificate
// ─────────────────────────────────────────────────────────────
function UCertificate({ lam }) {
  return (
    <div style={{ padding: 22, display:'flex', flexDirection:'column', gap: 16, maxWidth: 1100, margin: '0 auto', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: U.ink, margin: 0, letterSpacing: -0.4 }}>Certificate</h1>
          <p style={{ color: U.ink3, fontSize: 13, margin: '4px 0 0' }}>cert-2026-0524-001a · issued 24 May 2026 · expires 24 Jun 2026</p>
        </div>
        <div style={{ flex: 1 }}/>
        <UBtn ghost small>Copy link</UBtn>
        <UBtn ghost small>Export JSON</UBtn>
        <UBtn ghost small>Export Markdown</UBtn>
        <UBtn primary small>Submit to GRC</UBtn>
      </div>

      <UCard>
        {/* certificate "letterhead" */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid '+U.line, background: 'linear-gradient(180deg, '+U.accentSoft+'33 0%, transparent 100%)' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <UBadge tone="ok" dot>Certified</UBadge>
            <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.ink3 }}>conditional · finite-benchmark · K = 2 exact</span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: U.ink, marginTop: 14, letterSpacing: -0.8 }}>LG3 + Phi3</div>
          <div style={{ fontSize: 14, color: U.ink2, marginTop: 6, maxWidth: 720, lineHeight: 1.55 }}>
            Under the stated candidate set, benchmark mixture, serial aggregation rule, welfare profile, and uncertainty model, this stack is certified to dominate every candidate competitor with strictly positive welfare gap.
          </div>
        </div>

        {/* body */}
        <div style={{ padding: 28, display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 32 }}>
          <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', rowGap: 14, fontSize: 13.5 }}>
            <UField label="Application"          value="acme-copilot · production · us-east"/>
            <UField label="Candidate set"        value="8 guards · 28 size-2 serial ensembles"/>
            <UField label="Aggregation"          value="serial · K = 2 · residual radius 0.000"/>
            <UField label="Benchmark mixture"    value="2,000 examples — 1,195 adv across 4 cells, 805 benign across 2 cells"/>
            <UField label="Welfare profile"      value={`λ = ${lam.toFixed(0)} · π_A inferred · uniform source weights`}/>
            <UField label="Measurement coverage" value="10 agent-cells · 13 pair-cells · 0 parse failures · 0 errors"/>
            <UField label="Welfare estimate"     value="0.1363  [+0.1245, +0.1481]"  accent/>
            <UField label="Comparisons"          value="27 of 27 certified · 0 unresolved"            accent/>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
            <div style={{ padding: 16, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform:'uppercase' }}>Versions</div>
              <div style={{ fontFamily: U.mono, fontSize: 12, marginTop: 10, color: U.ink2, lineHeight: 1.8 }}>
                <div><span style={{ color: U.ink, display:'inline-block', width: 60 }}>LG3</span>llama-guard3-1B · 3-1B</div>
                <div><span style={{ color: U.ink, display:'inline-block', width: 60 }}>Phi3</span>phi3-mini · mini</div>
                <div><span style={{ color: U.ink, display:'inline-block', width: 60 }}>Policy</span>acme-tos@v4.2</div>
                <div><span style={{ color: U.ink, display:'inline-block', width: 60 }}>Prompt</span>cass-judge@v1.7</div>
              </div>
            </div>

            <div style={{ padding: 16, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform:'uppercase' }}>Re-certify on</div>
              <ul style={{ fontSize: 12.5, color: U.ink2, paddingLeft: 18, marginTop: 8, lineHeight: 1.7 }}>
                <li>Guard version diff</li>
                <li>Traffic mixture shift &gt; 8%</li>
                <li>New attack family observed</li>
                <li>Policy or prompt update</li>
                <li>Monthly default cadence</li>
              </ul>
            </div>

            <div style={{ padding: 16, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8, display:'flex', alignItems:'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: U.line2 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: U.ink }}>Awaiting reviewer signoff</div>
                <div style={{ fontSize: 11.5, color: U.ink3 }}>Assigned to · model-risk-lead@acme</div>
              </div>
              <UBtn primary small>Sign</UBtn>
            </div>
          </div>
        </div>

        {/* limitations */}
        <div style={{ padding: '0 28px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform:'uppercase', marginBottom: 8 }}>Limitations</div>
          <ul style={{ paddingLeft: 18, margin: 0, color: U.ink2, fontSize: 13, lineHeight: 1.65 }}>
            <li>Conditional on the specified benchmark mixture; not a deployment-general guarantee.</li>
            <li>Leave-one-source-out: hold-out regret 1.078 when HarmBench is excluded — re-certify if traffic shifts.</li>
            <li>Applies to K = 2 only. For K ≥ 3, residual uncertainty must be carried.</li>
            <li>Source weights, λ, and π_A are customer-supplied and were not independently validated.</li>
          </ul>
        </div>
      </UCard>
    </div>
  );
}

function UField({ label, value, accent }) {
  return (
    <>
      <div style={{ color: U.ink3, fontSize: 12.5 }}>{label}</div>
      <div style={{ color: accent ? U.ok : U.ink, fontFamily: U.mono, fontSize: 12.5, fontVariantNumeric:'tabular-nums' }}>{value}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Drift
// ─────────────────────────────────────────────────────────────
function UDrift() {
  return (
    <div style={{ padding: 22, display:'flex', flexDirection:'column', gap: 16 }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: U.ink, margin: 0, letterSpacing: -0.4 }}>Drift</h1>
          <p style={{ color: U.ink3, fontSize: 13, margin: '4px 0 0' }}>Continuous re-certification triggers — model, prompt, traffic, attack-family.</p>
        </div>
        <div style={{ flex: 1 }}/>
        <UBadge tone="warn" dot>1 high · 1 med</UBadge>
        <UBtn ghost small>Configure</UBtn>
      </div>

      <UCard>
        <div>
          {DRIFT.map((d, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns: '14px 1.6fr 1.6fr 1.2fr 100px', alignItems:'center', gap: 16, padding:'16px 18px', borderTop: i?'1px solid '+U.line:'none' }}>
              <USeverity s={d.severity}/>
              <div>
                <div style={{ color: U.ink, fontSize: 13.5, fontWeight: 500 }}>{d.signal}</div>
                <div style={{ color: U.ink3, fontSize: 11.5, marginTop: 2 }}>monitored since 1 Apr 2026</div>
              </div>
              <div style={{ color: U.ink2, fontSize: 12.5, fontFamily: U.mono }}>{d.change}</div>
              <div style={{ color: d.severity==='ok'?U.ok:d.severity==='high'?U.bad:U.warn, fontSize: 12.5 }}>{d.delta}</div>
              <UBtn small primary={d.severity!=='ok'} ghost={d.severity==='ok'}>
                {d.severity==='ok' ? 'OK' : 'Re-certify'}
              </UBtn>
            </div>
          ))}
        </div>
      </UCard>

      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 16 }}>
        <UCard>
          <UCardHead title="Traffic mixture (30d)" sub="adversarial share of traffic"/>
          <div style={{ padding: 16 }}><UTimeline/></div>
        </UCard>
        <UCard>
          <UCardHead title="Re-certification history"/>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: U.sans, fontSize: 12.5 }}>
            <tbody>
              {[
                { date: '24 May 2026', who: 'cass-greedy', stack: 'LG3 + Phi3',  status: 'ok' },
                { date: '29 Apr 2026', who: 'cass-greedy', stack: 'LG3 + Phi3',  status: 'ok' },
                { date: '2 Apr 2026',  who: 'manual',      stack: 'L3-3B + LG3', status: 'ok' },
                { date: '5 Mar 2026',  who: 'cass-greedy', stack: 'L3-3B + LG3', status: 'ok' },
                { date: '8 Feb 2026',  who: 'cass-greedy', stack: 'L3-3B + LG3', status: 'exp' },
              ].map((r, i) => (
                <tr key={i} style={{ borderTop: i?'1px solid '+U.line:'none' }}>
                  <td style={{ padding:'11px 18px', fontFamily: U.mono, fontSize: 11.5, color: U.ink3, fontVariantNumeric:'tabular-nums', width: 110 }}>{r.date}</td>
                  <td style={{ padding:'11px 16px', color: U.ink3 }}>{r.who}</td>
                  <td style={{ padding:'11px 16px', color: U.ink, fontFamily: U.mono, fontSize: 11.5 }}>{r.stack}</td>
                  <td style={{ padding:'11px 18px', textAlign:'right' }}>
                    {r.status==='ok' ? <UBadge tone="ok" dot>Certified</UBadge> : <UBadge tone="neutral">Expired</UBadge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </UCard>
      </div>
    </div>
  );
}

function UTimeline() {
  const days = 30;
  const adv = Array.from({length: days}, (_,i) => 0.48 + Math.sin(i/3)*0.04 + (i>22?0.06:0));
  const W = 540, H = 180, padL = 36, padR = 14, padT = 14, padB = 30;
  const yMax = 0.7, yMin = 0.3;
  const xOf = i => padL + (i/(days-1))*(W-padL-padR);
  const yOf = v => padT + (1-(v-yMin)/(yMax-yMin))*(H-padT-padB);
  const linePts = adv.map((v,i)=>[xOf(i), yOf(v)]);
  const area = linePts.map((p,i)=> (i?'L':'M')+p.join(',')).join(' ') + ` L${xOf(days-1)},${H-padB} L${xOf(0)},${H-padB} Z`;
  return (
    <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }}>
      <defs>
        <linearGradient id="ugrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={U.accent} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={U.accent} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.3, 0.5, 0.7].map(v => (
        <g key={v}><line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={U.line}/><text x={padL-8} y={yOf(v)+3} textAnchor="end" fill={U.ink3} fontSize="10" fontFamily={U.mono}>{(v*100).toFixed(0)}%</text></g>
      ))}
      <line x1={padL} x2={W-padR} y1={yOf(0.55)} y2={yOf(0.55)} stroke={U.warn} strokeDasharray="3 4"/>
      <text x={W-padR-4} y={yOf(0.55)-4} textAnchor="end" fill={U.warn} fontSize="10" fontFamily={U.sans}>drift threshold 55%</text>
      <path d={area} fill="url(#ugrad)"/>
      <path d={linePts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')} fill="none" stroke={U.accent} strokeWidth="2"/>
      {adv.map((v,i) => v>0.55 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2.5" fill={U.warn}/>)}
      <text x={padL} y={H-10} fill={U.ink3} fontSize="10" fontFamily={U.mono}>30d ago</text>
      <text x={W-padR} y={H-10} textAnchor="end" fill={U.ink3} fontSize="10" fontFamily={U.mono}>today</text>
    </svg>
  );
}

Object.assign(window, { UIApp });
