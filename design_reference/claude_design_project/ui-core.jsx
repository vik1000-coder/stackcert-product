// StackCert UI — Design tokens & primitive components
// Shared by all screens. All globals exported to window for cross-file access.

const U = {
  // surfaces
  bg:        '#f6f6f8',
  surface:   '#ffffff',
  surface2:  '#fafafb',
  surface3:  '#f1f1f3',
  surface4:  '#e9e9ec',

  // lines
  line:      '#e7e7ea',
  line2:     '#d6d6dc',
  line3:     '#c2c2c9',

  // ink
  ink:       '#111114',
  ink2:      '#3a3a42',
  ink3:      '#62626d',
  dim:       '#9a9aa3',
  faint:     '#c2c2c9',

  // accent (indigo)
  accent:    '#5b5bd6',
  accentH:   '#4a4ac9',
  accentSoft:'#eeeefb',
  accentSoft2:'#e1e1f9',

  // semantic
  ok:        '#1f9d55',
  okSoft:    '#e3f3e9',
  okSoft2:   '#d1ebda',
  warn:      '#a85d11',
  warnSoft:  '#fbeed5',
  bad:       '#bc2a2a',
  badSoft:   '#fbe5e5',

  // chart accents (subtler than semantic)
  blue:      '#2563eb',
  blueSoft:  '#dbeafe',
  amber:     '#d97706',

  // type
  sans:      '"Inter","SF Pro Text",system-ui,-apple-system,sans-serif',
  display:   '"Inter","SF Pro Display",system-ui,-apple-system,sans-serif',
  mono:      '"JetBrains Mono","IBM Plex Mono",ui-monospace,Menlo,monospace',

  // shadows
  shadow1:   '0 1px 2px rgba(15,15,25,.04), 0 0 0 1px rgba(15,15,25,.04)',
  shadow2:   '0 2px 8px rgba(15,15,25,.06), 0 0 0 1px rgba(15,15,25,.04)',
  shadowPop: '0 10px 30px rgba(15,15,25,.12), 0 2px 4px rgba(15,15,25,.05), 0 0 0 1px rgba(15,15,25,.06)',
};

