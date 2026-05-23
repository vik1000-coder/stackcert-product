import { getAccessToken } from './supabase';

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  environment: string;
  risk_tier: string;
  data_mode: string;
  description: string;
  setup_status?: string;
  created_at?: string;
};

export type RunSummary = {
  id: string;
  project_id: string;
  workspace_id: string;
  status: string;
  k: number;
  rho_prior: number;
  lambda_cost: number;
  examples: number;
  guards: number;
  candidate_stacks: number;
  benchmark_cells: number;
  outputs: number;
  certificate_id: string;
  certificate_status: string;
  measurement_actions: number;
};

export type RankingRow = {
  architecture_id: string;
  guard_ids: string[];
  label: string;
  size: number;
  first_order_welfare: number;
  full_welfare: number;
  welfare_low: number;
  welfare_high: number;
  benign_pass: number;
  adversarial_miss: number;
  movement: number;
  status: string;
  estimated_latency_ms: number;
  estimated_cost_usd_per_1k: number;
};

export type OverviewPayload = {
  workspace: Workspace;
  project: Project;
  run: RunSummary;
  certificate: {
    id: string;
    status: string;
    raw_status: string;
    generated_at: string;
    scope: string;
    limitations: string[];
  };
  recommended_stack: RankingRow;
  marginal_stack: RankingRow;
  stats: {
    welfare: number;
    welfare_low: number;
    welfare_high: number;
    regret_avoided: number;
    comparison_count: number;
    certified_comparison_count: number;
    pair_cells_measured: number;
    pair_cells_total: number;
    measurement_cost_usd: number;
    exhaustive_cost_usd: number;
    cost_avoided_usd: number;
  };
  benchmark_mix: Array<{
    cell_id: string;
    side: string;
    source: string;
    weight: number;
    examples: number;
  }>;
  activity: Array<{ kind: string; message: string; tone: string }>;
};

export type RankingPayload = {
  run: RunSummary;
  rows: RankingRow[];
  marginal_winner: RankingRow;
  recommended: RankingRow;
};

export type CorrelationsPayload = {
  run: RunSummary;
  side: string;
  guards: Array<{ id: string; label: string }>;
  matrix: number[][];
  top_rows: PairDetail[];
  details: PairDetail[];
};

export type PairDetail = {
  cell_id: string;
  guard_ids: string[];
  label: string;
  correlation: number;
  metric: number;
  metric_label: string;
  both_pass_rate: number;
  both_block_rate: number;
  disagreement_rate: number;
  n_examples: number;
};

export type MeasurementsPayload = {
  run: RunSummary;
  actions: Array<{
    id: string;
    priority: number;
    action_type: string;
    guard_ids: string[];
    label: string;
    cell_id: string;
    side: string;
    expected_radius_reduction: number;
    cost_agent_cells: number;
    cost_usd: number;
    eta_minutes: number;
    status: string;
  }>;
  summary: {
    action_count: number;
    selected_cost_usd: number;
    selected_eta_minutes: number;
    total_expected_radius_reduction: number;
    budget_fraction: number;
  };
};

export type UsageEvent = {
  id: string;
  project_id: string;
  run_id: string | null;
  job_id: string | null;
  provider: string | null;
  model: string | null;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  duration_ms: number | null;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CostSummaryPayload = {
  project_id: string;
  run_id: string | null;
  summary: {
    events: number;
    request_count: number;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    actual_cost_usd: number;
    currency: string;
  };
  by_provider: Array<{
    provider: string;
    events: number;
    request_count: number;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    actual_cost_usd: number;
  }>;
  events: UsageEvent[];
};

export type CertificatePayload = {
  certificate_id: string;
  run_id: string;
  status: string;
  status_compact: string;
  recommended_label: string;
  certified_label: string | null;
  generated_at: string;
  limitations: string[];
  assumptions: Record<string, unknown>;
  recertification_triggers: string[];
  welfare_estimates: unknown[];
  comparisons: unknown[];
  markdown: string;
};

export type CertificateSignoff = {
  id: string;
  certificate_id: string;
  signer_role: string;
  decision: 'approved' | 'rejected' | 'requested_changes';
  comment: string;
  created_at: string;
};

export type IssuedCertificate = {
  id: string;
  certificate_id: string;
  project_id: string;
  run_id: string;
  status: string;
  selected_stack_label: string;
  scope: string;
  issued_at: string;
  expires_at: string;
  artifact_hash: string;
  limitations: string[];
  summary: Record<string, unknown>;
  signoffs: CertificateSignoff[];
};

export type DriftPayload = {
  project: Project;
  run: RunSummary;
  signals: Array<{
    id: string;
    kind: string;
    severity: string;
    title: string;
    description: string;
    status: string;
  }>;
  history: Array<{ id: string; status: string; run_id: string; summary: string }>;
};

export type CustomBehavior = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  side: string;
  policy_category: string;
  severity: string;
  prompt_hash: string;
  prompt_redacted: string;
  expected_safe_behavior: string;
  unsafe_behavior: string;
  status: string;
  version: string;
  created_at: string;
};

