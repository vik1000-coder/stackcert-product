import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

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
      '/auth/sign-in?next=%2Fapp%2Fws_demo%2Fproj_acme_copilot%2Foverview'
    );
  });

  it('renders local demo sign-in when auth route is opened', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/auth/sign-in']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Continue with the seeded demo account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to demo/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(screen.getByText(/Create an LLM app workspace/i)).toBeInTheDocument();
  });

  it('renders onboarding flow shell', () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Start a StackCert pilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Who is leading the rollout/i)).toBeInTheDocument();
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
