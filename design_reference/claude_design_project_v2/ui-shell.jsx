// StackCert UI — App shell (sidebar, top bar, routing)

function UIApp() {
  const [route, setRoute]     = React.useState('overview');
  const [persona, setPersona] = React.useState('security');
  const [lam, setLam]         = React.useState(5);
  const [cmd, setCmd]         = React.useState(false);
  const lamPreset = LAMBDA_PRESETS[lam] || LAMBDA_PRESETS[5];

  const nav = [
    { id: 'overview', label: 'Overview',     hint: '1' },
    { id: 'ranking',  label: 'Stack ranking', hint: '2', count: 28 },
    { id: 'corr',     label: 'Co-failure',    hint: '3' },
    { id: 'planner',  label: 'Measurements',  hint: '4', count: 5, badge: 'new' },
    { id: 'cert',     label: 'Certificate',   hint: '5' },
    { id: 'drift',    label: 'Drift',         hint: '6', count: 4 },
  ];

  // Number keys 1-6 jump screens; ⌘K opens command palette.
  React.useEffect(() => {
    const k = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') { e.preventDefault(); setCmd(c => !c); }
        return;
      }
      const i = '123456'.indexOf(e.key);
      if (i >= 0) setRoute(nav[i].id);
      if (e.key === 'Escape') setCmd(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const Screen = {
    overview: UOverview,
    ranking:  URanking,
    corr:     UCorr,
    planner:  UPlanner,
    cert:     UCertificate,
    drift:    UDrift,
  }[route];

  return (
    <div style={{ width: '100%', height: '100%', minWidth: 1120, background: U.bg, color: U.ink, fontFamily: U.sans, fontSize: 13, display: 'flex', minHeight: 0 }}>
      <USide nav={nav} route={route} setRoute={setRoute}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <UTop persona={persona} setPersona={setPersona} lam={lam} setLam={setLam} lamPreset={lamPreset} route={route} nav={nav} onCmd={() => setCmd(true)}/>
        <div className="u-fade-in" key={route} style={{ flex: 1, overflow: 'auto', background: U.bg, minWidth: 0 }}>
          <Screen lam={lam} persona={persona} go={setRoute}/>
        </div>
      </div>
      {cmd && <UCommandPalette nav={nav} setRoute={(id) => { setRoute(id); setCmd(false); }} close={() => setCmd(false)}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────
function USide({ nav, route, setRoute }) {
  return (
    <div style={{ width: 232, background: U.surface2, borderRight: '1px solid '+U.line, padding: '14px 10px', display:'flex', flexDirection:'column', flexShrink: 0 }}>
      <UWorkspace/>

      <div style={{ marginTop: 16 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setRoute(n.id)}
            style={{ display:'flex', alignItems:'center', gap: 10, width:'100%', padding:'7px 10px',
              background: route===n.id ? U.surface3 : 'transparent',
              border:'none', borderRadius: 6, cursor:'pointer', textAlign:'left',
              color: route===n.id ? U.ink : U.ink2, fontSize: 13, fontWeight: route===n.id?500:400, marginBottom: 1, transition: 'background .08s' }}
            onMouseEnter={(e) => { if (route!==n.id) e.currentTarget.style.background = U.surface3+'80'; }}
            onMouseLeave={(e) => { if (route!==n.id) e.currentTarget.style.background = 'transparent'; }}>
            <UNavIcon id={n.id} active={route===n.id}/>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge && <span style={{ fontSize: 10, padding:'1px 6px', background: U.accentSoft, color: U.accent, borderRadius: 4, fontWeight: 500, letterSpacing: 0.2 }}>{n.badge}</span>}
            {n.count != null && !n.badge && <span style={{ fontSize: 11, color: U.dim, fontVariantNumeric:'tabular-nums' }}>{n.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18, padding: '0 10px' }}>
        <div style={{ fontSize: 10.5, color: U.dim, letterSpacing: 0.4, textTransform:'uppercase', marginBottom: 8, fontWeight: 500 }}>This run</div>
        <div style={{ fontSize: 12, color: U.ink2, lineHeight: 1.85 }}>
          <RunRow label="id"      value="run-0c3f"/>
          <RunRow label="seed"    value="1729"/>
          <RunRow label="K · ρ"   value="2 · 0.60"/>
          <RunRow label="n"       value="2,000"/>
          <RunRow label="started" value="11:08 UTC"/>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '0 10px' }}>
        <div style={{ fontSize: 10.5, color: U.dim, letterSpacing: 0.4, textTransform:'uppercase', marginBottom: 6, fontWeight: 500 }}>Shortcuts</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap: 4, alignItems:'center', fontSize: 11.5, color: U.ink3 }}>
          <UKbd>1</UKbd><UKbd>2</UKbd><UKbd>3</UKbd>… nav
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap: 4, alignItems:'center', fontSize: 11.5, color: U.ink3, marginTop: 4 }}>
          <UKbd>⌘</UKbd><UKbd>K</UKbd> command
        </div>
      </div>

      <div style={{ flex: 1 }}/>

      <UProfile/>
    </div>
  );
}

