import { Link, useSearchParams } from 'react-router-dom';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';
import { Footer } from './LandingPage';

const demoOverviewPath = '/app/ws_demo/proj_acme_copilot/overview';
const demoSetupPath = '/app/ws_demo/proj_acme_copilot/setup';

const tourSteps = [
  {
    step: '01',
    title: 'Start with the release question',
    body: 'The demo opens on a support-copilot app that needs a shippable safety-check combination, not a generic model score.'
  },
  {
    step: '02',
    title: 'Compare candidate stacks',
    body: 'See how StackCert weighs safety, usefulness, cost, latency, and uncertainty across combinations the team could actually deploy.'
  },
  {
    step: '03',
    title: 'Inspect overlap and remaining tests',
    body: 'Review where checks fail on the same examples, where they cover different risks, and which extra measurements would matter most.'
  },
  {
    step: '04',
    title: 'Read the release report boundary',
    body: 'The final report states what was tested, what StackCert recommends, what is out of scope, and when the team should retest.'
  }
];

const previewScreens = [
  'Overview recommendation',
  'Stack ranking',
  'Co-failure map',
  'Targeted measurements',
  'Release report',
  'Retest triggers'
];

export function DemoPage() {
  const [searchParams] = useSearchParams();
  const target = searchParams.get('next') === 'setup' ? demoSetupPath : demoOverviewPath;
  const demoAuthPath = `/auth/sign-in?flow=demo&next=${encodeURIComponent(target)}`;

  return (
    <div className="landing marketing-shell">
      <header className="landing-nav">
        <div className="landing-container marketing-nav">
          <Link to="/" className="sidebar-brand">
            <LogoMark size={22} />
            <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
          </Link>
          <div style={{ flex: 1 }} />
          <ButtonLink to="/auth/sign-in">Pilot sign in</ButtonLink>
          <ButtonLink to="/onboarding" variant="primary">
            Start pilot
          </ButtonLink>
        </div>
      </header>

      <main className="demo-page">
        <section className="demo-hero">
          <div className="landing-container demo-hero-grid">
            <div className="demo-access-copy">
              <Badge tone="neutral">Demo sandbox</Badge>
              <h1 className="section-title">Preview StackCert with safe sample data.</h1>
              <p className="hero-copy">
                The demo uses a fictional Acme support copilot so you can see the product before uploading anything.
                You will review a recommendation, compare safety-check combinations, inspect why overlap matters, and
                read the release report boundary.
              </p>
              <div className="demo-proof-row" aria-label="Demo contents">
                <span>Prefilled sample account</span>
                <span>No customer data</span>
                <span>Separate from pilot setup</span>
              </div>
              <div className="demo-access-actions">
                <ButtonLink to={demoAuthPath} variant="primary">
                  Continue to demo sandbox
                </ButtonLink>
                <ButtonLink to="/onboarding">Create a private pilot</ButtonLink>
              </div>
            </div>

            <aside className="demo-preview-panel" aria-label="Sample demo preview">
              <div className="demo-preview-topline">
                <span>Acme Support Copilot</span>
                <Badge tone="ok">Sample data</Badge>
              </div>
              <div className="demo-recommendation">
                <span>Recommendation preview</span>
                <strong>LG3 + Phi3</strong>
                <p>
                  The sample run shows why the recommended stack is not just the highest-scoring individual check. It
                  depends on overlap, residual risk, and deployable cost.
                </p>
              </div>
              <div className="demo-metric-grid">
                <Metric label="Examples" value="2,000" />
                <Metric label="Stacks" value="36" />
                <Metric label="Est. cost" value="$7.42" />
                <Metric label="Report" value="Scoped" />
              </div>
            </aside>
          </div>
        </section>

        <section className="demo-section">
          <div className="landing-container">
            <div className="demo-section-head">
              <div>
                <div className="section-eyebrow">What you will see</div>
                <h2 className="section-title">A guided tour of a real StackCert decision.</h2>
              </div>
              <p>
                The sandbox is meant to answer one practical question: would this help your team decide which safety
                checks to ship for a production LLM app?
              </p>
            </div>

            <div className="demo-tour-grid">
              {tourSteps.map((item) => (
                <Card key={item.step}>
                  <div className="demo-step-number">{item.step}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="demo-section demo-section-muted">
          <div className="landing-container demo-details-grid">
            <Card>
              <div className="section-eyebrow">Screens included</div>
              <h2 className="demo-card-title">The demo shows the main buyer-facing workflow.</h2>
              <div className="demo-screen-list">
                {previewScreens.map((screen) => (
                  <span key={screen}>{screen}</span>
                ))}
              </div>
            </Card>

            <Card>
              <div className="section-eyebrow">Before you enter</div>
              <h2 className="demo-card-title">Demo data is intentionally isolated.</h2>
              <div className="demo-boundary-list">
                <BoundaryItem
                  label="Demo sandbox"
                  body="Uses the prefilled demo account and sample Acme support-copilot data. Treat it as a product tour, not your own evaluation."
                />
                <BoundaryItem
                  label="Private pilot"
                  body="Uses your account and creates an isolated project for your app. The first output is a release report: what was tested, what StackCert recommends, the limits, and when to retest."
                />
                <BoundaryItem
                  label="No shared state"
                  body="Demo credentials cannot create real projects, and pilot accounts do not inherit the sample demo data by default."
                />
              </div>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BoundaryItem({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <p>{body}</p>
    </div>
  );
}
