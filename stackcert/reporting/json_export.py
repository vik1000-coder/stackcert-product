from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any

from stackcert.data.schemas import StackCertificate


def to_jsonable(value: Any) -> Any:
    if is_dataclass(value):
        return to_jsonable(asdict(value))
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(item) for item in value]
    return value


def certificate_to_dict(certificate: StackCertificate) -> dict[str, Any]:
    return to_jsonable(certificate)


def write_certificate_json(certificate: StackCertificate, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(certificate_to_dict(certificate), indent=2, sort_keys=True) + "\n", encoding="utf-8")