function RunRow({ label, value }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: '54px 1fr', alignItems: 'baseline', columnGap: 8 }}>
      <span style={{ color: U.ink3, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.ink2, whiteSpace: 'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'right' }}>{value}</span>
    </div>
  );
}

function UWorkspace() {
  return (
    <button style={{ display:'flex', alignItems:'center', gap: 9, padding:'8px 10px', background:'transparent', border:'1px solid '+U.line, borderRadius: 8, cursor:'pointer', textAlign:'left', transition: 'background .1s' }}
      onMouseEnter={(e) => e.currentTarget.style.background = U.surface3+'80'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #2a2a35, #111114)', color: U.surface, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600, letterSpacing: -0.2 }}>A</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: U.ink, lineHeight: 1.2 }}>Acme</div>
        <div style={{ fontSize: 11, color: U.ink3, lineHeight: 1.2 }}>copilot · prod</div>
      </div>
      <UChevron/>
    </button>
  );
}

function UProfile() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'10px 10px', borderTop: '1px solid '+U.line, marginTop: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg, #c2b3f5, #5b5bd6)', flexShrink: 0, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600 }}>IM</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: U.ink, lineHeight: 1.2 }}>Iris Mendel</div>
        <div style={{ fontSize: 11, color: U.ink3, lineHeight: 1.2 }}>AI Security · admin</div>
      </div>
      <button title="Sign out" style={{ width: 24, height: 24, padding: 0, background:'transparent', border:'none', cursor:'pointer', borderRadius: 5, color: U.ink3, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2v10h6"/><path d="M5 7h7m-2-2l2 2-2 2"/></svg>
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

// ─────────────────────────────────────────────────────────────
// Top bar
// ─────────────────────────────────────────────────────────────
function UTop({ persona, setPersona, lam, setLam, lamPreset, route, nav, onCmd }) {
  const current = nav.find(n => n.id === route);
  const personas = [
    { id: 'platform', label: 'Platform' },
    { id: 'security', label: 'Security' },
    { id: 'grc',      label: 'Risk' },
  ];
  return (
    <div style={{ height: 56, borderBottom: '1px solid '+U.line, background: U.surface, display:'flex', alignItems:'center', padding:'0 22px', gap: 14, flexShrink: 0 }}>
      {/* breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 13, minWidth: 0, flexShrink: 0 }}>
        <a href="Landing.html" style={{ color: U.ink3, whiteSpace:'nowrap', textDecoration: 'none' }} title="Back to stackcert.app">StackCert</a>
        <span style={{ color: U.faint }}>/</span>
        <span style={{ color: U.ink3, whiteSpace:'nowrap' }}>acme-copilot</span>
        <span style={{ color: U.faint }}>/</span>
        <span style={{ color: U.ink, fontWeight: 500, whiteSpace:'nowrap' }}>{current?.label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 8 }}/>

      {/* search trigger */}
      <button onClick={onCmd}
        style={{ display:'flex', alignItems:'center', gap: 10, padding:'5px 8px 5px 10px', height: 30, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8, cursor:'pointer', fontFamily: U.sans, fontSize: 12.5, color: U.ink3, width: 220, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={U.ink3} strokeWidth="1.5" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="3.5"/><path d="M8.5 8.5l3 3"/></svg>
        <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Search guards, cells…</span>
        <div style={{ flex: 1 }}/>
        <UKbd>⌘K</UKbd>
      </button>

      {/* λ slider */}
      <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'5px 12px 5px 12px', height: 30, border: '1px solid '+U.line, borderRadius: 8, background: U.surface2, flexShrink: 0 }}>
        <span style={{ color: U.ink3, fontSize: 12 }}>λ</span>
        <input type="range" min="1" max="20" step="1" value={lam}
          onChange={e => setLam(parseInt(e.target.value))}
          style={{ width: 96, accentColor: U.accent }}/>
        <span style={{ fontFamily: U.mono, color: U.ink, fontSize: 12, width: 14, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{lam}</span>
        <span style={{ color: U.ink3, fontSize: 11.5, fontStyle:'italic', whiteSpace:'nowrap' }}>{lamPreset?.name || 'custom'}</span>
      </div>

      {/* persona segmented */}
      <div style={{ display:'flex', alignItems:'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: U.ink3, letterSpacing: 0.3, textTransform:'uppercase', fontWeight: 500 }}>View as</span>
        <div style={{ display:'flex', background: U.surface3, padding: 2, borderRadius: 7, height: 30 }}>
          {personas.map(p => (
            <button key={p.id} onClick={() => setPersona(p.id)}
              style={{ background: persona===p.id ? U.surface : 'transparent', color: persona===p.id ? U.ink : U.ink3,
                boxShadow: persona===p.id ? '0 1px 2px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)' : 'none',
                border: 'none', padding: '0 11px', fontFamily: U.sans, fontSize: 12, fontWeight: 500, cursor:'pointer', borderRadius: 5, transition: 'all .1s', whiteSpace:'nowrap' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button title="Notifications" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid '+U.line, background: U.surface, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={U.ink2} strokeWidth="1.5" strokeLinecap="round"><path d="M3 6a4 4 0 018 0v3l1 1H2l1-1V6z"/><path d="M5.5 12a1.5 1.5 0 003 0"/></svg>
        <span style={{ position:'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, background: U.bad, border:'1.5px solid '+U.surface, boxSizing:'content-box' }}/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Command palette
// ─────────────────────────────────────────────────────────────
function UCommandPalette({ nav, setRoute, close }) {
  const [q, setQ] = React.useState('');
  const items = nav.map(n => ({ kind: 'nav', label: 'Go to ' + n.label, action: () => setRoute(n.id), key: n.id, hint: n.hint }));
  const filtered = q.trim() ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div onClick={close} style={{ position:'fixed', inset: 0, background: 'rgba(15,15,25,.30)', zIndex: 100, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop: 100 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 520, background: U.surface, borderRadius: 12, boxShadow: U.shadowPop, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'12px 16px', borderBottom: '1px solid '+U.line }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke={U.ink3} strokeWidth="1.5" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3 3"/></svg>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search screens, guards, cells…"
            style={{ flex: 1, font: 'inherit', fontSize: 14, color: U.ink, background: 'transparent', border:'none', outline:'none' }}/>
          <UKbd>esc</UKbd>
        </div>
        <div style={{ maxHeight: 360, overflow:'auto', padding: '6px 0' }}>
          {filtered.map((i,idx) => (
            <button key={i.key} onClick={i.action}
              style={{ display:'flex', alignItems:'center', gap: 10, padding:'9px 16px', width:'100%', background: idx===0?U.surface3+'80':'transparent', border:'none', cursor:'pointer', fontSize: 13, color: U.ink, textAlign:'left' }}
              onMouseEnter={(e) => e.currentTarget.style.background = U.surface3}
              onMouseLeave={(e) => e.currentTarget.style.background = idx===0?U.surface3+'80':'transparent'}>
              <span style={{ flex: 1 }}>{i.label}</span>
              {i.hint && <UKbd>{i.hint}</UKbd>}
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: '20px 16px', color: U.ink3, fontSize: 13 }}>No results.</div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { UIApp });
