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
    threshold: float | None = Field(default=None, ge=0, le=1)


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
    adapter_mode: str = Field(pattern="^(deterministic_fixture|rest_guard|uploaded_outputs)$", default="deterministic_fixture")
    execution_mode: str = Field(pattern="^(immediate|queued)$", default="immediate")
    lambda_cost: float = Field(default=5.0, ge=0, le=100)
    rho_prior: float = Field(default=0.6, ge=-1, le=1)
    max_k: int = Field(default=2, ge=1, le=2)
    max_cost_usd: float | None = Field(default=None, ge=0)
    failure_mode: str | None = Field(default=None, pattern="^(provider_timeout|provider_rate_limited|invalid_configuration)$")


class MeasurementPlanCreate(BaseModel):
    action_ids: list[str] = Field(default_factory=list, max_length=100)
    max_cost_usd: float | None = Field(default=None, ge=0)


class BenchmarkImportPreviewRequest(BaseModel):
    format: str = Field(pattern="^(auto|jsonl|csv)$", default="auto")
    content: str = Field(min_length=10, max_length=1_000_000)


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
