from __future__ import annotations

from collections import defaultdict

from stackcert.data.schemas import (
    BenchmarkCell,
    BenchmarkExample,
    Guard,
    GuardOutput,
    ValidationIssue,
    ValidationReport,
)


def validate_project(
    guards: list[Guard],
    cells: list[BenchmarkCell],
    examples: list[BenchmarkExample],
    outputs: list[GuardOutput],
) -> ValidationReport:
    guard_ids = {guard.guard_id for guard in guards}
    cell_ids = {cell.cell_id for cell in cells}
    example_ids = {example.example_id for example in examples}
    issues: list[ValidationIssue] = []

    for example in examples:
        if example.cell_id not in cell_ids:
            issues.append(
                ValidationIssue(
                    "error",
                    "unknown_cell",
                    f"Example {example.example_id} references unknown cell {example.cell_id}.",
                    {"example_id": example.example_id, "cell_id": example.cell_id},
                )
            )

    outputs_by_guard: dict[str, set[str]] = defaultdict(set)
    for output in outputs:
        if output.guard_id not in guard_ids:
            issues.append(
                ValidationIssue(
                    "warning",
                    "unknown_guard_output",
                    f"Output references guard not present in catalog: {output.guard_id}.",
                    {"guard_id": output.guard_id},
                )
            )
        if output.example_id not in example_ids:
            issues.append(
                ValidationIssue(
                    "error",
                    "unknown_example_output",
                    f"Output references unknown example {output.example_id}.",
                    {"example_id": output.example_id},
                )
            )
        if not 0.0 <= output.pass_probability <= 1.0 or not 0.0 <= output.block_probability <= 1.0:
            issues.append(
                ValidationIssue(
                    "error",
                    "invalid_probability",
                    f"Output for {output.guard_id}/{output.example_id} has probability outside [0, 1].",
                    {"guard_id": output.guard_id, "example_id": output.example_id},
                )
            )
        if output.error:
            issues.append(
                ValidationIssue(
                    "warning",
                    "guard_error",
                    f"Output for {output.guard_id}/{output.example_id} recorded an adapter error.",
                    {"guard_id": output.guard_id, "example_id": output.example_id, "error": output.error},
                )
            )
        outputs_by_guard[output.guard_id].add(output.example_id)

    for guard in guards:
        missing = example_ids.difference(outputs_by_guard.get(guard.guard_id, set()))
        if missing:
            issues.append(
                ValidationIssue(
                    "error",
                    "missing_outputs",
                    f"Guard {guard.guard_id} is missing {len(missing)} outputs.",
                    {"guard_id": guard.guard_id, "missing_count": len(missing)},
                )
            )

    return ValidationReport(
        examples=len(examples),
        guards=len(guards),
        outputs=len(outputs),
        complete=not any(issue.severity == "error" for issue in issues),
        issues=tuple(issues),
    )

