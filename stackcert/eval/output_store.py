from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from stackcert.data.importers import load_guard_outputs_jsonl, write_jsonl
from stackcert.data.schemas import GuardOutput


class JSONLOutputStore:
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def write(self, outputs: list[GuardOutput]) -> None:
        write_jsonl(self.path, [asdict(output) for output in outputs])

    def read(self) -> list[GuardOutput]:
        return load_guard_outputs_jsonl(self.path)

