import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { authDestination } from './lib/authFlow';

const footerLinkedRoutes = [
  { path: '/why-stackcert', heading: /Why StackCert/i, staticPage: true },
  { path: '/how-it-works', heading: /How It Works/i, staticPage: true },
  { path: '/pricing', heading: /Pricing/i, staticPage: true },
  { path: '/changelog', heading: /Changelog/i, staticPage: true },
  { path: '/status', heading: /Status/i, staticPage: true },
  { path: '/docs', heading: /Documentation/i, staticPage: true },
  { path: '/integrations', heading: /Integrations/i, staticPage: true },
  { path: '/pilot-readiness', heading: /Pilot Readiness/i, staticPage: true },
  { path: '/proof', heading: /Same release decision without always calling Grok/i },
  { path: '/methodology-paper', heading: /Methodology Paper/i, staticPage: true },
  { path: '/replication-kit', heading: /Replication Kit/i, staticPage: true },
  { path: '/blog', heading: /Evidence-backed safety decisions/i },
  { path: '/glossary', heading: /Glossary/i, staticPage: true },
  { path: '/about', heading: /About StackCert/i, staticPage: true },
  { path: '/customers', heading: /Customers/i, staticPage: true },
  { path: '/security', heading: /Security/i, staticPage: true },
  { path: '/procurement', heading: /Procurement FAQ/i, staticPage: true },
  { path: '/support', heading: /Support/i, staticPage: true },
  { path: '/careers', heading: /Careers/i, staticPage: true },
  { path: '/press', heading: /Press/i, staticPage: true },
  { path: '/privacy', heading: /Privacy/i, staticPage: true },
  { path: '/terms', heading: /Terms of Service/i, staticPage: true },
  { path: '/soc-2', heading: /SOC 2/i, staticPage: true },
  { path: '/dpa', heading: /Data Processing Addendum/i, staticPage: true },
  { path: '/subprocessors', heading: /Subprocessors/i, staticPage: true },
];

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

  it('renders pilot sign-in by default instead of prefilled demo credentials', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/auth/sign-in']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Sign in to your pilot account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to pilot/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(screen.getByText(/Create a pilot account/i)).toBeInTheDocument();
  });

  it('keeps the sample demo behind an explicit sandbox flow', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Preview the first release-report path with safe sample data/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Sample walkthrough/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/What the walkthrough teaches/i)).toBeInTheDocument();
    expect(screen.getByText(/Release question/i)).toBeInTheDocument();
    expect(screen.getByText(/Targeted tests/i)).toBeInTheDocument();
    expect(screen.getByText(/Retest boundary/i)).toBeInTheDocument();
    expect(screen.getByText(/What you will see/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommendation preview/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Demo data is intentionally isolated/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue to sample walkthrough/i })).toHaveAttribute(
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

    expect(screen.getByText(/Open the isolated sample demo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toHaveValue('demo@stackcert.dev');
    expect(screen.getByRole('button', { name: /Open sample walkthrough/i })).toBeInTheDocument();
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

    expect(screen.getByText(/Set up a real pilot/i)).toBeInTheDocument();
    expect(screen.getByText(/What this pilot will produce/i)).toBeInTheDocument();
    expect(screen.getByText(/private version of the sample walkthrough/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Name the app and deployment surface/i })).toBeInTheDocument();
    expect(screen.getByText(/Draft completeness/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company or team/i)).toHaveValue('');
    expect(screen.getByLabelText(/LLM app or workflow/i)).toHaveValue('');
  });

  it.each(footerLinkedRoutes)('renders $path with clear page content and a footer', ({ path, heading, staticPage }) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    if (staticPage) {
      expect(screen.getByText(/Current pilot posture/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Ready to try the workflow/i })).toBeInTheDocument();
    }
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: /Privacy/i })).toHaveAttribute('href', '/privacy');
    expect(within(footer).getByRole('link', { name: /Terms/i })).toHaveAttribute('href', '/terms');
  });

  it('renders the blog index and full empirical article route', () => {
    render(
      <MemoryRouter initialEntries={['/blog']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Evidence-backed safety decisions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /A 2,000 Example Test/i })).toHaveAttribute(
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
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the frontier proof page with concrete Grok comparison data', () => {
    render(
      <MemoryRouter initialEntries={['/proof']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Same release decision without always calling Grok/i })).toBeInTheDocument();
    expect(screen.getByText(/240-example support-copilot safety task/i)).toBeInTheDocument();
    expect(screen.getAllByText(/xAI Grok 4\.3 judge/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/StackCert local pair/i)).toBeInTheDocument();
    expect(screen.getByText(/The best local model still underperforms alone/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Any selected check can veto/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Task-specific slices show when combinations matter/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/If Grok wins, StackCert should say so/i)).toBeInTheDocument();
    expect(screen.getByText(/Bring your own benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/Toxic chat moderation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Benchmark cells used/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Redacted example inputs and outputs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prompts are summarized to avoid publishing harmful instructions/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/StrongREJECT jailbreak prompts/i)).toBeInTheDocument();
    expect(screen.getByText(/Run the fixture path or spend provider budget intentionally/i)).toBeInTheDocument();
  });
});
