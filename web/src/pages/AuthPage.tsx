import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ButtonLink, Card, LogoMark } from '../components/Primitives';
import { authDestination, demoEmail, demoPassword, isDemoEmail } from '../lib/authFlow';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const flow = search.get('flow') === 'demo' ? 'demo' : 'beta';
  const isDemoFlow = flow === 'demo';
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(search.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in');
  const [email, setEmail] = useState(isDemoFlow ? demoEmail : '');
  const [password, setPassword] = useState(isDemoFlow ? demoPassword : '');
  const [message, setMessage] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const destination = useMemo(() => {
    return authDestination(search.get('next'), flow);
  }, [flow, search]);
  const signedInAsDemo = sessionEmail ? isDemoEmail(sessionEmail) : false;
  const sessionFlowMismatch = Boolean(sessionEmail) && (isDemoFlow ? !signedInAsDemo : signedInAsDemo);

  useEffect(() => {
    if (isDemoFlow) {
      setMode('sign-in');
      setEmail(demoEmail);
      setPassword(demoPassword);
    } else if (email === demoEmail && password === demoPassword) {
      setEmail('');
      setPassword('');
    }
  }, [isDemoFlow]);

  useEffect(() => {
    let mounted = true;
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const activeEmail = data.session?.user.email ?? null;
      setSessionEmail(activeEmail);
      if (!activeEmail) return;
      const activeIsDemo = isDemoEmail(activeEmail);
      if (isDemoFlow && !activeIsDemo) {
        setMessage('You are signed in to a private pilot account. Sign out to open the sample demo sandbox.');
        return;
      }
      if (!isDemoFlow && activeIsDemo) {
        setMessage('You are signed in with the demo sandbox account. Sign out before creating or testing a real pilot.');
        return;
      }
      if (data.session) {
        navigate(destination, { replace: true });
      }
    });
    return () => {
      mounted = false;
    };
  }, [destination, isDemoFlow, navigate]);

  async function signOutCurrentSession() {
    setMessage(null);
    if (!supabase) return;
    await supabase.auth.signOut();
    setSessionEmail(null);
    if (isDemoFlow) {
      setEmail(demoEmail);
      setPassword(demoPassword);
      setMessage('Signed out of the private pilot account. Continue with the demo sandbox account.');
    } else {
      setEmail('');
      setPassword('');
      setMessage('Signed out of the demo sandbox. Continue with your pilot account.');
    }
  }

  async function submitAuth(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage(null);
    if (!supabase) {
      navigate(destination);
      return;
    }
    if (sessionFlowMismatch) {
      setMessage(
        isDemoFlow
          ? 'Sign out of the private pilot account before opening the demo sandbox.'
          : 'Sign out of the demo sandbox before using a real pilot.'
      );
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
    <div className="auth-page">
      <Card>
        <div className="auth-card">
          <div className="auth-brand">
            <LogoMark />
            <div>
              <div style={{ fontWeight: 650 }}>StackCert</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {isDemoFlow
                  ? 'Open the isolated sample demo'
                  : mode === 'sign-in'
                    ? 'Sign in to your pilot account'
                    : 'Create a pilot account'}
              </div>
            </div>
          </div>
          {isDemoFlow ? (
            <div className="notice auth-context">
              <strong>Demo sandbox</strong>
              <span>
                This opens sample support-copilot data only. It does not create a pilot, upload your data, or
                represent your agent.
              </span>
            </div>
          ) : (
            <div className="auth-tabs">
              <button className={`btn ${mode === 'sign-in' ? 'accent' : ''}`} onClick={() => setMode('sign-in')}>
                Sign in
              </button>
              <button className={`btn ${mode === 'sign-up' ? 'accent' : ''}`} onClick={() => setMode('sign-up')}>
                Create account
              </button>
            </div>
          )}
          <form onSubmit={submitAuth}>
            <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              <span className="stat-label">Email</span>
              <input
                className="btn"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
              <span className="stat-label">Password</span>
              <input
                className="btn"
                type="password"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
            </label>
            {message ? <div className="notice" style={{ marginBottom: 12 }}>{message}</div> : null}
            <button className="btn primary" style={{ width: '100%' }} type="submit">
              {isDemoFlow ? 'Open demo sandbox' : mode === 'sign-in' ? 'Continue to pilot' : 'Create pilot account'}
            </button>
          </form>
          {sessionFlowMismatch ? (
            <button className="btn" style={{ width: '100%', marginTop: 10 }} type="button" onClick={signOutCurrentSession}>
              Sign out of {signedInAsDemo ? 'demo sandbox' : 'private pilot account'}
            </button>
          ) : null}
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {isDemoFlow
              ? 'The demo account is prefilled and intentionally separate from real pilot accounts.'
              : 'Use this path for your own app data and setup. To inspect sample data, open the separate demo sandbox.'}
          </p>
          <div className="auth-links">
            <ButtonLink to="/">Back to landing</ButtonLink>
            {isDemoFlow ? <ButtonLink to="/onboarding">Start real pilot</ButtonLink> : <ButtonLink to="/demo">View demo sandbox</ButtonLink>}
          </div>
        </div>
      </Card>
    </div>
  );
}
