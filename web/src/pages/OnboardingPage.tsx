import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  api,
  type OnboardingAppCategory,
  type OnboardingBudgetRange,
  type OnboardingDeploymentStage,
  type OnboardingEvidenceMode,
  type OnboardingOptimizationGoal,
  type OnboardingReleaseGateTarget,
  type OnboardingRole,
  type ProjectOnboardingProfileInput
} from '../lib/api';
import { FirstReportJourney } from '../components/FirstReportJourney';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';
import { isDemoEmail } from '../lib/authFlow';
import { supabase } from '../lib/supabase';

const demoPath = '/demo';
const demoSetupPathLink = '/demo?next=setup';
const draftKey = 'stackcert:onboarding-draft:v2';

type OnboardingDraft = {
  companyName: string;
  projectName: string;
  riskTier: 'standard' | 'high' | 'critical';
  dataMode: 'redacted_snippets' | 'hashes_only' | 'customer_hosted' | 'raw_allowed';
  role: OnboardingRole;
  evidenceMode: OnboardingEvidenceMode;
  appCategory: OnboardingAppCategory;
  deploymentStage: OnboardingDeploymentStage;
  optimizationGoal: OnboardingOptimizationGoal;
  primaryRiskConcerns: string[];
  releaseGateTarget: OnboardingReleaseGateTarget;
  budgetRange: OnboardingBudgetRange;
};

const initialDraft: OnboardingDraft = {
  companyName: '',
  projectName: '',
  riskTier: 'high',
  dataMode: 'redacted_snippets',
  role: 'platform',
  evidenceMode: 'uploaded_outputs',
  appCategory: 'customer_support',
  deploymentStage: 'pre_production',
  optimizationGoal: 'balanced',
  primaryRiskConcerns: [],
  releaseGateTarget: 'not_yet',
  budgetRange: 'under_100'
};

const steps = [
  { id: 'scope', title: 'Scope', subtitle: 'Name the app and deployment surface.' },
  { id: 'risks', title: 'Risks', subtitle: 'Capture who owns review and what failures matter.' },
  { id: 'evidence', title: 'Starting data', subtitle: 'Choose what StackCert should use first.' },
  { id: 'objective', title: 'Objective', subtitle: 'Set the first release goal preference.' },
  { id: 'review', title: 'Review', subtitle: 'Create the pilot and open the right setup task.' }
] as const;

const roles: Array<{ id: OnboardingRole; label: string; detail: string }> = [
  { id: 'platform', label: 'AI platform', detail: 'Owns release gates, routing, cost, latency, and worker setup.' },
  { id: 'safety', label: 'Safety', detail: 'Defines risky examples, reviews failures, and decides when to retest.' },
  { id: 'risk', label: 'Risk or GRC', detail: 'Needs scoped reports, limitations, signoffs, and audit history.' },
  { id: 'mixed', label: 'Mixed team', detail: 'A shared pilot with platform, safety, and reviewer handoffs.' }
];

const evidenceModes: Array<{ id: OnboardingEvidenceMode; label: string; detail: string; next: string }> = [
  {
    id: 'uploaded_outputs',
    label: 'Uploaded outputs',
    detail: 'Start from CSV or JSONL outputs your checks already produced.',
    next: 'Import examples, then upload safety-check outputs.'
  },
  {
    id: 'connected_guards',
    label: 'REST or local checks',
    detail: 'Register managed safety-check connectors before a worker run.',
    next: 'Open the connector registry and save at least two options.'
  },
  {
    id: 'model_judge',
    label: 'Model judge',
    detail: 'Use an OpenAI-compatible or local judge to review examples.',
    next: 'Configure model, instructions, threshold, and secret reference.'
  },
  {
    id: 'trace_import',
    label: 'Trace import',
    detail: 'Transform LangSmith, Langfuse, OpenTelemetry, or JSONL traces into reviewable examples.',
    next: 'Create a reviewed example suite before the first test run.'
  },
  {
    id: 'demo_first',
    label: 'Demo first',
    detail: 'Walk through the sample support-copilot project before creating a release report for your app.',
    next: 'Open the demo walkthrough, then return to your saved draft.'
  }
];

