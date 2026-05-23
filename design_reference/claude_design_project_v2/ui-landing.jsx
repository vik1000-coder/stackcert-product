// StackCert UI — Landing page
// Marketing site for the product, in the same design system as the app.
// Self-contained: depends only on ui-core (tokens + primitives).

function LandingPage() {
  return (
    <div style={{ width:'100%', minHeight:'100%', background: U.surface, color: U.ink, fontFamily: U.sans, fontSize: 14 }}>
      <LandingNav/>
      <LandingHero/>
      <LandingLogos/>
      <LandingProblem/>
      <LandingHow/>
      <LandingProduct/>
      <LandingFeatures/>
      <LandingProof/>
      <LandingPricing/>
      <LandingCTA/>
      <LandingFooter/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Nav
// ─────────────────────────────────────────────────────────────
function LandingNav() {
  return (
    <div style={{ position:'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid '+U.line }}>
      <LandingContainer>
        <div style={{ display:'flex', alignItems:'center', height: 60, gap: 28 }}>
          <a href="#" style={{ display:'flex', alignItems:'center', gap: 8, textDecoration:'none', color:'inherit' }}>
            <LogoMark/>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>StackCert</span>
          </a>
          <nav style={{ display:'flex', gap: 24, fontSize: 13.5, color: U.ink2 }}>
            <a href="#problem" style={navLink}>Why</a>
            <a href="#how" style={navLink}>How it works</a>
            <a href="#product" style={navLink}>Product</a>
            <a href="#pricing" style={navLink}>Pricing</a>
            <a href="#docs" style={navLink}>Docs</a>
          </nav>
          <div style={{ flex: 1 }}/>
          <a href="StackCert.html" style={{ ...navLink, fontSize: 13.5 }}>Sign in</a>
          <UBtn ink onClick={() => location.href = 'StackCert.html'}>Open app →</UBtn>
        </div>
      </LandingContainer>
    </div>
  );
}
const navLink = { textDecoration:'none', color: U.ink2, fontWeight: 500, transition:'color .1s' };

function LogoMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 6, background: U.ink, color: '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily: U.display, fontWeight: 700, fontSize: size*0.55, letterSpacing: -0.5 }}>
      ⌗
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────
function LandingHero() {
  return (
    <section style={{ position:'relative', padding: '88px 0 48px', overflow:'hidden' }}>
      {/* soft grid backdrop */}
      <div aria-hidden style={{ position:'absolute', inset: 0, opacity: 0.35, pointerEvents:'none',
        backgroundImage: `linear-gradient(${U.line} 1px, transparent 1px), linear-gradient(90deg, ${U.line} 1px, transparent 1px)`,
        backgroundSize: '36px 36px',
        maskImage: 'radial-gradient(ellipse at top, #000 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at top, #000 0%, transparent 70%)' }}/>
      <LandingContainer>
        <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr', gap: 36, textAlign:'center', maxWidth: 880, margin: '0 auto' }}>
          <div style={{ display:'inline-flex', alignSelf:'center', alignItems:'center', gap: 8, padding: '5px 14px 5px 6px', background: U.surface, border:'1px solid '+U.line, borderRadius: 999, fontSize: 12.5, color: U.ink2, boxShadow: U.shadow1 }}>
            <span style={{ background: U.accentSoft, color: U.accent, fontWeight: 600, padding: '2px 8px', borderRadius: 999, fontSize: 11.5 }}>New</span>
            Research preprint · "Composable guardrail certification at λ=5"
            <UChevron dir="right" size={12} color={U.ink3}/>
          </div>
          <h1 style={{ fontFamily: U.display, fontSize: 64, lineHeight: 1.04, letterSpacing: -2, fontWeight: 600, margin: 0, color: U.ink }}>
            Certify the<br/>guardrail stack<br/>you actually ship.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: U.ink3, margin: 0, maxWidth: 640, marginInline:'auto' }}>
            Marginal block-rates lie. <strong style={{ color: U.ink2 }}>StackCert</strong> measures
            correlated failures across the guards you compose, and ships a defensible certificate—not
            a hunch—to your safety team, your auditors, and your shipping calendar.
          </p>
          <div style={{ display:'flex', gap: 10, justifyContent:'center', marginTop: 4 }}>
            <UBtn ink style={{ padding: '10px 18px', fontSize: 14 }} onClick={() => location.href='StackCert.html'}>Open the dashboard →</UBtn>
            <UBtn ghost style={{ padding: '10px 18px', fontSize: 14 }}>Book a 20-minute demo</UBtn>
          </div>
          <div style={{ display:'flex', gap: 22, justifyContent:'center', fontSize: 12.5, color: U.ink3, marginTop: -4 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><Dot c={U.ok}/> SOC 2 Type II</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><Dot c={U.ok}/> ISO 27001</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}><Dot c={U.ok}/> Self-hosted available</span>
          </div>
        </div>

        {/* product preview */}
        <div style={{ position:'relative', marginTop: 64, padding: '20px 20px 0', background: 'linear-gradient(180deg, '+U.surface3+' 0%, '+U.surface+' 100%)', border:'1px solid '+U.line, borderRadius: 18, boxShadow: '0 30px 80px rgba(15,15,25,.08), 0 6px 20px rgba(15,15,25,.04)', maxWidth: 1120, margin: '64px auto 0' }}>
          <BrowserChrome/>
          <HeroDashboard/>
        </div>
      </LandingContainer>
    </section>
  );
}

function Dot({ c }) { return <span style={{ width: 6, height: 6, borderRadius: 3, background: c }}/>; }

function BrowserChrome() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 8, paddingBottom: 14 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: '#f56565' }}/>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: '#f1c40f' }}/>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: '#27ae60' }}/>
      <div style={{ flex: 1, display:'flex', justifyContent:'center' }}>
        <div style={{ background: U.surface, border:'1px solid '+U.line, borderRadius: 6, padding: '4px 14px', fontSize: 12, color: U.ink3, fontFamily: U.mono, fontVariantNumeric: 'tabular-nums' }}>stackcert.app / acme-copilot / overview</div>
      </div>
    </div>
  );
}

