from __future__ import annotations

from typing import Any

from stackcert_service.services import report_versions


def export_report(report_id: str, export_format: str, *, lambda_cost: float = 5.0, created_by: str | None = None) -> dict[str, Any]:
    return report_versions.export(report_id, export_format, lambda_cost=lambda_cost, created_by=created_by)
