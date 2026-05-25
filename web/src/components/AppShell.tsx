import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { StackCertAppContext } from '../lib/appContext';
import { supabase } from '../lib/supabase';
import { LoadingState, LogoMark } from './Primitives';

const routes = [
  { to: 'overview', label: 'Recommendation' },
  { to: 'ranking', label: 'Options compared' },
  { to: 'co-failure', label: 'Overlap analysis' },
  { to: 'measurements', label: 'Test plan and cost' },
  { to: 'certificate', label: 'Release evidence' },
  { to: 'drift', label: 'When to retest' },
  { to: 'setup', label: 'App setup' },
  { to: 'projects', label: 'Apps' },
  { to: 'admin', label: 'Admin' }
];

export function AppShell({ lambda, onLambdaChange }: { lambda: number; onLambdaChange: (value: number) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { workspaceId = 'ws_demo', projectId = 'proj_acme_copilot' } = useParams();
  const [authReady, setAuthReady] = useState(!supabase);
  const [hasSession, setHasSession] = useState(!supabase);
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.project(projectId),
    enabled: authReady && hasSession
  });
  const runs = useQuery({
    queryKey: ['project-runs', projectId, lambda],
    queryFn: () => api.projectRuns(projectId, lambda),
    enabled: authReady && hasSession
  });
  const onboardingProfile = useQuery({
    queryKey: ['onboarding-profile', projectId],
    queryFn: () => api.onboardingProfile(projectId),
    enabled: authReady && hasSession && projectId !== 'proj_acme_copilot',
    retry: false
  });
  const projectName = project.data?.project?.name ?? 'Acme Copilot';
  const projectStatus = project.data?.project?.setup_status ?? 'demo_seeded';
  const runParam = searchParams.get('run') || undefined;
  const activeRun = runs.data?.runs.find((run) => run.id === runParam) ?? runs.data?.runs[0];
  const activeRunId = activeRun?.id;
  const context: StackCertAppContext = {
    workspaceId,
    projectId,
    activeRunId,
    runsLoading: runs.isLoading,
    runs: runs.data?.runs ?? []
  };
  const [profileLambdaApplied, setProfileLambdaApplied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < routes.length) {
        navigate(routes[index].to);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    if (!supabase) return;

    const redirectToSignIn = () => {
      const next = `${location.pathname}${location.search}`;
      navigate(`/auth/sign-in?next=${encodeURIComponent(next)}`, { replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const signedIn = Boolean(data.session);
      setHasSession(signedIn);
      setAuthReady(true);
      if (!signedIn) redirectToSignIn();
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const signedIn = Boolean(session);
      setHasSession(signedIn);
      setAuthReady(true);
      if (!signedIn) redirectToSignIn();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (profileLambdaApplied || !onboardingProfile.data) return;
    const nextLambda = Math.round(onboardingProfile.data.profile.lambda_cost);
    if (nextLambda >= 1 && nextLambda <= 10) {
      onLambdaChange(nextLambda);
    }
    setProfileLambdaApplied(true);
  }, [onLambdaChange, onboardingProfile.data, profileLambdaApplied]);

  if (!authReady || !hasSession) return <LoadingState />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="sidebar-brand">
          <LogoMark />
          <div>
            <div style={{ fontWeight: 650, fontSize: 15 }}>StackCert</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {projectName}
            </div>
          </div>
        </NavLink>
        <div className="notice">
          <div style={{ color: 'var(--sc-ink)', fontWeight: 600, marginBottom: 4 }}>
            {projectStatus === 'demo_seeded' ? 'Demo sandbox: sample data' : activeRun ? 'Pilot evidence run' : 'App setup'}
          </div>
          <div className="mono">{activeRun?.id ?? projectStatus}</div>
          <div style={{ marginTop: 7 }}>
            {activeRun
              ? `${activeRun.guards} safety options · ${activeRun.candidate_stacks} combinations · ${activeRun.examples.toLocaleString()} examples`
              : 'Add examples, safety options, and uploaded outputs before review.'}
            {projectStatus === 'demo_seeded' ? (
              <div style={{ marginTop: 7 }}>This is not connected to beta customer data.</div>
            ) : null}
          </div>
        </div>
        <nav className="nav-list" aria-label="StackCert app navigation">
          {routes.map((route, index) => (
            <NavLink key={route.to} to={route.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-glyph" />
              <span>{route.label}</span>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--sc-dim)' }}>
                {index + 1}
              </span>
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <div className="stat-label">Risk profile</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {['Safety', 'Balanced', 'UX'].map((item) => (
              <span key={item} className="chip" style={{ background: item === 'Safety' ? 'var(--sc-accent-soft)' : undefined }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </aside>
      <main className="app-main">
        <div className="topbar">
          <div className="search-box">
            <span>Search examples, options, evidence</span>
            <span className="mono" style={{ marginLeft: 'auto', color: 'var(--sc-dim)' }}>
              ⌘K
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 240 }}>
            <span className="stat-label">Risk weight</span>
            <input
              aria-label="Risk weight"
              type="range"
              min="1"
              max="10"
              step="1"
              value={lambda}
              onChange={(event) => onLambdaChange(Number(event.currentTarget.value))}
              style={{ flex: 1 }}
            />
            <span className="mono" style={{ width: 24, fontSize: 12 }}>
              {lambda}
            </span>
          </label>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span className="chip">Security</span>
            <span className="chip">Platform</span>
            <span className="chip">Risk</span>
          </div>
        </div>
        <Outlet context={context} />
      </main>
    </div>
  );
}