export type CustomBehaviorInput = {
  name: string;
  description: string;
  side: 'adversarial' | 'benign';
  policy_category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  prompt: string;
  expected_safe_behavior: string;
  unsafe_behavior: string;
};

export type CostEstimate = {
  guard_calls: number;
  candidate_stacks: number;
  estimated_full_eval_usd: number;
  estimated_cass_incremental_usd: number;
  estimated_savings_usd: number;
  breakdown: Record<string, number>;
};

export type BenchmarkSuite = {
  id: string;
  db_id?: string;
  project_id: string;
  name: string;
  version: string;
  status: string;
  source: string;
  description?: string;
  license?: string | null;
  created_at?: string;
  artifact?: {
    bucket: string;
    object_path: string;
    content_type: string;
    byte_size: number;
    sha256: string;
  } | null;
  cells: Array<{
    cell_id: string;
    side: string;
    source: string;
    policy_category: string | null;
    weight: number;
    examples: number;
  }>;
};

export type GuardCatalogItem = {
  id: string;
  guard_key?: string;
  label: string;
  display_name?: string;
  name: string;
  type: string;
  guard_type?: string;
  vendor?: string;
  version: string;
  adapter_type?: string;
  latency_ms: number;
  unit_cost_usd: number;
  status: string;
  redaction?: {
    auth_secret_stored: boolean;
    auth_secret_visible: boolean;
  };
};

export type GuardConnectorInput = {
  guard_key: string;
  display_name: string;
  guard_type: 'rest_guard' | 'local_python' | 'model_judge' | 'uploaded_outputs';
  vendor?: string;
  version: string;
  adapter_type: 'rest_guard' | 'local_python' | 'model_judge' | 'uploaded_outputs';
  endpoint_url?: string;
  auth_header_name: string;
  auth_secret?: string;
  threshold?: number;
};

export type CandidateStack = {
  architecture_id: string;
  guard_ids: string[];
  label: string;
  size: number;
  status: string;
  estimated_latency_ms: number;
  estimated_cost_usd_per_1k: number;
};

export type StackCertJob = {
  id: string;
  type: 'evaluation_run' | 'measurement_plan' | string;
  project_id: string;
  run_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  progress: number;
  summary: Record<string, unknown>;
  artifact_preview?: Array<{
    example_id: string;
    guard_id: string;
    guard_label: string;
    binary_pass: boolean;
    block_probability: number;
    error: string | null;
  }>;
  actions?: MeasurementsPayload['actions'];
  next_steps: string[];
};

export type EvaluationJobInput = {
  guard_ids: string[];
  examples_per_cell: number;
  seed: number;
  adapter_mode: 'deterministic_fixture' | 'uploaded_outputs';
  execution_mode?: 'immediate' | 'queued';
};

export type BenchmarkImportPreview = {
  format: 'jsonl' | 'csv';
  status: 'valid' | 'invalid';
  rows_seen: number;
  valid_rows: number;
  issues: Array<{ severity: 'error' | 'warning'; row?: number; code: string; message: string }>;
  summary: {
    by_side: Record<string, number>;
    by_category: Record<string, number>;
    warnings: number;
    errors: number;
  };
  preview: Array<{
    name: string;
    prompt_redacted: string;
    side: string;
    policy_category: string;
    severity: string;
  }>;
};

export type BenchmarkImportCommitInput = {
  format: 'auto' | 'jsonl' | 'csv';
  content: string;
  name: string;
  version?: string;
  description?: string;
  license?: string;
};

export type WorkspaceInput = {
  name: string;
  slug?: string;
  plan: 'starter' | 'team' | 'enterprise';
};

export type ProjectInput = {
  workspace_id: string;
  name: string;
  slug?: string;
  environment: 'development' | 'staging' | 'production';
  risk_tier: 'low' | 'standard' | 'high' | 'critical';
  data_mode: 'raw_allowed' | 'redacted_snippets' | 'hashes_only' | 'customer_hosted';
  description?: string;
};

