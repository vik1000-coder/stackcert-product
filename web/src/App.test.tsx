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

    expect(screen.getByText(/Certify the/i)).toBeInTheDocument();
    expect(screen.getAllByText(/guardrail stack/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Correlation-Aware Stack Selection/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/What is CASS/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the demo/i })).toHaveAttribute(
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

    expect(screen.getByText(/Sign in to the certification workbench/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(screen.getByText(/Create a certification workspace/i)).toBeInTheDocument();
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
});
