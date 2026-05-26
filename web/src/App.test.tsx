import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { authDestination } from './lib/authFlow';

describe('StackCert app', () => {
  it('renders the landing page value proposition', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Choose the right.*safety checks.*for your LLM app/i })).toBeInTheDocument();
    expect(screen.getByText(/An LLM app has many safety options/i)).toBeInTheDocument();
    expect(screen.getByText(/Choosing the combination is the hard part/i)).toBeInTheDocument();
    expect(screen.getByText(/What teams often do instead/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View support-copilot demo/i })).toHaveAttribute(
      'href',
      '/demo'
    );
  });

  it('renders beta sign-in by default instead of prefilled demo credentials', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/auth/sign-in']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Sign in to your beta workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to beta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(screen.getByText(/Create a beta workspace account/i)).toBeInTheDocument();
  });

  it('keeps the seeded demo behind an explicit sandbox flow', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Explore StackCert without mixing it with a beta workspace/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Demo sandbox/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Continue to demo sandbox/i })).toHaveAttribute(
      'href',
      '/auth/sign-in?flow=demo&next=%2Fapp%2Fws_demo%2Fproj_acme_copilot%2Foverview'
    );
  });

  it('prefills credentials only for the explicit demo auth flow', () => {
    render(
      <MemoryRouter initialEntries={['/auth/sign-in?flow=demo&next=%2Fapp%2Fws_demo%2Fproj_acme_copilot%2Foverview']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Open the isolated seeded demo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toHaveValue('demo@stackcert.dev');
    expect(screen.getByRole('button', { name: /Open demo sandbox/i })).toBeInTheDocument();
  });

  it('keeps demo and beta auth destinations separated and normalizes stale demo routes', () => {
    expect(authDestination(null, 'demo')).toBe('/app/ws_demo/proj_acme_copilot/overview');
    expect(authDestination('/app/ws_demo/proj_acme_copilot/setup', 'demo')).toBe('/app/ws_demo/proj_acme_copilot/setup');
    expect(authDestination('/app/ws_demo/proj_acme_copilot/overview?run=latest', 'demo')).toBe(
      '/app/ws_demo/proj_acme_copilot/overview?run=latest'
    );
    expect(authDestination('/app/ws_demo/proj_acme_copilot/scorecards', 'demo')).toBe(
      '/app/ws_demo/proj_acme_copilot/overview'
    );
    expect(authDestination('/onboarding?resume=1', 'beta')).toBe('/onboarding?resume=1');
    expect(authDestination('/app/ws_demo/proj_acme_copilot/overview', 'beta')).toBe('/onboarding?resume=1');
  });

  it('renders onboarding flow shell', () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Create the first evidence packet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Name the app and deployment surface/i })).toBeInTheDocument();
    expect(screen.getByText(/Draft completeness/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company or workspace/i)).toHaveValue('');
    expect(screen.getByLabelText(/LLM app or workflow/i)).toHaveValue('');
  });

  it('renders footer helper pages from marketing links', () => {
    render(
      <MemoryRouter initialEntries={['/terms']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/does not guarantee outcomes/i)).toBeInTheDocument();
  });

  it('renders the blog index and full empirical article route', () => {
    render(
      <MemoryRouter initialEntries={['/blog']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Evidence-backed safety decisions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /A 2,000-Example Test/i })).toHaveAttribute(
      'href',
      '/blog/two-thousand-example-test'
    );
  });

  it('renders blog post figures and scoped limitations', () => {
    render(
      <MemoryRouter initialEntries={['/blog/two-thousand-example-test']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /When Marginal Selection Fails/i })).toBeInTheDocument();
    expect(screen.getByAltText(/Finite oracle gap/i)).toHaveAttribute(
      'src',
      '/blog/figures/fig01_finite_oracle_gap.svg'
    );
    expect(screen.getByText(/What this does not prove/i)).toBeInTheDocument();
  });
});
