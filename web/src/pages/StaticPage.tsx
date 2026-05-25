import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';

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
    summary: 'StackCert exists because LLM app teams have many safety options, but few clear ways to choose the right combination for their actual workflow.',
    sections: [
      { heading: 'The problem', body: 'Rules, classifiers, model judges, more context, and stronger models can all help, but more checks are not automatically better.' },
      { heading: 'The decision', body: 'StackCert compares the combinations a team can actually ship, with safety, usefulness, latency, cost, and uncertainty visible in one place.' },
      { heading: 'The outcome', body: 'Teams get an app-specific recommendation and release evidence that says what was tested, what was not, and when to retest.' }
    ]
  },
  'how-it-works': {
    eyebrow: 'Product',
    title: 'How It Works',
    summary: 'StackCert turns app examples, safety-check outputs, and launch goals into a recommendation for which combination to ship.',
    sections: [
      { heading: 'Describe the app', body: 'Choose the workflow, safety options, example mix, custom risky behaviors, and tradeoffs that matter for release.' },
      { heading: 'Compare combinations', body: 'StackCert tests where options overlap, where they cover different failures, and where extra testing can change the answer.' },
      { heading: 'Ship with evidence', body: 'Export release evidence, collect signoffs, and use API, CLI, GitHub Actions, or MCP resources to block or warn on deployments.' }
    ]
  },
  pricing: {
    eyebrow: 'Product',
    title: 'Pricing',
    summary: 'The product is designed to be economical: teams should pay for useful release evidence, not a giant test grid.',
    sections: [
      { heading: 'Starter', body: 'Free local/demo use for one application, uploaded outputs, and one active evidence packet.' },
      { heading: 'Team', body: 'Production recommendations, retest monitoring, usage ledger, signoff workflow, and deploy-gate automation.' },
      { heading: 'Enterprise', body: 'Self-hosted or VPC deployment, SSO, custom retention, procurement support, and private integration work.' }
    ]
  },
  changelog: {
    eyebrow: 'Product',
    title: 'Changelog',
    summary: 'Current development is focused on turning the research prototype into a production-ready StackCert application.',
    sections: [
      { heading: 'Current build', body: 'Supabase-backed apps, safety option connectors, example import, queued workers, usage ledger, release evidence, signoffs, and deployment gates.' },
      { heading: 'Latest slice', body: 'First-pilot readiness guidance, provider-grade worker hardening, MCP resources, and release-gate integration endpoints.' },
      { heading: 'Next', body: 'Provider adapters, persisted budget policies, trace commit flows, billing, and enterprise pipeline integrations.' }
    ]
  },
  status: {
    eyebrow: 'Product',
    title: 'Status',
    summary: 'The local product build is suitable for demos and design-partner pilots, with clear remaining production work.',
    sections: [
      { heading: 'API', body: 'FastAPI service with tested app, example-suite, safety-option, worker, cost, release-evidence, and MCP endpoints.' },
      { heading: 'Database', body: 'Supabase migrations cover workspaces, apps, suites, app-specific examples, jobs, usage events, evidence packets, and signoffs.' },
      { heading: 'Operations', body: 'CI workflows, lint/advisor checks, deploy-gate workflow, and local runbook are in place.' }
    ]
  },
  docs: {
    eyebrow: 'Resources',
    title: 'Documentation',
    summary: 'StackCert documentation is organized around a practical LLM app workflow rather than a generic model-evaluation checklist.',
    sections: [
      { heading: 'Setup', body: 'Create a workspace, define an app, import examples, and register safety options.' },
      { heading: 'Run', body: 'Queue evaluation and targeted test jobs, inspect overlap, and compare candidate combinations.' },
      { heading: 'Release', body: 'Issue release evidence, collect signoffs, and connect the result to CI/CD or LLM app-release tooling with GitHub Actions, GitLab, CircleCI, or webhook templates.' }
    ]
  },
  'methodology-paper': {
    eyebrow: 'Resources',
    title: 'Methodology Paper',
    summary: 'The plain-English idea: safety options should be evaluated together, because two good options can fail on the same examples.',
    sections: [
      { heading: 'Core idea', body: 'Combinations should be evaluated by joint behavior, not just one-at-a-time safety-check scores.' },
      { heading: 'Targeted tests', body: 'StackCert tests overlaps that can change the recommendation instead of measuring every expensive path.' },
      { heading: 'CASS details', body: 'The underlying method is CASS: Correlation-Aware Stack Selection, scoped to the example mix, candidate combinations, goal score, and assumptions.' }
    ]
  },
  'replication-kit': {
    eyebrow: 'Resources',
    title: 'Replication Kit',
    summary: 'The repository includes fixture examples, outputs, tests, and scripts so a buyer can inspect the evidence path end to end.',
    sections: [
      { heading: 'Artifacts', body: 'Demo JSONL examples, safety-check outputs, example weights, and generated evidence packets.' },
      { heading: 'Commands', body: 'Unit tests, API smoke tests, worker runner, Supabase reset/lint/advisor checks, and web verification.' },
      { heading: 'Goal', body: 'Make the demo reproducible before a customer trusts StackCert with their own agent workflows.' }
    ]
  },
  blog: {
    eyebrow: 'Resources',
    title: 'Blog',
    summary: 'Planned essays will explain safety-check combinations, LLM app deployment risk, example design, and the economics of targeted testing.',
    sections: [
      { heading: 'First posts', body: 'Why one-at-a-time safety scores fail, what release evidence means, and how to decide when to retest.' },
      { heading: 'Operator notes', body: 'Practical lessons from connecting StackCert to CI/CD and agent-release workflows.' },
      { heading: 'Research notes', body: 'Short methodology updates as the overlap-testing implementation matures.' }
    ]
  },
  glossary: {
    eyebrow: 'Resources',
    title: 'Glossary',
    summary: 'A compact vocabulary for teams using StackCert without needing to know the research paper first.',
    sections: [
      { heading: 'Safety check', body: 'A rule, classifier, model judge, context policy, stronger model route, or other step that improves LLM app behavior.' },
      { heading: 'Combination', body: 'The set of safety checks you choose to run for an application workflow.' },
      { heading: 'Overlap', body: 'When two checks miss the same risky examples or block the same normal examples.' },
      { heading: 'Release evidence', body: 'A scoped packet that records the selected combination, assumptions, limitations, and retest triggers.' },
      { heading: 'CASS', body: 'The underlying method StackCert uses to choose combinations by measuring overlap where it matters.' }
    ]
  },
  about: {
    eyebrow: 'Company',
    title: 'About StackCert',
    summary: 'StackCert is being built for teams that have moved past AI demos and need repeatable release evidence for real agent workflows.',
    sections: [
      { heading: 'Mission', body: 'Help companies ship useful AI agents with clearer evidence, lower testing cost, and more honest risk language.' },
      { heading: 'Point of view', body: 'No evidence packet proves universal safety. Good release evidence makes scope, assumptions, and residual risk explicit.' },
      { heading: 'Audience', body: 'AI platform, safety engineering, model risk, security, and GRC teams working together on production releases.' }
    ]
  },
  customers: {
    eyebrow: 'Company',
    title: 'Customers',
    summary: 'StackCert is designed for regulated or high-consequence teams deploying support, internal operations, coding, security, and research agents.',
    sections: [
      { heading: 'Best fit', body: 'Teams with multiple safety options, multiple combinations, and enough deployment risk to need reviewable evidence.' },
      { heading: 'Design partners', body: 'Ideal early customers can provide real app examples, existing safety-check outputs, and a concrete release gate.' },
      { heading: 'Outcome', body: 'A repeatable evidence packet that can travel between platform, safety, risk, and executive review.' }
    ]
  },
  security: {
    eyebrow: 'Company',
    title: 'Security',
    summary: 'The product is designed around minimal sensitive data, explicit retention choices, and deployable self-hosted paths.',
    sections: [
      { heading: 'Data minimization', body: 'Apps can use redacted snippets, hashes-only records, uploaded outputs, or customer-hosted data paths.' },
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
      { heading: 'Research', body: 'Test planning, example design, uncertainty intervals, and safety-evaluation methodology.' },
      { heading: 'Go to market', body: 'Design-partner discovery with platform, safety, security, and model-risk buyers.' }
    ]
  },
  press: {
    eyebrow: 'Company',
    title: 'Press',
    summary: 'StackCert is a developing product for choosing safety-check combinations for production LLM applications.',
    sections: [
      { heading: 'Short description', body: 'StackCert helps teams choose which safety checks to combine for production AI agents.' },
      { heading: 'Long description', body: 'StackCert measures where safety options overlap, ranks candidate combinations, and produces scoped evidence packets for release review.' },
      { heading: 'Contact', body: 'For now, use the demo/contact flow while the company presence is formalized.' }
    ]
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy',
    summary: 'StackCert should collect only what is needed to create, operate, and audit a scoped release-evidence workflow.',
    sections: [
      { heading: 'Product data', body: 'The preferred production path stores redacted prompts, hashes, metadata, outputs, and release evidence rather than raw sensitive conversations.' },
      { heading: 'Account data', body: 'Workspace, project, billing, auth, and activity metadata are used to operate the service.' },
      { heading: 'Retention', body: 'Enterprise customers should be able to configure retention, deletion, and customer-hosted evidence paths.' }
    ]
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    summary: 'These product terms are a placeholder for counsel review, but the product posture is already clear: StackCert mitigates risk; it does not guarantee outcomes.',
    sections: [
      { heading: 'Use of service', body: 'Customers are responsible for lawful data handling, truthful example configuration, and human review of deployment decisions.' },
      { heading: 'No guarantee', body: 'StackCert release evidence is scoped over specified data, safety options, model versions, assumptions, and time. It is not a guarantee of real-world safety.' },
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
    summary: 'The DPA page records the intended posture for handling customer examples and safety-check output data.',
    sections: [
      { heading: 'Processing purpose', body: 'Process customer-provided examples, safety-check outputs, and app metadata for recommendations, monitoring, and support.' },
      { heading: 'Data modes', body: 'Support raw-allowed, redacted-snippet, hashes-only, and customer-hosted configurations.' },
      { heading: 'Enterprise review', body: 'A formal DPA should be completed with counsel before production customer processing.' }
    ]
  },
  subprocessors: {
    eyebrow: 'Legal',
    title: 'Subprocessors',
    summary: 'The intended hosted system is intentionally small: Supabase, hosting/runtime infrastructure, observability, and payment/vendor tooling as needed.',
    sections: [
      { heading: 'Core infrastructure', body: 'Supabase can provide Postgres, Auth, Storage, and row-level security for hosted deployments.' },
      { heading: 'Optional services', body: 'Observability, email, payments, and support vendors should be listed here before public launch.' },
      { heading: 'Customer-hosted option', body: 'Enterprise customers may choose a deployment mode that keeps sensitive example artifacts in their environment.' }
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
              <ButtonLink to="/demo" variant="primary">
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
