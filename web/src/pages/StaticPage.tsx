import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';

const demoOverviewPath = '/app/ws_demo/proj_acme_copilot/overview';
const demoSignInPath = `/auth/sign-in?next=${encodeURIComponent(demoOverviewPath)}`;

type StaticContent = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
};

const pages: Record<string, StaticContent> = {
  'why-stackcert': {
    eyebrow: 'Product',
    title: 'Why StackCert',
    summary: 'StackCert exists because the most expensive guardrail mistakes are composition mistakes: redundant guards, correlated misses, hidden cost, and unclear release evidence.',
    sections: [
      { heading: 'The problem', body: 'A guard can look strong in isolation and still add little value to a stack when it fails on the same examples as another guard.' },
      { heading: 'The decision', body: 'StackCert compares the actual candidate stacks a team can ship, with latency, cost, uncertainty, and scope visible in one place.' },
      { heading: 'The outcome', body: 'Teams get a scoped certificate and deployment gate that says what was measured, what was not, and what should trigger recertification.' }
    ]
  },
  'how-it-works': {
    eyebrow: 'Product',
    title: 'How It Works',
    summary: 'StackCert turns benchmark examples, guard outputs, and business risk weights into a defensible stack recommendation.',
    sections: [
      { heading: 'Declare the launch context', body: 'Choose the candidate guards, benchmark mix, custom behaviors, aggregation rule, and risk profile.' },
      { heading: 'Measure the useful uncertainty', body: 'CASS plans targeted measurements where co-failure information can change the decision.' },
      { heading: 'Ship with a gate', body: 'Issue a certificate, collect signoffs, and use API, CLI, GitHub Actions, or MCP resources to block or warn on deployments.' }
    ]
  },
  pricing: {
    eyebrow: 'Product',
    title: 'Pricing',
    summary: 'The product is designed to be economical: teams should pay for evidence, not for decorative dashboard seats.',
    sections: [
      { heading: 'Starter', body: 'Free local/demo use for one application, uploaded outputs, and one active certificate.' },
      { heading: 'Team', body: 'Production certification, drift monitoring, usage ledger, signoff workflow, and deploy-gate automation.' },
      { heading: 'Enterprise', body: 'Self-hosted or VPC deployment, SSO, custom retention, procurement support, and private integration work.' }
    ]
  },
  changelog: {
    eyebrow: 'Product',
    title: 'Changelog',
    summary: 'Current development is focused on turning the CASS prototype into a production-ready StackCert application.',
    sections: [
      { heading: 'Current build', body: 'Supabase-backed projects, guard connectors, benchmark import, queued workers, usage ledger, certificates, signoffs, and deployment gates.' },
      { heading: 'Latest slice', body: 'Provider-grade worker hardening and MCP-style agent integration endpoints.' },
      { heading: 'Next', body: 'Provider adapters, richer onboarding, hosted deployment, billing, and enterprise pipeline integrations.' }
    ]
  },
  status: {
    eyebrow: 'Product',
    title: 'Status',
    summary: 'The local product build is suitable for demos and design-partner pilots, with clear remaining production work.',
    sections: [
      { heading: 'API', body: 'FastAPI service with tested project, benchmark, guard, worker, cost, certificate, and MCP endpoints.' },
      { heading: 'Database', body: 'Supabase migrations cover workspaces, projects, suites, custom behaviors, jobs, usage events, certificates, and signoffs.' },
      { heading: 'Operations', body: 'CI workflows, lint/advisor checks, certificate gate workflow, and local runbook are in place.' }
    ]
  },
  docs: {
    eyebrow: 'Resources',
    title: 'Documentation',
    summary: 'StackCert documentation is organized around a practical certification workflow rather than a generic model-evaluation checklist.',
    sections: [
      { heading: 'Setup', body: 'Create a workspace, define a project, import benchmark examples, and register guard connectors.' },
      { heading: 'Run', body: 'Queue evaluation and measurement jobs, inspect co-failure, and compare candidate stack rankings.' },
      { heading: 'Release', body: 'Issue a scoped certificate, collect signoffs, and connect the certificate gate to CI/CD or agent-release tooling.' }
    ]
  },
  'methodology-paper': {
    eyebrow: 'Resources',
    title: 'Methodology Paper',
    summary: 'The methodology is based on CASS: Correlation-Aware Stack Selection for composable guardrail certification.',
    sections: [
      { heading: 'Core idea', body: 'Guard stacks should be evaluated by joint behavior, not just marginal guard scores.' },
      { heading: 'Measurement plan', body: 'Targeted pair and cell measurements shrink the uncertainty interval around the deployment decision.' },
      { heading: 'Certificate scope', body: 'Every result is scoped to the benchmark mixture, candidate stack set, welfare profile, and aggregation assumptions.' }
    ]
  },
  'replication-kit': {
    eyebrow: 'Resources',
    title: 'Replication Kit',
    summary: 'The repository includes fixture examples, outputs, tests, and scripts so a buyer can inspect the evidence path end to end.',
    sections: [
      { heading: 'Artifacts', body: 'Demo JSONL examples, guard outputs, benchmark weights, and generated certificates.' },
      { heading: 'Commands', body: 'Unit tests, API smoke tests, worker runner, Supabase reset/lint/advisor checks, and web verification.' },
      { heading: 'Goal', body: 'Make the demo reproducible before a customer trusts StackCert with their own agent workflows.' }
    ]
  },
  blog: {
    eyebrow: 'Resources',
    title: 'Blog',
    summary: 'Planned essays will explain guardrail composition, agent deployment risk, benchmark design, and the economics of targeted measurement.',
    sections: [
      { heading: 'First posts', body: 'Why marginal guard scores fail, what a scoped certificate means, and how to decide when to recertify.' },
      { heading: 'Operator notes', body: 'Practical lessons from connecting StackCert to CI/CD and agent-release workflows.' },
      { heading: 'Research notes', body: 'Short methodology updates as the CASS implementation matures.' }
    ]
  },
  glossary: {
    eyebrow: 'Resources',
    title: 'Glossary',
    summary: 'A compact vocabulary for teams using StackCert in deployment reviews.',
    sections: [
      { heading: 'CASS', body: 'Correlation-Aware Stack Selection, the StackCert method for selecting guard stacks using co-failure evidence.' },
      { heading: 'Certificate', body: 'A scoped evidence packet that records the selected stack, assumptions, limitations, and recertification triggers.' },
      { heading: 'Benchmark mixture', body: 'The weighted set of benign and adversarial behavior cells used to represent the launch risk profile.' }
    ]
  },
  about: {
    eyebrow: 'Company',
    title: 'About StackCert',
    summary: 'StackCert is being built for teams that have moved past AI demos and need repeatable release evidence for real agent workflows.',
    sections: [
      { heading: 'Mission', body: 'Help companies ship useful AI agents with clearer evidence, lower measurement cost, and more honest risk language.' },
      { heading: 'Point of view', body: 'No certificate proves universal safety. A good certificate makes scope, assumptions, and residual risk explicit.' },
      { heading: 'Audience', body: 'AI platform, safety engineering, model risk, security, and GRC teams working together on production releases.' }
    ]
  },
  customers: {
    eyebrow: 'Company',
    title: 'Customers',
    summary: 'StackCert is designed for regulated or high-consequence teams deploying support, internal operations, coding, security, and research agents.',
    sections: [
      { heading: 'Best fit', body: 'Teams with multiple guardrails, multiple candidate stacks, and enough deployment risk to need reviewable evidence.' },
      { heading: 'Design partners', body: 'Ideal early customers can provide real benchmark behaviors, existing guard outputs, and a concrete release gate.' },
      { heading: 'Outcome', body: 'A repeatable certificate packet that can travel between platform, safety, risk, and executive review.' }
    ]
  },
  security: {
    eyebrow: 'Company',
    title: 'Security',
    summary: 'The product is designed around minimal sensitive data, explicit retention choices, and deployable self-hosted paths.',
    sections: [
      { heading: 'Data minimization', body: 'Projects can use redacted snippets, hashes-only records, uploaded outputs, or customer-hosted data paths.' },
      { heading: 'Access', body: 'Supabase Auth, row-level security, server-side service role usage, and redacted connector secrets are part of the architecture.' },
      { heading: 'Operations', body: 'CI, dependency checks, migration linting, and Supabase advisors are expected release gates.' }
    ]
  },
  careers: {
    eyebrow: 'Company',
    title: 'Careers',
    summary: 'StackCert is early. The near-term hiring profile is people who can bridge product engineering, AI safety, statistics, and enterprise trust.',
    sections: [
      { heading: 'Engineering', body: 'Backend, frontend, infra, and integrations for teams that ship production agents.' },
      { heading: 'Research', body: 'Measurement planning, benchmark design, uncertainty intervals, and safety-evaluation methodology.' },
      { heading: 'Go to market', body: 'Design-partner discovery with platform, safety, security, and model-risk buyers.' }
    ]
  },
  press: {
    eyebrow: 'Company',
    title: 'Press',
    summary: 'StackCert is a developing product built from the CASS thesis: guardrail stacks need evidence about composition, not just isolated scores.',
    sections: [
      { heading: 'Short description', body: 'StackCert certifies composable guardrail stacks for production AI agents.' },
      { heading: 'Long description', body: 'StackCert measures correlated guardrail failures, ranks candidate stacks, and produces scoped evidence packets for release review.' },
      { heading: 'Contact', body: 'For now, use the demo/contact flow while the company presence is formalized.' }
    ]
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy',
    summary: 'StackCert should collect only what is needed to create, operate, and audit a scoped certification workflow.',
    sections: [
      { heading: 'Product data', body: 'The preferred production path stores redacted prompts, hashes, metadata, outputs, and certificate evidence rather than raw sensitive conversations.' },
      { heading: 'Account data', body: 'Workspace, project, billing, auth, and activity metadata are used to operate the service.' },
      { heading: 'Retention', body: 'Enterprise customers should be able to configure retention, deletion, and customer-hosted evidence paths.' }
    ]
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    summary: 'These product terms are a placeholder for counsel review, but the product posture is already clear: StackCert mitigates risk; it does not guarantee outcomes.',
    sections: [
      { heading: 'Use of service', body: 'Customers are responsible for lawful data handling, truthful benchmark configuration, and human review of deployment decisions.' },
      { heading: 'No guarantee', body: 'A StackCert certificate is scoped evidence over specified data, guards, model versions, assumptions, and time. It is not a guarantee of real-world safety.' },
      { heading: 'Production review', body: 'High-risk deployments should combine StackCert with security review, monitoring, incident response, and organization-specific approvals.' }
    ]
  },
  'soc-2': {
    eyebrow: 'Legal',
    title: 'SOC 2',
    summary: 'SOC 2 controls are part of the intended enterprise path. The local product currently includes the technical foundations needed for that direction.',
    sections: [
      { heading: 'Current controls', body: 'Auth boundary, row-level security plan, audit-friendly signoffs, CI checks, and database migration review.' },
      { heading: 'Needed controls', body: 'Formal policies, vendor management, access reviews, incident response, change management, and independent audit.' },
      { heading: 'Customer path', body: 'Enterprise deployments can start with self-hosted or customer-hosted data while compliance evidence matures.' }
    ]
  },
  dpa: {
    eyebrow: 'Legal',
    title: 'Data Processing Addendum',
    summary: 'The DPA page records the intended posture for handling customer benchmark and guard-output data.',
    sections: [
      { heading: 'Processing purpose', body: 'Process customer-provided benchmark, guard-output, and project metadata for certification, monitoring, and support.' },
      { heading: 'Data modes', body: 'Support raw-allowed, redacted-snippet, hashes-only, and customer-hosted configurations.' },
      { heading: 'Enterprise review', body: 'A formal DPA should be completed with counsel before production customer processing.' }
    ]
  },
  subprocessors: {
    eyebrow: 'Legal',
    title: 'Subprocessors',
    summary: 'The intended hosted stack is intentionally small: Supabase, hosting/runtime infrastructure, observability, and payment/vendor tooling as needed.',
    sections: [
      { heading: 'Core infrastructure', body: 'Supabase can provide Postgres, Auth, Storage, and row-level security for hosted deployments.' },
      { heading: 'Optional services', body: 'Observability, email, payments, and support vendors should be listed here before public launch.' },
      { heading: 'Customer-hosted option', body: 'Enterprise customers may choose a deployment mode that keeps sensitive benchmark artifacts in their environment.' }
    ]
  }
};

