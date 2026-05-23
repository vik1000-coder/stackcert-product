from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

STATUS_RANK = {
    "valid": 3,
    "provisional": 2,
    "needs_measurement": 1,
    "missing": 0,
    "expired": 0,
    "revoked": 0,
    "failed": 0,
}


def fetch_certificate_status(base_url: str, project_id: str, lambda_cost: float, token: str | None, timeout: float) -> dict[str, Any]:
    query = urllib.parse.urlencode({"lambda_cost": lambda_cost})
    url = f"{base_url.rstrip('/')}/api/projects/{urllib.parse.quote(project_id)}/certificate-status?{query}"
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def evaluate_gate(payload: dict[str, Any], required_status: str = "valid", mode: str = "fail") -> dict[str, Any]:
    status = str(payload.get("status") or "missing")
    required_rank = STATUS_RANK.get(required_status, STATUS_RANK["valid"])
    actual_rank = STATUS_RANK.get(status, 0)
    blocking_reasons = list(payload.get("blocking_reasons") or [])
    if actual_rank < required_rank and not blocking_reasons:
        blocking_reasons.append(f"certificate_{status}_does_not_meet_required_{required_status}")
    ok = actual_rank >= required_rank
    return {
        "ok": ok,
        "mode": mode,
        "required_status": required_status,
        "status": status,
        "certificate_id": payload.get("certificate_id"),
        "scope": payload.get("scope"),
        "blocking_reasons": blocking_reasons,
        "not_a_guarantee": bool(payload.get("not_a_guarantee", True)),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Gate a deployment on StackCert certificate status.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--project-id", default="proj_acme_copilot")
    parser.add_argument("--lambda-cost", type=float, default=5.0)
    parser.add_argument("--require", choices=tuple(STATUS_RANK), default="valid")
    parser.add_argument("--mode", choices=("fail", "warn"), default="fail")
    parser.add_argument("--token", default=None)
    parser.add_argument("--timeout", type=float, default=10.0)
    args = parser.parse_args(argv)

    try:
        payload = fetch_certificate_status(args.base_url, args.project_id, args.lambda_cost, args.token, args.timeout)
        result = evaluate_gate(payload, required_status=args.require, mode=args.mode)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
        result = {
            "ok": False,
            "mode": args.mode,
            "required_status": args.require,
            "status": "missing",
            "certificate_id": None,
            "scope": None,
            "blocking_reasons": [f"certificate_status_unavailable: {exc}"],
            "not_a_guarantee": True,
        }

    print(json.dumps(result, sort_keys=True))
    if result["ok"] or args.mode == "warn":
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
