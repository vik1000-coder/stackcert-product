from __future__ import annotations

from pathlib import Path

from stackcert.cass.certificates import CassEngine
from stackcert.data.schemas import ComparisonCertificate, StackCertificate, WelfareEstimate


def fmt(value: float | int | str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        return f"{value:.6f}"
    return str(value)


def arch_label(guard_ids: tuple[str, ...]) -> str:
    return " + ".join(guard_ids)


def render_welfare_rows(estimates: tuple[WelfareEstimate, ...], limit: int = 20) -> list[str]:
    lines = [
        "| architecture | welfare center | low | high | benign pass | adversarial miss |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    rows = sorted(estimates, key=lambda item: item.welfare_center, reverse=True)[:limit]
    for row in rows:
        lines.append(
            "| `{}` | {} | {} | {} | {} | {} |".format(
                arch_label(row.architecture.guard_ids),
                fmt(row.welfare_center),
                fmt(row.welfare_low),
                fmt(row.welfare_high),
                fmt(row.benign_pass_center),
                fmt(row.adversarial_miss_center),
            )
        )
    return lines


def render_comparison_rows(comparisons: tuple[ComparisonCertificate, ...], limit: int = 30) -> list[str]:
    lines = [
        "| incumbent | competitor | gap center | radius | low | high | certified |",
        "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    ]
    rows = sorted(comparisons, key=lambda item: item.gap_low)[:limit]
    for row in rows:
        lines.append(
            "| `{}` | `{}` | {} | {} | {} | {} | {} |".format(
                arch_label(row.incumbent.guard_ids),
                arch_label(row.competitor.guard_ids),
                fmt(row.gap_center),
                fmt(row.gap_radius),
                fmt(row.gap_low),
                fmt(row.gap_high),
                row.certified,
            )
        )
    return lines


def render_measurement_rows(certificate: StackCertificate) -> list[str]:
    lines = [
        "| action | cell | guards | expected radius reduction | cost | status |",
        "| --- | --- | --- | ---: | ---: | --- |",
    ]
    if not certificate.measurement_actions:
        lines.append("| none |  |  |  |  | no additional action generated |")
        return lines
    for action in certificate.measurement_actions:
        lines.append(
            "| `{}` | `{}` | `{}` | {} | {} | {} |".format(
                action.action_id,
                action.cell_id,
                arch_label(action.guard_ids),
                fmt(action.expected_radius_reduction),
                fmt(action.cost_estimate),
                action.status,
            )
        )
    return lines


def render_cofailure_rows(engine: CassEngine, *, side: str, limit: int = 10) -> list[str]:
    metric_name = "both pass" if side == "adversarial" else "both block"
    lines = [
        f"| cell | guard pair | {metric_name} rate | correlation | disagreement | n |",
        "| --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for row in engine.top_cofailure_rows(side=side, limit=limit):
        metric = row.both_pass_rate if side == "adversarial" else row.both_block_rate
        lines.append(
            "| `{}` | `{}` | {} | {} | {} | {} |".format(
                row.cell_id,
                arch_label((row.guard_id_a, row.guard_id_b)),
                fmt(metric),
                fmt(row.correlation),
                fmt(row.disagreement_rate),
                row.n_examples,
            )
        )
    return lines


def render_certificate_markdown(certificate: StackCertificate, engine: CassEngine | None = None) -> str:
    lines: list[str] = [
        "# StackCert Evidence Packet",
        "",
        "## Summary",
        "",
        f"- Certificate ID: `{certificate.certificate_id}`",
        f"- Run ID: `{certificate.run_id}`",
        f"- Generated at: `{certificate.generated_at}`",
        f"- Status: `{certificate.status}`",
        f"- Recommended stack: `{arch_label(certificate.recommended_architecture.guard_ids)}`",
        f"- Certified stack: `{arch_label(certificate.certified_architecture.guard_ids) if certificate.certified_architecture else 'None'}`",
        f"- Welfare profile: `{certificate.welfare_profile.name}` with lambda `{certificate.welfare_profile.lambda_cost}`",
        "",
        "## Methodology",
        "",
        f"- Method: `{certificate.assumptions.get('method_id', 'cass')}`",
        f"- Method version: `{certificate.assumptions.get('method_version', 'cass-v2-atom-correlation-search')}`",
        f"- Evidence engine: `{certificate.assumptions.get('evidence_engine', 'old_cass')}`",
        f"- Evidence engine version: `{certificate.assumptions.get('evidence_engine_version', 'old_cass-k2-serial-interval-v1')}`",
        "- Interpretation: CASS is the current atom-aware, correlation-aware committee search policy. old_cass is the retained K<=2 serial interval evidence layer used for this packet.",
        "- External priors: no closed-source or large-scale benchmark prior is applied unless source-backed priors are explicitly provided.",
        "",
        "## Benchmark Mixture",
        "",
        "| cell | side | source | normalized weight | examples |",
        "| --- | --- | --- | ---: | ---: |",
    ]
    for cell in certificate.benchmark_cells:
        count = cell.metadata.get("example_count", "")
        lines.append(f"| `{cell.cell_id}` | {cell.side} | {cell.source} | {fmt(cell.weight)} | {count} |")

    lines.extend(
        [
            "",
            "## Validation",
            "",
            f"- Examples: `{certificate.validation_report.examples}`",
            f"- Guards: `{certificate.validation_report.guards}`",
            f"- Outputs: `{certificate.validation_report.outputs}`",
            f"- Complete: `{certificate.validation_report.complete}`",
        ]
    )
    if certificate.validation_report.issues:
        for issue in certificate.validation_report.issues:
            lines.append(f"- `{issue.severity}` `{issue.code}`: {issue.message}")

    lines.extend(["", "## Stack Ranking", ""])
    lines.extend(render_welfare_rows(certificate.welfare_estimates))
    lines.extend(["", "## Competitor Comparisons", ""])
    lines.extend(render_comparison_rows(certificate.comparisons))
    lines.extend(["", "## Measurement Recommendations", ""])
    lines.extend(render_measurement_rows(certificate))

    if engine is not None:
        lines.extend(["", "## Adversarial Co-Miss Diagnostics", ""])
        lines.extend(render_cofailure_rows(engine, side="adversarial"))
        lines.extend(["", "## Benign False-Block Overlap Diagnostics", ""])
        lines.extend(render_cofailure_rows(engine, side="benign"))

    lines.extend(["", "## Assumptions", ""])
    for key, value in certificate.assumptions.items():
        lines.append(f"- `{key}`: `{value}`")

    lines.extend(["", "## Limitations", ""])
    for item in certificate.limitations:
        lines.append(f"- {item}")

    lines.extend(["", "## Re-Certification Triggers", ""])
    for item in certificate.recertification_triggers:
        lines.append(f"- {item}")

    lines.append("")
    return "\n".join(lines)


def write_certificate_markdown(
    certificate: StackCertificate,
    path: str | Path,
    *,
    engine: CassEngine | None = None,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_certificate_markdown(certificate, engine=engine), encoding="utf-8")