export function StaticPage() {
  const { pageSlug } = useParams();
  const page = pageSlug ? pages[pageSlug] : undefined;
  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-container marketing-nav">
          <Link to="/" className="sidebar-brand">
            <LogoMark size={22} />
            <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
          </Link>
          <nav className="marketing-nav-links">
            <Link to="/why-stackcert">Why</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/docs">Docs</Link>
            <Link to="/security">Security</Link>
          </nav>
          <div style={{ flex: 1 }} />
          <ButtonLink to="/onboarding" variant="primary">
            Start pilot
          </ButtonLink>
        </div>
      </header>

      <main className="marketing-page">
        <div className="landing-container">
          <div className="marketing-page-head">
            <Badge tone="neutral">{page.eyebrow}</Badge>
            <h1 className="section-title" style={{ marginTop: 18, maxWidth: 820 }}>
              {page.title}
            </h1>
            <p className="hero-copy" style={{ margin: '16px 0 0', maxWidth: 820 }}>
              {page.summary}
            </p>
          </div>
          <div className="grid grid-3">
            {page.sections.map((section) => (
              <Card key={section.heading}>
                <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>{section.heading}</h2>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                  {section.body}
                </p>
              </Card>
            ))}
          </div>
          <div className="static-cta">
            <h2>Ready to try the workflow?</h2>
            <p>Start with the seeded demo or create a pilot shell for one production agent.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <ButtonLink to={demoSignInPath} variant="primary">
                Open demo
              </ButtonLink>
              <ButtonLink to="/onboarding">Start pilot</ButtonLink>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