const appCategories: Array<{ id: OnboardingAppCategory; label: string }> = [
  { id: 'customer_support', label: 'Customer support' },
  { id: 'internal_agent', label: 'Internal agent' },
  { id: 'research_copilot', label: 'Research copilot' },
  { id: 'code_assistant', label: 'Code assistant' },
  { id: 'workflow_automation', label: 'Workflow automation' },
  { id: 'other', label: 'Other' }
];

const deploymentStages: Array<{ id: OnboardingDeploymentStage; label: string; detail: string }> = [
  { id: 'exploration', label: 'Exploration', detail: 'Learning which checks might fit.' },
  { id: 'pre_production', label: 'Pre-production', detail: 'Preparing a release report before a launch or policy change.' },
  { id: 'production_monitoring', label: 'Production monitoring', detail: 'Retesting a live app as behavior drifts.' }
];

const riskConcerns = [
  { id: 'tool_misuse', label: 'Unauthorized tool use' },
  { id: 'data_leakage', label: 'Sensitive data leakage' },
  { id: 'prompt_injection', label: 'Prompt injection' },
  { id: 'regulated_advice', label: 'Regulated advice' },
  { id: 'policy_evasion', label: 'Policy evasion' },
  { id: 'benign_friction', label: 'Blocking normal users' }
];

const optimizationGoals: Array<{ id: OnboardingOptimizationGoal; label: string; detail: string; lambda: number }> = [
  { id: 'balanced', label: 'Balanced', detail: 'Treat safety, usefulness, latency, and cost as a first pilot mix.', lambda: 5 },
  { id: 'safety_risk', label: 'Safety risk', detail: 'Prefer safer combinations even when they cost more.', lambda: 8 },
  { id: 'cost', label: 'Cost', detail: 'Keep measurement and runtime spend low while still checking overlap.', lambda: 3 },
  { id: 'latency', label: 'Latency', detail: 'Favor options that are realistic for interactive workflows.', lambda: 4 },
  { id: 'user_friction', label: 'User friction', detail: 'Watch for normal users being blocked by too many checks.', lambda: 5 }
];

const releaseGateTargets: Array<{ id: OnboardingReleaseGateTarget; label: string }> = [
  { id: 'github_actions', label: 'GitHub Actions' },
  { id: 'gitlab', label: 'GitLab CI' },
  { id: 'circleci', label: 'CircleCI' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'mcp_agent', label: 'Agent or MCP workflow' },
  { id: 'not_yet', label: 'Not yet' }
];

