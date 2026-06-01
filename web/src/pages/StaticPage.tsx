import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';
import { Footer } from './LandingPage';

type StaticContent = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  note?: string;
};

const pages: Record<string, StaticContent> = {
  'why-stackcert': {
    eyebrow: 'Product',
    title: 'Why StackCert',
    summary: 'StackCert exists because LLM app teams have many safety options, but few clear ways to choose the right combination for their actual workflow.',
    note: 'Best read as the product thesis: StackCert is for choosing deployable safety-check combinations, not for making broad claims about a model.',
    sections: [
      { heading: 'The problem', body: 'Rules, classifiers, model judges, more context, and stronger models can all help, but more checks are not automatically better.' },
      { heading: 'The decision', body: 'StackCert compares the combinations a team can actually ship, with safety, usefulness, latency, cost, and uncertainty visible in one place.' },
      { heading: 'The outcome', body: 'Teams get an app-specific recommendation and a release report that says what was tested, what was not, and when to retest.' }
    ]
  },
  'how-it-works': {
    eyebrow: 'Product',
    title: 'How It Works',
    summary: 'StackCert turns app examples, safety-check outputs, and launch goals into a recommendation for which combination to ship.',
    note: 'The workflow is intentionally narrow: start with one app, make the tested scope explicit, and expand only after the first report is useful.',
    sections: [
      { heading: 'Describe the app', body: 'Choose the workflow, safety options, example mix, custom risky behaviors, and tradeoffs that matter for release.' },
      { heading: 'Compare combinations', body: 'StackCert tests where options overlap, where they cover different failures, and where extra testing can change the answer.' },
      { heading: 'Review before release', body: 'Export a release report, collect signoffs, and use API, CLI, GitHub Actions, or MCP resources to block or warn on deployments.' }
    ]
  },
  pricing: {
    eyebrow: 'Product',
    title: 'Pricing',
    summary: 'The product is designed to be economical: teams should pay for useful release reports, not a giant test grid.',
    note: 'Pricing is still directional for design-partner discovery. The important product principle is that customers should not pay for unnecessary brute-force testing.',
    sections: [
      { heading: 'Starter', body: 'Free local/demo use for one application, uploaded outputs, and one active release report.' },
      { heading: 'Team', body: 'Production recommendations, retest monitoring, usage ledger, signoff workflow, and deploy-gate automation.' },
      { heading: 'Enterprise', body: 'Self-hosted or VPC deployment, SSO, custom retention, procurement support, and private integration work.' }
    ]
  },
  changelog: {
    eyebrow: 'Product',
    title: 'Changelog',
    summary: 'Current development is focused on turning the research prototype into a production-ready StackCert application.',
    note: 'This page summarizes product progress for visitors. Engineering-level release details stay in the repository docs and CI history.',
    sections: [
      { heading: 'Current build', body: 'Supabase-backed apps, safety option connectors, example import, queued workers, usage ledger, release reports, signoffs, and deployment gates.' },
      { heading: 'Latest slice', body: 'First-pilot readiness guidance, design-partner deployability, provider-health operations, signed release-gate webhooks, and release-report language.' },
      { heading: 'Next', body: 'Design-partner onboarding, production monitoring, backup rehearsal, auth sender-domain setup, and first customer-specific deployment adapters.' }
    ]
  },
  status: {
    eyebrow: 'Product',
    title: 'Status',
    summary: 'The product target is a design-partner pilot: real app examples, uploaded safety-check outputs, and a scoped release report before broad self-serve launch.',
    note: 'Current status is staging/design-partner ready, not broad public production. The app is deployed, tested, and still under active hardening.',
    sections: [
      { heading: 'API', body: 'FastAPI service with tested app, example-suite, safety-option, worker, cost, release-report, and MCP endpoints.' },
      { heading: 'Pilot path', body: 'The primary deployable workflow is uploaded outputs: customers bring examples and safety-check results, then StackCert compares options and issues the report.' },
      { heading: 'Operations', body: 'CI workflows, lint/advisor checks, deploy-gate workflow, Sentry hooks, provider-health admin views, and local runbook are in place or explicitly checklist-driven.' }
    ]
  },
  docs: {
    eyebrow: 'Resources',
    title: 'Documentation',
    summary: 'StackCert documentation is organized around a practical LLM app workflow rather than a generic model-evaluation checklist.',
    note: 'These docs describe the current product path: create a pilot, load examples and outputs, then issue a scoped release report.',
    sections: [
      { heading: 'Setup', body: 'Create a private pilot project, define an app, import examples, and start with uploaded safety-check outputs for the fastest pilot.' },
      { heading: 'Run', body: 'Use uploaded outputs first, then optionally queue managed REST or model-judge jobs when the team wants StackCert to execute checks.' },
      { heading: 'Release', body: 'Issue a release report, collect signoffs, and connect the result to CI/CD or LLM app-release tooling with GitHub Actions, GitLab, CircleCI, or webhook templates.' }
    ]
  },
  integrations: {
    eyebrow: 'Resources',
    title: 'Integrations',
    summary: 'StackCert fits into common release workflows through CI gates, signed deployment webhooks, REST/OpenAPI endpoints, and authenticated MCP resources.',
    note: 'The design-partner default is still uploaded outputs. These integrations let platform teams automate the release-report decision once the first pilot is useful.',
    sections: [
      { heading: 'CI/CD gates', body: 'Use the GitHub composite action, reusable GitHub workflow, GitLab CI, or CircleCI examples to pass, warn, or block deployments based on the current release report.' },
      { heading: 'Deployment webhooks', body: 'Call the signed release-gate webhook from deployment platforms that prefer HMAC authentication over bearer tokens.' },
      { heading: 'Agent interfaces', body: 'Use the FastAPI OpenAPI schema and remote MCP endpoint so agent platforms can inspect release status, limitations, and retest guidance.' }
    ]
  },
  'methodology-paper': {
    eyebrow: 'Resources',
    title: 'Methodology Paper',
    summary: 'The plain-English idea: safety options should be evaluated together, because two good options can fail on the same examples.',
    note: 'The methodology is useful only when the tested examples, candidate safety checks, and objective match the release decision being made.',
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
    note: 'The replication kit is meant to make the demo inspectable before a buyer trusts StackCert with their own app data.',
    sections: [
      { heading: 'Artifacts', body: 'Demo JSONL examples, safety-check outputs, example weights, and generated release reports.' },
      { heading: 'Commands', body: 'Unit tests, API smoke tests, worker runner, Supabase reset/lint/advisor checks, and web verification.' },
      { heading: 'Goal', body: 'Make the demo reproducible before a customer trusts StackCert with their own agent workflows.' }
    ]
  },
  blog: {
    eyebrow: 'Resources',
    title: 'Blog',
    summary: 'Planned essays will explain safety-check combinations, LLM app deployment risk, example design, and the economics of targeted testing.',
    note: 'The live blog index contains the full article series. This summary exists for route completeness.',
    sections: [
      { heading: 'First posts', body: 'Why one-at-a-time safety scores fail, what release reports mean, and how to decide when to retest.' },
      { heading: 'Operator notes', body: 'Practical lessons from connecting StackCert to CI/CD and agent-release workflows.' },
      { heading: 'Research notes', body: 'Short methodology updates as the overlap-testing implementation matures.' }
    ]
  },
  glossary: {
    eyebrow: 'Resources',
    title: 'Glossary',
    summary: 'A compact vocabulary for teams using StackCert without needing to know the research paper first.',
    note: 'These definitions are intentionally product-first. The app can use more technical terms internally, but user-facing pages should stay plain.',
    sections: [
      { heading: 'Safety check', body: 'A rule, classifier, model judge, context policy, stronger model route, or other step that improves LLM app behavior.' },
      { heading: 'Combination', body: 'The set of safety checks you choose to run for an application workflow.' },
      { heading: 'Overlap', body: 'When two checks miss the same risky examples or block the same normal examples.' },
      { heading: 'Release report', body: 'A scoped review record that says what examples and safety-check combinations were tested, what StackCert recommends, what is not covered, and when to retest.' },
      { heading: 'CASS', body: 'The underlying method StackCert uses to choose combinations by measuring overlap where it matters.' }
    ]
  },
  about: {
    eyebrow: 'Company',
    title: 'About StackCert',
    summary: 'StackCert is being built for teams that have moved past AI demos and need repeatable release reports for real agent workflows.',
    note: 'StackCert is early and product-led: the immediate goal is proving value with real pilot workflows before broad company scaling.',
    sections: [
      { heading: 'Mission', body: 'Help companies ship useful AI agents with clearer evidence, lower testing cost, and more honest risk language.' },
      { heading: 'Point of view', body: 'No release report proves universal safety. Good release reports make scope, assumptions, and residual risk explicit.' },
      { heading: 'Audience', body: 'AI platform, safety engineering, model risk, security, and GRC teams working together on production releases.' }
    ]
  },
  customers: {
    eyebrow: 'Company',
    title: 'Customers',
    summary: 'StackCert is designed for regulated or high-consequence teams deploying support, internal operations, coding, security, and research agents.',
    note: 'The best early customer already has an LLM app, some safety options, and a release decision that needs evidence.',
    sections: [
      { heading: 'Best fit', body: 'Teams with multiple safety options, multiple combinations, and enough deployment risk to need reviewable evidence.' },
      { heading: 'Design partners', body: 'Ideal early customers can provide real app examples, existing safety-check outputs, and a concrete release gate.' },
      { heading: 'Outcome', body: 'A repeatable release report that can travel between platform, safety, risk, and executive review.' }
    ]
  },
  security: {
    eyebrow: 'Company',
    title: 'Security',
    summary: 'The design-partner pilot is built around minimal sensitive data, uploaded-output workflows, explicit retention choices, and customer-hosted adapter paths.',
    note: 'Security posture is strongest when customers can use redacted data, private artifacts, scoped auth, and explicit retest boundaries.',
    sections: [
      { heading: 'Data minimization', body: 'Apps can use redacted snippets, hashes-only records, uploaded outputs, or customer-hosted data paths. StackCert does not need to host customer local models for v1.' },
      { heading: 'Access', body: 'Supabase Auth, row-level security, server-side service role usage, and redacted connector secrets are part of the architecture.' },
      { heading: 'Operations', body: 'CI, dependency checks, migration linting, Supabase advisors, monitoring, backup rehearsal, and deployment-gate checks are expected release gates.' }
    ]
  },
  careers: {
    eyebrow: 'Company',
    title: 'Careers',
    summary: 'StackCert is early. The near-term hiring profile is people who can bridge product engineering, AI safety, statistics, and enterprise trust.',
    note: 'This is an early-company placeholder. It should not imply open roles until hiring is real.',
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
    note: 'This page keeps language conservative while the company story is still being formalized.',
    sections: [
      { heading: 'Short description', body: 'StackCert helps teams choose which safety checks to combine for production AI agents.' },
      { heading: 'Long description', body: 'StackCert measures where safety options overlap, ranks candidate combinations, and produces scoped release reports for review.' },
      { heading: 'Contact', body: 'For now, use the demo/contact flow while the company presence is formalized.' }
    ]
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy',
    summary: 'StackCert should collect only what is needed to create, operate, and audit a scoped release-report workflow.',
    note: 'This is a product posture page, not final legal counsel-approved policy text. It should stay conservative until launch.',
    sections: [
      { heading: 'Product data', body: 'The preferred design-partner path stores redacted prompts, hashes, metadata, uploaded safety-check outputs, and release reports rather than raw sensitive conversations.' },
      { heading: 'Account data', body: 'Team, project, billing, auth, and activity metadata are used to operate the service.' },
      { heading: 'Retention', body: 'Enterprise customers should be able to configure retention, deletion, and customer-hosted evidence paths.' }
    ]
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    summary: 'These product terms are a placeholder for counsel review, but the product posture is already clear: StackCert mitigates risk; it does not guarantee outcomes.',
    note: 'These terms are placeholders for legal review. They preserve the core boundary: StackCert helps reduce scoped release risk, but does not guarantee outcomes.',
    sections: [
      { heading: 'Use of service', body: 'Customers are responsible for lawful data handling, truthful example configuration, and human review of deployment decisions.' },
      { heading: 'No guarantee', body: 'StackCert release reports are scoped over specified data, safety options, model versions, assumptions, and time. They are not a guarantee of real-world safety.' },
      { heading: 'Production review', body: 'High-risk deployments should combine StackCert with security review, monitoring, incident response, and organization-specific approvals.' }
    ]
  },
  'soc-2': {
    eyebrow: 'Legal',
    title: 'SOC 2',
    summary: 'SOC 2 controls are part of the intended enterprise path. The local product currently includes the technical foundations needed for that direction.',
    note: 'SOC 2 is not complete today. The page should accurately describe intended controls and current technical foundations.',
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
    note: 'A formal DPA still needs counsel review before production customer processing.',
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
    note: 'The subprocessor list must be kept current before public launch or paid production use.',
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
    <div className="landing marketing-shell">
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

      <main className="marketing-page static-page-main">
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
          <div className="static-note">
            <Badge tone="neutral">Current state</Badge>
            <p>{page.note ?? 'This page summarizes the current StackCert product direction and should stay aligned with the deployed app.'}</p>
          </div>
          <div className="static-cta">
            <h2>Ready to try the workflow?</h2>
            <p>Start with the sample demo or create a private pilot for one production agent.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <ButtonLink to="/demo" variant="primary">
                Open demo
              </ButtonLink>
              <ButtonLink to="/onboarding">Start pilot</ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
