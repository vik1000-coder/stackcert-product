import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ButtonLink, Card, LogoMark } from '../components/Primitives';
import { supabase } from '../lib/supabase';

const fallbackDemoPath = '/app/ws_demo/proj_acme_copilot/overview';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('demo@stackcert.dev');
  const [password, setPassword] = useState('stackcert-demo');
  const [message, setMessage] = useState<string | null>(null);
  const destination = useMemo(() => {
    const next = new URLSearchParams(location.search).get('next');
    return next?.startsWith('/app/') ? next : fallbackDemoPath;
  }, [location.search]);
  const isDemoDestination = destination.includes('/proj_acme_copilot/overview');

  useEffect(() => {
    let mounted = true;
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) {
        navigate(destination, { replace: true });
      }
    });
    return () => {
      mounted = false;
    };
  }, [destination, navigate]);

  async function submitAuth() {
    setMessage(null);
    if (!supabase) {
      navigate(destination);
      return;
    }

    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                product: 'stackcert'
              }
            }
          });

    const { data, error } = result;
    if (error) {
      setMessage(error.message);
      return;
    }
    if (mode === 'sign-up' && !data.session) {
      setMessage('Account created. Check your email to confirm, then sign in.');
      return;
    }
    navigate(destination);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--sc-bg)', padding: 20 }}>
      <Card>
        <div style={{ width: 360, maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
            <LogoMark />
            <div>
              <div style={{ fontWeight: 650 }}>StackCert</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {mode === 'sign-in' && isDemoDestination
                  ? 'Continue with the seeded demo account'
                  : mode === 'sign-in'
                    ? 'Sign in to the certification workbench'
                    : 'Create a certification workspace'}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <button className={`btn ${mode === 'sign-in' ? 'accent' : ''}`} onClick={() => setMode('sign-in')}>
              Sign in
            </button>
            <button className={`btn ${mode === 'sign-up' ? 'accent' : ''}`} onClick={() => setMode('sign-up')}>
              Create account
            </button>
          </div>
          <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <span className="stat-label">Email</span>
            <input className="btn" value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
          </label>
          <label style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
            <span className="stat-label">Password</span>
            <input className="btn" type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
          </label>
          {message ? <div className="notice" style={{ marginBottom: 12 }}>{message}</div> : null}
          <button className="btn primary" style={{ width: '100%' }} onClick={submitAuth}>
            {mode === 'sign-in' && isDemoDestination ? 'Continue to demo' : mode === 'sign-in' ? 'Continue' : 'Create account'}
          </button>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {isDemoDestination
              ? 'The demo account is prefilled. In local mode, Continue opens the seeded project without a Supabase session.'
              : 'The hosted demo uses Supabase Auth. Without Supabase env vars, this route opens the seeded local project.'}
          </p>
          <ButtonLink to="/">Back to landing</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
