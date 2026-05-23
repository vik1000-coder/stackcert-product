from __future__ import annotations

import random
from collections import defaultdict

from stackcert.data.schemas import BenchmarkExample


def sample_within_cells(
    examples: list[BenchmarkExample],
    *,
    per_cell: int | None = None,
    seed: int = 0,
    with_replacement: bool = False,
) -> list[BenchmarkExample]:
    rng = random.Random(seed)
    by_cell: dict[str, list[BenchmarkExample]] = defaultdict(list)
    for example in examples:
        by_cell[example.cell_id].append(example)

    sampled: list[BenchmarkExample] = []
    for rows in by_cell.values():
        n = per_cell if per_cell is not None else len(rows)
        if with_replacement:
            sampled.extend(rng.choice(rows) for _ in range(n))
        else:
            rows = list(rows)
            rng.shuffle(rows)
            sampled.extend(rows[: min(n, len(rows))])
    return sampled