const budgetRanges: Array<{ id: OnboardingBudgetRange; label: string }> = [
  { id: 'under_25', label: 'Under $25' },
  { id: 'under_100', label: 'Under $100' },
  { id: 'under_500', label: 'Under $500' },
  { id: 'custom_later', label: 'Set later' }
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => loadDraft());
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');
  const [authState, setAuthState] = useState<'checking' | 'none' | 'demo' | 'beta'>(supabase ? 'checking' : 'none');

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setAuthState('none');
      return;
    }

    const applySessionEmail = (email: string | null | undefined) => {
      if (!mounted) return;
      if (!email) {
        setAuthState('none');
        return;
      }
      setAuthState(isDemoEmail(email) ? 'demo' : 'beta');
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        applySessionEmail(data.session?.user.email);
      })
      .catch(() => {
        applySessionEmail(null);
      });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySessionEmail(session?.user.email);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('resume')) {
      setDraft(loadDraft());
    }
  }, [location.search]);

  const activeStep = steps[stepIndex];
  const profile = profileFromDraft(draft);
  const selectedEvidence = evidenceModes.find((item) => item.id === draft.evidenceMode) ?? evidenceModes[0];
  const selectedGoal = optimizationGoals.find((item) => item.id === draft.optimizationGoal) ?? optimizationGoals[0];
  const readiness = useMemo(() => setupReadiness(draft), [draft]);
  const canContinue = canContinueStep(stepIndex, draft);
  const isDemoSession = authState === 'demo';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDemoSession) {
      setStatus('error');
      setError('Sign out of the sample walkthrough before creating a real pilot.');
      return;
    }
    if (stepIndex < steps.length - 1) {
      if (canContinue) setStepIndex((current) => current + 1);
      return;
    }
    setStatus('saving');
    setError('');
    try {
      const response = await api.createOnboardingPilot({
        workspace: {
          name: draft.companyName.trim(),
          slug: slugify(draft.companyName),
          plan: draft.riskTier === 'critical' ? 'enterprise' : 'team'
        },
        project: {
          name: draft.projectName.trim(),
          slug: slugify(draft.projectName),
          environment: draft.deploymentStage === 'exploration' ? 'staging' : 'production',
          risk_tier: draft.riskTier,
          data_mode: draft.dataMode,
          description: pilotDescription(draft)
        },
        profile
      });
      clearDraft();
      navigate(nextSetupPath(response.workspace.id, response.project.id, response.profile.first_setup_focus));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not create the pilot project.';
      if (isAuthError(message)) {
        saveDraft(draft);
        navigate(`/auth/sign-in?next=${encodeURIComponent('/onboarding?resume=1')}`);
        return;
      }
      setStatus('error');
      setError(message);
    }
  }

  async function signOutDemoSession() {
    setStatus('saving');
    setError('');
    try {
      await supabase?.auth.signOut();
      setAuthState('none');
      setStatus('idle');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Could not sign out of the sample walkthrough.');
    }
  }

  function update<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleRisk(riskId: string) {
    setDraft((current) => {
      const exists = current.primaryRiskConcerns.includes(riskId);
      const next = exists
        ? current.primaryRiskConcerns.filter((item) => item !== riskId)
        : [...current.primaryRiskConcerns, riskId].slice(0, 8);
      return { ...current, primaryRiskConcerns: next };
    });
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-container marketing-nav">
          <Link to="/" className="sidebar-brand">
            <LogoMark size={22} />
            <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
          </Link>
          <div style={{ flex: 1 }} />
          <ButtonLink to={demoPath}>Open demo</ButtonLink>
        </div>
      </header>

      <main className="marketing-page">
        <div className="landing-container">
          <div className="marketing-page-head onboarding-head">
            <Badge tone="neutral">Pilot builder</Badge>
            <h1 className="section-title">Set up a real pilot for one LLM app.</h1>
            <p className="hero-copy">
              A pilot is an isolated project for your app. StackCert uses it to compare safety checks and create a
              release report: what was tested, what is recommended, what is out of scope, and when to retest.
            </p>
          </div>
          <FirstReportJourney
            title="What this pilot will produce"
            intro="You are creating the private version of the sample walkthrough: your app, your examples, your safety options, and a scoped release report for one release decision."
          />
          <Card>
            <div className="onboarding-auth-boundary">
              <Badge tone="neutral">Private pilot boundary</Badge>
              <h2>First release report path</h2>
              <p>
                Demo data cannot become a real pilot. The sample walkthrough stays isolated; a private pilot starts
                from your app, your examples, and your safety options so the release report can support your actual
                release decision.
              </p>
            </div>
          </Card>

          {authState === 'checking' ? (
            <Card>
              <div className="onboarding-auth-boundary">
                <Badge tone="neutral">Checking session</Badge>
                <h2>Preparing your pilot setup.</h2>
                <p className="muted">StackCert is checking whether this browser is signed in to the sample walkthrough or a real pilot account.</p>
              </div>
            </Card>
          ) : isDemoSession ? (
            <DemoSessionBoundary status={status} error={error} onSignOut={signOutDemoSession} />
          ) : (
            <form className="onboarding-layout" onSubmit={handleSubmit}>
              <div className="onboarding-main">
                <Card>
                  <div className="onboarding-step-kicker">
                    <span className="mono">0{stepIndex + 1}</span>
                    <span>{activeStep.title}</span>
                  </div>
                  <h2 className="onboarding-step-title">{activeStep.subtitle}</h2>
                  {activeStep.id === 'scope' ? (
                    <ScopeStep draft={draft} update={update} />
                  ) : activeStep.id === 'risks' ? (
                    <RiskStep draft={draft} update={update} toggleRisk={toggleRisk} />
                  ) : activeStep.id === 'evidence' ? (
                    <EvidenceStep draft={draft} update={update} />
                  ) : activeStep.id === 'objective' ? (
                    <ObjectiveStep draft={draft} update={update} />
                  ) : (
                    <ReviewStep draft={draft} selectedEvidence={selectedEvidence} selectedGoal={selectedGoal} />
                  )}
                </Card>

                <div className="onboarding-actions">
                  <button
                    className="btn"
                    type="button"
                    disabled={stepIndex === 0 || status === 'saving'}
                    onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  >
                    Back
                  </button>
                  <div style={{ flex: 1 }} />
                  {draft.evidenceMode === 'demo_first' && activeStep.id === 'review' ? (
                    <ButtonLink to={demoSetupPathLink} variant="primary">
                      Open demo walkthrough
                    </ButtonLink>
                  ) : null}
                  <button className="btn primary" type="submit" disabled={!canContinue || status === 'saving'}>
                    {status === 'saving'
                      ? 'Creating pilot...'
                      : activeStep.id === 'review'
                        ? draft.evidenceMode === 'demo_first'
                          ? 'Create private pilot anyway'
                          : 'Create private pilot'
                        : 'Continue'}
                  </button>
                </div>
                {status === 'error' ? <p className="form-error">{error}</p> : null}
              </div>

              <aside className="onboarding-side">
                <Card>
                  <div className="stat-label">Draft completeness</div>
                  <div className="mono onboarding-readiness">{readiness}%</div>
                  <div className="progress-track" style={{ marginTop: 12 }}>
                    <span style={{ width: `${readiness}%` }} />
                  </div>
                  <div className="onboarding-progress-list">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        className={`onboarding-progress-item ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'complete' : ''}`}
                        onClick={() => {
                          if (index <= stepIndex || canContinueStep(stepIndex, draft)) setStepIndex(index);
                        }}
                      >
                        <span className="pilot-step-marker" aria-hidden="true" />
                        <span>
                          <strong>{step.title}</strong>
                          <small>{step.subtitle}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="onboarding-plan-card">
                    <Badge tone={draft.riskTier === 'critical' ? 'bad' : draft.riskTier === 'high' ? 'warn' : 'neutral'}>
                      {titleCase(draft.riskTier)} risk
                    </Badge>
                    <p>
                      Next setup task: <strong>{selectedEvidence.next}</strong>
                    </p>
                    <p className="muted">
                      StackCert will produce a release report for this app and test mix; it cannot guarantee
                      broad model safety.
                    </p>
                  </div>
                </Card>
              </aside>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function DemoSessionBoundary({
  status,
  error,
  onSignOut
}: {
  status: 'idle' | 'saving' | 'error';
  error: string;
  onSignOut: () => void;
}) {
  return (
    <Card>
      <div className="onboarding-auth-boundary">
        <Badge tone="warn">Demo session active</Badge>
        <h2>Sign out of the sample walkthrough before starting a real pilot.</h2>
        <p>
          The sample walkthrough account only opens sample support-copilot data. A real pilot creates an isolated project for your
          app, examples, safety options, and release reports.
        </p>
        <p className="muted">
          Your pilot draft is saved in this browser while you switch out of the sample walkthrough.
        </p>
        <div className="onboarding-auth-actions">
          <button className="btn primary" type="button" disabled={status === 'saving'} onClick={onSignOut}>
            {status === 'saving' ? 'Signing out...' : 'Sign out of sample walkthrough'}
          </button>
          <ButtonLink to={demoPath}>Return to demo</ButtonLink>
        </div>
        {status === 'error' ? <p className="form-error">{error}</p> : null}
      </div>
    </Card>
  );
}

function ScopeStep({ draft, update }: { draft: OnboardingDraft; update: UpdateDraft }) {
  return (
    <div className="onboarding-step-body">
      <div className="form-grid">
        <label>
          Company or team
          <input
            placeholder="e.g. Acme Support"
            value={draft.companyName}
            onChange={(event) => update('companyName', event.currentTarget.value)}
          />
        </label>
        <label>
          LLM app or workflow
          <input
            placeholder="e.g. customer support agent"
            value={draft.projectName}
            onChange={(event) => update('projectName', event.currentTarget.value)}
          />
        </label>
        <label>
          App category
          <select value={draft.appCategory} onChange={(event) => update('appCategory', event.currentTarget.value as OnboardingAppCategory)}>
            {appCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data handling
          <select value={draft.dataMode} onChange={(event) => update('dataMode', event.currentTarget.value as OnboardingDraft['dataMode'])}>
            <option value="redacted_snippets">Redacted snippets</option>
            <option value="hashes_only">Hashes only</option>
            <option value="customer_hosted">Customer hosted</option>
            <option value="raw_allowed">Raw allowed</option>
          </select>
        </label>
      </div>
      <div className="choice-grid onboarding-choice-grid">
        {deploymentStages.map((item) => (
          <button
            className={`choice-button ${draft.deploymentStage === item.id ? 'active' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={draft.deploymentStage === item.id}
            onClick={() => update('deploymentStage', item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>
      <div className="segmented-row" role="group" aria-label="Risk tier">
        {(['standard', 'high', 'critical'] as const).map((tier) => (
          <button
            className={`btn ${draft.riskTier === tier ? 'accent' : ''}`}
            key={tier}
            type="button"
            aria-pressed={draft.riskTier === tier}
            onClick={() => update('riskTier', tier)}
          >
            {titleCase(tier)}
          </button>
        ))}
      </div>
    </div>
  );
}

function RiskStep({ draft, update, toggleRisk }: { draft: OnboardingDraft; update: UpdateDraft; toggleRisk: (riskId: string) => void }) {
  return (
    <div className="onboarding-step-body">
      <div className="choice-grid onboarding-choice-grid four">
        {roles.map((item) => (
          <button
            className={`choice-button ${draft.role === item.id ? 'active' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={draft.role === item.id}
            onClick={() => update('role', item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>
      <div>
        <div className="stat-label" style={{ marginBottom: 10 }}>Primary concerns</div>
        <div className="onboarding-chip-grid">
          {riskConcerns.map((item) => (
            <button
              className={`chip-button ${draft.primaryRiskConcerns.includes(item.id) ? 'active' : ''}`}
              key={item.id}
              type="button"
              aria-pressed={draft.primaryRiskConcerns.includes(item.id)}
              onClick={() => toggleRisk(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceStep({ draft, update }: { draft: OnboardingDraft; update: UpdateDraft }) {
  return (
    <div className="choice-grid onboarding-choice-grid evidence">
      {evidenceModes.map((item) => (
        <button
          className={`choice-button ${draft.evidenceMode === item.id ? 'active' : ''}`}
          key={item.id}
          type="button"
          aria-pressed={draft.evidenceMode === item.id}
          onClick={() => update('evidenceMode', item.id)}
        >
          <strong>{item.label}</strong>
          <span>{item.detail}</span>
          <em>{item.next}</em>
        </button>
      ))}
    </div>
  );
}

function ObjectiveStep({ draft, update }: { draft: OnboardingDraft; update: UpdateDraft }) {
  const selectedGoal = optimizationGoals.find((item) => item.id === draft.optimizationGoal) ?? optimizationGoals[0];
  return (
    <div className="onboarding-step-body">
      <div className="choice-grid onboarding-choice-grid">
        {optimizationGoals.map((item) => (
          <button
            className={`choice-button ${draft.optimizationGoal === item.id ? 'active' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={draft.optimizationGoal === item.id}
            onClick={() => update('optimizationGoal', item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>
      <div className="onboarding-objective-grid">
        <div className="onboarding-inline-panel">
          <div className="stat-label">Release goal weighting</div>
          <div className="mono onboarding-readiness">{selectedGoal.lambda}</div>
          <p className="muted">
            This seeds the first recommendation. Users can still adjust the underlying risk weight in the workbench.
          </p>
        </div>
        <div className="onboarding-inline-panel">
          <div className="stat-label">Provider budget posture</div>
          <div className="segmented-row wrap">
            {budgetRanges.map((item) => (
              <button
                className={`btn ${draft.budgetRange === item.id ? 'accent' : ''}`}
                key={item.id}
                type="button"
                aria-pressed={draft.budgetRange === item.id}
                onClick={() => update('budgetRange', item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="stat-label" style={{ marginBottom: 10 }}>First release-gate target</div>
        <div className="segmented-row wrap">
          {releaseGateTargets.map((item) => (
            <button
              className={`btn ${draft.releaseGateTarget === item.id ? 'accent' : ''}`}
              key={item.id}
              type="button"
              aria-pressed={draft.releaseGateTarget === item.id}
              onClick={() => update('releaseGateTarget', item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  draft,
  selectedEvidence,
  selectedGoal
}: {
  draft: OnboardingDraft;
  selectedEvidence: (typeof evidenceModes)[number];
  selectedGoal: (typeof optimizationGoals)[number];
}) {
  const rows = [
    ['Team', draft.companyName],
    ['App', draft.projectName],
    ['Starting data', selectedEvidence.label],
    ['Release goal', `${selectedGoal.label} / weighting ${selectedGoal.lambda}`],
    ['Release gate', releaseGateTargets.find((item) => item.id === draft.releaseGateTarget)?.label ?? 'Not yet'],
    ['Data handling', titleCase(draft.dataMode.replaceAll('_', ' '))]
  ];
  return (
    <div className="onboarding-review">
      <div className="onboarding-review-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="stat-label">{label}</div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="notice">
        <strong>First release-report path</strong>
        <p style={{ margin: '6px 0 0' }}>
          {selectedEvidence.next} Then StackCert can compare safety-check combinations, show cost/latency tradeoffs,
          issue a release report, and give your CI or agent workflow a release-gate response.
        </p>
      </div>
      <div className="notice warn">
        A StackCert release report reduces release risk for the committed app scope. It is not a guarantee that the
        model is safe everywhere or that untested prompts, tools, policies, retrieval changes, or traffic shifts are
        covered.
      </div>
    </div>
  );
}

type UpdateDraft = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;

function profileFromDraft(draft: OnboardingDraft): ProjectOnboardingProfileInput {
  const goal = optimizationGoals.find((item) => item.id === draft.optimizationGoal) ?? optimizationGoals[0];
  return {
    role: draft.role,
    evidence_mode: draft.evidenceMode,
    app_category: draft.appCategory,
    deployment_stage: draft.deploymentStage,
    optimization_goal: draft.optimizationGoal,
    primary_risk_concerns: draft.primaryRiskConcerns,
    release_gate_target: draft.releaseGateTarget,
    budget_range: draft.budgetRange,
    lambda_cost: goal.lambda
  };
}

function setupReadiness(draft: OnboardingDraft) {
  const scopeReady = draft.companyName.trim().length >= 2 && draft.projectName.trim().length >= 2;
  const risksReady = Boolean(draft.role) && draft.primaryRiskConcerns.length > 0;
  const evidenceReady = Boolean(draft.evidenceMode);
  const objectiveReady = Boolean(draft.optimizationGoal) && Boolean(draft.budgetRange);
  const items = [
    scopeReady,
    risksReady,
    evidenceReady,
    objectiveReady,
    scopeReady && risksReady && evidenceReady && objectiveReady
  ];
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

function canContinueStep(stepIndex: number, draft: OnboardingDraft) {
  if (stepIndex === 0) return draft.companyName.trim().length >= 2 && draft.projectName.trim().length >= 2;
  if (stepIndex === 1) return Boolean(draft.role) && draft.primaryRiskConcerns.length > 0;
  if (stepIndex === 2) return Boolean(draft.evidenceMode);
  if (stepIndex === 3) return Boolean(draft.optimizationGoal) && Boolean(draft.budgetRange);
  return true;
}

function nextSetupPath(workspaceId: string, projectId: string, focus: string) {
  if (focus === 'overview') return `/app/${workspaceId}/${projectId}/overview`;
  if (focus === 'certificate') return `/app/${workspaceId}/${projectId}/certificate`;
  if (focus.startsWith('setup#')) return `/app/${workspaceId}/${projectId}/${focus}`;
  return `/app/${workspaceId}/${projectId}/setup`;
}

function pilotDescription(draft: OnboardingDraft) {
  const evidenceMode = evidenceModes.find((item) => item.id === draft.evidenceMode);
  const goal = optimizationGoals.find((item) => item.id === draft.optimizationGoal);
  return `${draft.projectName.trim()} pilot for comparing safety-check combinations. Starting data: ${
    evidenceMode?.label ?? 'Uploaded outputs'
  }. Primary rollout owner: ${draft.role}. Objective: ${goal?.label ?? 'Balanced'}. Data handling: ${draft.dataMode.replaceAll('_', ' ')}.`;
}

function loadDraft(): OnboardingDraft {
  try {
    const raw = window.localStorage?.getItem(draftKey);
    if (!raw) return initialDraft;
    return { ...initialDraft, ...JSON.parse(raw) };
  } catch {
    return initialDraft;
  }
}

function saveDraft(draft: OnboardingDraft) {
  try {
    window.localStorage?.setItem(draftKey, JSON.stringify(draft));
  } catch {
    return;
  }
}

function clearDraft() {
  try {
    window.localStorage?.removeItem(draftKey);
  } catch {
    return;
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'stackcert-pilot';
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function isAuthError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('authentication required') || normalized.includes('missing auth token') || normalized.includes('401');
}
