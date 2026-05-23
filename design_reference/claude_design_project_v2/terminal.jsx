// Direction A — "Terminal"
// Dark, monospace, data-dense. Bloomberg / observability-tool feel.

const T = {
  bg:     '#0b0e11',
  panel:  '#12161a',
  panel2: '#171c21',
  line:   '#222a32',
  line2:  '#2c3640',
  ink:    '#e7edf2',
  ink2:   '#a8b2bd',
  dim:    '#677381',
  faint:  '#414c57',
  green:  '#5cd28a',
  amber:  '#f0b656',
  red:    '#ef6d6d',
  blue:   '#74a7ff',
  mag:    '#c483f5',
  cyan:   '#5fd2cc',
  mono:   '"IBM Plex Mono","JetBrains Mono",ui-monospace,Menlo,monospace',
  sans:   '"IBM Plex Sans","Inter",system-ui,sans-serif',
};

const tFmt = (n, d=3) => (n>=0?'+':'') + n.toFixed(d);
const tFmt2 = (n, d=3) => n.toFixed(d);

// ─────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────
function TerminalApp() {
  const [route, setRoute] = React.useState('overview');
  const [persona, setPersona] = React.useState('security'); // 'platform' | 'security' | 'grc'
  const [lam, setLam] = React.useState(5);
  const lamPreset = LAMBDA_PRESETS[lam] || LAMBDA_PRESETS[5];

  const nav = [
    { id: 'overview',   label: 'Overview',    icon: '▤' },
    { id: 'ranking',    label: 'Stack Rank',  icon: '≣' },
    { id: 'corr',       label: 'Co-failure',  icon: '◫' },
    { id: 'planner',    label: 'Measurement', icon: '◇' },
    { id: 'cert',       label: 'Certificate', icon: '✓' },
    { id: 'drift',      label: 'Drift',       icon: '∿' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: T.bg, color: T.ink, fontFamily: T.mono, fontSize: 12, display: 'flex', flexDirection: 'column' }}>
      <TopBar persona={persona} setPersona={setPersona} lam={lam} setLam={setLam} lamPreset={lamPreset}/>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <SideNav nav={nav} route={route} setRoute={setRoute} />
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {route === 'overview' && <TOverview lam={lam} persona={persona} go={setRoute}/>}
          {route === 'ranking'  && <TRanking lam={lam} />}
          {route === 'corr'     && <TCorr />}
          {route === 'planner'  && <TPlanner />}
          {route === 'cert'     && <TCertificate lam={lam} />}
          {route === 'drift'    && <TDrift />}
        </div>
      </div>
      <StatusBar route={route} lam={lam}/>
    </div>
  );
}

