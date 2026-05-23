import { Link } from 'react-router-dom';
import { Badge, ButtonLink, Card, Chip, LogoMark } from '../components/Primitives';

const demoOverviewPath = '/app/ws_demo/proj_acme_copilot/overview';
const demoSignInPath = `/auth/sign-in?next=${encodeURIComponent(demoOverviewPath)}`;

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-container" style={{ display: 'flex', alignItems: 'center', height: 60, gap: 28 }}>
          <Link to="/" className="sidebar-brand">
            <LogoMark size={22} />
            <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
          </Link>
          <nav style={{ display: 'flex', gap: 24, color: 'var(--sc-ink-2)', fontSize: 13.5, fontWeight: 550 }}>
            <a href="#problem" style={{ textDecoration: 'none' }}>
              Why
            </a>
            <a href="#how" style={{ textDecoration: 'none' }}>
              How it works
            </a>
            <a href="#product" style={{ textDecoration: 'none' }}>
              Product
            </a>
            <a href="#pricing" style={{ textDecoration: 'none' }}>
              Pricing
            </a>
            <Link to="/docs" style={{ textDecoration: 'none' }}>
              Docs
            </Link>
          </nav>
          <div style={{ flex: 1 }} />
          <ButtonLink to="/auth/sign-in">Sign in</ButtonLink>
          <ButtonLink to="/onboarding" variant="primary">
            Start pilot
          </ButtonLink>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-container" style={{ position: 'relative' }}>
          <div style={{ display: 'grid', gap: 28, textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ justifySelf: 'center' }}>
              <Badge tone="neutral">
                <span style={{ color: 'var(--sc-accent)', fontWeight: 700 }}>New</span>
                Composable guardrail certification
              </Badge>
            </div>
            <h1 className="hero-title">
              Certify the
              <br />
              guardrail stack
              <br />
              you actually ship.
            </h1>
            <p className="hero-copy">
              Teams often ship safety by picking the best single guard, stacking every guard, or adding more policy
              context until costs and latency creep up. StackCert measures how guards fail together, selects the stack
              that actually improves risk, and produces scoped evidence your reviewers can use.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ButtonLink to="/onboarding" variant="primary">
                Start a pilot
              </ButtonLink>
              <ButtonLink to={demoSignInPath}>View seeded demo</ButtonLink>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap', color: 'var(--sc-ink-3)', fontSize: 12.5 }}>
              <span>Lower evaluation spend</span>
              <span>Less redundant latency</span>
              <span>Scoped deploy evidence</span>
            </div>
          </div>
          <div className="product-preview">
            <HeroDashboard />
          </div>
        </div>
      </section>

      <LogoStrip />
      <ProblemSection />
      <AlternativesSection />
      <CassSection />
      <EconomicsSection />
      <HowSection />
      <ProductSection />
      <AudienceSection />
      <DocsSection />
      <PricingSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function HeroDashboard() {
  return (
    <div style={{ border: '1px solid var(--sc-line)', borderBottom: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10, background: 'var(--sc-surface)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 430 }}>
        <div style={{ borderRight: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--sc-line)', borderRadius: 7, padding: 8 }}>
            <LogoMark size={18} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Acme</span>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 2 }}>
            {['Overview', 'Stack ranking', 'Co-failure', 'Measurements', 'Certificate', 'Drift'].map((item, index) => (
              <div key={item} style={{ padding: '7px 8px', borderRadius: 6, background: index === 0 ? 'var(--sc-surface-3)' : 'transparent', color: index === 0 ? 'var(--sc-ink)' : 'var(--sc-ink-3)', fontSize: 12 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 22 }}>
          <Badge tone="ok" dot>
            Certified
          </Badge>
          <div style={{ marginTop: 12, fontSize: 32, fontWeight: 650 }}>LG3 + Phi3</div>
          <div className="grid grid-4" style={{ marginTop: 18 }}>
            <MiniStat label="Welfare" value="0.1363" tone="ok" />
            <MiniStat label="Regret avoided" value="+0.0253" tone="ok" />
            <MiniStat label="Pair-cells" value="13/168" />
            <MiniStat label="Cost avoided" value="$25k" tone="ok" />
          </div>
          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <Card>
              <div style={{ fontWeight: 650, fontSize: 12, marginBottom: 12 }}>Welfare by stack</div>
              {['LG3 + Phi3', 'L3-3B + LG3', 'Gemma + LG3', 'L3-3B + Phi3'].map((item, index) => (
                <div key={item} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 54px', alignItems: 'center', gap: 8, marginTop: 9 }}>
                  <span className="mono" style={{ fontSize: 11 }}>
                    {item}
                  </span>
                  <span style={{ height: 7, borderRadius: 4, background: index === 0 ? 'var(--sc-ok)' : index === 3 ? 'var(--sc-bad)' : 'var(--sc-line-3)', width: `${90 - index * 16}%` }} />
                  <span className="mono right" style={{ fontSize: 11 }}>
                    {index === 3 ? '-0.047' : '0.1' + index}
                  </span>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontWeight: 650, fontSize: 12, marginBottom: 8 }}>Why this is not obvious</div>
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                The marginal winner loses after co-failure is measured. Both guards miss overlapping adversarial
                examples, so stacked welfare collapses.
              </p>
              <div className="notice" style={{ marginTop: 12 }}>
                CASS recommends LG3 + Phi3 and issues a scoped certificate.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="mono" style={{ marginTop: 4, fontSize: 17, fontWeight: 650, color: tone ? `var(--sc-${tone})` : 'var(--sc-ink)' }}>
        {value}
      </div>
    </div>
  );
}

function LogoStrip() {
  return (
    <section style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '54px 0' }}>
      <div className="landing-container" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--sc-ink-3)', fontSize: 12, fontWeight: 650, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 26 }}>
          Built for safety teams shipping regulated AI workflows
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap', color: 'var(--sc-dim)', fontSize: 22, fontWeight: 650 }}>
          {['Acme', 'Northwind', 'Helix', 'Atlas', 'Vela', 'Pillar'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section id="problem" style={{ padding: '112px 0' }}>
      <div className="landing-container">
        <div style={{ maxWidth: 740, marginBottom: 48 }}>
          <div className="section-eyebrow">The problem</div>
          <h2 className="section-title">Stacking guardrails creates a hidden correlation tax.</h2>
          <p className="hero-copy" style={{ margin: '16px 0 0', fontSize: 17 }}>
            Two strong guards do not necessarily compose into a stronger system. If they miss the same attacks, the
            stack can be redundant, expensive, and hard to defend.
          </p>
        </div>
        <div className="grid grid-2">
          <Card>
            <Badge tone="bad" dot>
              Without StackCert
            </Badge>
            <h3 style={{ fontSize: 28, margin: '18px 0 8px' }}>Wrong marginal winner</h3>
            <p className="muted">A pair looks best on first-order scores but fails together on the same adversarial cells.</p>
          </Card>
          <Card>
            <Badge tone="ok" dot>
              With StackCert
            </Badge>
            <h3 style={{ fontSize: 28, margin: '18px 0 8px' }}>Scoped certified winner</h3>
            <p className="muted">CASS measures co-failure and certifies the winner among the actual candidate stacks.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function CassSection() {
  return (
    <section style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '96px 0' }}>
      <div className="landing-container">
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="section-eyebrow">What is CASS?</div>
            <h2 className="section-title">Correlation-Aware Stack Selection.</h2>
            <p className="hero-copy" style={{ margin: '18px 0 0', maxWidth: 620, fontSize: 17 }}>
              CASS is the measurement logic behind StackCert. It treats a guardrail stack as a composed system and
              asks the practical launch question: which candidate stack gives the best scoped welfare after accounting
              for overlapping misses, false blocks, latency, and cost?
            </p>
          </div>
          <Card>
            <div className="cass-logic">
              <div>
                <span className="mono">01</span>
                <strong>Marginal scores</strong>
                <p>Start with each guard's benign pass rate, adversarial miss rate, latency, and unit cost.</p>
              </div>
              <div>
                <span className="mono">02</span>
                <strong>Co-failure evidence</strong>
                <p>Measure whether guards miss the same adversarial examples or block the same benign examples.</p>
              </div>
              <div>
                <span className="mono">03</span>
                <strong>Scoped certificate</strong>
                <p>Recommend a stack only for the declared benchmark mixture, candidate set, and risk profile.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function HowSection() {
  const steps = [
    ['01', 'Model the release', 'Pick the agent workflow, candidate guards, benchmark mixture, custom behaviors, and welfare profile that reflect the launch decision.'],
    ['02', 'Measure composition', 'Run uploaded outputs or provider connectors, then let CASS target the co-failure measurements that can change the stack ranking.'],
    ['03', 'Gate deployment', 'Issue a scoped certificate with assumptions, limitations, signoffs, usage costs, drift signals, and recertification triggers.']
  ];
  return (
    <section id="how" style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '112px 0' }}>
      <div className="landing-container">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title" style={{ maxWidth: 760 }}>
          Three steps. One defensible risk decision.
        </h2>
        <div className="grid grid-3" style={{ marginTop: 44 }}>
          {steps.map(([num, title, body]) => (
            <Card key={num}>
              <div className="mono" style={{ color: 'var(--sc-accent)', fontSize: 12, marginBottom: 18 }}>
                {num}
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: 22 }}>{title}</h3>
              <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
                {body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  const cards = [
    ['Stack ranking', 'See every candidate, the naive marginal winner, the full CASS ranking, uncertainty interval, cost, and latency.'],
    ['Benchmark builder', 'Import company behaviors, draft custom tests, and weight the benign/adversarial mix to match the workflow.'],
    ['Guard connectors', 'Use uploaded outputs first, then connect REST guards, local adapters, and model judges as the integration matures.'],
    ['Measurement queue', 'Run targeted worker jobs with leases, retries, usage tracking, and budget caps before spending on more evaluation.'],
    ['Certificate gate', 'Export scoped JSON/Markdown evidence and wire certificate status into GitHub Actions or deployment pipelines.'],
    ['Agent surface', 'Expose tools, resources, and prompts so agent-platform jobs can read status, costs, and release-review evidence.']
  ];
  return (
    <section id="product" style={{ padding: '112px 0' }}>
      <div className="landing-container">
        <div className="section-eyebrow">Inside the product</div>
        <h2 className="section-title" style={{ maxWidth: 760 }}>
          The dashboard your safety, platform, and risk teams can share.
        </h2>
        <div className="grid grid-2" style={{ marginTop: 44 }}>
          {cards.map(([tag, body]) => (
            <Card key={tag}>
              <Chip>{tag}</Chip>
              <p style={{ margin: '18px 0 0', fontSize: 18, lineHeight: 1.45 }}>{body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  const users = [
    ['AI platform lead', 'Needs a repeatable gate before agent releases and a way to compare cost, latency, and risk across guard stacks.'],
    ['Safety engineer', 'Needs to turn policy failures into benchmark cells and inspect where guards fail together.'],
    ['Risk or GRC reviewer', 'Needs a concise evidence packet with scope, assumptions, limitations, and signoff history.']
  ];
  return (
    <section style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '96px 0' }}>
      <div className="landing-container">
        <div className="section-eyebrow">Who it is for</div>
        <h2 className="section-title" style={{ maxWidth: 820 }}>
          One workflow for the people who actually approve an agent launch.
        </h2>
        <div className="grid grid-3" style={{ marginTop: 36 }}>
          {users.map(([title, body]) => (
            <Card key={title}>
              <h3 style={{ margin: '0 0 10px', fontSize: 21 }}>{title}</h3>
              <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                {body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DocsSection() {
  const links = [
    ['Documentation', '/docs', 'Setup, run, and release workflow.'],
    ['Methodology', '/methodology-paper', 'CASS assumptions and certificate scope.'],
    ['Security', '/security', 'Data handling, auth, and deployment posture.'],
    ['Terms', '/terms', 'Risk positioning and no-guarantee language.']
  ];
  return (
    <section id="docs" style={{ padding: '96px 0' }}>
      <div className="landing-container">
        <div className="section-eyebrow">Resources</div>
        <h2 className="section-title" style={{ maxWidth: 780 }}>
          Clear enough for buyers, precise enough for deployment reviews.
        </h2>
        <div className="grid grid-4" style={{ marginTop: 36 }}>
          {links.map(([title, href, body]) => (
            <Link className="resource-link-card" to={href} key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '112px 0' }}>
      <div className="landing-container">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">Pay for the certificate, not the dashboard.</h2>
        <div className="grid grid-3" style={{ marginTop: 44 }}>
          {[
            ['Starter', 'Free', 'One app, uploaded outputs, one active certificate.'],
            ['Team', '$1,800', 'Production certification, drift monitoring, audit log, and support.'],
            ['Enterprise', 'Talk to us', 'VPC/self-hosted, SSO, custom integrations, and evidence packages.']
          ].map(([name, price, desc], index) => (
            <Card key={name}>
              <h3 style={{ margin: 0 }}>{name}</h3>
              <div style={{ marginTop: 10, fontSize: 32, fontWeight: 650 }}>{price}</div>
              <p className="muted">{desc}</p>
              <ButtonLink to="/onboarding" variant={index === 1 ? 'accent' : 'primary'}>
                Start
              </ButtonLink>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section style={{ padding: '96px 0' }}>
      <div className="landing-container">
        <div style={{ borderRadius: 22, background: 'var(--sc-ink)', color: '#fff', padding: '56px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>Stop shipping guardrails on vibes.</h2>
            <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 16, lineHeight: 1.55 }}>
              Get a certificate your safety team can defend, your platform team can automate, and your reviewers can
              understand.
            </p>
          </div>
          <div style={{ justifySelf: 'end' }}>
            <ButtonLink to="/onboarding">Start a pilot</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const columns = [
    {
      title: 'Product',
      links: [
        ['Why StackCert', '/why-stackcert'],
        ['How it works', '/how-it-works'],
        ['Pricing', '/pricing'],
        ['Changelog', '/changelog'],
        ['Status', '/status']
      ]
    },
    {
      title: 'Resources',
      links: [
        ['Documentation', '/docs'],
        ['Methodology paper', '/methodology-paper'],
        ['Replication kit', '/replication-kit'],
        ['Blog', '/blog'],
        ['Glossary', '/glossary']
      ]
    },
    {
      title: 'Company',
      links: [
        ['About', '/about'],
        ['Customers', '/customers'],
        ['Security', '/security'],
        ['Careers', '/careers'],
        ['Press', '/press']
      ]
    },
    {
      title: 'Legal',
      links: [
        ['Privacy', '/privacy'],
        ['Terms', '/terms'],
        ['SOC 2', '/soc-2'],
        ['DPA', '/dpa'],
        ['Subprocessors', '/subprocessors']
      ]
    }
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '48px 0 36px', fontSize: 13 }}>
      <div className="landing-container">
        <div className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <LogoMark size={20} />
              <span style={{ fontWeight: 650, fontSize: 14 }}>StackCert</span>
            </div>
            <p className="muted" style={{ lineHeight: 1.55, margin: 0, maxWidth: 290 }}>
              Composable guardrail certification for teams shipping agent workflows into real review processes.
            </p>
          </div>
          {columns.map((column) => (
            <FooterCol key={column.title} title={column.title} links={column.links} />
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 StackCert Labs, Inc.</span>
          <span>Scoped evidence, not a guarantee.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <div className="footer-title">{title}</div>
      <ul className="footer-links">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link to={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
