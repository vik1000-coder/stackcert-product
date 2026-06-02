from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=80, pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    plan: str = Field(default="starter", pattern="^(starter|team|enterprise)$")


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=80, pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    environment: str = Field(default="production", pattern="^(development|staging|production)$")
    risk_tier: str = Field(default="standard", pattern="^(low|standard|high|critical)$")
    data_mode: str = Field(default="redacted_snippets", pattern="^(raw_allowed|redacted_snippets|hashes_only|customer_hosted)$")
    description: str | None = Field(default=None, max_length=2000)


class ProjectOnboardingProfileCreate(BaseModel):
    role: str = Field(default="platform", pattern="^(platform|safety|risk|mixed)$")
    evidence_mode: str = Field(
        default="uploaded_outputs",
        pattern="^(uploaded_outputs|connected_guards|model_judge|trace_import|demo_first)$",
    )
    app_category: str = Field(
        default="customer_support",
        pattern="^(customer_support|internal_agent|research_copilot|code_assistant|workflow_automation|other)$",
    )
    deployment_stage: str = Field(default="pre_production", pattern="^(exploration|pre_production|production_monitoring)$")
    optimization_goal: str = Field(default="balanced", pattern="^(safety_risk|cost|latency|user_friction|balanced)$")
    primary_risk_concerns: list[str] = Field(default_factory=list, max_length=8)
    release_gate_target: str = Field(default="not_yet", pattern="^(github_actions|gitlab|circleci|webhook|mcp_agent|not_yet)$")
    budget_range: str = Field(default="under_100", pattern="^(under_25|under_100|under_500|custom_later)$")
    lambda_cost: float = Field(default=5.0, ge=1, le=10)
    release_decision_owner: str = Field(default="Engineering lead", max_length=120)
    override_owner: str = Field(default="Shared committee", max_length=120)
    release_gate_mode: str = Field(default="warn", pattern="^(advisory|warn|block)$")
    failure_response: str = Field(default="Open a manual release review before deployment.", max_length=500)
    signoff_roles: list[str] = Field(default_factory=lambda: ["engineering_lead", "safety_reviewer"], max_length=8)
    use_case_template: str = Field(default="customer_support", pattern="^(customer_support|internal_assistant|agentic_workflow|custom)$")
    success_criteria: list[str] = Field(default_factory=list, max_length=8)


class ProjectOnboardingProfileUpdate(BaseModel):
    role: str | None = Field(default=None, pattern="^(platform|safety|risk|mixed)$")
    evidence_mode: str | None = Field(
        default=None,
        pattern="^(uploaded_outputs|connected_guards|model_judge|trace_import|demo_first)$",
    )
    app_category: str | None = Field(
        default=None,
        pattern="^(customer_support|internal_agent|research_copilot|code_assistant|workflow_automation|other)$",
    )
    deployment_stage: str | None = Field(default=None, pattern="^(exploration|pre_production|production_monitoring)$")
    optimization_goal: str | None = Field(default=None, pattern="^(safety_risk|cost|latency|user_friction|balanced)$")
    primary_risk_concerns: list[str] | None = Field(default=None, max_length=8)
    release_gate_target: str | None = Field(default=None, pattern="^(github_actions|gitlab|circleci|webhook|mcp_agent|not_yet)$")
    budget_range: str | None = Field(default=None, pattern="^(under_25|under_100|under_500|custom_later)$")
    lambda_cost: float | None = Field(default=None, ge=1, le=10)
    release_decision_owner: str | None = Field(default=None, max_length=120)
    override_owner: str | None = Field(default=None, max_length=120)
    release_gate_mode: str | None = Field(default=None, pattern="^(advisory|warn|block)$")
    failure_response: str | None = Field(default=None, max_length=500)
    signoff_roles: list[str] | None = Field(default=None, max_length=8)
    use_case_template: str | None = Field(default=None, pattern="^(customer_support|internal_assistant|agentic_workflow|custom)$")
    success_criteria: list[str] | None = Field(default=None, max_length=8)


class OnboardingPilotCreate(BaseModel):
    workspace: WorkspaceCreate
    project: ProjectCreate
    profile: ProjectOnboardingProfileCreate = Field(default_factory=ProjectOnboardingProfileCreate)


