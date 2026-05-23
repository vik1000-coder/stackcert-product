from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from stackcert.data.schemas import BenchmarkExample, GuardOutput
from stackcert.guards.base import GuardAdapter


@dataclass
class EvaluationRunner:
    adapters: tuple[GuardAdapter, ...]

    def run(self, examples: Iterable[BenchmarkExample]) -> list[GuardOutput]:
        outputs: list[GuardOutput] = []
        example_list = list(examples)
        for adapter in self.adapters:
            for example in example_list:
                outputs.append(adapter.score(example))
        return outputs