// One-time global CSS for hover states, scrollbars, focus rings.
if (typeof document !== 'undefined' && !document.getElementById('ui-styles')) {
  const s = document.createElement('style');
  s.id = 'ui-styles';
  s.textContent = `
    .u-row{transition:background .08s}
    .u-row:hover{background:${U.surface2}}
    .u-row.u-selected{background:${U.accentSoft}80}
    .u-row.u-selected:hover{background:${U.accentSoft}}
    .u-clickable{cursor:pointer;-webkit-tap-highlight-color:transparent}
    .u-btn{transition:background .1s,border-color .1s,color .1s,transform .04s}
    .u-btn:hover{background:${U.surface3}}
    .u-btn.u-primary:hover{background:${U.accentH}}
    .u-btn.u-ink:hover{background:#000}
    .u-btn:active{transform:translateY(.5px)}
    .u-chip-clickable{cursor:pointer;transition:background .1s,border-color .1s}
    .u-chip-clickable:hover{border-color:${U.line2};background:${U.surface3}}
    .u-link{color:${U.accent};cursor:pointer}
    .u-link:hover{text-decoration:underline;text-underline-offset:2px}
    .u-input{font:inherit;color:${U.ink};background:${U.surface};border:1px solid ${U.line};border-radius:7px;padding:6px 10px;outline:none;transition:border-color .1s,box-shadow .1s}
    .u-input:focus{border-color:${U.accent};box-shadow:0 0 0 3px ${U.accentSoft}}
    .u-input::placeholder{color:${U.dim}}
    ::-webkit-scrollbar{width:11px;height:11px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:${U.line2};border:3px solid ${U.bg};border-radius:6px}
    ::-webkit-scrollbar-thumb:hover{background:${U.line3}}
    .u-fade-in{animation:uFadeIn .18s ease-out}
    @keyframes uFadeIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(s);
}

const uFmt   = (n, d=3) => (n>=0?'+':'') + n.toFixed(d);
const uFmt2  = (n, d=3) => n.toFixed(d);
const uPct   = (n, d=0) => (n*100).toFixed(d) + '%';
const uCurr  = (n) => '$' + n.toLocaleString('en-US');

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────
function UCard({ children, style, padding = 0, hover, onClick }) {
  const base = {
    background: U.surface,
    border: '1px solid '+U.line,
    borderRadius: 10,
    ...(padding && { padding }),
  };
  return (
    <div onClick={onClick} className={hover?'u-clickable':''}
      style={{ ...base, ...style }}>
      {children}
    </div>
  );
}

function UCardHead({ title, sub, right, style }) {
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom: '1px solid '+U.line, gap: 12, ...style }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: U.ink }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: U.ink3, marginTop: 2 }}>{sub}</div>}
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
    <span style={{ display:'inline-flex', alignItems:'center', gap: 6, padding:'2px 9px', background: t.bg, color: t.color, borderRadius: 999, fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: t.dot, flexShrink: 0 }}/>}
      {children}
    </span>
  );
}

function UChip({ children, style, mono, onClick, active }) {
  const base = {
    display:'inline-flex', alignItems:'center', padding:'2px 8px',
    background: active ? U.ink : U.surface, color: active ? U.surface : U.ink2,
    border:'1px solid ' + (active ? U.ink : U.line),
    borderRadius: 5, fontSize: 11.5,
    fontFamily: mono ? U.mono : U.sans,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  };
  return <span onClick={onClick} className={onClick?'u-chip-clickable':''} style={{...base, ...style}}>{children}</span>;
}

function UBtn({ children, primary, ink, ghost, small, style, onClick, icon, disabled }) {
  const base = {
    border: 'none', cursor: disabled?'not-allowed':'pointer',
    fontFamily: U.sans, fontSize: small?12:12.5, fontWeight: 500,
    padding: small?'5px 10px':'7px 13px', borderRadius: 7,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled?0.5:1,
    whiteSpace: 'nowrap',
  };
  let cls = 'u-btn';
  let v;
  if (primary) { v = { background: U.accent, color: '#fff' }; cls += ' u-primary'; }
  else if (ink) { v = { background: U.ink, color: '#fff' }; cls += ' u-ink'; }
  else if (ghost) { v = { background: 'transparent', color: U.ink2, border: '1px solid '+U.line }; }
  else { v = { background: U.surface, color: U.ink2, border: '1px solid '+U.line }; }
  return (
    <button onClick={disabled?undefined:onClick} className={cls} disabled={disabled}
      style={{ ...base, ...v, ...style }}>
      {icon}{children}
    </button>
  );
}

function UStat({ label, value, accent, sub, size }) {
  const sizes = { sm: 16, md: 19, lg: 26, xl: 34 };
  const sz = sizes[size||'md'];
  return (
    <div>
      <div style={{ fontSize: 11.5, color: U.ink3, letterSpacing: 0.1 }}>{label}</div>
      <div style={{ fontFamily: U.mono, color: accent || U.ink, fontSize: sz, marginTop: 4, fontVariantNumeric:'tabular-nums', fontWeight: 500, letterSpacing: sz>=26?-0.6:-0.2, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: U.ink3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function UField({ label, value, accent, mono = true, valueStyle }) {
  return (
    <React.Fragment>
      <div style={{ color: U.ink3, fontSize: 12.5 }}>{label}</div>
      <div style={{ color: accent ? U.ok : U.ink, fontFamily: mono ? U.mono : U.sans, fontSize: 12.5, fontVariantNumeric:'tabular-nums', ...valueStyle }}>{value}</div>
    </React.Fragment>
  );
}

function USeverity({ s, size = 9 }) {
  const c = s==='high' ? U.bad : s==='med' ? U.warn : s==='low' ? U.blue : U.ok;
  return <span style={{ width: size, height: size, borderRadius: size, background: c, boxShadow: '0 0 0 3px '+c+'22', flexShrink: 0 }}/>;
}

function UChevron({ dir='down', size=11, color }) {
  const r = { down: 0, up: 180, left: 90, right: 270 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 11 11" fill="none" stroke={color||U.ink3} strokeWidth="1.6" strokeLinecap="round" style={{ transform: `rotate(${r}deg)`, flexShrink: 0 }}>
      <path d="M2 4l3.5 3 3.5-3"/>
    </svg>
  );
}

// Welfare-interval bar widget (used in ranking table)
function UInterval({ full, cert, radius = 0.018, w = 130, h = 18 }) {
  const min = -0.15, max = 0.20;
  const x0 = ((0-min)/(max-min))*w;
  const x = ((full-min)/(max-min))*w;
  const rad = (radius/(max-min))*w;
  const color = cert ? U.ok : full<0 ? U.bad : U.ink2;
  return (
    <svg width={w} height={h} style={{ display:'block', margin:'0 auto' }}>
      <line x1={0} x2={w} y1={h/2} y2={h/2} stroke={U.line2}/>
      <line x1={x0} x2={x0} y1={3} y2={h-3} stroke={U.ink3} strokeWidth="0.8"/>
      <rect x={x-rad} y={h/2-3} width={rad*2} height={6} fill={color} rx={1.5} opacity={0.35}/>
      <circle cx={x} cy={h/2} r="3.5" fill={color} stroke={U.surface} strokeWidth="1.4"/>
    </svg>
  );
}

// Inline kbd hint
function UKbd({ children }) {
  return <span style={{ display:'inline-block', padding:'1px 5px', fontFamily: U.mono, fontSize: 10.5, color: U.ink3, background: U.surface, border:'1px solid '+U.line, borderRadius: 4, boxShadow: '0 1px 0 '+U.line, minWidth: 16, textAlign:'center' }}>{children}</span>;
}

// Section header used at the top of each screen
function UPageHead({ title, sub, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap: 14, flexWrap:'wrap' }}>
      <div>
        <h1 style={{ fontSize: 24, fontFamily: U.display, fontWeight: 600, color: U.ink, margin: 0, letterSpacing: -0.5 }}>{title}</h1>
        {sub && <p style={{ color: U.ink3, fontSize: 13.5, margin: '4px 0 0', maxWidth: 780, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      <div style={{ flex: 1 }}/>
      {children && <div style={{ display:'flex', alignItems:'center', gap: 8 }}>{children}</div>}
    </div>
  );
}

// Empty-state shell, used inside tabs/cards.
function UEmpty({ icon, title, sub, action }) {
  return (
    <div style={{ padding: '36px 24px', textAlign:'center', color: U.ink3 }}>
      {icon && <div style={{ display:'flex', justifyContent:'center', marginBottom: 12, color: U.dim }}>{icon}</div>}
      <div style={{ color: U.ink2, fontSize: 14, fontWeight: 500 }}>{title}</div>
      {sub && <div style={{ marginTop: 4, fontSize: 12.5 }}>{sub}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

// Used to wrap each main screen in a constrained, padded column.
function UPage({ children }) {
  return (
    <div style={{ padding: '28px 28px 64px', maxWidth: 1320, margin: '0 auto', display:'flex', flexDirection:'column', gap: 20 }}>
      {children}
    </div>
  );
}

Object.assign(window, {
  U, uFmt, uFmt2, uPct, uCurr,
  UCard, UCardHead, UBadge, UChip, UBtn, UStat, UField,
  USeverity, UChevron, UInterval, UKbd, UPageHead, UEmpty, UPage,
});
