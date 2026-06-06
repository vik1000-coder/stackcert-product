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
  why: {
    eyebrow: 'Product',
    title: 'Why StackCert',
    summary: 'StackCert helps teams decide which LLM safety checks to ship before a release, using the examples, costs, latency, and risks that matter for one real app workflow.',
    note: 'The sellable wedge is deliberately narrow: one workflow, scoped evidence, explicit limitations, and a report that can travel through release review.',
    sections: [
      { heading: 'Release decisions are combinational', body: 'Rules, classifiers, model judges, fallback models, and policy context interact. One-at-a-time scores miss shared failures, disagreement, cost, and user friction.' },
      { heading: 'The buyer artifact is the report', body: 'The output is not an abstract benchmark. It is a scoped release report showing the recommended combination, options compared, residual risk, and retest triggers.' },
      { heading: 'Start with customer evidence', body: 'The fastest pilot path uses uploaded examples and uploaded safety-check outputs, then adds REST checks, model judges, and release gates only where the workflow needs them.' }
    ]
  },
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
  product: {
    eyebrow: 'Product',
    title: 'Product',
    summary: 'The product is a first-pilot workflow for turning app examples and safety-check outputs into a defensible recommendation and release report.',
    note: 'This is not a broad AI governance suite yet. It is a practical release-evidence tool for teams choosing among safety-check combinations.',
    sections: [
      { heading: 'First pilot setup', body: 'Create one private app, choose the deployment surface, name the review owner, select risk concerns, and load examples with stable external IDs.' },
      { heading: 'Evaluation workbench', body: 'Compare candidate combinations, inspect why the obvious pick changed or held, review overlap and disagreement, and estimate cost and latency before more testing.' },
      { heading: 'Release workflow', body: 'Issue Markdown, JSON, and private artifacts; collect reviewer signoff; expose pass, warn, or block decisions through CI/CD, webhooks, OpenAPI, and MCP resources.' }
    ]
  },
  pricing: {
    eyebrow: 'Product',
    title: 'Pricing',
    summary: 'StackCert is service-led first: a guided diagnostic or design-partner pilot uses the product to create repeatable release evidence for one agent workflow.',
    note: 'Provider calls are customer-paid costs or explicit evaluation credits. The buyer should know which workflows, examples, candidate checks, runs, reports, users, and overages are included before work starts.',
    sections: [
      { heading: 'Diagnostic Sprint', body: '$5,000 to $10,000 for benchmark design, candidate safety-option mapping, a small evidence replay, and a go/no-go memo for one agent workflow.' },
      { heading: 'Design Partner Pilot', body: '$15,000 to $35,000 for a guided 2-6 week pilot: one private workflow, 100 to 2,000 examples, 3 to 15 safety checks or routes, release report, review call, and retest plan.' },
      { heading: 'Production Evidence Program', body: '$4,000 to $12,000/month after a successful pilot for repeated release reports, retests, reviewer seats, audit history, and release-gate integrations.' },
      { heading: 'Enterprise', body: 'Custom pricing for contracted workflows, SSO, custom retention, VPC or self-hosted paths, customer-hosted evidence, security review, procurement packet, and priority support.' }
    ]
  },
  'sample-report': {
    eyebrow: 'Resources',
    title: 'Sample Release Report',
    summary: 'A complete StackCert report should make the release decision understandable to platform, safety, risk, and executive reviewers without a live walkthrough.',
    note: 'The sample report is candid by design. It should show recommendation, assumptions, limitations, retest triggers, and signoff boundaries, not just a green status.',
    sections: [
      { heading: 'Executive summary', body: 'State the selected safety-check combination, what release it supports, the pass/warn/block posture, expected cost and latency, and the top remaining risks.' },
      { heading: 'Scope and dataset', body: 'Name the app, model, prompt or policy version, tools, retrieval boundary, example counts, risk categories, safe/risky balance, and any small-N warnings.' },
      { heading: 'Options compared', body: 'List rules, classifiers, model judges, stronger models, context changes, fallbacks, and combinations, including the obvious one-at-a-time pick.' },
      { heading: 'Recommendation', body: 'Explain why the selected combination wins, why the obvious pick did or did not hold, and which overlaps or disagreements changed the answer.' },
      { heading: 'Limitations', body: 'Call out untested prompts, tools, policy changes, traffic shifts, provider assumptions, redaction boundaries, and places where StackCert cannot make a broad safety claim.' },
      { heading: 'Retest and approval', body: 'List triggers for a fresh report, record reviewer signoff or override, and expose release-gate signals for CI/CD, webhooks, MCP resources, and agent workflow review.' }
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
      { heading: 'Next', body: 'Design-partner onboarding, production auth email setup, signed pilot terms, first customer-specific deployment adapters, and managed-provider traffic observation.' }
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
      { heading: 'Operations', body: 'CI workflows, lint/advisor checks, deploy-gate workflow, provider-health admin views, and local runbooks are in place or checklist-driven. Sentry is skipped for this pass; log alerts and uptime checks are the required operating baseline.' }
    ]
  },
  docs: {
    eyebrow: 'Resources',
    title: 'Documentation',
    summary: 'StackCert documentation is organized around a practical LLM app workflow rather than a generic model-evaluation checklist.',
    note: 'These docs describe the current product path: create a pilot, load examples and outputs, then issue a scoped release report.',
    sections: [
      { heading: 'Setup', body: 'Create a private pilot project, define one app, import examples with stable external IDs, and upload safety-check outputs that reference those IDs.' },
      { heading: 'Run', body: 'Preview coverage first. Create the uploaded-output run only when every selected safety check covers every suite example. Managed REST/model-judge jobs remain advanced.' },
      { heading: 'Customize benchmarks', body: 'Start from customer support, internal assistant, or agent workflow templates, then add buyer-specific risk categories, expected decisions, weights, metadata, and holdout examples before using results for release evidence.' },
      { heading: 'Compare candidates', body: 'Register frontier baselines, open-weight judges, safety guard models, customer REST checks, context policies, and hybrid fallback routes as candidate safety options.' },
      { heading: 'Release', body: 'Issue a release report, collect signoffs, and connect the result to CI/CD or LLM app-release tooling with GitHub Actions, GitLab, CircleCI, or signed webhook templates.' },
      { heading: 'Operate', body: 'Before real data, confirm production Auth email setup, support ownership, signed customer data terms, and customer data-mode decisions.' }
    ]
  },
  integrations: {
    eyebrow: 'Resources',
    title: 'Integrations',
    summary: 'StackCert fits into common release workflows through CI gates, signed deployment webhooks, REST/OpenAPI endpoints, and authenticated MCP resources.',
    note: 'The design-partner default is still uploaded outputs. These integrations let platform teams automate the release-report decision once the first pilot is useful.',
    sections: [
      { heading: 'CI/CD gates', body: 'Use the GitHub composite action, reusable GitHub workflow, GitLab CI, or CircleCI examples to pass, warn, or block deployments based on the current release report.' },
      { heading: 'Deployment webhooks', body: 'Call POST /api/projects/{project_id}/release-gates/webhook with HMAC-SHA256 headers when a deployment system prefers signed webhooks over bearer tokens.' },
      { heading: 'Agent interfaces', body: 'Use the FastAPI OpenAPI schema and remote MCP endpoint so agent platforms can inspect release status, limitations, retest guidance, report scope, and release-gate decisions before acting.' },
      { heading: 'Notifications', body: 'For v1, use CI outputs or deployment-webhook responses to notify Slack, Teams, PagerDuty, or ticketing systems. Native outbound notification setup should wait for a named design-partner workflow.' }
    ]
  },
  'pilot-readiness': {
    eyebrow: 'Resources',
    title: 'Pilot Readiness',
    summary: 'A concrete preflight for turning the current staging app into a sellable design-partner pilot without pretending it is broad public production.',
    note: 'This checklist intentionally skips Sentry. Staging has log-based alerts, uptime checks, alert routing, and restore evidence; the remaining operating bar is Auth email setup, signed terms, and a support owner for the live pilot.',
    sections: [
      { heading: 'Product scope', body: 'One app, one example suite, uploaded safety-check outputs, a recommendation, overlap review, targeted tests, release report, and release-gate integration.' },
      { heading: 'Ops evidence', body: 'Staging uptime checks, Cloud Run alert policies, alert routing, and restore rehearsal are complete. Confirm production Auth email setup, data mode, signed terms, and support ownership before real customer examples.' },
      { heading: 'Data boundary', body: 'Prefer redacted snippets, hashes, metadata, and uploaded outputs. Local/customer-owned models are represented by outputs, REST endpoints, or future customer-hosted workers.' },
      { heading: 'Done means', body: 'A design partner can complete the pilot path without command-line help, and the team can restore data, route alerts, support users, and block unsafe deployments.' }
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
      { heading: 'CASS v2 replay', body: 'The proof page now compares the retained old_cass K=2 serial reference against CASS v2 search over larger committees and voting/quota rules, using saved outputs.' },
      { heading: 'Frontier proof', body: 'The proof page runs this idea on a 240-example support-safety task against xAI Grok 4.3 and local candidate checks. It keeps the frontier result visible instead of claiming local always wins.' },
      { heading: 'CASS details', body: 'CASS now means atom-aware, correlation-aware committee search for scoped release evidence. The legacy K<=2 serial interval certificate is retained as old_cass for audit and ablation.' }
    ]
  },
  'replication-kit': {
    eyebrow: 'Resources',
    title: 'Replication Kit',
    summary: 'The repository includes fixture examples, outputs, tests, and scripts so a buyer can inspect the evidence path end to end.',
    note: 'The replication kit is meant to make the demo inspectable before a buyer trusts StackCert with their own app data.',
    sections: [
      { heading: 'Artifacts', body: 'Demo JSONL examples, safety-check outputs, example weights, and generated release reports.' },
      { heading: 'Frontier proof', body: 'A generated aggregate fixture shows the 240-example Grok 4.3 comparison without committing raw provider secrets or raw prompts.' },
      { heading: 'Verification', body: 'Unit tests, API smoke tests, worker-run checks, database checks, and web verification keep the demo inspectable without requiring buyers to operate the engineering toolchain.' },
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
      { heading: 'CASS', body: 'The underlying method StackCert uses to choose combinations by measuring overlap, brittle atoms, and shared failures where they matter. The old K<=2 interval layer is called old_cass.' }
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
  'ai-platform-teams': {
    eyebrow: 'Customers',
    title: 'AI Platform Teams',
    summary: 'For platform teams, StackCert turns safety-check choice into a repeatable release gate with cost, latency, and retest signals.',
    note: 'The strongest platform pilot starts with one app that already has candidate checks and a release path where pass, warn, or block decisions matter.',
    sections: [
      { heading: 'What you get', body: 'A recommendation dashboard, options compared, targeted test plan, release-gate response, and report artifacts that can be wired into CI/CD or agent deployment workflows.' },
      { heading: 'What you provide', body: 'Workflow scope, current safety options, example IDs, uploaded outputs or endpoints, budget and latency constraints, and a fallback plan for blocked releases.' },
      { heading: 'Why it matters', body: 'The platform team can avoid blanket expensive model calls while still showing reviewers why a safety-check combination is acceptable for a release.' }
    ]
  },
  'safety-engineering-teams': {
    eyebrow: 'Customers',
    title: 'Safety Engineering Teams',
    summary: 'For safety teams, StackCert makes shared misses, disagreement, small-N cells, and residual risk visible before launch.',
    note: 'Safety language should stay scoped: StackCert helps decide among tested combinations; it does not certify universal model behavior.',
    sections: [
      { heading: 'What you get', body: 'Risk-category example mix, overlap analysis, disagreement notes, targeted tests, limitations, and retest triggers tied to model, prompt, tool, policy, or traffic changes.' },
      { heading: 'What you provide', body: 'Risk concerns, representative safe and risky examples, labeling guidance, reviewer availability, and acceptance criteria for the release report.' },
      { heading: 'Why it matters', body: 'A combination can look strong in marginal scores and still miss the same unsafe examples. StackCert focuses review on those decision-changing overlaps.' }
    ]
  },
  'risk-compliance-teams': {
    eyebrow: 'Customers',
    title: 'Risk and Compliance Teams',
    summary: 'For risk and compliance teams, StackCert produces reviewable release evidence with assumptions, limitations, approvals, and audit-friendly artifacts.',
    note: 'Before paid pilots, legal/privacy/security pages still need counsel and vendor-review completion, but the product boundary is explicit.',
    sections: [
      { heading: 'What you get', body: 'Executive summary, scope, dataset summary, options compared, recommendation, limitations, approvals, private artifacts, and release-gate audit signals.' },
      { heading: 'What you provide', body: 'Review criteria, required signoff roles, data handling expectations, retention constraints, and escalation rules for warn or block outcomes.' },
      { heading: 'Why it matters', body: 'The report makes the release decision inspectable across teams without claiming broad safety, legal compliance, or future behavior outside the tested scope.' }
    ]
  },
  security: {
    eyebrow: 'Company',
    title: 'Security',
    summary: 'The design-partner pilot is built around minimal sensitive data, uploaded-output workflows, explicit retention choices, and customer-hosted adapter paths.',
    note: 'Security posture is strongest when customers can use redacted data, private artifacts, scoped auth, and explicit retest boundaries.',
    sections: [
      { heading: 'Data minimization', body: 'Apps can use redacted snippets, hashes-only records, uploaded outputs, or customer-hosted data paths. StackCert does not host customer local models for v1.' },
      { heading: 'Access', body: 'Supabase Auth, row-level security, server-side service role usage, project-scoped tokens, HMAC release webhooks, and redacted connector secrets are part of the architecture.' },
      { heading: 'Operations', body: 'CI, dependency checks, migration linting, Supabase advisors, Cloud Run log alerts, uptime checks, backup rehearsal, and deployment-gate checks are expected release gates.' },
      { heading: 'Customer controls', body: 'A design partner should agree on data mode, retention, deletion/export owner, support contact, and release-report scope before real examples are uploaded.' }
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
      { heading: 'Product data', body: 'The preferred design-partner path stores redacted prompts, hashes, metadata, uploaded safety-check outputs, release context, and release reports rather than raw sensitive conversations.' },
      { heading: 'Account data', body: 'Team, project, auth, billing, support, and activity metadata are used to operate the service and audit release-report workflows.' },
      { heading: 'Retention', body: 'Before a paid pilot, agree on retention, deletion/export owner, and whether examples remain raw, redacted, hashes-only, or customer-hosted.' },
      { heading: 'Provider data', body: 'Uploaded-output pilots avoid sending customer prompts to managed model providers. Managed REST/model-judge runs require explicit connector setup and budget controls.' }
    ]
  },
  procurement: {
    eyebrow: 'Company',
    title: 'Procurement FAQ',
    summary: 'StackCert should be sold as scoped release evidence for one LLM app workflow, with clear data boundaries and integration points.',
    note: 'Formal legal terms still need counsel review. This page keeps the buyer conversation aligned with the current product boundary.',
    sections: [
      { heading: 'What is purchased', body: 'A design-partner pilot that produces a scoped release report and helps wire the decision into the customer release workflow.' },
      { heading: 'What is not purchased', body: 'A universal AI safety certification, hosted arbitrary local model infrastructure, or a guarantee that future traffic is safe.' },
      { heading: 'Data handling', body: 'Customers can start with redacted examples and uploaded outputs, then choose stronger controls such as hashes-only records or customer-hosted evidence paths.' },
      { heading: 'Operational proof', body: 'Before real customer data, StackCert should provide smoke-test results, alert/uptime ids, restore evidence, production Auth email setup, signed terms, and a named support owner.' }
    ]
  },
  support: {
    eyebrow: 'Company',
    title: 'Support',
    summary: 'Design partners need a clear human support path while StackCert is still a guided pilot product.',
    note: 'This is the commercial support posture for early pilots, not a public self-serve SLA.',
    sections: [
      { heading: 'Pilot owner', body: 'Each design partner should have one StackCert owner for onboarding, file import review, report interpretation, release-gate setup, and incident triage.' },
      { heading: 'Response target', body: 'Agree on response windows before launch. For early paid pilots, use business-day support plus urgent escalation for blocked production releases.' },
      { heading: 'Runbook', body: 'Support should be able to inspect project readiness, provider health, job failures, release-report status, and release-gate audit events.' },
      { heading: 'Rollback', body: 'Every release-gate integration should include an agreed fallback: warn-only mode, manual approval, previous report, or disable gate with audit note.' }
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
            <Badge tone="neutral">Current pilot posture</Badge>
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
