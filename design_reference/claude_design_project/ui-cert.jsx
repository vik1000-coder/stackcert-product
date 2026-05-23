// StackCert UI — Certificate screen
// The formal artifact a customer would send to GRC. Big formal display with
// sticky action bar.

function UCertificate({ lam }) {
  return (
    <div style={{ paddingBottom: 0 }}>
      <UPage>
        <UPageHead title="Certificate"
          sub="The formal artifact for this run. Export the JSON/Markdown for the audit trail, or submit to GRC for signoff.">
          <UBadge tone="ok" dot>Issued</UBadge>
          <UChip mono>cert-2026-0524-001a</UChip>
        </UPageHead>

        <CertificateArtifact lam={lam}/>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 20 }}>
          <UCard>
            <UCardHead title="Re-certification triggers" sub="The cert auto-expires under these conditions."/>
            <div>
              {[
                { sev: 'high', label: 'New attack family detected',           note: 'auto-fires within 1 hour' },
                { sev: 'med',  label: 'Guard version diff (any in stack)',    note: 'auto-fires on detection' },
                { sev: 'med',  label: 'Policy or prompt template update',     note: 'auto-fires on commit' },
                { sev: 'low',  label: 'Traffic mixture shift > 8%',           note: 'evaluated daily' },
                { sev: 'ok',   label: 'Monthly default cadence',              note: 'next: 24 Jun 2026' },
              ].map((r, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'14px 1fr auto', alignItems:'center', gap: 14, padding: '12px 18px', borderTop: i?'1px solid '+U.line:'none' }}>
                  <USeverity s={r.sev}/>
                  <div style={{ color: U.ink, fontSize: 13 }}>{r.label}</div>
                  <div style={{ color: U.ink3, fontSize: 11.5, fontFamily: U.mono, fontVariantNumeric:'tabular-nums' }}>{r.note}</div>
                </div>
              ))}
            </div>
          </UCard>

          <UCard>
            <UCardHead title="Signoff" sub="Reviewer attestations attached to the cert"/>
            <div style={{ padding: 18 }}>
              {[
                { name: 'Iris Mendel',  role: 'AI Security · author', status: 'signed', time: '24 May, 11:14 UTC' },
                { name: 'Awaiting',     role: 'Model Risk Lead',      status: 'pending' },
                { name: 'Awaiting',     role: 'Platform Engineering', status: 'pending' },
              ].map((sg, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 0', borderTop: i?'1px solid '+U.line:'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 15, background: sg.status==='signed' ? 'linear-gradient(135deg, #c2b3f5, #5b5bd6)' : U.surface3, color: sg.status==='signed'?'#fff':U.dim, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 600 }}>
                    {sg.status==='signed' ? sg.name.split(' ').map(p=>p[0]).join('') : '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: sg.status==='signed'?U.ink:U.ink3 }}>{sg.name}</div>
                    <div style={{ fontSize: 11.5, color: U.ink3 }}>{sg.role}</div>
                  </div>
                  {sg.status==='signed'
                    ? <div style={{ textAlign:'right' }}>
                        <UBadge tone="ok" dot>Signed</UBadge>
                        <div style={{ fontSize: 11, color: U.ink3, marginTop: 3, fontFamily: U.mono, fontVariantNumeric:'tabular-nums' }}>{sg.time}</div>
                      </div>
                    : <UBtn small ghost>Remind →</UBtn>}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid '+U.line, padding: 14, background: U.surface2, fontSize: 12, color: U.ink3, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
              Certificate becomes legally binding for the GRC audit trail after all three signoffs.
            </div>
          </UCard>
        </div>
      </UPage>

      {/* sticky action bar */}
      <div style={{ position:'sticky', bottom: 0, background: U.surface, borderTop: '1px solid '+U.line, padding: '14px 28px', display:'flex', alignItems:'center', gap: 12, boxShadow: '0 -1px 4px rgba(15,15,25,.04)' }}>
        <UBadge tone="ok" dot>Ready to submit</UBadge>
        <span style={{ color: U.ink3, fontSize: 12.5 }}>All 27/27 comparisons certified. 1 of 3 signoffs collected.</span>
        <div style={{ flex: 1 }}/>
        <UBtn ghost small>Copy link</UBtn>
        <UBtn ghost small icon={<ExportIcon2/>}>Export JSON</UBtn>
        <UBtn ghost small icon={<ExportIcon2/>}>Export Markdown</UBtn>
        <UBtn ghost small>Print PDF</UBtn>
        <UBtn ink>Submit to GRC →</UBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Certificate artifact (the formal-looking document)
// ─────────────────────────────────────────────────────────────
function CertificateArtifact({ lam }) {
  return (
    <UCard style={{ overflow: 'hidden' }}>
      {/* letterhead */}
      <div style={{ padding: '28px 36px 24px', borderBottom: '1px solid '+U.line, background: 'linear-gradient(180deg, '+U.accentSoft+'66 0%, transparent 100%)' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: U.ink, color: '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily: U.display, fontWeight: 700, fontSize: 12 }}>SC</div>
          <span style={{ fontWeight: 500, color: U.ink, letterSpacing: -0.1 }}>StackCert</span>
          <span style={{ color: U.faint }}>·</span>
          <span style={{ fontSize: 12, color: U.ink3, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500 }}>Certificate of Serial Guardrail Stack</span>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop: 18, gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <UBadge tone="ok" dot>Certified</UBadge>
              <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.ink3 }}>conditional · finite-benchmark · K = 2 exact</span>
            </div>
            <div style={{ fontFamily: U.display, fontSize: 38, fontWeight: 600, color: U.ink, marginTop: 14, letterSpacing: -1, lineHeight: 1 }}>
              LG3 <span style={{ color: U.faint, fontWeight: 400 }}>+</span> Phi3
            </div>
            <div style={{ fontSize: 13.5, color: U.ink2, marginTop: 8, maxWidth: 720, lineHeight: 1.55 }}>
              Certified to dominate every candidate competitor under the stated candidate set, benchmark mixture, serial aggregation rule, welfare profile, and uncertainty model, with strictly positive welfare gap.
            </div>
          </div>
          {/* seal */}
          <Seal/>
        </div>
      </div>

      {/* fields */}
      <div style={{ padding: '24px 36px', display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 36 }}>
        <div style={{ display:'grid', gridTemplateColumns:'170px 1fr', rowGap: 14, fontSize: 13.5 }}>
          <UField label="Certificate ID"        value="cert-2026-0524-001a"/>
          <UField label="Application"           value="acme-copilot · production · us-east"/>
          <UField label="Candidate set"         value="8 guards · 28 size-2 serial ensembles"/>
          <UField label="Aggregation"           value="serial · K = 2 · residual radius 0.000"/>
          <UField label="Benchmark mixture"     value="2,000 examples — 1,195 adv (4 cells) + 805 benign (2 cells)"/>
          <UField label="Welfare profile"       value={`λ = ${lam} · π_A inferred · uniform source weights`}/>
          <UField label="Measurement coverage"  value="10 agent-cells · 13 pair-cells · 0 parse failures · 0 errors"/>
          <UField label="Welfare estimate"      value="0.1363  [+0.1245, +0.1481]" accent/>
          <UField label="Competitor comparisons" value="27 of 27 certified · 0 unresolved"  accent/>
          <UField label="Issued / expires"      value="24 May 2026 · 24 Jun 2026"/>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
          <div style={{ padding: 16, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform: 'uppercase' }}>Component versions</div>
            <div style={{ fontFamily: U.mono, fontSize: 12, marginTop: 10, color: U.ink2, lineHeight: 1.85 }}>
              <CertLine k="LG3"    v="llama-guard3-1B · 3-1B"/>
              <CertLine k="Phi3"   v="phi3-mini · mini"/>
              <CertLine k="Policy" v="acme-tos @ v4.2"/>
              <CertLine k="Prompt" v="cass-judge @ v1.7"/>
              <CertLine k="Suite"  v="stackcert @ v0.4.1"/>
            </div>
          </div>

          <div style={{ padding: 16, background: U.surface2, border: '1px solid '+U.line, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform: 'uppercase' }}>What this covers</div>
            <ul style={{ paddingLeft: 18, margin: '8px 0 0', fontSize: 12.5, color: U.ink2, lineHeight: 1.7 }}>
              <li>Selection of the recommended stack across the candidate set</li>
              <li>Joint failure modes (pair-cell correlations on adv and benign sides)</li>
              <li>Comparison to every alternative under the same welfare profile</li>
            </ul>
            <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 14 }}>What it does NOT cover</div>
            <ul style={{ paddingLeft: 18, margin: '8px 0 0', fontSize: 12.5, color: U.ink2, lineHeight: 1.7 }}>
              <li>Runtime enforcement behaviour or latency SLOs</li>
              <li>Generalisation beyond the certified benchmark mixture</li>
              <li>K ≥ 3 composition (residual uncertainty would apply)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* statement */}
      <div style={{ padding: '0 36px 24px' }}>
        <div style={{ padding: '18px 22px', background: U.surface2, border: '1px solid '+U.line, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform: 'uppercase' }}>Statement of certification</div>
          <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.65, color: U.ink2 }}>
            Under the candidate set, benchmark mixture, serial aggregation rule, welfare profile, and uncertainty model
            specified above, the stack <strong style={{ color: U.ink }}>LG3 + Phi3</strong> has welfare <strong style={{ color: U.ok }}>0.1363</strong> with
            a 95% interval of <strong style={{ color: U.ok }}>[+0.1245, +0.1481]</strong>, and a strictly positive lower bound on its
            welfare gap against every candidate competitor. This certificate is conditional on the stated assumptions and does
            not constitute a deployment-general guarantee of safety.
          </p>
        </div>
      </div>

      {/* limitations */}
      <div style={{ padding: '0 36px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: U.ink3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Limitations</div>
        <ul style={{ paddingLeft: 18, margin: 0, color: U.ink2, fontSize: 13, lineHeight: 1.7 }}>
          <li>Conditional on the specified benchmark mixture; not a deployment-general guarantee.</li>
          <li>Leave-one-source-out: hold-out regret 1.078 when HarmBench is excluded — re-certify if traffic shifts away from the certified mixture.</li>
          <li>Applies to K = 2 serial composition only. K ≥ 3 stacks would carry conservative residual uncertainty.</li>
          <li>Source weights, λ, and π_A are customer-supplied and were not independently validated against business outcomes.</li>
          <li>Welfare interval is conditional on the K=2 decomposition error being zero; this is exact under the K=2 model.</li>
        </ul>
      </div>
    </UCard>
  );
}

