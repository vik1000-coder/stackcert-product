from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

from stackcert.data.schemas import BenchmarkCell, BenchmarkExample, Guard, GuardOutput


def read_jsonl(path: str | Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with Path(path).open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def write_jsonl(path: str | Path, rows: Iterable[dict[str, Any]]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True, sort_keys=True))
            handle.write("\n")


def read_csv(path: str | Path) -> list[dict[str, str]]:
    with Path(path).open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def prompt_hash(prompt_text: str) -> str:
    return hashlib.sha256(prompt_text.encode("utf-8")).hexdigest()


def normalize_side(value: str) -> str:
    side = str(value).strip().lower()
    if side in {"a", "adv", "adversarial", "harmful", "unsafe"}:
        return "adversarial"
    if side in {"n", "benign", "safe", "clean", "normal"}:
        return "benign"
    raise ValueError(f"unknown benchmark side: {value!r}")


def load_examples_jsonl(
    path: str | Path,
    *,
    retain_prompt_text: bool = False,
    default_weight: float = 1.0,
) -> tuple[list[BenchmarkCell], list[BenchmarkExample]]:
    """Load StackCert examples or the existing CASS research JSONL format."""

    rows = read_jsonl(path)
    cells_by_id: dict[str, BenchmarkCell] = {}
    examples: list[BenchmarkExample] = []
    counts_by_cell: dict[str, int] = {}
    raw_cell_rows: dict[str, dict[str, Any]] = {}

    for row in rows:
        cell_id = str(row.get("cell_id") or row.get("benchmark_cell"))
        if not cell_id:
            raise ValueError("example row is missing cell_id or benchmark_cell")
        counts_by_cell[cell_id] = counts_by_cell.get(cell_id, 0) + 1
        raw_cell_rows.setdefault(cell_id, row)

    for cell_id, first_row in sorted(raw_cell_rows.items()):
        side_value = first_row.get("side") or first_row.get("label_side") or cell_id.split("/", 1)[0]
        source = str(first_row.get("source") or first_row.get("source_dataset") or cell_id.split("/", 1)[-1])
        cells_by_id[cell_id] = BenchmarkCell(
            cell_id=cell_id,
            side=normalize_side(side_value),  # type: ignore[arg-type]
            source=source,
            weight=float(first_row.get("weight", default_weight)),
            policy_category=first_row.get("policy_category"),
            metadata={"example_count": counts_by_cell[cell_id]},
        )

    examples = []
    for row in rows:
        prompt_text = str(row.get("prompt_text") or row.get("prompt") or row.get("prompt_redacted") or "")
        cell_id = str(row.get("cell_id") or row.get("benchmark_cell"))
        examples.append(
            BenchmarkExample(
                example_id=str(row["example_id"]),
                cell_id=cell_id,
                prompt_hash=str(row.get("prompt_hash") or prompt_hash(prompt_text)),
                prompt_redacted=row.get("prompt_redacted") or (prompt_text[:240] if prompt_text else None),
                prompt_text=prompt_text if retain_prompt_text else None,
                source=row.get("source") or row.get("source_dataset"),
                policy_category=row.get("policy_category"),
                metadata={k: v for k, v in row.items() if k not in {"prompt_text", "prompt", "prompt_redacted"}},
            )
        )

    return list(cells_by_id.values()), examples


def load_guard_outputs_jsonl(path: str | Path, *, run_id: str = "imported") -> list[GuardOutput]:
    rows = read_jsonl(path)
    outputs: list[GuardOutput] = []
    for row in rows:
        if "binary_pass" in row:
            binary_pass = bool(row["binary_pass"])
        elif "block_decision" in row:
            binary_pass = int(row["block_decision"]) == 0
        elif "binary_block" in row:
            binary_pass = not bool(row["binary_block"])
        else:
            raise ValueError("guard output row is missing binary_pass or block_decision")

        if "block_probability" in row:
            block_probability = float(row["block_probability"])
        elif row.get("block_score_raw") is not None:
            block_probability = max(0.0, min(1.0, float(row["block_score_raw"])))
        else:
            block_probability = 0.0 if binary_pass else 1.0

        outputs.append(
            GuardOutput(
                run_id=str(row.get("run_id") or run_id),
                example_id=str(row["example_id"]),
                guard_id=str(row.get("guard_id") or row.get("agent_id")),
                pass_probability=max(0.0, min(1.0, float(row.get("pass_probability", 1.0 - block_probability)))),
                block_probability=block_probability,
                binary_pass=binary_pass,
                raw_score=float(row["raw_score"]) if row.get("raw_score") is not None else row.get("block_score_raw"),
                output_metadata={k: v for k, v in row.items() if k not in {"raw_output"}},
                error=row.get("error"),
            )
        )
    return outputs


def infer_guards_from_outputs(outputs: Iterable[GuardOutput], *, default_type: str = "imported") -> list[Guard]:
    guards: dict[str, Guard] = {}
    for output in outputs:
        if output.guard_id in guards:
            continue
        metadata = output.output_metadata
        guards[output.guard_id] = Guard(
            guard_id=output.guard_id,
            name=metadata.get("name") or output.guard_id,
            version=str(metadata.get("model_version") or metadata.get("version") or "unknown"),
            guard_type=str(metadata.get("guard_type") or default_type),
            threshold=metadata.get("threshold"),
            metadata={k: v for k, v in metadata.items() if k not in {"error"}},
        )
    return sorted(guards.values(), key=lambda guard: guard.guard_id)