class GuardConnectorCreate(BaseModel):
    guard_key: str = Field(min_length=2, max_length=80, pattern="^[a-z0-9][a-z0-9_-]*[a-z0-9]$")
    display_name: str = Field(min_length=2, max_length=120)
    guard_type: str = Field(pattern="^(rest_guard|local_python|model_judge|uploaded_outputs)$")
    vendor: str | None = Field(default=None, max_length=80)
    version: str = Field(default="v1", min_length=1, max_length=60)
    adapter_type: str = Field(default="rest_guard", pattern="^(rest_guard|local_python|model_judge|uploaded_outputs)$")
    endpoint_url: str | None = Field(default=None, max_length=500)
    auth_header_name: str = Field(default="Authorization", min_length=2, max_length=80)
    auth_secret: str | None = Field(default=None, max_length=2000)
    secret_env_var: str | None = Field(default=None, max_length=120, pattern="^[A-Z_][A-Z0-9_]*$")
    model: str | None = Field(default=None, max_length=120)
    provider_format: str | None = Field(default=None, pattern="^(openai_chat|ollama_chat|direct_json)$")
    system_prompt: str | None = Field(default=None, max_length=4000)
    timeout_sec: int | None = Field(default=None, ge=1, le=600)
    request_price_usd: float | None = Field(default=None, ge=0, le=100)
    input_price_per_1m_tokens_usd: float | None = Field(default=None, ge=0, le=10_000)
    output_price_per_1m_tokens_usd: float | None = Field(default=None, ge=0, le=10_000)
    threshold: float | None = Field(default=None, ge=0, le=1)
    rate_limit_per_minute: int | None = Field(default=None, ge=1, le=60_000)
    retry_max_attempts: int | None = Field(default=None, ge=1, le=10)
    retry_backoff_base_seconds: int | None = Field(default=None, ge=1, le=3600)
    decision_mapping: dict[str, str] = Field(default_factory=dict, max_length=30)
    max_concurrency: int | None = Field(default=None, ge=1, le=200)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1, le=8000)
    decision_schema: str | None = Field(default=None, max_length=2000)


class GuardConnectorTestCallRequest(BaseModel):
    live: bool | None = None
    example_id: str = Field(default="test_example", min_length=2, max_length=160)
    input: str = Field(default="A user asks for another customer's private account details.", min_length=2, max_length=4000)
    output: str | None = Field(default="I cannot provide private account details.", max_length=4000)
    metadata: dict[str, Any] = Field(default_factory=dict, max_length=50)


class GuardConnectorSecretUpdate(BaseModel):
    auth_secret: str | None = Field(default=None, max_length=4000)
    secret_env_var: str | None = Field(default=None, max_length=120, pattern="^[A-Z_][A-Z0-9_]*$")
    secret_ref: str | None = Field(default=None, max_length=800)
    backend: str = Field(default="auto", pattern="^(auto|env|local_memory|gcp_secret_manager)$")


class CustomBehaviorCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    side: str = Field(pattern="^(adversarial|benign)$")
    policy_category: str = Field(min_length=2, max_length=80)
    severity: str = Field(pattern="^(low|medium|high|critical)$")
    prompt: str = Field(min_length=5, max_length=8000)
    expected_safe_behavior: str = Field(min_length=5, max_length=2000)
    unsafe_behavior: str = Field(min_length=5, max_length=2000)


class CostEstimateRequest(BaseModel):
    examples: int = Field(ge=1, le=1_000_000)
    guards: int = Field(ge=1, le=100)
    candidate_stacks: int = Field(ge=1, le=10_000)
    avg_input_tokens: int = Field(ge=1, le=200_000, default=750)
    avg_output_tokens: int = Field(ge=0, le=200_000, default=80)
    model_cost_per_1m_input: float = Field(ge=0, default=0.25)
    model_cost_per_1m_output: float = Field(ge=0, default=1.25)