function CertLine({ k, v }) {
  return (
    <div>
      <span style={{ color: U.ink, display:'inline-block', width: 64 }}>{k}</span>
      <span style={{ color: U.ink2 }}>{v}</span>
    </div>
  );
}

function Seal() {
  return (
    <div style={{ flexShrink: 0, position:'relative', width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="52" fill="none" stroke={U.accent} strokeWidth="1"/>
        <circle cx="55" cy="55" r="46" fill="none" stroke={U.accent} strokeWidth="0.5" strokeDasharray="2 3"/>
        <defs>
          <path id="sealText" d="M 55,55 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"/>
        </defs>
        <text fontSize="7.5" fontFamily={U.mono} fill={U.accent} letterSpacing="2.5">
          <textPath href="#sealText" startOffset="0%">CERTIFIED · STACKCERT · K=2 · ρ=0.60 · </textPath>
        </text>
        <g transform="translate(55,55)">
          <path d="M -14 0 L -4 10 L 14 -10" fill="none" stroke={U.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
    </div>
  );
}

function ExportIcon2() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 7.5V1.5m-2 2.5L6 1.5l2 2.5M2 8.5v1a1 1 0 001 1h6a1 1 0 001-1v-1"/></svg>;
}

Object.assign(window, { UCertificate });