function HeroDashboard() {
  // Stylized rendering of the actual product Overview, made flat for the hero.
  return (
    <div style={{ background: U.surface, borderTopLeftRadius: 10, borderTopRightRadius: 10, border:'1px solid '+U.line, borderBottom:'none', overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', minHeight: 480 }}>
        {/* sidebar */}
        <div style={{ background: U.surface2, borderRight: '1px solid '+U.line, padding: 14 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'6px 8px', border:'1px solid '+U.line, borderRadius: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: U.ink }}/>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Acme</div>
          </div>
          <div style={{ marginTop: 14 }}>
            {['Overview','Stack ranking','Co-failure','Measurements','Certificate','Drift'].map((n,i) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap: 8, padding:'6px 8px', background: i===0?U.surface3:'transparent', borderRadius: 5, color: i===0?U.ink:U.ink2, fontSize: 12, marginBottom: 2 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: i===0?U.ink:U.line2 }}/>
                {n}
              </div>
            ))}
          </div>
        </div>
        {/* content */}
        <div style={{ padding: 22, display:'flex', flexDirection:'column', gap: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <UBadge tone="ok" dot>Certified</UBadge>
            <span style={{ color: U.ink3, fontSize: 11.5 }}>cert-2026-0524-001a · 24 May, 11:08 UTC</span>
          </div>
          <div style={{ fontFamily: U.display, fontSize: 32, fontWeight: 600, letterSpacing: -0.8 }}>
            LG3 <span style={{ color: U.faint, fontWeight: 400 }}>+</span> Phi3
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 18, paddingBlock: 8, borderTop:'1px solid '+U.line, borderBottom:'1px solid '+U.line }}>
            <MiniStat label="Welfare" v="0.1363" tone={U.ok}/>
            <MiniStat label="Regret avoided" v="+0.0253" tone={U.ok}/>
            <MiniStat label="Pair-cells" v="13/168"/>
            <MiniStat label="Comparisons" v="27/27" tone={U.ok}/>
            <MiniStat label="Marginal pick" v="L3-3B + LG3" small/>
          </div>
          {/* chart */}
          <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 14 }}>
            <div style={{ border:'1px solid '+U.line, borderRadius: 8, padding: 14, background: U.surface2 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Welfare by stack</div>
              <MiniWelfare/>
            </div>
            <div style={{ border:'1px solid '+U.line, borderRadius: 8, padding: 14, background: U.surface2 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Why this isn't obvious</div>
              <div style={{ fontSize: 11.5, color: U.ink3, lineHeight: 1.5 }}>
                <strong style={{ color: U.ink2 }}>L3-3B + LG3</strong> wins first-order but loses on full evaluation. Both guards miss the same adversarial examples — <strong style={{ color: U.bad }}>+0.48</strong> block correlation.
              </div>
              <div style={{ marginTop: 10, padding: 10, background: U.accentSoft, borderRadius: 6, fontSize: 11.5, color: U.ink2, lineHeight: 1.45 }}>
                <strong style={{ color: U.accent }}>Recommendation.</strong> Adopt CASS-greedy and re-certify on every drift signal.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, v, tone, small }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: U.ink3, letterSpacing: 0.1 }}>{label}</div>
      <div style={{ fontFamily: U.mono, fontSize: small?13:18, fontWeight: 500, color: tone || U.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{v}</div>
    </div>
  );
}

function MiniWelfare() {
  const items = [
    { name: 'LG3 + Phi3',  first: 0.1552, full: 0.1363, cert: true  },
    { name: 'L3-3B + LG3', first: 0.1593, full: 0.1110, cert: false },
    { name: 'Gemma + LG3', first: 0.0594, full: 0.0641, cert: false },
    { name: 'L3-3B + Phi3',first: 0.1223, full:-0.0477, cert: false },
  ];
  const min = -0.06, max = 0.20;
  const xOf = v => ((v-min)/(max-min))*100;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
      {items.map(it => {
        const cFull = it.cert ? U.ok : it.full<0 ? U.bad : U.ink2;
        return (
          <div key={it.name} style={{ display:'grid', gridTemplateColumns:'90px 1fr', alignItems:'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: it.cert?U.ink:U.ink2, fontWeight: it.cert?500:400 }}>{it.cert && '★ '}{it.name}</span>
            <div style={{ position:'relative', height: 16 }}>
              <div style={{ position:'absolute', top: '50%', left: `${xOf(0)}%`, width: 1, height: 12, marginTop: -6, background: U.line2 }}/>
              <div style={{ position:'absolute', top: '50%', height: 1, background: cFull, opacity: 0.35,
                left: `${xOf(Math.min(it.first,it.full))}%`,
                width: `${xOf(Math.max(it.first,it.full))-xOf(Math.min(it.first,it.full))}%` }}/>
              <div style={{ position:'absolute', top: '50%', left: `${xOf(it.first)}%`, width: 7, height: 7, marginLeft: -4, marginTop: -4, borderRadius: 4, background: U.surface, border: '1.4px solid '+U.ink3 }}/>
              <div style={{ position:'absolute', top: '50%', left: `${xOf(it.full)}%`, width: 9, height: 9, marginLeft: -5, marginTop: -5, borderRadius: 5, background: cFull }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Logos
// ─────────────────────────────────────────────────────────────
function LandingLogos() {
  const logos = ['Acme', 'Northwind', 'Helix', 'Atlas', 'Vela', 'Pillar', 'Anchor'];
  return (
    <section style={{ padding: '64px 0 40px', borderTop: '1px solid '+U.line, background: U.surface2 }}>
      <LandingContainer>
        <div style={{ textAlign:'center', color: U.ink3, fontSize: 12.5, letterSpacing: 0.6, textTransform:'uppercase', fontWeight: 500, marginBottom: 28 }}>
          Trusted by safety teams shipping into regulated workloads
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 32, flexWrap:'wrap' }}>
          {logos.map(l => (
            <div key={l} style={{ fontFamily: U.display, fontSize: 22, fontWeight: 600, color: U.dim, letterSpacing: -0.3, opacity: 0.85 }}>{l}</div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────────────────────
function LandingProblem() {
  return (
    <section id="problem" style={{ padding: '120px 0' }}>
      <LandingContainer>
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <SectionEyebrow>The problem</SectionEyebrow>
          <SectionTitle>Stacking guardrails creates a hidden correlation tax.</SectionTitle>
          <p style={{ fontSize: 17, color: U.ink3, lineHeight: 1.55, marginTop: 16 }}>
            Two guards that each block 85% of attacks don't compose to 97.75% — they compose to whatever fraction
            of attacks <em>neither</em> catches. That fraction is determined by their failure correlation, and
            no marginal benchmark you've ever run measures it.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 28 }}>
          {/* Bad case */}
          <div style={{ padding: 28, background: U.surface, border: '1px solid '+U.line, borderRadius: 14 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
              <UBadge tone="bad" dot>Without StackCert</UBadge>
              <span style={{ color: U.ink3, fontSize: 12 }}>marginal-greedy selection</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap: 14, marginBottom: 8 }}>
              <div style={{ fontFamily: U.display, fontSize: 32, fontWeight: 600, color: U.ink, letterSpacing: -0.6 }}>L3-3B + LG3</div>
              <span style={{ fontSize: 12, color: U.bad, fontWeight: 500 }}>wrong winner</span>
            </div>
            <p style={{ fontSize: 13.5, color: U.ink3, lineHeight: 1.55, margin: 0 }}>
              First-order welfare looks great (+0.159). But these two guards miss the <em>same</em> adversarial
              examples — block correlation +0.48 — so the real stacked welfare collapses to +0.111.
              You shipped this. Now your auditors are asking why.
            </p>
            <CorrBars adv={0.48} regret={0.025}/>
          </div>

          {/* Good case */}
          <div style={{ padding: 28, background: U.surface, border: '1px solid '+U.accent+'33', borderRadius: 14, boxShadow: '0 0 0 4px '+U.accentSoft }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
              <UBadge tone="ok" dot>With StackCert</UBadge>
              <span style={{ color: U.ink3, fontSize: 12 }}>CASS-greedy certification</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap: 14, marginBottom: 8 }}>
              <div style={{ fontFamily: U.display, fontSize: 32, fontWeight: 600, color: U.ink, letterSpacing: -0.6 }}>LG3 + Phi3</div>
              <span style={{ fontSize: 12, color: U.ok, fontWeight: 500 }}>certified ★</span>
            </div>
            <p style={{ fontSize: 13.5, color: U.ink3, lineHeight: 1.55, margin: 0 }}>
              Lower first-order (+0.155), <em>higher</em> stacked welfare (+0.136). Adversarial misses spread
              across cells (block correlation +0.12), so the stack does what stacking promises. Certificate
              issued in 14 minutes with 13 pair-cell measurements — 92% fewer than exhaustive.
            </p>
            <CorrBars adv={0.12} regret={0} good/>
          </div>
        </div>

        {/* Stat row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 1, marginTop: 56, background: U.line, border: '1px solid '+U.line, borderRadius: 14, overflow:'hidden' }}>
          <BigStat n="22.7%" lbl="Real welfare lift hidden by marginal scores"/>
          <BigStat n="92%" lbl="Measurement reduction vs. exhaustive K=2"/>
          <BigStat n="0.025" lbl="Regret per run on the wrong stack"/>
          <BigStat n="14 min" lbl="Time to a defensible certificate"/>
        </div>
      </LandingContainer>
    </section>
  );
}

function CorrBars({ adv, regret, good }) {
  const advW = Math.min(100, Math.abs(adv)*100);
  return (
    <div style={{ marginTop: 24, display:'flex', flexDirection:'column', gap: 12 }}>
      <BarRow label="Adv. block correlation" v={adv.toFixed(2)} pct={advW} color={good?U.ok:U.bad} tip={good?'spread across cells':'misses overlap'}/>
      <BarRow label="Welfare regret"        v={regret.toFixed(3)} pct={regret*1000+(good?2:0)} color={good?U.ok:U.bad}  tip={good?'zero regret':'shipped wrong stack'}/>
    </div>
  );
}
function BarRow({ label, v, pct, color, tip }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11.5, color: U.ink3, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ display:'flex', gap: 8 }}>
          <span style={{ color: U.dim, fontStyle:'italic' }}>{tip}</span>
          <span style={{ fontFamily: U.mono, color, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
        </span>
      </div>
      <div style={{ height: 6, background: U.surface3, borderRadius: 3, overflow:'hidden' }}>
        <div style={{ width: pct+'%', height: '100%', background: color, borderRadius: 3 }}/>
      </div>
    </div>
  );
}
function BigStat({ n, lbl }) {
  return (
    <div style={{ background: U.surface, padding: 28, textAlign:'left' }}>
      <div style={{ fontFamily: U.display, fontSize: 40, fontWeight: 600, letterSpacing: -1.2, color: U.ink, fontVariantNumeric:'tabular-nums' }}>{n}</div>
      <div style={{ fontSize: 12.5, color: U.ink3, marginTop: 4, lineHeight: 1.45, maxWidth: 200 }}>{lbl}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// How
// ─────────────────────────────────────────────────────────────
function LandingHow() {
  const steps = [
    { n: '01', title: 'Declare candidates',
      body: 'Point CASS at the guards you\'re considering, the benchmark mixture you serve, the welfare profile (λ) your business actually uses, and an aggregation rule (K = 2, K = 3).',
      tag: 'CONFIG',
    },
    { n: '02', title: 'Run bundle-greedy',
      body: 'CASS picks the smallest set of pair-cell evaluations that can refute every alternative. Typically <8% of the exhaustive K=2 cost — and you only pay for what actually moves the certificate.',
      tag: 'SCHEDULER',
    },
    { n: '03', title: 'Issue the certificate',
      body: 'Signed, dated, conditional on the stated assumptions. Embed it in your model card, hand it to GRC, and watch the drift signals continuously check whether it still holds.',
      tag: 'ARTIFACT',
    },
  ];
  return (
    <section id="how" style={{ padding: '120px 0', borderTop: '1px solid '+U.line, background: U.surface2 }}>
      <LandingContainer>
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <SectionEyebrow>How it works</SectionEyebrow>
          <SectionTitle>Three steps. One certificate. Zero hand-waving.</SectionTitle>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 22 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ padding: 30, background: U.surface, border: '1px solid '+U.line, borderRadius: 14, position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 22 }}>
                <span style={{ fontFamily: U.mono, fontSize: 12, color: U.accent, letterSpacing: 0.5 }}>{s.n}</span>
                <UChip mono>{s.tag}</UChip>
              </div>
              <h3 style={{ fontFamily: U.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, margin: '0 0 12px', color: U.ink }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: U.ink3, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
              {/* mini illustration */}
              <HowIllustration kind={i}/>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function HowIllustration({ kind }) {
  return (
    <div style={{ marginTop: 22, padding: 14, background: U.surface2, border:'1px solid '+U.line, borderRadius: 8, fontFamily: U.mono, fontSize: 11, color: U.ink2, lineHeight: 1.65 }}>
      {kind === 0 && <>
        <Term k="guards" v="[Rules, Lex, L3-3B, LG3, Phi3, Gemma]"/>
        <Term k="cells"  v="HarmBench, StrongREJECT, ToxicChat, XSTest"/>
        <Term k="λ"      v={`5 &nbsp;<span style='color:${U.ink3}'>// high-safety</span>`}/>
        <Term k="K"      v="2"/>
      </>}
      {kind === 1 && <>
        <Term k="queued" v="13 / 168 pair-cells"/>
        <Term k="cost"   v="$1,720 / $30,800 exhaustive"/>
        <Term k="ETA"    v="14 min"/>
        <Term k="status" v={`<span style='color:${U.ok};font-weight:500'>scheduled</span>`}/>
      </>}
      {kind === 2 && <>
        <Term k="cert"   v="cert-2026-0524-001a"/>
        <Term k="stack"  v={`<span style='color:${U.ink};font-weight:500'>LG3 + Phi3</span>`}/>
        <Term k="welfare" v={`<span style='color:${U.ok}'>+0.1363</span>  [+0.1245, +0.1481]`}/>
        <Term k="expires" v="24 Jun 2026"/>
      </>}
    </div>
  );
}
function Term({ k, v }) {
  return <div><span style={{ color: U.ink3, width: 70, display:'inline-block' }}>{k}</span><span dangerouslySetInnerHTML={{__html:v}}/></div>;
}

// ─────────────────────────────────────────────────────────────
// Product (screenshot-style cards)
// ─────────────────────────────────────────────────────────────
function LandingProduct() {
  return (
    <section id="product" style={{ padding: '120px 0' }}>
      <LandingContainer>
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <SectionEyebrow>Inside the product</SectionEyebrow>
          <SectionTitle>The dashboard your safety, platform, and risk teams all agree on.</SectionTitle>
          <p style={{ fontSize: 16.5, color: U.ink3, lineHeight: 1.55, marginTop: 14 }}>
            One source of truth — three personas. Switch the lens to surface what each role needs without
            forking dashboards or losing context.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24 }}>
          <ScreenCard
            tag="Stack ranking"
            title="See every candidate. See where stacking lies."
            body="Sortable, filterable, with intervals on every full-eval estimate. The marginal column tells you what naive selection would have chosen; the full column tells you what the data actually says.">
            <RankingPreview/>
          </ScreenCard>

          <ScreenCard
            tag="Co-failure matrix"
            title="The correlation map nobody else surfaces."
            body="Adversarial and benign block correlations across every pair, with the worst offenders ranked. Click any cell to see the cell-level decomposition — Lex × Rules at 0.946 won't survive that view.">
            <MatrixPreview/>
          </ScreenCard>

          <ScreenCard
            tag="Measurements"
            title="Spend the budget that actually moves the certificate."
            body="CASS bundle-greedy queues the smallest set of pair-cell evaluations needed to refute every alternative. The next-run cost and ETA update live as you toggle measurements in.">
            <PlannerPreview/>
          </ScreenCard>

          <ScreenCard
            tag="Certificate"
            title="A signed artifact your auditors can read."
            body="Conditional, scoped, dated, and accompanied by every assumption it depends on. Export JSON for your audit trail, Markdown for the model card, or PDF for the binder.">
            <CertPreview/>
          </ScreenCard>
        </div>
      </LandingContainer>
    </section>
  );
}

function ScreenCard({ tag, title, body, children }) {
  return (
    <div style={{ background: U.surface, border:'1px solid '+U.line, borderRadius: 16, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ padding: 28 }}>
        <UChip mono style={{ marginBottom: 14 }}>{tag}</UChip>
        <h3 style={{ fontFamily: U.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.3, margin: '0 0 8px', color: U.ink, lineHeight: 1.25 }}>{title}</h3>
        <p style={{ fontSize: 14, color: U.ink3, lineHeight: 1.55, margin: 0 }}>{body}</p>
      </div>
      <div style={{ flex: 1, padding: '0 22px 22px' }}>
        <div style={{ background: U.surface2, border:'1px solid '+U.line, borderRadius: 10, overflow:'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function RankingPreview() {
  const rows = [
    { rank:1, stack:'LG3 + Phi3',  first:'0.1552', full:'+0.1363', tag:'certified', tone:U.ok },
    { rank:2, stack:'L3-3B + LG3', first:'0.1593', full:'+0.1110', tag:'open',      tone:U.ink2 },
    { rank:3, stack:'Gemma + LG3', first:'0.0594', full:'+0.0641', tag:'open',      tone:U.ink2 },
    { rank:4, stack:'L3-3B + Phi3',first:'0.1223', full:'−0.0477', tag:'neg.',      tone:U.bad },
  ];
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'30px 1fr 70px 80px 80px', gap: 8, padding:'6px 8px', fontSize: 10.5, color: U.ink3, letterSpacing: 0.3, textTransform:'uppercase' }}>
        <span>#</span><span>Stack</span><span style={{ textAlign:'right' }}>1st-order</span><span style={{ textAlign:'right' }}>Full</span><span>Status</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'30px 1fr 70px 80px 80px', gap: 8, padding:'10px 8px', borderTop:'1px solid '+U.line, fontSize: 12, alignItems:'center', background: i===0?U.accentSoft+'66':'transparent' }}>
          <span style={{ color: U.ink3, fontFamily: U.mono, fontVariantNumeric:'tabular-nums' }}>{r.rank}</span>
          <span style={{ fontFamily: U.mono, color: i===0?U.ink:U.ink2 }}>{i===0 && '★ '}{r.stack}</span>
          <span style={{ fontFamily: U.mono, color: U.ink3, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.first}</span>
          <span style={{ fontFamily: U.mono, color: r.tone, textAlign:'right', fontWeight: i===0?500:400, fontVariantNumeric:'tabular-nums' }}>{r.full}</span>
          <span>{i===0?<UBadge tone="ok" dot>cert</UBadge>:i===3?<UBadge tone="bad">neg.</UBadge>:<UBadge tone="neutral">open</UBadge>}</span>
        </div>
      ))}
    </div>
  );
}

function MatrixPreview() {
  const ids = ['Lex','Rul','L3-3','LG3','Phi3','Gem'];
  // 6x6 small heatmap (illustrative subset)
  const M = {
    'Lex|Lex':1,'Lex|Rul':0.94,'Lex|L3-3':0.14,'Lex|LG3':0.16,'Lex|Phi3':0.21,'Lex|Gem':-0.06,
    'Rul|Lex':0.94,'Rul|Rul':1,'Rul|L3-3':0.10,'Rul|LG3':0.12,'Rul|Phi3':0.18,'Rul|Gem':-0.08,
    'L3-3|Lex':0.14,'L3-3|Rul':0.10,'L3-3|L3-3':1,'L3-3|LG3':0.48,'L3-3|Phi3':0.72,'L3-3|Gem':0.08,
    'LG3|Lex':0.16,'LG3|Rul':0.12,'LG3|L3-3':0.48,'LG3|LG3':1,'LG3|Phi3':0.12,'LG3|Gem':-0.04,
    'Phi3|Lex':0.21,'Phi3|Rul':0.18,'Phi3|L3-3':0.72,'Phi3|LG3':0.12,'Phi3|Phi3':1,'Phi3|Gem':-0.11,
    'Gem|Lex':-0.06,'Gem|Rul':-0.08,'Gem|L3-3':0.08,'Gem|LG3':-0.04,'Gem|Phi3':-0.11,'Gem|Gem':1,
  };
  const sz = 38;
  return (
    <div style={{ padding: 18, display:'flex', justifyContent:'center' }}>
      <svg width={sz*(ids.length+1)} height={sz*(ids.length+1)}>
        {ids.map((id, i) => (
          <text key={'h'+id} x={(i+1)*sz + sz/2} y={sz-8} fill={U.ink3} fontSize="9" fontFamily={U.mono} textAnchor="middle">{id}</text>
        ))}
        {ids.map((id, i) => (
          <text key={'v'+id} x={sz-6} y={(i+1)*sz + sz/2+3} fill={U.ink3} fontSize="9" fontFamily={U.mono} textAnchor="end">{id}</text>
        ))}
        {ids.map((a, i) => ids.map((b, j) => {
          const r = M[a+'|'+b];
          const fill = r===1 ? U.surface3
            : r>=0 ? `rgba(188,42,42,${Math.pow(r,0.55)*0.9})`
            : `rgba(31,157,85,${Math.pow(-r,0.55)*0.4})`;
          return <rect key={a+b} x={(j+1)*sz+1} y={(i+1)*sz+1} width={sz-2} height={sz-2} fill={fill} stroke={U.line} rx={3}/>;
        }))}
      </svg>
    </div>
  );
}

function PlannerPreview() {
  return (
    <div style={{ padding: 14 }}>
      {[
        { p:['LG3','Phi3'], cell:'A/HarmBench',   d:'−0.0091', c:'$240', sel:true },
        { p:['LG3','Phi3'], cell:'A/StrongREJECT', d:'−0.0074', c:'$240', sel:true },
        { p:['L3-3B','Phi3'], cell:'A/HarmBench', d:'−0.0042', c:'$320', sel:false },
        { p:['LG3','Phi3'], cell:'N/XSTest-safe', d:'−0.0038', c:'$180', sel:false },
      ].map((m, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'20px 1.2fr 1.4fr 70px 60px', alignItems:'center', gap: 8, padding:'10px 10px', borderTop: i?'1px solid '+U.line:'none', background: m.sel?U.accentSoft+'66':'transparent' }}>
          <span style={{ display:'inline-flex', width: 14, height: 14, borderRadius: 4, border: '1.5px solid '+(m.sel?U.accent:U.line2), background: m.sel?U.accent:U.surface, alignItems:'center', justifyContent:'center' }}>
            {m.sel && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2 5l2 2 4-4.5"/></svg>}
          </span>
          <span style={{ display:'flex', gap: 4 }}>
            <UChip mono style={{ fontSize: 10.5, padding:'1px 6px' }}>{m.p[0]}</UChip>
            <span style={{ color: U.faint }}>×</span>
            <UChip mono style={{ fontSize: 10.5, padding:'1px 6px' }}>{m.p[1]}</UChip>
          </span>
          <span style={{ fontFamily: U.mono, fontSize: 10.5, color: U.ink3 }}>{m.cell}</span>
          <span style={{ fontFamily: U.mono, fontSize: 11.5, color: U.ok, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{m.d}</span>
          <span style={{ fontFamily: U.mono, fontSize: 11, color: U.ink2, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{m.c}</span>
        </div>
      ))}
    </div>
  );
}

function CertPreview() {
  return (
    <div style={{ padding: 22, display:'flex', alignItems:'center', gap: 18 }}>
      <div style={{ flex: 1 }}>
        <UBadge tone="ok" dot>Certified</UBadge>
        <div style={{ fontFamily: U.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginTop: 8, color: U.ink }}>
          LG3 <span style={{ color: U.faint, fontWeight: 400 }}>+</span> Phi3
        </div>
        <div style={{ fontFamily: U.mono, fontSize: 11, color: U.ink3, marginTop: 4 }}>cert-2026-0524-001a · K=2 · ρ=0.60</div>
        <div style={{ marginTop: 14, display:'grid', gridTemplateColumns:'auto 1fr', columnGap: 14, rowGap: 4, fontFamily: U.mono, fontSize: 11 }}>
          <span style={{ color: U.ink3 }}>welfare</span><span style={{ color: U.ok, fontVariantNumeric:'tabular-nums' }}>+0.1363</span>
          <span style={{ color: U.ink3 }}>interval</span><span style={{ color: U.ink2, fontVariantNumeric:'tabular-nums' }}>[+0.1245, +0.1481]</span>
          <span style={{ color: U.ink3 }}>comps</span><span style={{ color: U.ok, fontVariantNumeric:'tabular-nums' }}>27 / 27</span>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        <svg width="90" height="90" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="52" fill="none" stroke={U.accent} strokeWidth="1"/>
          <circle cx="55" cy="55" r="46" fill="none" stroke={U.accent} strokeWidth="0.5" strokeDasharray="2 3"/>
          <defs>
            <path id="lpSealText" d="M 55,55 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"/>
          </defs>
          <text fontSize="7.5" fontFamily={U.mono} fill={U.accent} letterSpacing="2.5">
            <textPath href="#lpSealText" startOffset="0%">CERTIFIED · STACKCERT · K=2 · ρ=0.60 · </textPath>
          </text>
          <g transform="translate(55,55)">
            <path d="M -14 0 L -4 10 L 14 -10" fill="none" stroke={U.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────────────────────
function LandingFeatures() {
  const feats = [
    { icon: <FIconShield/>,   title: 'Pair-cell measurements',   body: 'Joint failure rates per (guard-pair × benchmark-cell), not just marginal block rates.' },
    { icon: <FIconChart/>,    title: 'CASS bundle-greedy',       body: 'Schedule measurements that actually refute alternatives — typically <8% of exhaustive cost.' },
    { icon: <FIconBolt/>,     title: 'Continuous re-certification', body: 'Drift signals on model versions, prompt diffs, traffic mixture, and attack families.' },
    { icon: <FIconPin/>,      title: 'Conditional certificates',     body: 'Every assumption explicit. Auditors can read exactly what is — and is not — covered.' },
    { icon: <FIconBranch/>,   title: 'K-aware composition',          body: 'Exact for K=2 serial stacks. Provably-bounded residual uncertainty for K≥3.' },
    { icon: <FIconLock/>,     title: 'Self-hosted or SaaS',          body: 'Deploy in your VPC, behind your SSO. SOC 2 Type II and ISO 27001 ready.' },
  ];
  return (
    <section style={{ padding: '120px 0', borderTop:'1px solid '+U.line, background: U.surface2 }}>
      <LandingContainer>
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <SectionEyebrow>What's inside</SectionEyebrow>
          <SectionTitle>Built for safety teams who have to defend their choices.</SectionTitle>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 24 }}>
          {feats.map(f => (
            <div key={f.title} style={{ padding: 26, background: U.surface, border: '1px solid '+U.line, borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: U.accentSoft, color: U.accent, display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: U.display, fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: U.ink, letterSpacing: -0.2 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: U.ink3, lineHeight: 1.55, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

const fIcon = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
function FIconShield(){ return <svg viewBox="0 0 18 18" {...fIcon}><path d="M9 2l6 2.5v4.2c0 3.4-2.4 6.3-6 7.3-3.6-1-6-3.9-6-7.3V4.5z"/><path d="M6.5 9l1.7 1.7L11.5 7.5"/></svg>; }
function FIconChart(){ return <svg viewBox="0 0 18 18" {...fIcon}><path d="M3 15h12M5 12V8M9 12V4M13 12v-5"/></svg>; }
function FIconBolt(){ return <svg viewBox="0 0 18 18" {...fIcon}><path d="M10 2L4 10h4l-2 6 6-8H8z"/></svg>; }
function FIconPin(){ return <svg viewBox="0 0 18 18" {...fIcon}><path d="M9 16s5-4.5 5-9a5 5 0 10-10 0c0 4.5 5 9 5 9z"/><circle cx="9" cy="7" r="2"/></svg>; }
function FIconBranch(){ return <svg viewBox="0 0 18 18" {...fIcon}><circle cx="5" cy="4" r="2"/><circle cx="5" cy="14" r="2"/><circle cx="13" cy="9" r="2"/><path d="M5 6v6M7 4h2a2 2 0 012 2v2m0 0v1"/></svg>; }
function FIconLock(){ return <svg viewBox="0 0 18 18" {...fIcon}><rect x="4" y="8" width="10" height="8" rx="1"/><path d="M6 8V6a3 3 0 016 0v2"/></svg>; }

// ─────────────────────────────────────────────────────────────
// Proof (quote + research callouts)
// ─────────────────────────────────────────────────────────────
function LandingProof() {
  return (
    <section style={{ padding: '120px 0' }}>
      <LandingContainer>
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 56, alignItems:'center' }}>
          <figure style={{ margin: 0 }}>
            <blockquote style={{ margin: 0, fontFamily: U.display, fontSize: 30, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.25, color: U.ink }}>
              &ldquo;StackCert is the first vendor we&apos;ve used where the certificate
              survives contact with the GRC team. The conditional framing is exactly what our auditors want.&rdquo;
            </blockquote>
            <figcaption style={{ marginTop: 24, display:'flex', alignItems:'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg,#c2b3f5,#5b5bd6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 600 }}>IM</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: U.ink }}>Iris Mendel</div>
                <div style={{ fontSize: 12.5, color: U.ink3 }}>Head of AI Security, Acme</div>
              </div>
            </figcaption>
          </figure>

          <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
            <ProofCard tag="Methodology" title="Composable Adversarial Safety Stacking (CASS)" body="Pair-cell measurement scheduling with provable refutation guarantees. ICML 2026 preprint." link="Read paper →"/>
            <ProofCard tag="Reproducibility" title="Open replication kit" body="The full Acme-copilot run, 2,000 examples, every measurement, every certificate. MIT licensed." link="See on GitHub →"/>
            <ProofCard tag="Standards" title="Aligned with NIST AI RMF & ISO 42001" body="Conditional certification maps directly to GOVERN and MEASURE function outcomes." link="View mapping →"/>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}

function ProofCard({ tag, title, body, link }) {
  return (
    <a href="#" style={{ textDecoration:'none', color:'inherit', padding: 20, background: U.surface, border: '1px solid '+U.line, borderRadius: 12, display:'flex', flexDirection:'column', gap: 8, transition:'border-color .15s, transform .15s' }}>
      <UChip mono style={{ alignSelf:'flex-start' }}>{tag}</UChip>
      <div style={{ fontFamily: U.display, fontSize: 16, fontWeight: 600, color: U.ink, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ fontSize: 13, color: U.ink3, lineHeight: 1.5 }}>{body}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: U.accent, fontWeight: 500 }}>{link}</div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────
function LandingPricing() {
  const tiers = [
    { name:'Starter',  price:'Free',     desc:'For a single application and up to 4 guards.',
      bullets:['Up to 6 candidate stacks', '1 active certificate', 'Self-serve only', 'Community Slack'],
      cta:'Start free', dark:false, recommended:false },
    { name:'Team',     price:'$1,800', priceSub:'per app · per month',
      desc:'For production deployments under one safety org.',
      bullets:['Unlimited candidate stacks', 'Continuous re-certification', 'Drift monitoring', 'SSO + audit log', 'Email + Slack support'],
      cta:'Start 14-day trial', dark:true, recommended:true },
    { name:'Enterprise', price:'Talk to us',
      desc:'For regulated workloads, on-prem, or multi-org.',
      bullets:['Self-hosted / VPC', 'Custom integrations', 'SOC 2 / ISO 27001 evidence package', 'Quarterly methodology review', 'Dedicated AE'],
      cta:'Book a call', dark:false, recommended:false },
  ];
  return (
    <section id="pricing" style={{ padding: '120px 0', borderTop:'1px solid '+U.line, background: U.surface2 }}>
      <LandingContainer>
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <SectionEyebrow>Pricing</SectionEyebrow>
          <SectionTitle>Pay for the certificate. Not the dashboard.</SectionTitle>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 22 }}>
          {tiers.map(t => (
            <div key={t.name} style={{ padding: 28, background: t.dark?U.ink:U.surface, color: t.dark?U.surface:U.ink, border: '1px solid '+(t.dark?U.ink:U.line), borderRadius: 14, position:'relative', boxShadow: t.dark?'0 20px 40px rgba(15,15,25,.18)':'none' }}>
              {t.recommended && <div style={{ position:'absolute', top: -10, left: 24, padding:'2px 10px', background: U.accent, color:'#fff', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>Most teams pick this</div>}
              <div style={{ fontFamily: U.display, fontSize: 16, fontWeight: 600, color: t.dark?U.surface:U.ink }}>{t.name}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginTop: 10 }}>
                <div style={{ fontFamily: U.display, fontSize: 32, fontWeight: 600, letterSpacing: -0.8, color: t.dark?U.surface:U.ink }}>{t.price}</div>
                {t.priceSub && <div style={{ fontSize: 12, color: t.dark?'rgba(255,255,255,.6)':U.ink3 }}>{t.priceSub}</div>}
              </div>
              <div style={{ fontSize: 13, color: t.dark?'rgba(255,255,255,.7)':U.ink3, lineHeight: 1.5, marginTop: 10, minHeight: 40 }}>{t.desc}</div>
              <div style={{ height: 1, background: t.dark?'rgba(255,255,255,.15)':U.line, margin:'18px 0' }}/>
              <ul style={{ listStyle:'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap: 10 }}>
                {t.bullets.map(b => (
                  <li key={b} style={{ display:'flex', alignItems:'flex-start', gap: 8, fontSize: 13.5, color: t.dark?'rgba(255,255,255,.85)':U.ink2 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={t.dark?U.surface:U.accent} strokeWidth="1.8" strokeLinecap="round" style={{ marginTop: 2, flexShrink: 0 }}><path d="M2.5 7.5l3 3 6-7"/></svg>
                    {b}
                  </li>
                ))}
              </ul>
              <button style={{ width:'100%', marginTop: 24, padding:'10px 14px', background: t.dark?U.surface:t.recommended?U.accent:U.ink, color: t.dark?U.ink:'#fff', border:'none', borderRadius: 8, fontFamily: U.sans, fontWeight: 500, fontSize: 13.5, cursor:'pointer' }}>
                {t.cta} →
              </button>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────
function LandingCTA() {
  return (
    <section style={{ padding: '120px 0' }}>
      <LandingContainer>
        <div style={{ position:'relative', overflow:'hidden', background: U.ink, color: U.surface, borderRadius: 22, padding: '64px 56px', display:'grid', gridTemplateColumns:'1.4fr 1fr', alignItems:'center', gap: 32 }}>
          <div aria-hidden style={{ position:'absolute', inset: 0, opacity: 0.18,
            backgroundImage: `radial-gradient(circle at 80% 20%, ${U.accent}, transparent 50%), radial-gradient(circle at 20% 80%, #c2b3f5, transparent 45%)` }}/>
          <div style={{ position:'relative' }}>
            <h2 style={{ fontFamily: U.display, fontSize: 42, fontWeight: 600, letterSpacing: -1, margin: 0, lineHeight: 1.1 }}>
              Stop shipping guardrails on vibes.
            </h2>
            <p style={{ fontSize: 16.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.55, margin: '14px 0 0', maxWidth: 540 }}>
              Get the certificate your safety team will defend, the platform team will ship, and your auditors won&apos;t bounce back.
            </p>
          </div>
          <div style={{ position:'relative', display:'flex', flexDirection:'column', gap: 10, alignItems:'flex-end' }}>
            <button onClick={() => location.href='StackCert.html'}
              style={{ background: U.surface, color: U.ink, padding:'12px 22px', borderRadius: 10, border:'none', fontFamily: U.sans, fontWeight: 500, fontSize: 14.5, cursor:'pointer' }}>
              Open the dashboard →
            </button>
            <button style={{ background:'transparent', color: U.surface, padding:'12px 22px', borderRadius: 10, border:'1px solid rgba(255,255,255,.2)', fontFamily: U.sans, fontWeight: 500, fontSize: 14.5, cursor:'pointer' }}>
              Book a 20-minute demo
            </button>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer style={{ borderTop: '1px solid '+U.line, padding: '48px 0 36px', background: U.surface2, fontSize: 13 }}>
      <LandingContainer>
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr repeat(4, 1fr)', gap: 28, marginBottom: 36 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
              <LogoMark size={20}/>
              <span style={{ fontWeight: 600, fontSize: 14 }}>StackCert</span>
            </div>
            <p style={{ color: U.ink3, lineHeight: 1.55, margin: 0, maxWidth: 280, fontSize: 13 }}>
              Composable guardrail certification. Made for safety teams shipping into regulated workloads.
            </p>
          </div>
          <FooterCol title="Product" links={['Why StackCert','How it works','Pricing','Changelog','Status']}/>
          <FooterCol title="Resources" links={['Documentation','Methodology paper','Replication kit','Blog','Glossary']}/>
          <FooterCol title="Company" links={['About','Customers','Security','Careers','Press']}/>
          <FooterCol title="Legal" links={['Privacy','Terms','SOC 2','DPA','Subprocessors']}/>
        </div>
        <div style={{ borderTop: '1px solid '+U.line, paddingTop: 24, display:'flex', alignItems:'center', justifyContent:'space-between', color: U.ink3, fontSize: 12.5 }}>
          <span>© 2026 StackCert Labs, Inc.</span>
          <span>Made in San Francisco, Berlin, and Cambridge.</span>
        </div>
      </LandingContainer>
    </footer>
  );
}
function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: U.ink3, letterSpacing: 0.4, textTransform:'uppercase', fontWeight: 500, marginBottom: 12 }}>{title}</div>
      <ul style={{ listStyle:'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap: 8 }}>
        {links.map(l => <li key={l}><a href="#" style={{ color: U.ink2, textDecoration:'none', fontSize: 13 }}>{l}</a></li>)}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────
function LandingContainer({ children }) {
  return <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px' }}>{children}</div>;
}
function SectionEyebrow({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: U.accent, letterSpacing: 0.8, textTransform:'uppercase', marginBottom: 14 }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: U.display, fontSize: 38, fontWeight: 600, letterSpacing: -1, lineHeight: 1.15, margin: 0, color: U.ink, textWrap: 'balance' }}>{children}</h2>;
}

Object.assign(window, { LandingPage });
