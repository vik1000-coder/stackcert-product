// StackCert UI — Drift screen
// Active signals + 30-day traffic mixture chart + re-cert history.

function UDrift() {
  const [active, setActive] = React.useState(null);

  // Default-select the highest-severity signal.
  React.useEffect(() => {
    const sev = { high: 3, med: 2, low: 1, ok: 0 };
    const top = DRIFT.slice().sort((a,b) => (sev[b.severity]||0) - (sev[a.severity]||0))[0];
    setActive(top?.signal || null);
  }, []);

  const sevCounts = { high: 0, med: 0, low: 0, ok: 0 };
  DRIFT.forEach(d => sevCounts[d.severity] = (sevCounts[d.severity]||0) + 1);
  const activeRow = DRIFT.find(d => d.signal === active);

  return (
    <UPage>
      <UPageHead title="Drift"
        sub="The certificate is conditional on the model, prompt, policy, and traffic distribution measured at certification time. These signals continuously check whether those conditions still hold.">
        <UBadge tone="bad" dot>{sevCounts.high} high</UBadge>
        <UBadge tone="warn" dot>{sevCounts.med} med</UBadge>
        <UBadge tone="neutral">{sevCounts.ok} ok</UBadge>
        <UBtn ghost small icon={<GearIcon/>}>Configure</UBtn>
      </UPageHead>

      <div style={{ display:'grid', gridTemplateColumns:'1.45fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead title="Active drift signals"
            sub="Click a signal to inspect."/>
          <div>
            {DRIFT.map((d, i) => (
              <SignalRow key={i} d={d} idx={i} active={d.signal===active} onClick={() => setActive(d.signal)}/>
            ))}
          </div>
        </UCard>

        {activeRow ? <SignalDetail d={activeRow}/> : <UCard padding={24}><UEmpty title="Pick a signal" sub="Choose one from the list to see details."/></UCard>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.45fr 1fr', gap: 20 }}>
        <UCard>
          <UCardHead title="Traffic mixture — 30 days"
            sub="Adversarial share of incoming traffic. Threshold at 55% triggers re-cert."
            right={<UChip mono>now 58%</UChip>}/>
          <div style={{ padding: 20 }}><DriftTimeline/></div>
        </UCard>
        <UCard>
          <UCardHead title="Re-certification history" sub="last 5 events"/>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: U.sans, fontSize: 12.5 }}>
            <tbody>
              {[
                { date: '24 May 2026', who: 'cass-greedy', stack: 'LG3 + Phi3',  status: 'ok',  trig: 'monthly' },
                { date: '29 Apr 2026', who: 'cass-greedy', stack: 'LG3 + Phi3',  status: 'ok',  trig: 'guard diff' },
                { date: '2 Apr 2026',  who: 'manual',      stack: 'L3-3B + LG3', status: 'ok',  trig: 'manual' },
                { date: '5 Mar 2026',  who: 'cass-greedy', stack: 'L3-3B + LG3', status: 'ok',  trig: 'attack family' },
                { date: '8 Feb 2026',  who: 'cass-greedy', stack: 'L3-3B + LG3', status: 'exp', trig: 'monthly' },
              ].map((r, i) => (
                <tr key={i} style={{ borderTop: i?'1px solid '+U.line:'none' }}>
                  <td style={{ padding:'11px 18px', fontFamily: U.mono, fontSize: 11.5, color: U.ink3, fontVariantNumeric:'tabular-nums', width: 100 }}>{r.date}</td>
                  <td style={{ padding:'11px 8px', color: U.ink3, fontSize: 12 }}>{r.trig}</td>
                  <td style={{ padding:'11px 8px', color: U.ink, fontFamily: U.mono, fontSize: 11.5 }}>{r.stack}</td>
                  <td style={{ padding:'11px 18px', textAlign:'right' }}>
                    {r.status==='ok' ? <UBadge tone="ok" dot>Certified</UBadge> : <UBadge tone="neutral">Expired</UBadge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </UCard>
      </div>
    </UPage>
  );
}

function SignalRow({ d, idx, active, onClick }) {
  return (
    <button onClick={onClick} className={'u-row '+(active?'u-selected':'')}
      style={{ width:'100%', display:'grid', gridTemplateColumns: '14px 1.5fr 1.6fr 1.2fr 100px',
        alignItems:'center', gap: 16, padding:'14px 18px',
        borderTop: idx?'1px solid '+U.line:'none', border:'none',
        cursor:'pointer', textAlign:'left', background: active?U.accentSoft+'80':'transparent' }}>
      <USeverity s={d.severity}/>
      <div>
        <div style={{ color: U.ink, fontSize: 13.5, fontWeight: 500 }}>{d.signal}</div>
        <div style={{ color: U.ink3, fontSize: 11.5, marginTop: 2 }}>monitored since 1 Apr 2026</div>
      </div>
      <div style={{ color: U.ink2, fontSize: 12.5, fontFamily: U.mono }}>{d.change}</div>
      <div style={{ color: d.severity==='ok'?U.ok:d.severity==='high'?U.bad:d.severity==='med'?U.warn:U.blue, fontSize: 12.5 }}>{d.delta}</div>
      <div style={{ textAlign:'right' }}>
        <UBtn small primary={d.severity==='high'} ink={d.severity==='med'} ghost={d.severity==='ok'||d.severity==='low'}>
          {d.severity==='ok' ? 'OK' : 'Re-certify'}
        </UBtn>
      </div>
    </button>
  );
}

function SignalDetail({ d }) {
  const tone = d.severity==='high'?'bad':d.severity==='med'?'warn':d.severity==='low'?'accent':'ok';
  const verdict = {
    high: 'Triggers an immediate re-certification. The certificate becomes provisional until the new run completes.',
    med:  'Re-certification queued for next scheduled cycle (within 24h). The current certificate remains valid.',
    low:  'Logged for review. The certificate is unaffected.',
    ok:   'No change. The certificate is in force.',
  }[d.severity];
  return (
    <UCard>
      <UCardHead title={d.signal} sub={d.change}
        right={<UBadge tone={tone} dot>{d.severity.toUpperCase()}</UBadge>}/>
      <div style={{ padding: 20 }}>
        <UStat label="Observed delta" value={d.delta} accent={d.severity==='ok'?U.ok:d.severity==='high'?U.bad:U.warn}/>
        <div style={{ marginTop: 18, fontSize: 11.5, color: U.ink3, marginBottom: 6, fontWeight: 500, letterSpacing: 0.3, textTransform:'uppercase' }}>Effect on certificate</div>
        <div style={{ fontSize: 13, color: U.ink2, lineHeight: 1.55 }}>{verdict}</div>

        <div style={{ marginTop: 18, fontSize: 11.5, color: U.ink3, marginBottom: 8, fontWeight: 500, letterSpacing: 0.3, textTransform:'uppercase' }}>Recent values</div>
        <MiniSparkRow severity={d.severity}/>
      </div>
      <div style={{ borderTop: '1px solid '+U.line, padding: '12px 18px', display:'flex', gap: 8, background: U.surface2 }}>
        <UBtn ghost small>Open run log</UBtn>
        <UBtn ghost small>Snooze 24h</UBtn>
        <div style={{ flex: 1 }}/>
        {d.severity !== 'ok' && <UBtn primary small>Trigger re-cert →</UBtn>}
      </div>
    </UCard>
  );
}

function MiniSparkRow({ severity }) {
  // tiny inline sparkline (illustrative)
  const W = 320, H = 50;
  const pts = Array.from({length: 30}, (_,i) => {
    const x = i;
    const noise = Math.sin(i/3.1) * 0.10 + Math.cos(i/5) * 0.08;
    return noise + (i > 22 && severity==='high' ? 0.45 : 0);
  });
  const min = Math.min(...pts), max = Math.max(...pts);
  const yOf = (v) => H - 4 - ((v-min)/(max-min||1))*(H-8);
  const xOf = (i) => 4 + (i/(pts.length-1))*(W-8);
  const path = pts.map((v,i)=>(i?'L':'M')+xOf(i)+','+yOf(v)).join(' ');
  const color = severity==='high'?U.bad:severity==='med'?U.warn:severity==='low'?U.blue:U.ok;
  return (
    <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }}>
      <rect x={0} y={0} width={W} height={H} fill={U.surface2} rx={5}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.6"/>
      {pts.map((v,i) => (i===pts.length-1) && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="3" fill={color} stroke={U.surface} strokeWidth="1.5"/>)}
    </svg>
  );
}

function DriftTimeline() {
  const days = 30;
  const adv = Array.from({length: days}, (_,i) => 0.48 + Math.sin(i/3)*0.04 + (i>22?0.07:0));
  const W = 600, H = 220, padL = 40, padR = 14, padT = 18, padB = 34;
  const yMax = 0.7, yMin = 0.3;
  const xOf = i => padL + (i/(days-1))*(W-padL-padR);
  const yOf = v => padT + (1-(v-yMin)/(yMax-yMin))*(H-padT-padB);
  const linePts = adv.map((v,i)=>[xOf(i), yOf(v)]);
  const area = linePts.map((p,i)=> (i?'L':'M')+p.join(',')).join(' ') + ` L${xOf(days-1)},${H-padB} L${xOf(0)},${H-padB} Z`;
  return (
    <svg width={W} height={H} style={{ display:'block', maxWidth:'100%' }}>
      <defs>
        <linearGradient id="ugrad2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={U.accent} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={U.accent} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.3, 0.4, 0.5, 0.6, 0.7].map(v => (
        <g key={v}>
          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={U.line}/>
          <text x={padL-8} y={yOf(v)+3} textAnchor="end" fill={U.ink3} fontSize="10" fontFamily={U.mono}>{(v*100).toFixed(0)}%</text>
        </g>
      ))}
      <line x1={padL} x2={W-padR} y1={yOf(0.55)} y2={yOf(0.55)} stroke={U.warn} strokeDasharray="3 4" strokeWidth="1.5"/>
      <text x={W-padR-6} y={yOf(0.55)-5} textAnchor="end" fill={U.warn} fontSize="10.5" fontFamily={U.sans}>drift threshold 55%</text>

      <path d={area} fill="url(#ugrad2)"/>
      <path d={linePts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')} fill="none" stroke={U.accent} strokeWidth="2"/>
      {adv.map((v,i) => v>0.55 && <circle key={i} cx={xOf(i)} cy={yOf(v)} r="2.5" fill={U.warn}/>)}

      <text x={padL} y={H-16} fill={U.ink3} fontSize="10" fontFamily={U.mono}>30d ago</text>
      <text x={(padL+W-padR)/2} y={H-16} fill={U.ink3} fontSize="10" fontFamily={U.mono} textAnchor="middle">15d ago</text>
      <text x={W-padR} y={H-16} textAnchor="end" fill={U.ink3} fontSize="10" fontFamily={U.mono}>today</text>

      {/* breach annotation */}
      <g transform={`translate(${xOf(26)}, ${yOf(adv[26])-22})`}>
        <line x1={0} y1={20} x2={0} y2={4} stroke={U.warn} strokeWidth="1"/>
        <rect x={-44} y={-12} width={88} height={16} fill={U.warnSoft} stroke={U.warn} rx={3}/>
        <text x={0} y={0} textAnchor="middle" fontSize="10.5" fontFamily={U.sans} fontWeight="500" fill={U.warn}>breach: 2d</text>
      </g>
    </svg>
  );
}

function GearIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="1.5"/><path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.5 2.5l1 1M8.5 8.5l1 1M2.5 9.5l1-1M8.5 3.5l1-1"/></svg>;
}

Object.assign(window, { UDrift });
