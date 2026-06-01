import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn()
}));

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signOut: authMocks.signOut
    }
  },
  getAccessToken: vi.fn()
}));

describe('Onboarding auth boundary', () => {
  beforeEach(() => {
    window.localStorage?.clear();
    authMocks.getSession.mockReset();
    authMocks.onAuthStateChange.mockReset();
    authMocks.signOut.mockReset();
    authMocks.unsubscribe.mockReset();
    authMocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: authMocks.unsubscribe
        }
      }
    });
  });

  it('blocks real-pilot onboarding while the demo sandbox session is active', async () => {
    const user = userEvent.setup();
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'demo@stackcert.dev'
          }
        }
      }
    });
    authMocks.signOut.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Demo session active/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign out of the sample walkthrough before starting a real pilot/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Name the app and deployment surface/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Sign out of sample walkthrough/i }));

    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: /Name the app and deployment surface/i })).toBeInTheDocument();
  });

  it('renders a blank real-pilot draft for non-demo sessions', async () => {
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'pilot@example.com'
          }
        }
      }
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Name the app and deployment surface/i })).toBeInTheDocument();
    expect(screen.getByText(/Draft completeness/i)).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByLabelText(/Company or team/i)).toHaveValue('');
    expect(screen.getByLabelText(/LLM app or workflow/i)).toHaveValue('');
  });
});