class EvaluationJobCreate(BaseModel):
    guard_ids: list[str] = Field(default_factory=list, max_length=20)
    benchmark_suite_id: str | None = Field(default=None, min_length=2, max_length=120)
    examples_per_cell: int = Field(ge=1, le=50, default=2)
    seed: int = Field(ge=0, le=1_000_000, default=7)
    adapter_mode: str = Field(pattern="^(deterministic_fixture|rest_guard|model_judge|uploaded_outputs)$", default="deterministic_fixture")
    execution_mode: str = Field(pattern="^(immediate|queued)$", default="immediate")
    lambda_cost: float = Field(default=5.0, ge=0, le=100)
    rho_prior: float = Field(default=0.6, ge=-1, le=1)
    max_k: int = Field(default=2, ge=1, le=2)
    max_cost_usd: float | None = Field(default=None, ge=0)
    failure_mode: str | None = Field(default=None, pattern="^(provider_timeout|provider_rate_limited|invalid_configuration)$")
    model_id: str | None = Field(default=None, max_length=160)
    model_version: str | None = Field(default=None, max_length=160)
    prompt_hash: str | None = Field(default=None, max_length=160)
    policy_hash: str | None = Field(default=None, max_length=160)
    tool_config_hash: str | None = Field(default=None, max_length=160)
    retrieval_config_hash: str | None = Field(default=None, max_length=160)
    traffic_profile_hash: str | None = Field(default=None, max_length=160)


class MeasurementPlanCreate(BaseModel):
    action_ids: list[str] = Field(default_factory=list, max_length=100)
    max_cost_usd: float | None = Field(default=None, ge=0)


class AdminWorkerRunRequest(BaseModel):
    worker_id: str | None = Field(default=None, min_length=2, max_length=160)
    max_jobs: int = Field(default=1, ge=1, le=10)
    lease_seconds: int = Field(default=900, ge=30, le=3600)


class WorkspaceBudgetPolicyUpdate(BaseModel):
    monthly_cap_usd: float | None = Field(default=None, ge=0, le=1_000_000)
    per_run_cap_usd: float | None = Field(default=None, ge=0, le=1_000_000)
    measurement_cap_usd: float | None = Field(default=None, ge=0, le=1_000_000)
    alert_threshold_pct: float = Field(default=0.8, ge=0, le=1.5)
    hard_stop_pct: float = Field(default=1.0, ge=0, le=2)
    enforce_hard_stop: bool = True
    provider_spend_disabled: bool = False
    notes: str | None = Field(default=None, max_length=1200)


class ProjectBudgetPolicyUpdate(BaseModel):
    monthly_cap_usd: float | None = Field(default=None, ge=0, le=1_000_000)
    per_run_cap_usd: float | None = Field(default=None, ge=0, le=1_000_000)
    measurement_cap_usd: float | None = Field(default=None, ge=0, le=1_000_000)
    provider_spend_disabled: bool = False
    notes: str | None = Field(default=None, max_length=1200)


class BenchmarkImportPreviewRequest(BaseModel):
    format: str = Field(pattern="^(auto|jsonl|csv)$", default="auto")
    content: str = Field(min_length=10, max_length=1_000_000)
    field_mapping: dict[str, str] = Field(default_factory=dict, max_length=20)
    source_name: str | None = Field(default=None, max_length=240)
    source_uri: str | None = Field(default=None, max_length=500)


class BenchmarkImportCommitRequest(BenchmarkImportPreviewRequest):
    name: str = Field(min_length=3, max_length=120)
    version: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=2000)
    license: str | None = Field(default=None, max_length=200)


class UploadedOutputRunCreate(BaseModel):
    benchmark_suite_id: str | None = Field(default=None, min_length=2, max_length=120)
    format: str = Field(pattern="^(auto|jsonl|csv)$", default="auto")
    content: str = Field(min_length=20, max_length=2_000_000)
    lambda_cost: float = Field(default=5.0, ge=0, le=100)
    rho_prior: float = Field(default=0.6, ge=-1, le=1)
    max_k: int = Field(default=2, ge=1, le=2)
    name: str | None = Field(default=None, max_length=120)
    model_id: str | None = Field(default=None, max_length=160)
    model_version: str | None = Field(default=None, max_length=160)
    prompt_hash: str | None = Field(default=None, max_length=160)
    policy_hash: str | None = Field(default=None, max_length=160)
    tool_config_hash: str | None = Field(default=None, max_length=160)
    retrieval_config_hash: str | None = Field(default=None, max_length=160)
    traffic_profile_hash: str | None = Field(default=None, max_length=160)
    field_mapping: dict[str, str] = Field(default_factory=dict, max_length=20)
    decision_mapping: dict[str, str] = Field(default_factory=dict, max_length=30)
    source: str | None = Field(default=None, pattern="^(uploaded_outputs|template_seeded)$")


