import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupPage } from './pages/SetupPage';

const mocks = vi.hoisted(() => ({
  benchmarkSuites: vi.fn(),
  guards: vi.fn(),
  stacks: vi.fn(),
  jobs: vi.fn(),
  customBehaviors: vi.fn(),
  pilotReadiness: vi.fn(),
  onboardingProfile: vi.fn(),
  estimateCost: vi.fn()
}));

vi.mock('./lib/appContext', () => ({
  useStackCertApp: () => ({
    workspaceId: 'ws_pilot',
    projectId: 'proj_pilot',
    activeRunId: undefined,
    runsLoading: false,
    runs: []
  })
}));

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api');
  return {
    ...actual,
    api: {
      benchmarkSuites: mocks.benchmarkSuites,
      guards: mocks.guards,
      stacks: mocks.stacks,
      jobs: mocks.jobs,
      customBehaviors: mocks.customBehaviors,
      pilotReadiness: mocks.pilotReadiness,
      onboardingProfile: mocks.onboardingProfile,
      estimateCost: mocks.estimateCost,
      createCustomBehavior: vi.fn(),
      createEvaluationJob: vi.fn(),
      runNextWorkerJob: vi.fn(),
      retryJob: vi.fn(),
      previewProjectBenchmarkImport: vi.fn(),
      previewTraceImport: vi.fn(),
      previewUploadedOutputRun: vi.fn(),
      createBenchmarkSuite: vi.fn(),
      commitTraceImport: vi.fn(),
      createGuardConnector: vi.fn(),
      createUploadedOutputRun: vi.fn()
    }
  };
});

describe('first-pilot clarity surfaces', () => {
  beforeEach(() => {
    mocks.benchmarkSuites.mockResolvedValue({
      suites: [
        {
          id: 'suite_1',
          name: 'Pilot app example suite',
          version: 'v1',
          source: 'custom_import',
          status: 'ready',
          cells: [{ cell_id: 'adversarial/tool_misuse', side: 'adversarial', weight: 1, examples: 2 }]
        }
      ]
    });
    mocks.guards.mockResolvedValue({
      guards: [
        { id: 'refund_guard', guard_key: 'refund_guard', label: 'Refund policy check', type: 'rest_guard', status: 'active', version: 'v1' },
        { id: 'pii_guard', guard_key: 'pii_guard', label: 'PII check', type: 'uploaded_outputs', status: 'active', version: 'v1' }
      ]
    });
    mocks.stacks.mockResolvedValue({
      run: null,
      stacks: [{ architecture_id: 'refund+pii', label: 'Refund + PII', estimated_latency_ms: 80, estimated_cost_usd_per_1k: 0.12 }]
    });
    mocks.jobs.mockResolvedValue({ jobs: [] });
    mocks.customBehaviors.mockResolvedValue({ behaviors: [] });
    mocks.pilotReadiness.mockResolvedValue({
      readiness: {
        project_id: 'proj_pilot',
        workspace_id: 'ws_pilot',
        status: 'needs_evidence_run',
        progress: { completed: 3, total: 5, percent: 0.6 },
        next_step: {
          id: 'evidence_run',
          label: 'Create the first test run',
          status: 'active',
          description: 'Run checks or upload outputs so every option is comparable.',
          action_label: 'Run or upload outputs',
          action_href: 'setup#run-evidence',
          blockers: []
        },
        stages: [
          {
            id: 'project',
            label: 'Create the app record',
            status: 'complete',
            description: 'The workspace and LLM app are in StackCert.',
            action_label: 'Open app setup',
            action_href: 'setup',
            details: {},
            blockers: [],
            counts_as_progress: true
          }
        ],
        summary: {
          project_name: 'Pilot App',
          suites: 1,
          examples: 2,
          suite_cells: 1,
          safety_options: 2,
          connector_records: 2,
          runs: 0
        },
        trust_boundary: {
          not_a_guarantee: true,
          plain_language: 'A StackCert release report can reduce release risk for this app and this test scope; it cannot guarantee broad model safety.',
          can_claim: [],
          cannot_claim: [],
          recertification_required_on: []
        }
      }
    });
    mocks.onboardingProfile.mockResolvedValue({
      profile: {
        workspace_id: 'ws_pilot',
        project_id: 'proj_pilot',
        role: 'platform',
        evidence_mode: 'uploaded_outputs',
        app_category: 'customer_support',
        deployment_stage: 'pre_production',
        optimization_goal: 'balanced',
        primary_risk_concerns: ['tool_misuse'],
        release_gate_target: 'not_yet',
        budget_range: 'under_100',
        lambda_cost: 5,
        first_setup_focus: 'setup#run-evidence'
      }
    });
    mocks.estimateCost.mockResolvedValue({
      estimate: {
        estimated_full_eval_usd: 12,
        estimated_cass_incremental_usd: 3,
        estimated_savings_usd: 9
      }
    });
  });

  it('leads setup with the first-pilot path before advanced connector controls', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/app/ws_pilot/proj_pilot/setup']}>
        <QueryClientProvider client={queryClient}>
          <SetupPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Path to the first release report/i)).toBeInTheDocument();
    expect(screen.getByText(/Use uploaded outputs for the fastest pilot/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Import app examples/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Preview output coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Review recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/Advanced connectors and workers/i)).toBeInTheDocument();

    const pageText = document.body.textContent ?? '';
    expect(pageText.indexOf('Use uploaded outputs for the fastest pilot')).toBeLessThan(
      pageText.indexOf('Advanced connectors and workers')
    );
  });

  it('fills the xAI Grok 4.3 model-judge preset without exposing a secret', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/app/ws_pilot/proj_pilot/setup']}>
        <QueryClientProvider client={queryClient}>
          <SetupPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /Use xAI Grok 4\.3 judge preset/i }));

    expect(screen.getByLabelText(/Option key/i)).toHaveValue('grok_4_3_judge');
    expect(screen.getByLabelText(/Display name/i)).toHaveValue('xAI Grok 4.3 Judge');
    expect(screen.getByLabelText(/Vendor/i)).toHaveValue('xAI');
    expect(screen.getByLabelText(/Endpoint URL/i)).toHaveValue('https://api.x.ai/v1/chat/completions');
    expect(screen.getByLabelText(/Model/i)).toHaveValue('grok-4.3');
    expect(screen.getByLabelText(/Secret env var/i)).toHaveValue('XAI_API_KEY');
    expect(screen.getByLabelText(/Auth secret/i)).toHaveValue('');
  });
});
