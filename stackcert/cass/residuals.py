from __future__ import annotations

from stackcert.data.schemas import Architecture


def residual_radius(architecture: Architecture) -> float:
    """K=2 MVP certificates have exact zero higher-order residual."""

    if architecture.size <= 2:
        return 0.0
    raise ValueError("residual-aware K>=3 support is intentionally out of MVP scope")

