from __future__ import annotations

from typing import Any


CASS_METHOD_ID = "cass"
CASS_METHOD_VERSION = "cass-v2-atom-correlation-search"
CASS_DISPLAY_NAME = "CASS"

OLD_CASS_METHOD_ID = "old_cass"
OLD_CASS_METHOD_VERSION = "old_cass-k2-serial-interval-v1"
OLD_CASS_DISPLAY_NAME = "old_cass"


def cass_methodology(
    *,
    max_k: int | None = None,
    rho_prior: float | None = None,
    external_prior_count: int = 0,
) -> dict[str, Any]:
    """Return the product-facing CASS method contract for audit surfaces."""
    return {
        "method_id": CASS_METHOD_ID,
        "method_version": CASS_METHOD_VERSION,
        "display_name": CASS_DISPLAY_NAME,
        "summary": "Atom-aware, correlation-aware safety-check committee search for scoped release evidence.",
        "search_policy": {
            "description": (
                "Filter brittle atoms, compare deployable combinations, penalize shared unsafe misses, "
                "and keep source-backed priors separate from finite-sample evidence."
            ),
            "aggregation_family": "serial veto, quota, and overlap-aware committee rules",
            "current_product_rule": "serial veto with overlap/correlation evidence",
        },
        "evidence_engine": {
            "method_id": OLD_CASS_METHOD_ID,
            "method_version": OLD_CASS_METHOD_VERSION,
            "display_name": OLD_CASS_DISPLAY_NAME,
            "scope": "Legacy K<=2 serial interval certificate retained as the auditable finite-sample evidence layer.",
            "max_k": max_k,
            "rho_prior": rho_prior,
        },
        "external_benchmark_priors": {
            "applied": external_prior_count > 0,
            "count": external_prior_count,
            "policy": (
                "Closed-source or large-scale benchmark priors are not applied to release evidence unless "
                "source-backed rows or explicit priors are provided and labeled."
            ),
        },
        "claim_boundaries": [
            "Scoped to the tested example mix, safety-check versions, release goal, and release context.",
            "Does not claim universal deployment safety or general frontier-model superiority.",
            "Requires retest after model, prompt, policy, retrieval, tool, traffic, or safety-check changes.",
        ],
    }


def cass_assumptions(
    *,
    max_k: int,
    rho_prior: float,
    use_feasible_bounds: bool,
) -> dict[str, Any]:
    """Flat assumptions payload kept compatible with existing report renderers."""
    return {
        "method_id": CASS_METHOD_ID,
        "method_version": CASS_METHOD_VERSION,
        "method_summary": "Atom-aware, correlation-aware committee search with explicit claim boundaries.",
        "evidence_engine": OLD_CASS_METHOD_ID,
        "evidence_engine_version": OLD_CASS_METHOD_VERSION,
        "aggregation": "serial",
        "max_k": max_k,
        "rho_prior": rho_prior,
        "use_feasible_bounds": use_feasible_bounds,
        "residual_treatment": "zero for old_cass K<=2 serial interval evidence",
        "certificate_scope": "finite benchmark mixture",
        "search_policy": (
            "CASS filters brittle atoms and evaluates shared-failure structure; old_cass supplies the current "
            "K<=2 finite-sample interval certificate."
        ),
        "external_benchmark_priors": "none applied unless source-backed priors are provided",
    }


def cass_scope_text(*, evidence_source: str) -> str:
    if evidence_source == "demo":
        return (
            "CASS v2 scoped release decision over the seeded sample example mix; old_cass K<=2 serial "
            "interval evidence is retained for audit."
        )
    return (
        "CASS v2 scoped release decision over uploaded pilot evidence; old_cass K<=2 serial interval "
        "evidence is retained for audit."
    )
