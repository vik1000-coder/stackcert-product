import { Link } from 'react-router-dom';
import { Badge, ButtonLink, Card, Chip, LogoMark } from '../components/Primitives';

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
            <Link to="/blog" style={{ textDecoration: 'none' }}>
              Blog
            </Link>
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
            <h1 className="hero-title">
              Choose the right
              <br />
              safety checks
              <br />
              for your LLM app.
            </h1>
            <p className="hero-copy">
              You can add rules, classifiers, model judges, stronger models, more context, or several checks at once.
              StackCert helps you compare those choices on examples from the application you care about, so you can
              improve safety and usefulness without paying to test every possibility.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ButtonLink to="/onboarding" variant="primary">
                Start a pilot
              </ButtonLink>
              <ButtonLink to="/demo">View support-copilot demo</ButtonLink>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap', color: 'var(--sc-ink-3)', fontSize: 12.5 }}>
              <span>App-specific tests</span>
              <span>Compare combinations</span>
              <span>Control cost and latency</span>
            </div>
          </div>
          <div className="product-preview">
            <HeroDashboard />
          </div>
        </div>
      </section>

      <SafetyOptionsSection />
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
            {['Recommendation', 'Options', 'Overlap', 'Test plan', 'Evidence', 'Retest'].map((item, index) => (
              <div key={item} style={{ padding: '7px 8px', borderRadius: 6, background: index === 0 ? 'var(--sc-surface-3)' : 'transparent', color: index === 0 ? 'var(--sc-ink)' : 'var(--sc-ink-3)', fontSize: 12 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 22 }}>
          <Badge tone="ok" dot>
            Recommended
          </Badge>
          <div style={{ marginTop: 12, fontSize: 32, fontWeight: 650 }}>LG3 + Phi3</div>
          <div className="grid grid-4" style={{ marginTop: 18 }}>
            <MiniStat label="Goal score" value="0.1377" tone="ok" />
            <MiniStat label="Better than obvious pick" value="+0.0382" tone="ok" />
            <MiniStat label="Overlap tests" value="13/168" />
            <MiniStat label="Testing saved" value="$4.6k" tone="ok" />
          </div>
          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <Card>
              <div style={{ fontWeight: 650, fontSize: 12, marginBottom: 12 }}>Score by combination</div>
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
                The combination that looks best from one-at-a-time testing loses when the checks fail on the same
                unsafe examples.
              </p>
              <div className="notice" style={{ marginTop: 12 }}>
                StackCert recommends LG3 + Phi3 and prepares a release evidence report.
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

function SafetyOptionsSection() {
  const options = [
    ['Rules', 'Block clearly disallowed actions, tools, or data access.'],
    ['Classifiers', 'Score whether a prompt or answer matches a risk category.'],
    ['Model judges', 'Ask another model to review the response or tool call.'],
    ['More context', 'Add policies, retrieval, examples, or instructions to the LLM.'],
    ['Stronger models', 'Route risky cases to a larger or more specialized model.'],
    ['Combinations', 'Run more than one check when a single option is not enough.']
  ];

  return (
    <section id="options" style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '88px 0' }}>
      <div className="landing-container">
        <div style={{ maxWidth: 780 }}>
          <div className="section-eyebrow">The basic building blocks</div>
          <h2 className="section-title">An LLM app has many safety options.</h2>
          <p className="hero-copy" style={{ margin: '16px 0 0', fontSize: 17 }}>
            A safety check is anything you put around the LLM to make the application behave better. A combination is
            simply the set of checks you decide to run for a real workflow.
          </p>
        </div>
        <div className="grid grid-3" style={{ marginTop: 36 }}>
          {options.map(([title, body]) => (
            <Card key={title}>
              <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>{title}</h3>
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

function ProblemSection() {
  return (
    <section id="problem" style={{ padding: '112px 0' }}>
      <div className="landing-container">
        <div style={{ maxWidth: 740, marginBottom: 48 }}>
          <div className="section-eyebrow">The problem</div>
          <h2 className="section-title">Choosing the combination is the hard part.</h2>
          <p className="hero-copy" style={{ margin: '16px 0 0', fontSize: 17 }}>
            More checks can help, but they can also repeat the same mistakes, block normal users, add latency, and
            raise model spend. The right answer depends on your app, your examples, and what failures matter most.
          </p>
        </div>
        <div className="grid grid-2">
          <Card>
            <Badge tone="bad" dot>
              Without StackCert
            </Badge>
            <h3 style={{ fontSize: 28, margin: '18px 0 8px' }}>Obvious pick, hidden weakness</h3>
            <p className="muted">A pair can look best when tested one check at a time, then fail on the same risky examples.</p>
          </Card>
          <Card>
            <Badge tone="ok" dot>
              With StackCert
            </Badge>
            <h3 style={{ fontSize: 28, margin: '18px 0 8px' }}>Best fit for this app</h3>
            <p className="muted">StackCert compares real combinations against the examples and goals that match the workflow.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function AlternativesSection() {
  const cards = [
    [
      'Pick the best single check',
      'Fast, but it ignores how that check behaves when paired with another option. The demo’s obvious pick loses once shared misses are measured.'
    ],
    [
      'Use the most expensive model',
      'Sometimes it helps, but it can raise cost and latency without proving that the application handles the failures you care about.'
    ],
    [
      'Add more policy context',
      'More prompt text can help, but it is not evidence. It often increases token spend and still leaves the actual safety tradeoff unmeasured.'
    ],
    [
      'Test every combination',
      'Brute-force testing is clean but expensive at scale. Each new check, example group, and release variant multiplies the bill.'
    ]
  ];

  return (
    <section style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '96px 0' }}>
      <div className="landing-container">
        <div style={{ maxWidth: 780 }}>
          <div className="section-eyebrow">What teams often do instead</div>
          <h2 className="section-title">The shortcut choices either miss risk or buy tests you do not need.</h2>
        </div>
        <div className="grid grid-4" style={{ marginTop: 36 }}>
          {cards.map(([title, body]) => (
            <Card key={title}>
              <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>{title}</h3>
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

function CassSection() {
  return (
    <section style={{ borderTop: '1px solid var(--sc-line)', background: 'var(--sc-surface-2)', padding: '96px 0' }}>
      <div className="landing-container">
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="section-eyebrow">How StackCert chooses</div>
            <h2 className="section-title">Test the overlaps that change the decision.</h2>
            <p className="hero-copy" style={{ margin: '18px 0 0', maxWidth: 620, fontSize: 17 }}>
              StackCert looks for whether two safety options cover different failures or make the same mistake. The
              underlying method is CASS, but the product question is simple: which combination gives the best safety,
              usefulness, latency, and cost tradeoff for this application?
            </p>
          </div>
          <Card>
            <div className="cass-logic">
              <div>
                <span className="mono">01</span>
                <strong>Start with each option</strong>
                <p>Measure how each safety check handles safe requests, risky requests, latency, and cost.</p>
              </div>
              <div>
                <span className="mono">02</span>
                <strong>Check overlap</strong>
                <p>Measure whether checks miss the same unsafe examples or block the same normal examples.</p>
              </div>
              <div>
                <span className="mono">03</span>
                <strong>Recommend a combination</strong>
                <p>Pick the best option set only for the app, examples, and goals that were actually tested.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function EconomicsSection() {
  const stats = [
    ['36', 'combinations compared', 'The sample support-copilot demo compares the safety-check choices the team could ship.'],
    ['13/168', 'overlap tests run', 'Only the overlap tests needed to decide between close combinations were measured.'],
    ['$4.6k', 'testing spend avoided', 'Estimated saved testing cost versus checking every overlap in the sample run.']
  ];

  return (
    <section style={{ padding: '96px 0' }}>
      <div className="landing-container">
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="section-eyebrow">Cost and scale</div>
            <h2 className="section-title">Safer decisions without measuring every combination.</h2>
            <p className="hero-copy" style={{ margin: '18px 0 0', maxWidth: 650, fontSize: 17 }}>
              StackCert is not trying to sell a bigger testing bill. It spends testing budget where the answer can
              change the launch decision, then turns the result into a release evidence report your team can review and
              reuse.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {stats.map(([value, label, body]) => (
              <Card key={label}>
                <div className="mono" style={{ fontSize: 28, fontWeight: 650, color: 'var(--sc-ink)' }}>
                  {value}
                </div>
                <div style={{ marginTop: 6, fontWeight: 650 }}>{label}</div>
                <p className="muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                  {body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowSection() {
  const steps = [
    ['01', 'Describe the app', 'Pick the LLM workflow, safety options, examples, and goals that reflect the decision you need to make.'],
    ['02', 'Compare combinations', 'Use uploaded outputs or connectors, then let StackCert target the overlap tests that can change the recommendation.'],
    ['03', 'Review before release', 'Export a release evidence report: what was tested, the recommended combination, assumptions, limitations, signoffs, costs, and retest triggers.']
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
    ['Options compared', 'See every safety-check combination, the obvious one-at-a-time pick, the final recommendation, latency, and cost.'],
    ['Example builder', 'Import company examples, draft custom tests, and weight safe/risky cases to match the workflow.'],
    ['Safety option connectors', 'Use uploaded outputs first, then connect REST checks, local adapters, and model judges as the integration matures.'],
    ['Test plan', 'Run targeted worker jobs with leases, retries, usage tracking, and budget caps before spending on more evaluation.'],
    ['Release evidence report', 'Export a scoped JSON/Markdown report and wire the pass, warn, or block result into GitHub Actions or deployment pipelines.'],
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
    ['AI platform lead', 'Needs a repeatable release gate and a way to compare cost, latency, and risk across safety-check combinations.'],
    ['Safety engineer', 'Needs to turn policy failures into app-specific examples and inspect where checks fail together.'],
    ['Risk or GRC reviewer', 'Needs concise release evidence with scope, assumptions, limitations, and signoff history.']
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
    ['Documentation', '/docs', 'App setup, test plan, and release workflow.'],
    ['Methodology', '/methodology-paper', 'Plain-English method, then CASS details.'],
    ['Blog', '/blog', 'Product, theory, method, and empirical posts.'],
    ['Security', '/security', 'Data handling, auth, and deployment posture.'],
    ['Replication kit', '/replication-kit', 'Artifacts and commands for review.']
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
        <h2 className="section-title">Pay for useful release reports, not a giant test grid.</h2>
        <div className="grid grid-3" style={{ marginTop: 44 }}>
          {[
            ['Starter', 'Free', 'One app, uploaded outputs, and one active release evidence report.'],
            ['Team', '$1,800', 'Production recommendations, drift monitoring, audit log, and support.'],
            ['Enterprise', 'Talk to us', 'VPC/self-hosted, SSO, custom integrations, and private report storage.']
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
            <h2 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>Stop guessing which safety checks to ship.</h2>
            <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 16, lineHeight: 1.55 }}>
              Get an app-specific recommendation your safety team can defend, your platform team can automate, and
              your reviewers can understand.
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
              Safety-check selection and release evidence for teams shipping LLM applications into real review processes.
            </p>
          </div>
          {columns.map((column) => (
            <FooterCol key={column.title} title={column.title} links={column.links} />
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 StackCert Labs, Inc.</span>
          <span>App-specific evidence, not a universal guarantee.</span>
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