async function request<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBase}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  workspaces: () => request<{ workspaces: Workspace[] }>('/api/workspaces'),
  createWorkspace: (payload: WorkspaceInput) => post<{ workspace: Workspace }>('/api/workspaces', payload),
  projects: () => request<{ projects: Project[] }>('/api/projects'),
  project: (projectId: string) => request<{ project: Project | null }>(`/api/projects/${projectId}`),
  createProject: ({ workspace_id, ...payload }: ProjectInput) =>
    post<{ project: Project }>(`/api/workspaces/${workspace_id}/projects`, payload),
  overview: (lambda: number) => request<OverviewPayload>(`/api/runs/real_main_2000/overview?lambda_cost=${lambda}`),
  ranking: (lambda: number) => request<RankingPayload>(`/api/runs/real_main_2000/ranking?lambda_cost=${lambda}`),
  correlations: (lambda: number, side: 'adversarial' | 'benign') =>
    request<CorrelationsPayload>(`/api/runs/real_main_2000/correlations?lambda_cost=${lambda}&side=${side}`),
  measurements: (lambda: number) => request<MeasurementsPayload>(`/api/runs/real_main_2000/measurements?lambda_cost=${lambda}`),
  runCosts: () => request<CostSummaryPayload>('/api/runs/real_main_2000/costs'),
  certificate: (lambda: number) => request<CertificatePayload>(`/api/runs/real_main_2000/certificate?lambda_cost=${lambda}`),
  issuedCertificate: (certificateId: string) => request<{ certificate: IssuedCertificate | null }>(`/api/certificates/${certificateId}`),
  issueCertificate: (lambda: number, payload: { acknowledge_limitations: boolean; expires_in_days: number; reviewer_note?: string }) =>
    post<{ certificate: IssuedCertificate }>(`/api/runs/real_main_2000/certificate/issue?lambda_cost=${lambda}`, payload),
  createCertificateSignoff: (
    certificateId: string,
    payload: { signer_role: string; decision: CertificateSignoff['decision']; comment?: string }
  ) => post<{ signoff: CertificateSignoff }>(`/api/certificates/${certificateId}/signoffs`, payload),
  drift: (lambda: number) => request<DriftPayload>(`/api/projects/proj_acme_copilot/drift?lambda_cost=${lambda}`),
  certificateMarkdownUrl: (lambda: number) => `${apiBase}/api/runs/real_main_2000/certificate.md?lambda_cost=${lambda}`,
  certificateJsonUrl: (lambda: number) => `${apiBase}/api/runs/real_main_2000/certificate.json?lambda_cost=${lambda}`,
  rankingCsvUrl: (lambda: number) => `${apiBase}/api/runs/real_main_2000/ranking.csv?lambda_cost=${lambda}`,
  benchmarkSuites: () =>
    request<{ suites: BenchmarkSuite[] }>('/api/projects/proj_acme_copilot/benchmark-suites?lambda_cost=5'),
  previewBenchmarkImport: (payload: { format: 'auto' | 'jsonl' | 'csv'; content: string }) =>
    post<{ project_id: string; import_preview: BenchmarkImportPreview }>('/api/projects/proj_acme_copilot/benchmark-suites/preview', payload),
  createBenchmarkSuite: (payload: BenchmarkImportCommitInput) =>
    post<{ project_id: string; suite: BenchmarkSuite; import_preview: BenchmarkImportPreview }>('/api/projects/proj_acme_copilot/benchmark-suites', payload),
  guards: () => request<{ guards: GuardCatalogItem[] }>('/api/projects/proj_acme_copilot/guards?lambda_cost=5'),
  guardConnectors: () => request<{ connectors: GuardCatalogItem[] }>('/api/projects/proj_acme_copilot/guard-connectors?lambda_cost=5'),
  createGuardConnector: (payload: GuardConnectorInput) =>
    post<{ connector: GuardCatalogItem }>('/api/projects/proj_acme_copilot/guard-connectors', payload),
  stacks: () => request<{ run: RunSummary; stacks: CandidateStack[] }>('/api/projects/proj_acme_copilot/stacks?lambda_cost=5'),
  jobs: () => request<{ jobs: StackCertJob[] }>('/api/projects/proj_acme_copilot/jobs'),
  createEvaluationJob: (payload: EvaluationJobInput) =>
    post<{ job: StackCertJob }>('/api/projects/proj_acme_copilot/evaluation-jobs', payload),
  runNextWorkerJob: () => post<{ job: StackCertJob }>('/api/projects/proj_acme_copilot/workers/run-next', {}),
  createMeasurementPlan: (payload: { action_ids: string[]; max_cost_usd?: number }, lambda: number) =>
    post<{ id: string; job: StackCertJob; status: string; run_id: string; summary: Record<string, unknown>; actions: MeasurementsPayload['actions'] }>(
      `/api/runs/real_main_2000/measurement-plans?lambda_cost=${lambda}`,
      payload
    ),
  customBehaviors: () => request<{ behaviors: CustomBehavior[] }>('/api/projects/proj_acme_copilot/custom-behaviors'),
  createCustomBehavior: (payload: CustomBehaviorInput) =>
    post<{ behavior: CustomBehavior }>('/api/projects/proj_acme_copilot/custom-behaviors', payload),
  estimateCost: (payload: { examples: number; guards: number; candidate_stacks: number }) =>
    post<{ estimate: CostEstimate }>('/api/projects/proj_acme_copilot/costs/estimate', payload)
};