class UploadedOutputPreviewRequest(BaseModel):
    benchmark_suite_id: str | None = Field(default=None, min_length=2, max_length=120)
    format: str = Field(pattern="^(auto|jsonl|csv)$", default="auto")
    content: str = Field(min_length=10, max_length=2_000_000)
    field_mapping: dict[str, str] = Field(default_factory=dict, max_length=20)
    decision_mapping: dict[str, str] = Field(default_factory=dict, max_length=30)


class RetentionPolicyUpdate(BaseModel):
    raw_examples_retention_days: int | None = Field(default=30, ge=0, le=3650)
    keep_aggregate_metrics: bool = True
    keep_redacted_snippets: bool = True
    delete_provider_responses: bool = True
    export_before_delete: bool = True
    notes: str | None = Field(default=None, max_length=1200)


class ReportExportRequest(BaseModel):
    format: str = Field(default="markdown", pattern="^(markdown|json|pdf)$")


class SamplePilotDuplicateRequest(BaseModel):
    workspace_id: str | None = Field(default=None, min_length=2, max_length=160)
    project_name: str | None = Field(default=None, min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=80, pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    mode: str = Field(default="with_fixture_run", pattern="^(draft|with_fixture_run)$")


class RetentionExecutionRequest(BaseModel):
    confirm: bool = False


class ConfigImportRequest(BaseModel):
    mode: str = Field(default="dry_run", pattern="^(dry_run|apply)$")
    content: str = Field(min_length=10, max_length=1_000_000)


class TraceImportPreviewRequest(BaseModel):
    source: str = Field(default="auto", pattern="^(auto|langsmith|langfuse|opentelemetry|generic_jsonl)$")
    content: str = Field(min_length=10, max_length=2_000_000)
    default_side: str = Field(default="benign", pattern="^(adversarial|benign)$")
    default_policy_category: str = Field(default="production_trace", min_length=2, max_length=80)
    max_examples: int = Field(default=50, ge=1, le=500)


class TraceImportCommitRequest(TraceImportPreviewRequest):
    name: str = Field(min_length=3, max_length=120)
    version: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=2000)
    license: str | None = Field(default=None, max_length=200)
    source_name: str | None = Field(default=None, max_length=240)
    source_uri: str | None = Field(default=None, max_length=500)
    review_approved: bool = False


class CertificateIssueRequest(BaseModel):
    acknowledge_limitations: bool
    expires_in_days: int = Field(default=30, ge=1, le=365)
    reviewer_note: str | None = Field(default=None, max_length=2000)


class CertificateSignoffCreate(BaseModel):
    signer_role: str = Field(default="risk_reviewer", pattern="^(owner|admin|platform|security|risk_reviewer|viewer)$")
    decision: str = Field(pattern="^(approved|rejected|requested_changes)$")
    comment: str | None = Field(default=None, max_length=2000)


class McpRpcRequest(BaseModel):
    jsonrpc: str = Field(default="2.0")
    id: str | int | None = None
    method: str = Field(min_length=1, max_length=120)
    params: dict[str, Any] = Field(default_factory=dict)


class ReleaseGateEvaluateRequest(BaseModel):
    environment: str | None = Field(default=None, max_length=80)
    model_id: str | None = Field(default=None, max_length=160)
    model_version: str | None = Field(default=None, max_length=160)
    prompt_hash: str | None = Field(default=None, max_length=160)
    policy_hash: str | None = Field(default=None, max_length=160)
    guard_connector_versions: dict[str, str] = Field(default_factory=dict, max_length=100)
    benchmark_suite_id: str | None = Field(default=None, max_length=160)
    benchmark_suite_version: str | None = Field(default=None, max_length=160)
    run_id: str | None = Field(default=None, max_length=160)
    deployment_ref: str | None = Field(default=None, max_length=300)
    commit_sha: str | None = Field(default=None, max_length=80)
    changed_since_evidence: list[str] = Field(default_factory=list, max_length=50)
    required_status: str = Field(default="valid", pattern="^(valid|provisional|needs_measurement)$")
    mode: str = Field(default="fail", pattern="^(fail|warn)$")
    lambda_cost: float = Field(default=5.0, ge=0, le=100)


class ReleaseGateWebhookRequest(ReleaseGateEvaluateRequest):
    event_id: str | None = Field(default=None, max_length=160)
    event_source: str | None = Field(default=None, max_length=160)
    event_type: str | None = Field(default=None, max_length=160)
