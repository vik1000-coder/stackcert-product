import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { LoadingState, LogoMark } from './Primitives';

const routes = [
  { to: 'overview', label: 'Overview' },
  { to: 'ranking', label: 'Stack ranking' },
  { to: 'co-failure', label: 'Co-failure' },
  { to: 'measurements', label: 'Measurements' },
  { to: 'certificate', label: 'Certificate' },
  { to: 'drift', label: 'Drift' },
  { to: 'setup', label: 'Setup' },
  { to: 'projects', label: 'Projects' }
];

export function AppShell({ lambda, onLambdaChange }: { lambda: number; onLambdaChange: (value: number) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = 'proj_acme_copilot' } = useParams();
  const [authReady, setAuthReady] = useState(!supabase);
  const [hasSession, setHasSession] = useState(!supabase);
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.project(projectId),
    enabled: authReady && hasSession
  });
  const projectName = project.data?.project?.name ?? 'Acme Copilot';
  const projectStatus = project.data?.project?.setup_status ?? 'demo_seeded';

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
            {projectStatus === 'demo_seeded' ? 'Seeded production run' : 'Project setup'}
          </div>
          <div className="mono">{projectStatus === 'demo_seeded' ? 'real_main_2000' : projectStatus}</div>
          <div style={{ marginTop: 7 }}>
            {projectStatus === 'demo_seeded' ? 'K=2 serial · 8 guards · 2,000 examples' : 'Add benchmarks, guards, and candidate stacks before certification.'}
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
            <span>Search evidence, stacks, cells</span>
            <span className="mono" style={{ marginLeft: 'auto', color: 'var(--sc-dim)' }}>
              ⌘K
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 240 }}>
            <span className="stat-label">λ</span>
            <input
              aria-label="Lambda safety cost"
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
        <Outlet />
      </main>
    </div>
  );
}
