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
  created_at?: string;
  completed_at?: string;
  source?: string;
  release_context?: Record<string, unknown>;
};

export type SamplePilot = {
  id: 'customer_support' | 'internal_assistant' | 'agentic_workflow' | string;
  name: string;
  description: string;
  risk_concerns: string[];
  examples: number;
  safety_options: number;
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

export type RunExample = {
  example_id: string;
  input: string;
  output?: string | null;
  expected_decision: 'pass' | 'block' | string;
  risk_category: string;
  risk_category_label: string;
  severity: string;
  weight: number;
  source: string;
  metadata: Record<string, unknown>;
  checks: Array<{
    guard_id: string;
    guard_label: string;
    decision: string;
    confidence: number;
    reason?: string | null;
    latency_ms?: number | null;
    cost?: number | null;
    error?: string | null;
  }>;
  final_decision: string;
  final_reason: string;
  affected_recommendation: boolean;
  recommendation_failure: boolean;
};

export type RunExamplesPayload = {
  run: RunSummary;
  combination_rule: string;
  recommended_guard_ids: string[];
  examples: RunExample[];
  summary: { examples: number; failures: number; affected_recommendation: number };
};

export type RunFailureCluster = {
  id: string;
  title: string;
  count: number;
  severity: string;
  risk_categories?: Record<string, number>;
  example_ids?: string[];
  examples: RunExample[];
};

export type RunFailuresPayload = {
  run: RunSummary;
  clusters: RunFailureCluster[];
  summary: { cluster_count: number; total_flagged_examples: number; blocking_cluster_count?: number };
};

export type RunStabilityPayload = {
  run: RunSummary;
  recommended: RankingRow;
  stability_pct: number;
  checks: Record<string, string | number>;
  guardrails: Array<{ code: string; message: string }>;
  summary: {
    examples: number;
    benign_examples: number;
    unsafe_examples: number;
    certified_comparisons: number;
    comparison_count: number;
  };
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

export type EvidenceReadiness = {
  run_id: string;
  status: 'ready' | 'warning' | 'blocked';
  can_issue: boolean;
  blockers: Array<{ code: string; message: string; details: Record<string, unknown> }>;
  warnings: Array<{ code: string; message: string; details: Record<string, unknown> }>;
  checks: Array<{ id: string; label: string; status: 'passed' | 'warning' | 'blocked'; message: string }>;
};

export type CertificateSignoff = {
  id: string;
  certificate_id: string;
  signer_role: string;
  decision: 'approved' | 'rejected' | 'requested_changes';
  comment: string;
  created_at: string;
};

export type EvidenceArtifact = {
  bucket: string;
  object_path: string;
  artifact_type: string;
  content_type: string;
  byte_size: number;
  sha256: string;
  metadata?: Record<string, unknown>;
};

export type EvidenceArtifactSignedUrl = EvidenceArtifact & {
  signed_url: string;
  expires_in_seconds: number;
};

export type EvidenceArtifactVerification = EvidenceArtifact & {
  expected_sha256: string;
  actual_sha256: string;
  verified: boolean;
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
  packet_snapshot?: Record<string, unknown>;
  artifact_refs?: EvidenceArtifact[];
  artifacts?: EvidenceArtifact[];
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

export type RecertificationResponse = {
  project_id: string;
  job_id: string;
  status: string;
  message: string;
};

export type PilotReadinessStage = {
  id: string;
  label: string;
  status: 'complete' | 'active' | 'blocked' | 'warning' | 'pending' | string;
  description: string;
  action_label: string;
  action_href: string;
  details: Record<string, unknown>;
  blockers: string[];
  counts_as_progress: boolean;
};

export type PilotReadinessPayload = {
  project_id: string;
  workspace_id: string;
  status: string;
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
  next_step: Pick<PilotReadinessStage, 'id' | 'label' | 'status' | 'description' | 'action_label' | 'action_href' | 'blockers'>;
  stages: PilotReadinessStage[];
  summary: {
    project_name: string;
    setup_status?: string;
    suites: number;
    examples: number;
    suite_cells: number;
    safety_options: number;
    connector_records: number;
    runs: number;
    latest_run_id?: string | null;
    latest_certificate_status?: string | null;
  };
  trust_boundary: {
    not_a_guarantee: boolean;
    plain_language: string;
    can_claim: string[];
    cannot_claim: string[];
    recertification_required_on: string[];
  };
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
  source_metadata?: Record<string, unknown>;
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
  price_card?: {
    request_price_usd: number;
    input_price_per_1m_tokens_usd: number;
    output_price_per_1m_tokens_usd: number;
    currency: string;
    billing_unit: string;
  };
  status: string;
  redaction?: {
    auth_secret_stored: boolean;
    auth_secret_visible: boolean;
  };
  config?: Record<string, unknown>;
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
  secret_env_var?: string;
  model?: string;
  provider_format?: 'openai_chat' | 'ollama_chat' | 'direct_json';
  system_prompt?: string;
  timeout_sec?: number;
  request_price_usd?: number;
  input_price_per_1m_tokens_usd?: number;
  output_price_per_1m_tokens_usd?: number;
  threshold?: number;
  rate_limit_per_minute?: number;
  retry_max_attempts?: number;
  retry_backoff_base_seconds?: number;
  decision_mapping?: Record<string, string>;
  max_concurrency?: number;
  temperature?: number;
  max_tokens?: number;
  decision_schema?: string;
};

export type GuardConnectorTestCall = {
  connector_id: string;
  guard_id: string;
  adapter_type: string;
  status: 'passed' | 'failed' | 'not_required' | string;
  message: string;
  request_preview: Record<string, unknown>;
  expected_response: Record<string, unknown>;
  decision_mapping: Record<string, string>;
  live?: boolean;
  last_test?: {
    status: string;
    tested_at: string;
    expires_at: string;
    normalized_decision: string;
    latency_ms: number;
    error_class?: string | null;
    redacted_response_preview?: Record<string, unknown>;
  } | null;
  issues: Array<{ code: string; message: string }>;
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
  run_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  attempts?: number;
  max_attempts?: number;
  lease_expires_at?: string | null;
  locked_by?: string | null;
  retry_after?: string | null;
  error?: string | null;
  error_class?: string | null;
  dead_letter_reason?: string | null;
  progress: number;
  summary: Record<string, unknown>;
  events?: Array<{ at: string; type: string; message: string; metadata?: Record<string, unknown> }>;
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
  benchmark_suite_id?: string;
  examples_per_cell: number;
  seed: number;
  adapter_mode: 'deterministic_fixture' | 'rest_guard' | 'model_judge' | 'uploaded_outputs';
  execution_mode?: 'immediate' | 'queued';
  lambda_cost?: number;
  rho_prior?: number;
  max_k?: number;
  max_cost_usd?: number;
  model_id?: string;
  model_version?: string;
  prompt_hash?: string;
  policy_hash?: string;
  tool_config_hash?: string;
  retrieval_config_hash?: string;
  traffic_profile_hash?: string;
};

export type UploadedOutputRunInput = {
  benchmark_suite_id?: string;
  format: 'auto' | 'jsonl' | 'csv';
  content: string;
  lambda_cost: number;
  rho_prior?: number;
  max_k?: number;
  name?: string;
  model_id?: string;
  model_version?: string;
  prompt_hash?: string;
  policy_hash?: string;
  tool_config_hash?: string;
  retrieval_config_hash?: string;
  traffic_profile_hash?: string;
  field_mapping?: Record<string, string>;
  decision_mapping?: Record<string, string>;
};

export type UploadedOutputPreviewInput = {
  benchmark_suite_id?: string;
  format: 'auto' | 'jsonl' | 'csv';
  content: string;
  field_mapping?: Record<string, string>;
  decision_mapping?: Record<string, string>;
};

export type UploadedOutputPreview = {
  format: 'jsonl' | 'csv';
  status: 'valid' | 'warning' | 'invalid';
  rows_seen: number;
  valid_outputs: number;
  known_outputs: number;
  summary: {
    guards: number;
    suite_examples: number;
    covered_examples: number;
    missing_examples: number;
    unknown_examples: number;
    expected_outputs: number;
    coverage: number;
    warnings: number;
    errors: number;
  };
  guards: Array<{
    guard_id: string;
    guard_label: string;
    outputs: number;
    covered_examples: number;
    missing_examples: number;
    coverage: number;
  }>;
  cells: Array<{
    cell_id: string;
    side: string;
    policy_category: string | null;
    examples: number;
    covered_examples: number;
    coverage: number;
  }>;
  issues: Array<{ severity: 'error' | 'warning'; code: string; message: string; details?: Record<string, unknown> }>;
  preview: Array<{
    example_id: string;
    guard_id: string;
    binary_pass: boolean;
    block_probability: number;
    known_example: boolean;
  }>;
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
    duplicate_prompts: number;
  };
  fingerprint: {
    algorithm: 'sha256';
    source_sha256: string;
    normalized_sha256: string;
    source_bytes: number;
    normalized_rows: number;
  };
  schema: Record<string, unknown>;
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
  field_mapping?: Record<string, string>;
  source_name?: string;
  source_uri?: string;
  name: string;
  version?: string;
  description?: string;
  license?: string;
};

export type TraceImportPreview = {
  source: string;
  rows_seen: number;
  draft_examples: number;
  status: 'valid' | 'invalid';
  issues: Array<{ severity: 'error' | 'warning'; row?: number; code: string; message: string }>;
  benchmark_import_content: string;
  fingerprint: { algorithm: 'sha256'; source_sha256: string; draft_sha256: string };
  preview: Array<{ external_id: string; name: string; side: string; policy_category: string; severity: string; prompt_hash: string }>;
  review_required: boolean;
  review_note: string;
};

export type TraceImportSource = 'auto' | 'langsmith' | 'langfuse' | 'opentelemetry' | 'generic_jsonl';

export type TraceImportPreviewInput = {
  source?: TraceImportSource;
  content: string;
  default_side?: 'adversarial' | 'benign';
  default_policy_category?: string;
  max_examples?: number;
};

export type TraceImportCommitInput = TraceImportPreviewInput & {
  name: string;
  version?: string;
  description?: string;
  license?: string;
  source_name?: string;
  source_uri?: string;
  review_approved: boolean;
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

export type OnboardingRole = 'platform' | 'safety' | 'risk' | 'mixed';
export type OnboardingEvidenceMode = 'uploaded_outputs' | 'connected_guards' | 'model_judge' | 'trace_import' | 'demo_first';
export type OnboardingAppCategory =
  | 'customer_support'
  | 'internal_agent'
  | 'research_copilot'
  | 'code_assistant'
  | 'workflow_automation'
  | 'other';
export type OnboardingDeploymentStage = 'exploration' | 'pre_production' | 'production_monitoring';
export type OnboardingOptimizationGoal = 'safety_risk' | 'cost' | 'latency' | 'user_friction' | 'balanced';
export type OnboardingReleaseGateTarget = 'github_actions' | 'gitlab' | 'circleci' | 'webhook' | 'mcp_agent' | 'not_yet';
export type OnboardingBudgetRange = 'under_25' | 'under_100' | 'under_500' | 'custom_later';

export type ProjectOnboardingProfile = {
  workspace_id: string;
  project_id: string;
  role: OnboardingRole;
  evidence_mode: OnboardingEvidenceMode;
  app_category: OnboardingAppCategory;
  deployment_stage: OnboardingDeploymentStage;
  optimization_goal: OnboardingOptimizationGoal;
  primary_risk_concerns: string[];
  release_gate_target: OnboardingReleaseGateTarget;
  budget_range: OnboardingBudgetRange;
  lambda_cost: number;
  first_setup_focus: string;
  release_decision_owner: string;
  override_owner: string;
  release_gate_mode: 'advisory' | 'warn' | 'block';
  failure_response: string;
  signoff_roles: string[];
  use_case_template: 'customer_support' | 'internal_assistant' | 'agentic_workflow' | 'custom';
  success_criteria: string[];
  created_at?: string;
  updated_at?: string;
};

export type ProjectOnboardingProfileInput = Omit<ProjectOnboardingProfile, 'workspace_id' | 'project_id' | 'first_setup_focus' | 'created_at' | 'updated_at'>;

export type OnboardingPilotInput = {
  workspace: WorkspaceInput;
  project: Omit<ProjectInput, 'workspace_id'>;
  profile: ProjectOnboardingProfileInput;
};

export type AuditEvent = {
  id: string;
  workspace_id: string | null;
  project_id: string | null;
  actor_user_id?: string | null;
  actor_type?: string | null;
  actor?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BudgetPolicy = {
  workspace_id: string;
  project_id?: string;
  configured: boolean;
  source: string;
  monthly_cap_usd: number | null;
  per_run_cap_usd: number | null;
  measurement_cap_usd: number | null;
  alert_threshold_pct?: number;
  hard_stop_pct?: number;
  enforce_hard_stop?: boolean;
  provider_spend_disabled: boolean;
  notes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BudgetState = {
  status: string;
  spent_usd: number;
  pending_cost_usd: number;
  projected_spend_usd: number;
  cap_usd: number | null;
  remaining_usd: number | null;
  alert_threshold_usd: number | null;
  hard_stop_usd: number | null;
  usage_percent: number | null;
  blocking_reasons: string[];
};

export type ProjectBudgetOverview = {
  project_id: string;
  workspace_id: string | null;
  configured: boolean;
  status: string;
  pending_cost_usd: number;
  blocking_reasons: string[];
  workspace: { policy: BudgetPolicy; state: BudgetState };
  project: { policy: BudgetPolicy; state: BudgetState };
  run: { operation: string; status: string; pending_cost_usd: number; cap_usd: number | null; blocking_reasons: string[] };
  effective: { per_run_cap_usd: number | null; provider_spend_disabled: boolean };
};

export type WorkspaceBudgetOverview = {
  workspace_id: string;
  policy: BudgetPolicy;
  state: BudgetState;
  project_count: number;
};

export type WorkspaceBudgetPolicyInput = {
  monthly_cap_usd?: number | null;
  per_run_cap_usd?: number | null;
  measurement_cap_usd?: number | null;
  alert_threshold_pct?: number;
  hard_stop_pct?: number;
  enforce_hard_stop?: boolean;
  provider_spend_disabled?: boolean;
  notes?: string | null;
};

export type ProjectBudgetPolicyInput = {
  monthly_cap_usd?: number | null;
  per_run_cap_usd?: number | null;
  measurement_cap_usd?: number | null;
  provider_spend_disabled?: boolean;
  notes?: string | null;
};

export type RetentionPolicy = {
  workspace_id?: string | null;
  project_id?: string | null;
  raw_examples_retention_days: number | null;
  keep_aggregate_metrics: boolean;
  keep_redacted_snippets: boolean;
  delete_provider_responses: boolean;
  export_before_delete: boolean;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RetentionPolicyInput = Partial<
  Pick<
    RetentionPolicy,
    'raw_examples_retention_days' | 'keep_aggregate_metrics' | 'keep_redacted_snippets' | 'delete_provider_responses' | 'export_before_delete' | 'notes'
  >
>;

export type RetentionExecution = {
  project_id: string;
  workspace_id?: string | null;
  mode: 'dry_run' | 'apply';
  policy: RetentionPolicy;
  actions: Array<{ id: string; label: string; action: string; retention_days?: number; estimated_records: number; status: string }>;
  summary: Record<string, unknown>;
  applied_at?: string;
};

export type ProjectPermissions = {
  role: string;
  role_label: 'Admin' | 'Editor' | 'Reviewer' | 'Viewer' | string;
  capabilities: Record<string, boolean>;
};

export type ReportExport = {
  report_id: string;
  run_id?: string;
  certificate_id?: string | null;
  format: 'markdown' | 'json' | 'pdf';
  content_type: string;
  filename: string;
  version: number;
  report_version_id?: string;
  content_hash?: string;
  generated_at: string;
  encoding: 'utf-8' | 'base64';
  content: string;
  summary: Record<string, unknown>;
};

export type ReportVersion = {
  id: string;
  workspace_id: string;
  project_id: string;
  run_id: string;
  certificate_id?: string | null;
  version: number;
  content_hash: string;
  release_context_hash: string;
  renderer_version: string;
  payload: Record<string, unknown>;
  markdown: string;
  html: string;
  artifact_refs: Array<Record<string, unknown>>;
  created_by?: string | null;
  created_at: string;
};

export type AdminProjectSummary = {
  project: Project;
  runs: {
    total: number;
    latest_run_id: string | null;
    latest_run_source: string | null;
    latest_certificate_status: string;
    latest_completed_at: string | null;
  };
  jobs: {
    total: number;
    queued: number;
    running: number;
    failed: number;
    complete: number;
    canceled: number;
    dead_letters: number;
    latest_status: string;
  };
  usage: CostSummaryPayload['summary'];
  budget: ProjectBudgetOverview;
  connectors: {
    total: number;
    active: number;
    missing_secrets: number;
    missing_secret_connectors: Array<{
      id?: string;
      guard_key?: string;
      label?: string;
      adapter_type?: string;
      vendor?: string;
      status?: string;
    }>;
  };
};

export type AdminOverview = {
  workspace: Workspace;
  role: string;
  generated_at: string;
  metrics: {
    projects: number;
    runs: number;
    issued_evidence: number;
    jobs: number;
    queued_jobs: number;
    running_jobs: number;
    failed_jobs: number;
    dead_letter_jobs: number;
    connectors: number;
    missing_secret_connectors: number;
    request_count: number;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    actual_cost_usd: number;
  };
  worker: {
    queue_depth: number;
    running: number;
    failed: number;
    dead_letters: number;
    stale_running: number;
    oldest_queued_at: string | null;
    next_retry_at: string | null;
    recommended_action: string;
  };
  provider_health: {
    status: 'idle' | 'healthy' | 'attention' | string;
    providers: Array<{
      provider: string;
      status: 'healthy' | 'running' | 'retrying' | 'dead_letter' | string;
      events: number;
      request_count: number;
      actual_cost_usd: number;
      retry_count: number;
      rate_limit_failures: number;
      timeout_failures: number;
      failed_jobs: number;
      dead_letter_count: number;
      running_jobs: number;
      latest_error_class?: string | null;
      latest_error?: string | null;
      latest_event_at?: string | null;
    }>;
    summary: {
      providers: number;
      retry_count: number;
      rate_limit_failures: number;
      timeout_failures: number;
      dead_letter_count: number;
      actual_cost_usd: number;
    };
  };
  usage: {
    summary: CostSummaryPayload['summary'];
    by_provider: CostSummaryPayload['by_provider'];
  };
  budget: WorkspaceBudgetOverview;
  projects: AdminProjectSummary[];
  jobs: Array<StackCertJob & { project_name?: string; project_slug?: string }>;
  dead_letters: Array<StackCertJob & { project_name?: string; project_slug?: string }>;
  audit_events: AuditEvent[];
  controls: {
    can_run_worker: boolean;
    can_retry_failed_jobs: boolean;
    can_cancel_queued_jobs: boolean;
    worker_scope: string;
    max_jobs_per_manual_run: number;
  };
};

export type AdminWorkerRun = {
  workspace_id: string;
  worker_id: string;
  processed: Array<{
    job_id: string;
    project_id?: string | null;
    run_id?: string | null;
    status?: string | null;
    summary: Record<string, unknown>;
  }>;
  processed_count: number;
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

async function patch<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBase}${path}`, {
    method: 'PATCH',
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
  projectPermissions: (projectId: string) => request<{ project_id: string; workspace_id: string; permissions: ProjectPermissions }>(`/api/projects/${projectId}/permissions`),
  createProject: ({ workspace_id, ...payload }: ProjectInput) =>
    post<{ project: Project }>(`/api/workspaces/${workspace_id}/projects`, payload),
  createOnboardingPilot: (payload: OnboardingPilotInput) =>
    post<{ workspace: Workspace; project: Project; profile: ProjectOnboardingProfile }>('/api/onboarding/pilots', payload),
  samplePilots: () => request<{ sample_pilots: SamplePilot[] }>('/api/sample-pilots'),
  duplicateSamplePilot: (
    templateId: string,
    payload: { workspace_id?: string; project_name?: string; slug?: string; mode?: 'draft' | 'with_fixture_run' }
  ) =>
    post<{
      sample_pilot: Pick<SamplePilot, 'id' | 'name' | 'description'>;
      workspace: Workspace;
      project: Project;
      profile: ProjectOnboardingProfile;
      suite: BenchmarkSuite;
      connectors: GuardCatalogItem[];
      run: RunSummary | null;
      template_seeded: boolean;
      next_url: string;
    }>(`/api/sample-pilots/${templateId}/duplicate`, payload),
  onboardingProfile: (projectId: string) =>
    request<{ profile: ProjectOnboardingProfile }>(`/api/projects/${projectId}/onboarding-profile`),
  updateOnboardingProfile: (projectId: string, payload: Partial<ProjectOnboardingProfileInput>) =>
    patch<{ profile: ProjectOnboardingProfile }>(`/api/projects/${projectId}/onboarding-profile`, payload),
  pilotReadiness: (projectId: string, lambda: number) =>
    request<{ readiness: PilotReadinessPayload }>(`/api/projects/${projectId}/pilot-readiness?lambda_cost=${lambda}`),
  projectRuns: (projectId: string, lambda: number) => request<{ runs: RunSummary[] }>(`/api/projects/${projectId}/runs?lambda_cost=${lambda}`),
  previewUploadedOutputRun: (projectId: string, payload: UploadedOutputPreviewInput) =>
    post<{ project_id: string; output_preview: UploadedOutputPreview }>(`/api/projects/${projectId}/runs/uploaded-outputs/preview`, payload),
  createUploadedOutputRun: (projectId: string, payload: UploadedOutputRunInput) =>
    post<{ run: RunSummary }>(`/api/projects/${projectId}/runs/uploaded-outputs`, payload),
  overview: (runId: string, lambda: number) => request<OverviewPayload>(`/api/runs/${runId}/overview?lambda_cost=${lambda}`),
  ranking: (runId: string, lambda: number) => request<RankingPayload>(`/api/runs/${runId}/ranking?lambda_cost=${lambda}`),
  runExamples: (runId: string, lambda: number) => request<RunExamplesPayload>(`/api/runs/${runId}/examples?lambda_cost=${lambda}`),
  runFailures: (runId: string, lambda: number) => request<RunFailuresPayload>(`/api/runs/${runId}/failures?lambda_cost=${lambda}`),
  runStability: (runId: string, lambda: number) => request<RunStabilityPayload>(`/api/runs/${runId}/stability?lambda_cost=${lambda}`),
  correlations: (runId: string, lambda: number, side: 'adversarial' | 'benign') =>
    request<CorrelationsPayload>(`/api/runs/${runId}/correlations?lambda_cost=${lambda}&side=${side}`),
  measurements: (runId: string, lambda: number) => request<MeasurementsPayload>(`/api/runs/${runId}/measurements?lambda_cost=${lambda}`),
  runCosts: (runId: string) => request<CostSummaryPayload>(`/api/runs/${runId}/costs`),
  certificate: (runId: string, lambda: number) => request<CertificatePayload>(`/api/runs/${runId}/certificate?lambda_cost=${lambda}`),
  certificateReadiness: (runId: string, lambda: number) =>
    request<{ readiness: EvidenceReadiness }>(`/api/runs/${runId}/certificate/readiness?lambda_cost=${lambda}`),
  issuedCertificateForRun: (runId: string, lambda: number) =>
    request<{ certificate: IssuedCertificate | null }>(`/api/runs/${runId}/issued-certificate?lambda_cost=${lambda}`),
  issuedCertificate: (certificateId: string) => request<{ certificate: IssuedCertificate | null }>(`/api/certificates/${certificateId}`),
  issueCertificate: (runId: string, lambda: number, payload: { acknowledge_limitations: boolean; expires_in_days: number; reviewer_note?: string }) =>
    post<{ certificate: IssuedCertificate }>(`/api/runs/${runId}/certificate/issue?lambda_cost=${lambda}`, payload),
  reportVersions: (runId: string, lambda: number) => request<{ report_versions: ReportVersion[] }>(`/api/runs/${runId}/report-versions?lambda_cost=${lambda}`),
  reportVersion: (reportVersionId: string) => request<{ report: ReportVersion }>(`/api/reports/${reportVersionId}`),
  exportReport: (reportId: string, format: 'markdown' | 'json' | 'pdf', lambda: number) =>
    post<{ export: ReportExport }>(`/api/reports/${reportId}/export?lambda_cost=${lambda}`, { format }),
  createCertificateSignoff: (
    certificateId: string,
    payload: { signer_role: string; decision: CertificateSignoff['decision']; comment?: string }
  ) => post<{ signoff: CertificateSignoff }>(`/api/certificates/${certificateId}/signoffs`, payload),
  certificateArtifacts: (certificateId: string) => request<{ artifacts: EvidenceArtifact[] }>(`/api/certificates/${certificateId}/artifacts`),
  certificateArtifactSignedUrl: (certificateId: string, artifactType: string) =>
    post<{ artifact: EvidenceArtifactSignedUrl }>(`/api/certificates/${certificateId}/artifacts/${artifactType}/signed-url`, {}),
  verifyCertificateArtifact: (certificateId: string, artifactType: string) =>
    request<{ verification: EvidenceArtifactVerification }>(`/api/certificates/${certificateId}/artifacts/${artifactType}/verify`),
  drift: (projectId: string, lambda: number) => request<DriftPayload>(`/api/projects/${projectId}/drift?lambda_cost=${lambda}`),
  triggerRecertification: (projectId: string, lambda: number) =>
    post<RecertificationResponse>(`/api/projects/${projectId}/recertify?lambda_cost=${lambda}`, {}),
  certificateMarkdownUrl: (runId: string, lambda: number) => `${apiBase}/api/runs/${runId}/certificate.md?lambda_cost=${lambda}`,
  certificateJsonUrl: (runId: string, lambda: number) => `${apiBase}/api/runs/${runId}/certificate.json?lambda_cost=${lambda}`,
  rankingCsvUrl: (runId: string, lambda: number) => `${apiBase}/api/runs/${runId}/ranking.csv?lambda_cost=${lambda}`,
  benchmarkSuites: (projectId: string) =>
    request<{ suites: BenchmarkSuite[] }>(`/api/projects/${projectId}/benchmark-suites?lambda_cost=5`),
  previewBenchmarkImport: (payload: { format: 'auto' | 'jsonl' | 'csv'; content: string }) =>
    post<{ project_id: string; import_preview: BenchmarkImportPreview }>('/api/projects/proj_acme_copilot/benchmark-suites/preview', payload),
  benchmarkImportSchema: (projectId: string) =>
    request<{ project_id: string; schema: Record<string, unknown> }>(`/api/projects/${projectId}/benchmark-suites/schema`),
  previewProjectBenchmarkImport: (
    projectId: string,
    payload: { format: 'auto' | 'jsonl' | 'csv'; content: string; field_mapping?: Record<string, string>; source_name?: string; source_uri?: string }
  ) =>
    post<{ project_id: string; import_preview: BenchmarkImportPreview }>(`/api/projects/${projectId}/benchmark-suites/preview`, payload),
  previewTraceImport: (
    projectId: string,
    payload: TraceImportPreviewInput
  ) => post<{ project_id: string; trace_import_preview: TraceImportPreview }>(`/api/projects/${projectId}/trace-imports/preview`, payload),
  commitTraceImport: (projectId: string, payload: TraceImportCommitInput) =>
    post<{ project_id: string; suite: BenchmarkSuite; import_preview: BenchmarkImportPreview; trace_import_preview: TraceImportPreview }>(
      `/api/projects/${projectId}/trace-imports`,
      payload
    ),
  createBenchmarkSuite: (projectId: string, payload: BenchmarkImportCommitInput) =>
    post<{ project_id: string; suite: BenchmarkSuite; import_preview: BenchmarkImportPreview }>(`/api/projects/${projectId}/benchmark-suites`, payload),
  guards: (projectId: string) => request<{ guards: GuardCatalogItem[] }>(`/api/projects/${projectId}/guards?lambda_cost=5`),
  guardConnectors: (projectId: string) => request<{ connectors: GuardCatalogItem[] }>(`/api/projects/${projectId}/guard-connectors?lambda_cost=5`),
  createGuardConnector: (projectId: string, payload: GuardConnectorInput) =>
    post<{ connector: GuardCatalogItem }>(`/api/projects/${projectId}/guard-connectors`, payload),
  testGuardConnector: (projectId: string, guardId: string, payload: { live?: boolean; example_id?: string; input?: string; output?: string; metadata?: Record<string, unknown> }) =>
    post<{ test_call: GuardConnectorTestCall }>(`/api/projects/${projectId}/guard-connectors/${guardId}/test-call`, payload),
  stacks: (projectId: string) => request<{ run: RunSummary | null; stacks: CandidateStack[] }>(`/api/projects/${projectId}/stacks?lambda_cost=5`),
  jobs: (projectId: string) => request<{ jobs: StackCertJob[] }>(`/api/projects/${projectId}/jobs`),
  retryJob: (jobId: string) => post<{ job: StackCertJob }>(`/api/jobs/${jobId}/retry`, {}),
  cancelJob: (jobId: string) => post<{ job: StackCertJob }>(`/api/jobs/${jobId}/cancel`, {}),
  createEvaluationJob: (projectId: string, payload: EvaluationJobInput) =>
    post<{ job: StackCertJob }>(`/api/projects/${projectId}/evaluation-jobs`, payload),
  runNextWorkerJob: (projectId: string) => post<{ job: StackCertJob }>(`/api/projects/${projectId}/workers/run-next`, {}),
  adminOverview: (workspaceId: string) => request<{ admin: AdminOverview }>(`/api/workspaces/${workspaceId}/admin/overview`),
  runWorkspaceWorker: (workspaceId: string, payload: { worker_id?: string; max_jobs?: number; lease_seconds?: number }) =>
    post<{ worker_run: AdminWorkerRun }>(`/api/workspaces/${workspaceId}/admin/workers/run-next`, payload),
  workspaceBudgetPolicy: (workspaceId: string) =>
    request<{ budget: WorkspaceBudgetOverview }>(`/api/workspaces/${workspaceId}/budget-policy`),
  updateWorkspaceBudgetPolicy: (workspaceId: string, payload: WorkspaceBudgetPolicyInput) =>
    patch<{ budget: WorkspaceBudgetOverview }>(`/api/workspaces/${workspaceId}/budget-policy`, payload),
  workspaceRetentionPolicy: (workspaceId: string) =>
    request<{ retention_policy: RetentionPolicy }>(`/api/workspaces/${workspaceId}/retention-policy`),
  updateWorkspaceRetentionPolicy: (workspaceId: string, payload: RetentionPolicyInput) =>
    patch<{ retention_policy: RetentionPolicy }>(`/api/workspaces/${workspaceId}/retention-policy`, payload),
  projectBudgetPolicy: (projectId: string) =>
    request<{ budget: ProjectBudgetOverview }>(`/api/projects/${projectId}/budget-policy`),
  updateProjectBudgetPolicy: (projectId: string, payload: ProjectBudgetPolicyInput) =>
    patch<{ budget: ProjectBudgetOverview }>(`/api/projects/${projectId}/budget-policy`, payload),
  projectRetentionPolicy: (projectId: string) =>
    request<{ retention_policy: RetentionPolicy }>(`/api/projects/${projectId}/retention-policy`),
  updateProjectRetentionPolicy: (projectId: string, payload: RetentionPolicyInput) =>
    patch<{ retention_policy: RetentionPolicy }>(`/api/projects/${projectId}/retention-policy`, payload),
  dryRunProjectRetention: (projectId: string) =>
    post<{ retention_execution: RetentionExecution }>(`/api/projects/${projectId}/retention-policy/dry-run`, { confirm: false }),
  applyProjectRetention: (projectId: string) =>
    post<{ retention_execution: RetentionExecution }>(`/api/projects/${projectId}/retention-policy/apply`, { confirm: true }),
  importProjectConfig: (projectId: string, payload: { mode: 'dry_run' | 'apply'; content: string }) =>
    post<{ config_import: { project_id: string; mode: string; status: string; changes: Record<string, unknown>; applied?: Record<string, unknown> } }>(
      `/api/projects/${projectId}/config/import`,
      payload
    ),
  projectAuditEvents: (projectId: string, limit = 100) =>
    request<{ audit_events: AuditEvent[] }>(`/api/projects/${projectId}/audit-events?limit=${limit}`),
  createMeasurementPlan: (runId: string, payload: { action_ids: string[]; max_cost_usd?: number }, lambda: number) =>
    post<{ id: string; job: StackCertJob; status: string; run_id: string; summary: Record<string, unknown>; actions: MeasurementsPayload['actions'] }>(
      `/api/runs/${runId}/measurement-plans?lambda_cost=${lambda}`,
      payload
    ),
  customBehaviors: (projectId: string) => request<{ behaviors: CustomBehavior[] }>(`/api/projects/${projectId}/custom-behaviors`),
  createCustomBehavior: (projectId: string, payload: CustomBehaviorInput) =>
    post<{ behavior: CustomBehavior }>(`/api/projects/${projectId}/custom-behaviors`, payload),
  estimateCost: (projectId: string, payload: { examples: number; guards: number; candidate_stacks: number }) =>
    post<{ estimate: CostEstimate }>(`/api/projects/${projectId}/costs/estimate`, payload)
};
