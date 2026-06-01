import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderHealthPanel } from './pages/AdminPage';
import type { AdminOverview } from './lib/api';

function providerHealth(overrides: Partial<AdminOverview['provider_health']> = {}): AdminOverview['provider_health'] {
  return {
    status: 'idle',
    providers: [],
    summary: {
      providers: 0,
      retry_count: 0,
      rate_limit_failures: 0,
      timeout_failures: 0,
      dead_letter_count: 0,
      actual_cost_usd: 0
    },
    ...overrides
  };
}

describe('provider health panel', () => {
  it('renders the empty uploaded-output-first state', () => {
    render(<ProviderHealthPanel providerHealth={providerHealth()} />);

    expect(screen.getByRole('heading', { name: /Provider health/i })).toBeInTheDocument();
    expect(screen.getByText(/No managed provider runs yet/i)).toBeInTheDocument();
    expect(screen.getByText(/does not host customer models/i)).toBeInTheDocument();
  });

  it('renders healthy, retrying, and dead-letter provider states', () => {
    render(
      <ProviderHealthPanel
        providerHealth={providerHealth({
          status: 'attention',
          summary: {
            providers: 3,
            retry_count: 2,
            rate_limit_failures: 1,
            timeout_failures: 1,
            dead_letter_count: 1,
            actual_cost_usd: 0.42
          },
          providers: [
            {
              provider: 'uploaded_outputs',
              status: 'healthy',
              events: 1,
              request_count: 8,
              actual_cost_usd: 0,
              retry_count: 0,
              rate_limit_failures: 0,
              timeout_failures: 0,
              failed_jobs: 0,
              dead_letter_count: 0,
              running_jobs: 0
            },
            {
              provider: 'rest_guard',
              status: 'retrying',
              events: 2,
              request_count: 10,
              actual_cost_usd: 0.17,
              retry_count: 2,
              rate_limit_failures: 1,
              timeout_failures: 0,
              failed_jobs: 0,
              dead_letter_count: 0,
              running_jobs: 0,
              latest_error_class: 'rate_limited',
              latest_error: 'Provider returned 429'
            },
            {
              provider: 'model_judge',
              status: 'dead_letter',
              events: 1,
              request_count: 4,
              actual_cost_usd: 0.25,
              retry_count: 0,
              rate_limit_failures: 0,
              timeout_failures: 1,
              failed_jobs: 1,
              dead_letter_count: 1,
              running_jobs: 0,
              latest_error_class: 'timeout',
              latest_error: 'Bearer secret-token should be hidden'
            }
          ]
        })}
      />
    );

    expect(screen.getByText('uploaded_outputs')).toBeInTheDocument();
    expect(screen.getByText('rest_guard')).toBeInTheDocument();
    expect(screen.getByText('model_judge')).toBeInTheDocument();
    expect(screen.getByText(/retrying/i)).toBeInTheDocument();
    expect(screen.getAllByText(/dead letter/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Bearer \[redacted\]/i)).toBeInTheDocument();
  });
});
