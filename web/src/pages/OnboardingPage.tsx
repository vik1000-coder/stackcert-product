import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, ButtonLink, Card, LogoMark } from '../components/Primitives';
import { api } from '../lib/api';

const demoOverviewPath = '/app/ws_demo/proj_acme_copilot/overview';
const demoSetupPath = '/app/ws_demo/proj_acme_copilot/setup';
const demoSignInPath = `/auth/sign-in?next=${encodeURIComponent(demoOverviewPath)}`;
const demoSetupSignInPath = `/auth/sign-in?next=${encodeURIComponent(demoSetupPath)}`;

const roles = [
  { id: 'platform', label: 'AI platform', detail: 'I own LLM app releases, routing, cost, latency, and deploy gates.' },
  { id: 'safety', label: 'Safety', detail: 'I define risky and normal examples, review failures, and decide when to retest.' },
  { id: 'risk', label: 'Risk or GRC', detail: 'I need app-specific evidence, limitations, and signoff records.' }
];

const evidenceModes = [
  { id: 'uploaded_outputs', label: 'Uploaded outputs', detail: 'Start with CSV or JSONL safety-check outputs from an existing test run.' },
  { id: 'connected_guards', label: 'Connected safety options', detail: 'Register REST checks, local Python checks, model judges, or uploaded-output adapters.' },
  { id: 'demo_first', label: 'Demo first', detail: 'Use the seeded Acme Copilot project to learn the workflow before connecting production data.' }
];

const riskTiers = ['standard', 'high', 'critical'] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('platform');
  const [evidenceMode, setEvidenceMode] = useState('uploaded_outputs');
  const [companyName, setCompanyName] = useState('Design Partner Lab');
  const [projectName, setProjectName] = useState('Customer Support Agent');
  const [riskTier, setRiskTier] = useState<(typeof riskTiers)[number]>('high');
  const [dataMode, setDataMode] = useState<'redacted_snippets' | 'hashes_only' | 'customer_hosted'>('redacted_snippets');
  const [status, setStatus] = useState<'idle' | 'saving' | 'created' | 'error'>('idle');
  const [error, setError] = useState('');
  const [createdPath, setCreatedPath] = useState('');

  const readiness = useMemo(() => {
    const items = [
      companyName.trim().length >= 2,
      projectName.trim().length >= 2,
      Boolean(role),
      Boolean(evidenceMode)
    ];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [companyName, evidenceMode, projectName, role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const workspaceResponse = await api.createWorkspace({
        name: companyName.trim(),
        slug: slugify(companyName),
        plan: riskTier === 'critical' ? 'enterprise' : 'team'
      });
      const projectResponse = await api.createProject({
        workspace_id: workspaceResponse.workspace.id,
        name: projectName.trim(),
        slug: slugify(projectName),
        environment: 'production',
        risk_tier: riskTier,
        data_mode: dataMode,
        description: pilotDescription(projectName.trim(), role, evidenceMode, dataMode)
      });
      const path = `/app/${workspaceResponse.workspace.id}/${projectResponse.project.id}/setup`;
      setCreatedPath(path);
      setStatus('created');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Could not create the pilot workspace.');
    }
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
          <ButtonLink to={demoSignInPath}>Open demo</ButtonLink>
        </div>
      </header>

      <main className="marketing-page">
        <div className="landing-container">
          <div className="marketing-page-head">
            <Badge tone="neutral">Pilot setup</Badge>
            <h1 className="section-title" style={{ marginTop: 18, maxWidth: 760 }}>
              Start a StackCert pilot around one LLM app.
            </h1>
            <p className="hero-copy" style={{ margin: '16px 0 0', maxWidth: 760 }}>
              This creates the workspace for a real recommendation flow: app examples, safety options, targeted tests,
              release evidence, and a deployment gate.
            </p>
          </div>

          <form className="onboarding-layout" onSubmit={handleSubmit}>
            <div className="onboarding-main">
              <Card>
                <StepHeader number="01" title="Who is leading the rollout?" />
                <div className="choice-grid">
                  {roles.map((item) => (
                    <button
                      className={`choice-button ${role === item.id ? 'active' : ''}`}
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <StepHeader number="02" title="Which LLM app are we improving?" />
                <div className="form-grid">
                  <label>
                    Company or workspace
                    <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                  </label>
                  <label>
                    App or workflow
                    <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                  </label>
                  <label>
                    Risk tier
                    <select value={riskTier} onChange={(event) => setRiskTier(event.target.value as typeof riskTier)}>
                      {riskTiers.map((tier) => (
                        <option key={tier} value={tier}>
                          {titleCase(tier)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Data handling
                    <select value={dataMode} onChange={(event) => setDataMode(event.target.value as typeof dataMode)}>
                      <option value="redacted_snippets">Redacted snippets</option>
                      <option value="hashes_only">Hashes only</option>
                      <option value="customer_hosted">Customer hosted</option>
                    </select>
                  </label>
                </div>
              </Card>

              <Card>
                <StepHeader number="03" title="How will evidence arrive first?" />
                <div className="choice-grid">
                  {evidenceModes.map((item) => (
                    <button
                      className={`choice-button ${evidenceMode === item.id ? 'active' : ''}`}
                      key={item.id}
                      type="button"
                      onClick={() => setEvidenceMode(item.id)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <aside className="onboarding-side">
              <Card>
                <div className="stat-label">Setup readiness</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 30, fontWeight: 650 }}>
                  {readiness}%
                </div>
                <div className="progress-track" style={{ marginTop: 12 }}>
                  <span style={{ width: `${readiness}%` }} />
                </div>
                <div className="setup-list">
                  <span>Example suite</span>
                  <span>Safety options</span>
                  <span>Cost estimate</span>
                  <span>Release evidence</span>
                </div>
                <button className="btn primary full-width" type="submit" disabled={status === 'saving'}>
                  {status === 'saving' ? 'Creating pilot...' : 'Create pilot workspace'}
                </button>
                <ButtonLink to={demoSetupSignInPath}>Use demo setup</ButtonLink>
                {status === 'created' && createdPath ? (
                  <button className="btn accent full-width" type="button" onClick={() => navigate(createdPath)}>
                    Continue to setup
                  </button>
                ) : null}
                {status === 'error' ? <p className="form-error">{error}</p> : null}
              </Card>
            </aside>
          </form>
        </div>
      </main>
    </div>
  );
}

function StepHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span className="mono" style={{ color: 'var(--sc-accent)', fontSize: 12 }}>
        {number}
      </span>
      <h2 style={{ margin: 0, fontSize: 19 }}>{title}</h2>
    </div>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'stackcert-pilot';
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function pilotDescription(
  projectName: string,
  roleId: string,
  evidenceModeId: string,
  dataMode: 'redacted_snippets' | 'hashes_only' | 'customer_hosted'
) {
  const role = roles.find((item) => item.id === roleId);
  const evidenceMode = evidenceModes.find((item) => item.id === evidenceModeId);
  const dataHandling = dataMode.replaceAll('_', ' ');
  return `${projectName} pilot for comparing safety-check combinations. Starting evidence: ${
    evidenceMode?.label ?? 'Uploaded outputs'
  }. Primary rollout owner: ${role?.label ?? 'AI platform'}. Data handling: ${dataHandling}.`;
}
