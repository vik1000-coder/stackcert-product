import { Link, useSearchParams } from 'react-router-dom';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';

const demoOverviewPath = '/app/ws_demo/proj_acme_copilot/overview';
const demoSetupPath = '/app/ws_demo/proj_acme_copilot/setup';

export function DemoPage() {
  const [searchParams] = useSearchParams();
  const target = searchParams.get('next') === 'setup' ? demoSetupPath : demoOverviewPath;
  const demoAuthPath = `/auth/sign-in?flow=demo&next=${encodeURIComponent(target)}`;

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-container marketing-nav">
          <Link to="/" className="sidebar-brand">
            <LogoMark size={22} />
            <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
          </Link>
          <div style={{ flex: 1 }} />
          <ButtonLink to="/auth/sign-in">Beta sign in</ButtonLink>
          <ButtonLink to="/onboarding" variant="primary">
            Start pilot
          </ButtonLink>
        </div>
      </header>

      <main className="marketing-page">
        <div className="landing-container">
          <div className="demo-access-grid">
            <section className="demo-access-copy">
              <Badge tone="neutral">Demo sandbox</Badge>
              <h1 className="section-title">Explore StackCert without mixing it with a beta workspace.</h1>
              <p className="hero-copy">
                The support-copilot demo is a seeded walkthrough. It shows recommendations, overlap analysis, cost
                planning, evidence, and retest logic using sample data only.
              </p>
              <div className="demo-access-actions">
                <ButtonLink to={demoAuthPath} variant="primary">
                  Continue to demo sandbox
                </ButtonLink>
                <ButtonLink to="/onboarding">Create a beta pilot</ButtonLink>
              </div>
            </section>

            <Card>
              <div className="demo-boundary-list">
                <BoundaryItem
                  label="Demo sandbox"
                  body="Uses the prefilled demo account and seeded Acme support-copilot evidence. Treat it as product tour data."
                />
                <BoundaryItem
                  label="Beta pilot"
                  body="Uses your account, creates your workspace, and guides you toward your first evidence packet."
                />
                <BoundaryItem
                  label="No shared state"
                  body="Demo credentials do not create customer workspaces, and beta users do not receive demo workspace access by default."
                />
              </div>
            </Card>
          </div>
        </div>
      </main>
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