function TopBar({ persona, setPersona, lam, setLam, lamPreset }) {
  const personas = [
    { id: 'platform', label: 'AI PLATFORM' },
    { id: 'security', label: 'AI SECURITY' },
    { id: 'grc',      label: 'MODEL RISK' },
  ];
  return (
    <div style={{ height: 44, borderBottom: '1px solid '+T.line, display:'flex', alignItems:'center', padding:'0 16px', background: T.panel, gap: 14 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <div style={{ width: 22, height: 22, background: T.green, color: T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 700, fontSize: 13, fontFamily: T.mono }}>S</div>
        <div style={{ letterSpacing: 0.5, fontWeight: 600 }}>STACKCERT</div>
        <div style={{ color: T.dim, marginLeft: 6 }}>/</div>
        <div style={{ color: T.ink2 }}>acme-copilot · prod</div>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <span style={{ color: T.dim }}>λ</span>
        <input type="range" min="1" max="20" step="1" value={lam}
          onChange={e => setLam(parseInt(e.target.value))}
          style={{ width: 100, accentColor: T.green }}/>
        <span style={{ fontFamily: T.mono, color: T.ink, width: 44, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{lam.toFixed(1)}</span>
        <span style={{ color: T.dim, fontSize: 11 }}>{lamPreset?.name || 'custom'}</span>
      </div>
      <div style={{ width: 1, height: 22, background: T.line }}/>
      <div style={{ display:'flex', border: '1px solid '+T.line2, borderRadius: 2 }}>
        {personas.map(p => (
          <button key={p.id} onClick={() => setPersona(p.id)}
            style={{ background: persona===p.id ? T.line2 : 'transparent', color: persona===p.id ? T.ink : T.ink2,
              border: 'none', padding: '5px 10px', fontFamily: T.mono, fontSize: 10.5, letterSpacing: 0.6, cursor:'pointer' }}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideNav({ nav, route, setRoute }) {
  return (
    <div style={{ width: 178, background: T.panel, borderRight: '1px solid '+T.line, padding: '14px 0', flexShrink: 0 }}>
      <div style={{ padding: '0 14px 8px', color: T.dim, fontSize: 10, letterSpacing: 0.8 }}>SECTIONS</div>
      {nav.map(n => (
        <button key={n.id} onClick={() => setRoute(n.id)}
          style={{ display:'flex', alignItems:'center', gap: 10, width:'100%', padding:'7px 14px',
            background: route===n.id ? T.line : 'transparent',
            borderTop:'none', borderRight:'none', borderBottom:'none',
            borderLeft: '2px solid ' + (route===n.id ? T.green : 'transparent'),
            color: route===n.id ? T.ink : T.ink2, cursor:'pointer', fontFamily: T.mono, fontSize: 12, textAlign:'left' }}>
          <span style={{ color: route===n.id ? T.green : T.dim, width: 12, textAlign:'center' }}>{n.icon}</span>
          {n.label}
        </button>
      ))}
      <div style={{ padding: '18px 14px 6px', color: T.dim, fontSize: 10, letterSpacing: 0.8 }}>RUN</div>
      <div style={{ padding: '0 14px', color: T.ink2, fontSize: 11, lineHeight: 1.7 }}>
        <div>id  <span style={{color:T.ink}}>run-0c3f</span></div>
        <div>seed <span style={{color:T.ink}}>1729</span></div>
        <div>K   <span style={{color:T.ink}}>2</span></div>
        <div>ρ   <span style={{color:T.ink}}>0.60</span></div>
        <div>n   <span style={{color:T.ink}}>2,000</span></div>
      </div>
    </div>
  );
}

function StatusBar({ route, lam }) {
  return (
    <div style={{ height: 22, background: T.panel, borderTop: '1px solid '+T.line, display:'flex', alignItems:'center', padding:'0 14px', gap: 18, fontSize: 10.5, color: T.dim, letterSpacing: 0.4 }}>
      <span style={{ color: T.green }}>● CONNECTED</span>
      <span>route: <span style={{color:T.ink2}}>{route}</span></span>
      <span>λ = <span style={{color:T.ink2}}>{lam.toFixed(1)}</span></span>
      <span>n = <span style={{color:T.ink2}}>2,000</span></span>
      <span>parse fail <span style={{color:T.green}}>0</span></span>
      <span>errors <span style={{color:T.green}}>0</span></span>
      <div style={{flex:1}}/>
      <span>v0.4.1 · K=2 exact</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable panel
// ─────────────────────────────────────────────────────────────
function TPanel({ title, sub, right, children, style }) {
  return (
    <div style={{ background: T.panel, border: '1px solid '+T.line, ...style }}>
      <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid '+T.line, gap: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.6, color: T.ink2 }}>{title}</div>
        {sub && <div style={{ color: T.dim, fontSize: 10.5 }}>{sub}</div>}
        <div style={{flex:1}}/>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

// Tiny inline sparkline
function Spark({ values, w=80, h=18, color=T.green }) {
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v,i) => [i*(w/(values.length-1)), h - ((v-min)/(max-min||1))*h*0.9 - 1].join(',')).join(' ');
  return <svg width={w} height={h} style={{ display:'block' }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.2"/></svg>;
}

// ─────────────────────────────────────────────────────────────
// Screen: Overview
// ─────────────────────────────────────────────────────────────
function TOverview({ lam, persona, go }) {
  const preset = LAMBDA_PRESETS[lam] || LAMBDA_PRESETS[5];
  const winner = STACKS.find(s => s.certified) || STACKS[1];
  const incumbent = STACKS[0];
  const drift = DRIFT;

  return (
    <div style={{ padding: 14, display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap: 12 }}>
      <TPanel title="RECOMMENDED STACK" sub="serial · K=2"
        right={<span style={{ color: T.green, fontSize: 10.5, letterSpacing: 0.6 }}>● CERTIFIED</span>}
        style={{ gridColumn: '1 / 3' }}>
        <div style={{ padding: 16, display:'flex', alignItems:'center', gap: 20 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <Chip text={winner.stack[0]} color={T.cyan}/>
            <span style={{ color: T.dim }}>→</span>
            <Chip text={winner.stack[1]} color={T.cyan}/>
          </div>
          <div style={{ width: 1, height: 36, background: T.line }}/>
          <Stat label="welfare" value={tFmt2(winner.full,4)} accent={T.green}/>
          <Stat label="regret avoided" value={'+'+tFmt2(preset.regret||0.0253,4)} accent={T.green}/>
          <Stat label="vs marginal pick" value={incumbent.stack.join(' + ')} mono dim/>
          <div style={{flex:1}}/>
          <button onClick={() => go('cert')} style={{ background: 'transparent', color: T.green, border: '1px solid '+T.green, padding: '7px 12px', fontFamily: T.mono, fontSize: 11, cursor:'pointer', letterSpacing: 0.5 }}>VIEW CERTIFICATE →</button>
        </div>
        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid '+T.line, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14 }}>
          <KV k="benign pass-through P_w" v="0.8721" />
          <KV k="adv miss-through M_w" v="0.1471" />
          <KV k="welfare gap [lo, hi]" v="[+0.0094, +0.0412]" />
          <KV k="active comparisons" v="0 / 27 unresolved" />
        </div>
      </TPanel>

      <TPanel title="MEASUREMENT BUDGET" sub="pair-cells used"
        right={<span style={{ color: T.dim, fontSize: 10.5 }}>budget 0.50 · ρ=0.60</span>}>
        <div style={{ padding: 14 }}>
          {METHODS.map(m => (
            <div key={m.method} style={{ display:'grid', gridTemplateColumns:'1.3fr 50px 1fr 60px', alignItems:'center', gap: 8, padding:'4px 0', fontSize: 11.5 }}>
              <span style={{ color: m.recommended ? T.green : T.ink2 }}>{m.recommended && '▸ '}{m.method}</span>
              <span style={{ color: T.ink, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{m.pairCells}</span>
              <div style={{ position:'relative', height: 6, background: T.line, borderRadius: 1 }}>
                <div style={{ position:'absolute', inset: 0, width: (m.pairCells/168*100)+'%', background: m.recommended ? T.green : T.faint }}/>
              </div>
              <span style={{ color: m.recommended ? T.green : T.dim, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>
                {m.recommended ? '92% ↓' : ((168-m.pairCells)/168*100).toFixed(0)+'%'}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 10, background: T.panel2, fontSize: 11, color: T.ink2, lineHeight: 1.5 }}>
            CASS-greedy certifies the winner at <span style={{color:T.green}}>13 pair-cells</span> vs. exhaustive K=2 evaluation requiring <span style={{color:T.ink}}>168</span>. <span style={{color:T.dim}}>92% reduction.</span>
          </div>
        </div>
      </TPanel>

      <TPanel title="DRIFT SIGNALS" sub="re-certification triggers">
        <div style={{ padding: 6 }}>
          {drift.map((d,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, padding:'9px 10px', borderBottom: i<drift.length-1 ? '1px solid '+T.line : 'none' }}>
              <SeverityDot s={d.severity}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontSize: 11.5 }}>{d.signal}</div>
                <div style={{ color: T.dim, fontSize: 10.5, marginTop: 2 }}>{d.change} · {d.delta}</div>
              </div>
            </div>
          ))}
        </div>
      </TPanel>

      <TPanel title="WELFARE — FIRST-ORDER vs FULL EVAL" sub={`λ = ${lam.toFixed(1)}`}
        style={{ gridColumn: '1 / 4' }}>
        <WelfareDeltaChart lam={lam}/>
      </TPanel>

      <TPanel title="PARSE QUALITY" sub="2000 rows × 8 guards" style={{ gridColumn:'1 / 2' }}>
        <div style={{ padding: 14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10 }}>
          <KV k="parse failures" v="0" accent={T.green}/>
          <KV k="errors" v="0" accent={T.green}/>
          <KV k="missing" v="0" accent={T.green}/>
          <KV k="rows captured" v="16,000"/>
          <KV k="bootstrap n" v="200"/>
          <KV k="seeds" v="50"/>
        </div>
      </TPanel>

      <TPanel title="BENCHMARK MIXTURE" sub="2,000 examples" style={{ gridColumn:'2 / 4' }}>
        <BenchMix />
      </TPanel>
    </div>
  );
}

function Stat({ label, value, accent, mono, dim }) {
  return (
    <div>
      <div style={{ color: T.dim, fontSize: 10, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ color: accent || (dim ? T.ink2 : T.ink), fontSize: 16, fontFamily: T.mono, marginTop: 2, fontVariantNumeric:'tabular-nums' }}>{value}</div>
    </div>
  );
}
function KV({ k, v, accent }) {
  return (
    <div style={{ padding:'2px 0' }}>
      <div style={{ color: T.dim, fontSize: 10, letterSpacing: 0.4 }}>{k}</div>
      <div style={{ color: accent || T.ink, fontFamily: T.mono, fontSize: 12.5, marginTop: 2, fontVariantNumeric:'tabular-nums' }}>{v}</div>
    </div>
  );
}
function Chip({ text, color }) {
  return <span style={{ border: '1px solid '+color, color, padding: '3px 8px', fontFamily: T.mono, fontSize: 12, letterSpacing: 0.3 }}>{text}</span>;
}
function SeverityDot({ s }) {
  const c = s==='high' ? T.red : s==='med' ? T.amber : s==='low' ? T.blue : T.green;
  return <span style={{ width: 8, height: 8, borderRadius: 4, background: c, flexShrink: 0 }}/>;
}

function WelfareDeltaChart({ lam }) {
  // Bar chart comparing first-order welfare (transparent) vs full-eval (solid).
  const data = STACKS.slice().sort((a,b) => b.full - a.full);
  const max = Math.max(...data.map(d => Math.max(d.firstOrder, d.full)));
  const min = Math.min(0, ...data.map(d => Math.min(d.firstOrder, d.full)));
  const range = max - min;
  const W = 760, H = 220, padL = 96, padR = 20, padT = 18, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xZero = padL + ((-min)/range) * innerW;
  return (
    <div style={{ padding: 14 }}>
      <svg width={W} height={H} style={{ display:'block' }}>
        {[-0.05,0,0.05,0.10,0.15,0.20,0.25].filter(v => v>=min && v<=max).map(v => {
          const x = padL + ((v-min)/range)*innerW;
          return <g key={v}>
            <line x1={x} x2={x} y1={padT} y2={padT+innerH} stroke={T.line} strokeDasharray={v===0?'':'2 3'}/>
            <text x={x} y={H-12} fill={T.dim} fontSize="10" fontFamily={T.mono} textAnchor="middle">{tFmt(v,2)}</text>
          </g>;
        })}
        {data.map((d, i) => {
          const y = padT + i*(innerH/data.length);
          const rowH = innerH/data.length - 4;
          const x1 = padL + ((d.firstOrder-min)/range)*innerW;
          const x2 = padL + ((d.full-min)/range)*innerW;
          const labelText = d.stack.join(' + ');
          const isWinner = d.certified;
          return (
            <g key={d.rank} transform={`translate(0, ${y})`}>
              <text x={padL-8} y={rowH/2+4} fill={isWinner?T.green:T.ink2} fontSize="11" fontFamily={T.mono} textAnchor="end">{labelText}</text>
              {/* first-order bar (hollow) */}
              <rect x={Math.min(xZero, x1)} y={rowH*0.18} width={Math.abs(x1-xZero)} height={rowH*0.30}
                fill="none" stroke={T.blue} strokeDasharray="2 2"/>
              {/* full-eval bar (solid) */}
              <rect x={Math.min(xZero, x2)} y={rowH*0.52} width={Math.abs(x2-xZero)} height={rowH*0.30}
                fill={isWinner ? T.green : (d.full < 0 ? T.red : T.amber)} opacity={0.9}/>
              {/* values */}
              <text x={Math.max(x1,x2)+6} y={rowH*0.36} fill={T.blue} fontSize="9.5" fontFamily={T.mono}>1st: {tFmt(d.firstOrder,3)}</text>
              <text x={Math.max(x1,x2)+6} y={rowH*0.74} fill={d.full<0?T.red:(isWinner?T.green:T.ink)} fontSize="9.5" fontFamily={T.mono}>full: {tFmt(d.full,3)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display:'flex', gap: 16, marginTop: 6, fontSize: 10.5, color: T.dim, paddingLeft: padL }}>
        <span><span style={{ display:'inline-block', width: 10, height: 1, border: '1px dashed '+T.blue, verticalAlign:'middle', marginRight: 6 }}/>FIRST-ORDER (product of marginals)</span>
        <span><span style={{ display:'inline-block', width: 10, height: 4, background: T.green, verticalAlign:'middle', marginRight: 6 }}/>FULL EVAL (with correlation)</span>
        <span style={{marginLeft:'auto'}}>↑ where the marginal winner can be wrong</span>
      </div>
    </div>
  );
}

function BenchMix() {
  const total = CELLS.reduce((a,c) => a+c.n, 0);
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display:'flex', height: 24, background: T.panel2, marginBottom: 10 }}>
        {CELLS.map((c,i) => (
          <div key={c.id} style={{ width: (c.n/total*100)+'%', background: c.side==='adv'? T.amber : T.cyan, opacity: 0.7, borderRight: i<CELLS.length-1 ? '1px solid '+T.bg : 'none' }}/>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10 }}>
        {CELLS.map(c => (
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 11 }}>
            <span style={{ width: 9, height: 9, background: c.side==='adv'?T.amber:T.cyan }}/>
            <span style={{ color: T.ink2 }}>{c.id}</span>
            <span style={{ color: T.dim, marginLeft:'auto', fontVariantNumeric:'tabular-nums' }}>n={c.n} · w={c.weight.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Stack Ranking
// ─────────────────────────────────────────────────────────────
function TRanking({ lam }) {
  const data = STACKS.slice().sort((a,b) => b.full - a.full);
  return (
    <div style={{ padding: 14 }}>
      <TPanel title="STACK RANKING — SIZE-2 SERIAL" sub={`λ = ${lam.toFixed(1)} · 28 candidates · 8 surfaced`}
        right={<span style={{ color: T.dim, fontSize: 10.5 }}>residual radius = 0.000 (K=2 exact)</span>}>
        <div style={{ padding: '6px 0' }}>
          <div style={{ display:'grid', gridTemplateColumns:'40px 1.6fr 1fr 1fr 1.4fr 1.6fr 0.6fr', padding:'8px 14px', borderBottom:'1px solid '+T.line, color: T.dim, fontSize: 10, letterSpacing: 0.5 }}>
            <span>#</span><span>STACK</span><span style={{textAlign:'right'}}>1ST-ORDER</span><span style={{textAlign:'right'}}>FULL</span><span style={{textAlign:'center'}}>INTERVAL</span><span>NOTE</span><span style={{textAlign:'right'}}>CERT</span>
          </div>
          {data.map((s, i) => (
            <RankRow key={i} s={s} />
          ))}
        </div>
      </TPanel>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginTop: 12 }}>
        <TPanel title="UNRESOLVED COMPARISONS" sub="gap interval excludes 0">
          <table style={{ width: '100%', borderCollapse:'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ color: T.dim, fontSize: 10, letterSpacing: 0.5 }}>
                <th style={{ textAlign:'left', padding:'8px 14px' }}>INCUMBENT</th>
                <th style={{ textAlign:'left', padding:'8px 14px' }}>vs COMPETITOR</th>
                <th style={{ textAlign:'right', padding:'8px 14px' }}>GAP [LO, HI]</th>
                <th style={{ textAlign:'right', padding:'8px 14px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISONS.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid '+T.line }}>
                  <td style={{ padding:'9px 14px', color: T.green }}>{c.incumbent}</td>
                  <td style={{ padding:'9px 14px', color: T.ink2 }}>{c.competitor}</td>
                  <td style={{ padding:'9px 14px', color: T.ink, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>[{tFmt(c.low,3)}, {tFmt(c.high,3)}]</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>
                    <span style={{ color: T.green, fontSize: 10.5, letterSpacing: 0.5 }}>● CERT</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TPanel>

        <TPanel title="REGRET BY λ" sub="marginal vs. CASS pick">
          <RegretByLambda />
        </TPanel>
      </div>
    </div>
  );
}

function RankRow({ s }) {
  const cert = s.certified;
  const color = cert ? T.green : (s.full < 0 ? T.red : T.ink2);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'40px 1.6fr 1fr 1fr 1.4fr 1.6fr 0.6fr', padding:'10px 14px', borderBottom:'1px solid '+T.line, alignItems:'center', fontSize: 12 }}>
      <span style={{ color: T.dim, fontVariantNumeric:'tabular-nums' }}>{cert ? '★ ' : ''}{s.rank}</span>
      <span style={{ display:'flex', gap: 6 }}>
        <Chip text={s.stack[0]} color={cert?T.green:T.line2}/>
        <span style={{ color: T.dim }}>→</span>
        <Chip text={s.stack[1]} color={cert?T.green:T.line2}/>
      </span>
      <span style={{ color: T.blue, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{tFmt2(s.firstOrder,4)}</span>
      <span style={{ color, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{tFmt(s.full,4)}</span>
      <IntervalBar full={s.full} radius={0.018} cert={cert}/>
      <span style={{ color: T.dim, fontSize: 11 }}>{s.note || '—'}</span>
      <span style={{ textAlign:'right' }}>
        {cert ? <span style={{ color: T.green }}>✓</span> : <span style={{ color: T.faint }}>—</span>}
      </span>
    </div>
  );
}

function IntervalBar({ full, radius, cert }) {
  const min = -0.15, max = 0.20, W = 160, H = 14;
  const x0 = ((0-min)/(max-min))*W;
  const x = ((full-min)/(max-min))*W;
  const r = (radius/(max-min))*W;
  return (
    <svg width={W} height={H} style={{ display:'block', margin:'0 auto' }}>
      <line x1={0} x2={W} y1={H/2} y2={H/2} stroke={T.line} />
      <line x1={x0} x2={x0} y1={2} y2={H-2} stroke={T.faint} />
      <line x1={x-r} x2={x+r} y1={H/2} y2={H/2} stroke={cert?T.green:T.amber} strokeWidth="2"/>
      <circle cx={x} cy={H/2} r="3" fill={cert?T.green:(full<0?T.red:T.amber)}/>
    </svg>
  );
}

function RegretByLambda() {
  // simulated curve: marginal regret rises with λ; CASS stays at 0
  const W = 360, H = 160, padL = 36, padB = 26, padT = 12;
  const lamPoints = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  const marg = [0, 0, 0.004, 0.012, 0.025, 0.029, 0.030, 0.032, 0.034, 0.036, 0.038];
  const cass = lamPoints.map(() => 0);
  const yMax = 0.04;
  const xOf = (i) => padL + (i/(lamPoints.length-1))*(W-padL-12);
  const yOf = (v) => padT + (1 - v/yMax)*(H-padT-padB);
  const path = (arr) => arr.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ');
  return (
    <div style={{ padding: 14 }}>
      <svg width={W} height={H} style={{ display:'block' }}>
        {[0, 0.01, 0.02, 0.03, 0.04].map(v => (
          <g key={v}>
            <line x1={padL} x2={W-12} y1={yOf(v)} y2={yOf(v)} stroke={T.line}/>
            <text x={padL-6} y={yOf(v)+3} textAnchor="end" fill={T.dim} fontSize="9" fontFamily={T.mono}>{v.toFixed(2)}</text>
          </g>
        ))}
        {lamPoints.map((l,i) => (
          <text key={l} x={xOf(i)} y={H-12} textAnchor="middle" fill={T.dim} fontSize="9" fontFamily={T.mono}>{l}</text>
        ))}
        <path d={path(marg)} fill="none" stroke={T.amber} strokeWidth="1.6"/>
        <path d={path(cass)} fill="none" stroke={T.green} strokeWidth="1.6"/>
        {marg.map((v,i) => v>0.001 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2" fill={T.amber}/>)}
      </svg>
      <div style={{ display:'flex', gap: 14, fontSize: 10.5, color: T.dim, marginTop: 6 }}>
        <span><span style={{ display:'inline-block', width: 12, height: 2, background: T.amber, verticalAlign:'middle', marginRight: 5 }}/>marginal selection regret</span>
        <span><span style={{ display:'inline-block', width: 12, height: 2, background: T.green, verticalAlign:'middle', marginRight: 5 }}/>CASS regret</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Correlation map
// ─────────────────────────────────────────────────────────────
function TCorr() {
  const [side, setSide] = React.useState('adv');
  const M = side === 'adv' ? CORR_ADV : CORR_BEN;
  return (
    <div style={{ padding: 14, display:'grid', gridTemplateColumns:'1fr 380px', gap: 12 }}>
      <TPanel title="CORRELATION MATRIX" sub={side==='adv'?'adversarial co-miss · positive = harmful overlap':'benign co-block · positive = concentrated overblock'}
        right={
          <div style={{ display:'flex', border: '1px solid '+T.line2 }}>
            <button onClick={()=>setSide('adv')} style={{ background: side==='adv'?T.amber:'transparent', color: side==='adv'?T.bg:T.ink2, border:'none', padding:'4px 10px', fontFamily: T.mono, fontSize: 10.5, cursor:'pointer', letterSpacing: 0.5 }}>ADV</button>
            <button onClick={()=>setSide('benign')} style={{ background: side==='benign'?T.cyan:'transparent', color: side==='benign'?T.bg:T.ink2, border:'none', padding:'4px 10px', fontFamily: T.mono, fontSize: 10.5, cursor:'pointer', letterSpacing: 0.5 }}>BENIGN</button>
          </div>
        }>
        <CorrMatrix M={M} side={side}/>
      </TPanel>

      <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
        <TPanel title={side==='adv' ? 'TOP CO-MISSES' : 'TOP FALSE-BLOCK OVERLAPS'} sub="welfare-relevant pairs">
          <div style={{ padding: 6 }}>
            {topPairs(M, side==='adv').map((p,i) => (
              <div key={i} style={{ padding: '9px 12px', borderBottom: '1px solid '+T.line, display:'flex', alignItems:'center', gap: 10 }}>
                <span style={{ color: T.dim, width: 14, fontSize: 11 }}>{i+1}</span>
                <Chip text={p.a} color={T.line2}/>
                <span style={{ color: T.dim }}>×</span>
                <Chip text={p.b} color={T.line2}/>
                <div style={{ flex: 1 }}/>
                <span style={{ color: side==='adv'?T.amber:T.cyan, fontFamily: T.mono, fontSize: 12 }}>{tFmt(p.r, 3)}</span>
              </div>
            ))}
          </div>
        </TPanel>

        <TPanel title="HOTSPOT" sub="paper-cited">
          <div style={{ padding: 14, fontSize: 11.5, color: T.ink2, lineHeight: 1.5 }}>
            {side==='adv' ? (
              <>
                <span style={{ color: T.amber }}>Lex × Rules</span> both pass <span style={{ color: T.ink }}>95.0%</span> of <span style={{ color: T.ink }}>A/XSTest-unsafe</span> with block correlation <span style={{ color: T.amber }}>+0.946</span>. Stacking redundant lexical guards offers near-zero additional safety on this cell.
              </>
            ) : (
              <>
                <span style={{ color: T.cyan }}>Gemma × Phi3</span> both block <span style={{ color: T.ink }}>48.0%</span> of <span style={{ color: T.ink }}>N/XSTest-safe</span>. Overblock is concentrated on a single benign cluster — good for UX, bad for breadth.
              </>
            )}
          </div>
        </TPanel>

        <TPanel title="LEGEND" sub="block-correlation scale">
          <div style={{ padding: 14 }}>
            <CorrLegend side={side}/>
          </div>
        </TPanel>
      </div>
    </div>
  );
}

function CorrMatrix({ M, side }) {
  const g = GUARDS.map(x => x.id);
  const N = g.length, cell = 48;
  const W = cell*(N+1), H = cell*(N+1);
  const colorOf = (r) => {
    if (r === 1) return '#0e1418';
    const sign = side==='adv' ? 1 : 1; // both sides: positive = high, but visually
    const t = Math.max(-1, Math.min(1, r));
    if (t >= 0) {
      const c = side==='adv' ? [240,182,86] : [95,210,204]; // amber for adv, cyan for benign
      const a = Math.pow(t, 0.6) * 0.9;
      return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    } else {
      const a = Math.pow(-t, 0.6) * 0.5;
      return `rgba(116,167,255,${a})`;
    }
  };
  return (
    <div style={{ padding: 14, overflow:'auto' }}>
      <svg width={W} height={H} style={{ display:'block' }}>
        {g.map((id, i) => (
          <text key={'h'+id} x={(i+1)*cell + cell/2} y={cell-12} fill={T.ink2} fontSize="10.5" fontFamily={T.mono} textAnchor="middle">{id}</text>
        ))}
        {g.map((id, i) => (
          <text key={'v'+id} x={cell-8} y={(i+1)*cell + cell/2 + 4} fill={T.ink2} fontSize="10.5" fontFamily={T.mono} textAnchor="end">{id}</text>
        ))}
        {g.map((a, i) => g.map((b, j) => {
          const r = M[a+'|'+b];
          const fill = colorOf(r);
          const x = (j+1)*cell + 2, y = (i+1)*cell + 2, sz = cell-4;
          return (
            <g key={a+'|'+b}>
              <rect x={x} y={y} width={sz} height={sz} fill={fill} stroke={T.line}/>
              {a !== b && <text x={x+sz/2} y={y+sz/2+3.5} fill={Math.abs(r)>0.5 ? T.bg : T.ink2} fontSize="10" fontFamily={T.mono} textAnchor="middle">{r.toFixed(2)}</text>}
            </g>
          );
        }))}
      </svg>
    </div>
  );
}

function topPairs(M, sortDesc) {
  const g = GUARDS.map(x => x.id);
  const out = [];
  for (let i=0;i<g.length;i++) for (let j=i+1;j<g.length;j++) {
    out.push({ a: g[i], b: g[j], r: M[g[i]+'|'+g[j]] });
  }
  out.sort((a,b) => sortDesc ? b.r - a.r : b.r - a.r);
  return out.slice(0, 6);
}

function CorrLegend({ side }) {
  const stops = [-1, -0.5, 0, 0.5, 1];
  return (
    <div>
      <div style={{ display:'flex', height: 14 }}>
        {Array.from({length: 41}, (_,i) => {
          const r = -1 + i*0.05;
          const c = r>=0
            ? (side==='adv' ? `rgba(240,182,86,${Math.pow(r,0.6)*0.9})` : `rgba(95,210,204,${Math.pow(r,0.6)*0.9})`)
            : `rgba(116,167,255,${Math.pow(-r,0.6)*0.5})`;
          return <div key={i} style={{ flex: 1, background: c }}/>;
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', color: T.dim, fontSize: 10, marginTop: 4 }}>
        {stops.map(s => <span key={s} style={{ fontVariantNumeric:'tabular-nums' }}>{tFmt(s,1)}</span>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Measurement Planner
// ─────────────────────────────────────────────────────────────
function TPlanner() {
  const [selected, setSelected] = React.useState(new Set(['m-001','m-002']));
  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const sel = MEASUREMENTS.filter(m => selected.has(m.id));
  const totalCost = sel.reduce((a,m) => a+m.cost, 0);
  const totalRadius = sel.reduce((a,m) => a+m.radiusΔ, 0);
  return (
    <div style={{ padding: 14, display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 12 }}>
      <TPanel title="RECOMMENDED MEASUREMENTS" sub="bundle-greedy · pair-cell evaluations"
        right={<button style={{ background: T.green, color: T.bg, border: 'none', padding: '6px 14px', fontFamily: T.mono, fontSize: 11, letterSpacing: 0.6, cursor:'pointer', fontWeight: 600 }}>QUEUE {selected.size} → RUN</button>}>
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'24px 1.4fr 1.4fr 2fr 0.8fr 0.8fr', padding:'8px 14px', borderBottom:'1px solid '+T.line, color: T.dim, fontSize: 10, letterSpacing: 0.5 }}>
            <span/>
            <span>PAIR</span>
            <span>CELL</span>
            <span>REASON</span>
            <span style={{textAlign:'right'}}>Δ-RADIUS</span>
            <span style={{textAlign:'right'}}>COST</span>
          </div>
          {MEASUREMENTS.map(m => (
            <div key={m.id} onClick={() => toggle(m.id)} style={{ display:'grid', gridTemplateColumns:'24px 1.4fr 1.4fr 2fr 0.8fr 0.8fr', padding:'10px 14px', borderBottom:'1px solid '+T.line, alignItems:'center', cursor:'pointer', background: selected.has(m.id) ? T.panel2 : 'transparent' }}>
              <span style={{ color: selected.has(m.id)?T.green:T.faint, fontSize: 13 }}>{selected.has(m.id) ? '☑' : '☐'}</span>
              <span style={{ display:'flex', gap: 5, alignItems:'center' }}>
                <Chip text={m.pair[0]} color={T.line2}/>
                <span style={{ color: T.dim }}>×</span>
                <Chip text={m.pair[1]} color={T.line2}/>
              </span>
              <span style={{ color: T.ink2 }}>{m.cell}</span>
              <span style={{ color: T.ink2, fontSize: 11.5 }}>{m.reason}</span>
              <span style={{ color: T.green, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>-{m.radiusΔ.toFixed(4)}</span>
              <span style={{ color: T.ink2, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>${m.cost}</span>
            </div>
          ))}
        </div>
      </TPanel>

      <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
        <TPanel title="BUDGET SUMMARY">
          <div style={{ padding: 14, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
            <KV k="selected" v={selected.size+' / '+MEASUREMENTS.length}/>
            <KV k="est. cost" v={'$'+totalCost} accent={T.green}/>
            <KV k="expected Δ-radius" v={'-'+totalRadius.toFixed(4)} accent={T.green}/>
            <KV k="time est." v={(selected.size*1.4).toFixed(1)+'h'}/>
            <KV k="budget left" v="0.13 / 0.50"/>
            <KV k="pair-cells used" v="13 → " accent={T.green}/>
          </div>
        </TPanel>

        <TPanel title="EXPECTED OUTCOME">
          <div style={{ padding: 14, fontSize: 11.5, color: T.ink2, lineHeight: 1.6 }}>
            <div style={{ marginBottom: 10 }}>
              Running the selected bundle is expected to:
            </div>
            <ul style={{ paddingLeft: 16, margin: 0, color: T.ink2 }}>
              <li style={{ marginBottom: 4 }}>Tighten the gap between <span style={{color:T.green}}>LG3 + Phi3</span> and <span style={{color:T.amber}}>L3-3B + LG3</span> from radius 0.018 → 0.009.</li>
              <li style={{ marginBottom: 4 }}>Resolve 2 remaining unresolved comparisons.</li>
              <li>Refresh the certificate within ~84 minutes.</li>
            </ul>
          </div>
        </TPanel>

        <TPanel title="ALTERNATIVES" sub="what other schedulers picked">
          <div style={{ padding: 6 }}>
            {[
              { name: 'Uncertainty-greedy', cost: 67*32, cells: 67 },
              { name: 'Uniform-by-cell',     cost: 84*32, cells: 84 },
              { name: 'MIP width-cover',     cost: 22*32, cells: 22 },
            ].map(a => (
              <div key={a.name} style={{ display:'flex', alignItems:'center', padding:'9px 12px', borderBottom:'1px solid '+T.line, fontSize: 11.5 }}>
                <span style={{ color: T.ink2 }}>{a.name}</span>
                <div style={{flex:1}}/>
                <span style={{ color: T.dim, fontVariantNumeric:'tabular-nums', marginRight: 14 }}>{a.cells} cells</span>
                <span style={{ color: T.ink2, fontVariantNumeric:'tabular-nums' }}>${a.cost}</span>
              </div>
            ))}
          </div>
        </TPanel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Certificate
// ─────────────────────────────────────────────────────────────
function TCertificate({ lam }) {
  return (
    <div style={{ padding: 14 }}>
      <TPanel title="CERTIFICATE · cert-2026-0524-001a" sub="finite-benchmark · conditional"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <button style={{ background: 'transparent', color: T.ink2, border: '1px solid '+T.line2, padding:'5px 10px', fontFamily: T.mono, fontSize: 10.5, cursor:'pointer' }}>EXPORT JSON</button>
            <button style={{ background: 'transparent', color: T.ink2, border: '1px solid '+T.line2, padding:'5px 10px', fontFamily: T.mono, fontSize: 10.5, cursor:'pointer' }}>EXPORT MD</button>
            <button style={{ background: T.green, color: T.bg, border: 'none', padding:'5px 10px', fontFamily: T.mono, fontSize: 10.5, cursor:'pointer', fontWeight: 600 }}>SUBMIT TO GRC</button>
          </div>
        }>
        <div style={{ padding: 24, display:'grid', gridTemplateColumns:'1fr 320px', gap: 28 }}>
          <div>
            <div style={{ color: T.green, fontSize: 11, letterSpacing: 0.8 }}>● CERTIFIED WINNER</div>
            <div style={{ fontSize: 22, color: T.ink, marginTop: 6, letterSpacing: -0.2 }}>LG3 + Phi3</div>
            <div style={{ color: T.dim, marginTop: 6, fontSize: 11.5 }}>
              Certified to beat every candidate competitor under the specified benchmark mixture, welfare profile, and uncertainty model.
            </div>

            <hr style={{ border: 0, borderTop: '1px solid '+T.line, margin: '20px 0' }}/>

            <CertField label="Application" value="acme-copilot · prod"/>
            <CertField label="Candidate set" value="8 guards · 28 size-2 serial stacks"/>
            <CertField label="Benchmark mixture" value="2,000 examples · 6 cells · 4 adv / 2 benign"/>
            <CertField label="Welfare profile" value={`λ = ${lam.toFixed(1)} · π_A inferred · source weights uniform`}/>
            <CertField label="Aggregation" value="serial · K = 2 · residual radius 0.000"/>
            <CertField label="Measurement coverage" value="10 agent-cells · 13 pair-cells · 0 parse fail · 0 errors"/>
            <CertField label="Welfare" value="0.1363  [+0.1245, +0.1481]" accent={T.green}/>
            <CertField label="Comparisons" value="27 / 27 certified · 0 unresolved" accent={T.green}/>

            <hr style={{ border: 0, borderTop: '1px solid '+T.line, margin: '20px 0' }}/>

            <div style={{ color: T.dim, fontSize: 10.5, letterSpacing: 0.5 }}>LIMITATIONS</div>
            <ul style={{ paddingLeft: 18, marginTop: 6, color: T.ink2, fontSize: 11.5, lineHeight: 1.6 }}>
              <li>Conditional on the specified benchmark mixture; not a deployment-general guarantee.</li>
              <li>Leave-one-source-out: hold-out regret 1.078 when HarmBench is excluded — re-certify if traffic shifts.</li>
              <li>K=2 only. For K≥3 stacks the certificate carries conservative residual uncertainty.</li>
              <li>Source weights, λ, and π_A are customer-supplied and must be reviewed before signoff.</li>
            </ul>
          </div>

          <div style={{ background: T.panel2, padding: 18, border: '1px solid '+T.line }}>
            <div style={{ color: T.dim, fontSize: 10, letterSpacing: 0.8 }}>VERSIONS</div>
            <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.7 }}>
              <div>LG3 <span style={{color:T.dim}}>llama-guard3-1B · 3-1B</span></div>
              <div>Phi3 <span style={{color:T.dim}}>phi3-mini · mini</span></div>
              <div>policy <span style={{color:T.dim}}>acme-tos@v4.2</span></div>
              <div>prompt <span style={{color:T.dim}}>cass-judge@v1.7</span></div>
            </div>

            <div style={{ color: T.dim, fontSize: 10, letterSpacing: 0.8, marginTop: 18 }}>RE-CERT TRIGGERS</div>
            <ul style={{ paddingLeft: 16, marginTop: 6, fontSize: 11, color: T.ink2, lineHeight: 1.7 }}>
              <li>Guard version diff</li>
              <li>Traffic mixture shift &gt; 8%</li>
              <li>New attack family detected</li>
              <li>Policy / prompt update</li>
              <li>Monthly default cadence</li>
            </ul>

            <div style={{ color: T.dim, fontSize: 10, letterSpacing: 0.8, marginTop: 18 }}>SIGNOFF</div>
            <div style={{ marginTop: 8, fontSize: 11, color: T.ink2, lineHeight: 1.7 }}>
              <div>Reviewer <span style={{color:T.ink}}>—</span></div>
              <div>Issued <span style={{color:T.ink}}>2026-05-24 11:08 UTC</span></div>
              <div>Expires <span style={{color:T.ink}}>2026-06-24</span></div>
            </div>

            <button style={{ marginTop: 16, width: '100%', background: T.green, color: T.bg, border: 'none', padding:'8px', fontFamily: T.mono, fontSize: 11, letterSpacing: 0.6, cursor:'pointer', fontWeight: 600 }}>SIGN AS REVIEWER</button>
          </div>
        </div>
      </TPanel>
    </div>
  );
}

function CertField({ label, value, accent }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'150px 1fr', padding:'5px 0', fontSize: 12 }}>
      <span style={{ color: T.dim, letterSpacing: 0.3 }}>{label}</span>
      <span style={{ color: accent || T.ink2, fontVariantNumeric:'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Drift
// ─────────────────────────────────────────────────────────────
function TDrift() {
  return (
    <div style={{ padding: 14 }}>
      <TPanel title="DRIFT MONITOR" sub="continuous re-certification triggers">
        <div style={{ padding: 0 }}>
          {DRIFT.map((d,i) => (
            <div key={i} style={{ padding: '14px 18px', borderBottom: i<DRIFT.length-1 ? '1px solid '+T.line : 'none', display:'grid', gridTemplateColumns:'18px 1.5fr 1.6fr 1fr 100px', alignItems:'center', gap: 14 }}>
              <SeverityDot s={d.severity}/>
              <div>
                <div style={{ color: T.ink, fontSize: 13 }}>{d.signal}</div>
                <div style={{ color: T.dim, fontSize: 10.5, marginTop: 2 }}>monitored since 2026-04-01</div>
              </div>
              <div style={{ color: T.ink2, fontSize: 11.5 }}>{d.change}</div>
              <div style={{ color: d.severity==='ok'?T.green:T.amber, fontSize: 11.5 }}>{d.delta}</div>
              <button style={{ background:'transparent', color: T.ink2, border: '1px solid '+T.line2, padding:'5px 8px', fontFamily: T.mono, fontSize: 10.5, cursor:'pointer' }}>
                {d.severity==='ok' ? 'OK' : 'RE-CERT →'}
              </button>
            </div>
          ))}
        </div>
      </TPanel>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginTop: 12 }}>
        <TPanel title="TRAFFIC MIXTURE TIMELINE" sub="last 30 days">
          <TimelineChart/>
        </TPanel>
        <TPanel title="RE-CERTIFICATION HISTORY">
          <div style={{ padding: 6 }}>
            {[
              { date: '2026-05-24', who: 'cass-greedy', status: 'cert', stack: 'LG3 + Phi3' },
              { date: '2026-04-29', who: 'cass-greedy', status: 'cert', stack: 'LG3 + Phi3' },
              { date: '2026-04-02', who: 'manual',      status: 'cert', stack: 'L3-3B + LG3' },
              { date: '2026-03-05', who: 'cass-greedy', status: 'cert', stack: 'L3-3B + LG3' },
              { date: '2026-02-08', who: 'cass-greedy', status: 'expired', stack: 'L3-3B + LG3' },
            ].map((r,i) => (
              <div key={i} style={{ padding: '9px 14px', borderBottom: '1px solid '+T.line, display:'grid', gridTemplateColumns:'95px 90px 70px 1fr', fontSize: 11.5, alignItems:'center' }}>
                <span style={{ color: T.dim, fontVariantNumeric:'tabular-nums' }}>{r.date}</span>
                <span style={{ color: T.ink2 }}>{r.who}</span>
                <span style={{ color: r.status==='cert'?T.green:T.dim }}>{r.status==='cert' ? '● CERT' : '○ EXP'}</span>
                <span style={{ color: T.ink }}>{r.stack}</span>
              </div>
            ))}
          </div>
        </TPanel>
      </div>
    </div>
  );
}

function TimelineChart() {
  // sparkline of adv % over 30 days
  const days = 30;
  const adv = Array.from({length: days}, (_,i) => 0.48 + Math.sin(i/3)*0.04 + (i>22?0.06:0) + Math.random()*0.01 );
  const W = 540, H = 150, padL = 30, padB = 24, padT = 14;
  const yMax = 0.7, yMin = 0.3;
  const xOf = i => padL + (i/(days-1))*(W-padL-12);
  const yOf = v => padT + (1-(v-yMin)/(yMax-yMin))*(H-padT-padB);
  return (
    <div style={{ padding: 14 }}>
      <svg width={W} height={H}>
        {[0.3, 0.5, 0.7].map(v => (
          <g key={v}><line x1={padL} x2={W-12} y1={yOf(v)} y2={yOf(v)} stroke={T.line}/><text x={padL-6} y={yOf(v)+3} textAnchor="end" fill={T.dim} fontSize="9" fontFamily={T.mono}>{(v*100).toFixed(0)}%</text></g>
        ))}
        <line x1={padL} x2={W-12} y1={yOf(0.55)} y2={yOf(0.55)} stroke={T.amber} strokeDasharray="3 3"/>
        <text x={W-14} y={yOf(0.55)-3} textAnchor="end" fill={T.amber} fontSize="9" fontFamily={T.mono}>drift threshold 55%</text>
        <path d={adv.map((v,i) => (i?'L':'M')+xOf(i)+','+yOf(v)).join(' ')} fill="none" stroke={T.cyan} strokeWidth="1.6"/>
        {adv.map((v,i) => v>0.55 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2" fill={T.amber}/>)}
        <text x={W-14} y={H-10} textAnchor="end" fill={T.dim} fontSize="9" fontFamily={T.mono}>days ago</text>
      </svg>
      <div style={{ display:'flex', gap: 14, fontSize: 10.5, color: T.dim, marginTop: 4 }}>
        <span><span style={{ display:'inline-block', width: 12, height: 2, background: T.cyan, verticalAlign:'middle', marginRight: 5 }}/>adversarial share of traffic</span>
      </div>
    </div>
  );
}

Object.assign(window, { TerminalApp });
