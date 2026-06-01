import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificatePage } from './pages/CertificatePage';
import { CorrelationsPage } from './pages/CorrelationsPage';
import { RankingPage } from './pages/RankingPage';

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  ranking: vi.fn(),
  rankingCsvUrl: vi.fn(),
  correlations: vi.fn(),
  certificate: vi.fn(),
  certificateReadiness: vi.fn(),
  issuedCertificateForRun: vi.fn(),
  issueCertificate: vi.fn(),
  certificateArtifactSignedUrl: vi.fn(),
  verifyCertificateArtifact: vi.fn(),
  createCertificateSignoff: vi.fn()
}));

vi.mock('./lib/appContext', async () => {
  const actual = await vi.importActual<typeof import('./lib/appContext')>('./lib/appContext');
  return {
    ...actual,
    useStackCertApp: mocks.context
  };
});

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      ranking: mocks.ranking,
      rankingCsvUrl: mocks.rankingCsvUrl,
      correlations: mocks.correlations,
      certificate: mocks.certificate,
      certificateReadiness: mocks.certificateReadiness,
      issuedCertificateForRun: mocks.issuedCertificateForRun,
      issueCertificate: mocks.issueCertificate,
      certificateArtifactSignedUrl: mocks.certificateArtifactSignedUrl,
      verifyCertificateArtifact: mocks.verifyCertificateArtifact,
      createCertificateSignoff: mocks.createCertificateSignoff
    }
  };
});

describe('workflow polish regressions', () => {
  beforeEach(() => {
    mocks.context.mockReturnValue({
      workspaceId: 'ws_private',
      projectId: 'proj_private',
      projectName: 'Private Pilot',
      projectStatus: 'evidence_ready',
      activeRunId: 'run_private',
      runsLoading: false,
      runs: []
    });
    mocks.rankingCsvUrl.mockReturnValue('/ranking.csv');
    mocks.ranking.mockResolvedValue({
      rows: [
        {
          architecture_id: 'guard_a',
          label: 'Refund guard',
          status: 'certified',
          first_order_welfare: 0.1,
          full_welfare: 0.12,
          welfare_low: 0.08,
          welfare_high: 0.14,
          movement: 0.02,
          estimated_latency_ms: 80,
          estimated_cost_usd_per_1k: 0.12
        }
      ]
    });
    mocks.certificate.mockResolvedValue(certificatePayload());
    mocks.certificateReadiness.mockResolvedValue({
      readiness: { status: 'ready', can_issue: true, checks: [], blockers: [], warnings: [] }
    });
    mocks.issuedCertificateForRun.mockResolvedValue({ certificate: null });
    mocks.issueCertificate.mockResolvedValue({
      certificate: {
        certificate_id: 'cert_private',
        issued_at: '2026-06-01T10:00:00Z',
        expires_at: '2026-07-01T10:00:00Z',
        artifact_hash: 'abc123',
        artifacts: [],
        artifact_refs: [],
        signoffs: []
      }
    });
  });

  it('uses private project text on the options page', async () => {
    renderWithQuery(<RankingPage lambda={5} />);

    expect(await screen.findByText(/Private Pilot could ship/i)).toBeInTheDocument();
    expect(screen.queryByText(/Acme could ship/i)).not.toBeInTheDocument();
  });

  it.each([
    { metric: 0.8, disagreement: 0.1, n: 40, copy: /often share the same unsafe misses/i },
    { metric: 0.1, disagreement: 0.7, n: 40, copy: /often disagree here/i },
    { metric: 0, disagreement: 0, n: 40, copy: /No shared unsafe misses or disagreement/i },
    { metric: 0.2, disagreement: 0.1, n: 3, copy: /Only 3 examples are in this cell/i }
  ])('explains overlap from actual values %#', async ({ metric, disagreement, n, copy }) => {
    mocks.correlations.mockResolvedValue(correlationPayload(metric, disagreement, n));
    renderWithQuery(<CorrelationsPage lambda={5} />);

    expect(await screen.findByText(copy)).toBeInTheDocument();
  });

  it('renders release context fields and disables issue after issuance', async () => {
    const user = userEvent.setup();
    renderWithQuery(<CertificatePage lambda={5} />);

    expect(await screen.findByText(/support-copilot/i)).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Issue release report/i }));

    expect(await screen.findByRole('button', { name: /Release report issued/i })).toBeDisabled();
  });
});

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

function correlationPayload(metric: number, disagreement_rate: number, n_examples: number) {
  const row = {
    label: 'Refund guard + PII check',
    guard_ids: ['refund_guard', 'pii_check'],
    cell_id: 'adversarial/tool_misuse',
    correlation: metric,
    metric,
    metric_label: 'co-miss',
    disagreement_rate,
    n_examples
  };
  return {
    guards: [
      { id: 'refund_guard', label: 'Refund' },
      { id: 'pii_check', label: 'PII' }
    ],
    matrix: [
      [1, metric],
      [metric, 1]
    ],
    top_rows: [row],
    details: [row]
  };
}

function certificatePayload() {
  return {
    certificate_id: 'cert_private',
    run_id: 'run_private',
    status_compact: 'certified',
    certified_label: 'Refund guard',
    recommended_label: 'Refund guard',
    generated_at: '2026-06-01T10:00:00Z',
    assumptions: {
      certificate_scope: 'finite benchmark mixture',
      release_context: {
        model_id: 'support-copilot',
        prompt_hash: 'prompt-v1'
      },
      use_feasible_bounds: true
    },
    limitations: ['Scoped to this app.'],
    recertification_triggers: ['Model change']
  };
}
