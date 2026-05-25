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


def fetch_release_gate(base_url: str, project_id: str, payload: dict[str, Any], token: str | None, timeout: float) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}/api/projects/{urllib.parse.quote(project_id)}/release-gates/evaluate"
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = json.loads(response.read().decode("utf-8"))
    return body.get("release_gate") or body


def evaluate_gate(payload: dict[str, Any], required_status: str = "valid", mode: str = "fail") -> dict[str, Any]:
    if "decision" in payload:
        decision = str(payload.get("decision") or "block")
        ok = decision == "pass" or mode == "warn"
        return {
            "ok": ok,
            "mode": mode,
            "required_status": payload.get("required_status") or required_status,
            "status": payload.get("status") or "missing",
            "decision": decision,
            "run_id": payload.get("run_id"),
            "certificate_id": payload.get("certificate_id") or payload.get("release_evidence_id"),
            "scope": (payload.get("assumptions") or {}).get("scope"),
            "blocking_reasons": list(payload.get("blocking_reasons") or []),
            "warnings": list(payload.get("warnings") or []),
            "not_a_guarantee": bool((payload.get("assumptions") or {}).get("not_a_guarantee", True)),
        }
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
    parser.add_argument("--release-gate", action="store_true", help="Use the production release-gate API instead of the legacy certificate-status endpoint.")
    parser.add_argument("--environment", default=None)
    parser.add_argument("--model-id", default=None)
    parser.add_argument("--model-version", default=None)
    parser.add_argument("--prompt-hash", default=None)
    parser.add_argument("--policy-hash", default=None)
    parser.add_argument("--benchmark-suite-id", default=None)
    parser.add_argument("--benchmark-suite-version", default=None)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--deployment-ref", default=None)
    parser.add_argument("--commit-sha", default=None)
    parser.add_argument("--guard-version", action="append", default=[], help="Expected guard connector version as guard_key=version. Repeatable.")
    parser.add_argument("--changed", action="append", default=[], help="A change since evidence that should force retest. Repeatable.")
    args = parser.parse_args(argv)

    try:
        if args.release_gate:
            payload = fetch_release_gate(
                args.base_url,
                args.project_id,
                {
                    "environment": args.environment,
                    "model_id": args.model_id,
                    "model_version": args.model_version,
                    "prompt_hash": args.prompt_hash,
                    "policy_hash": args.policy_hash,
                    "benchmark_suite_id": args.benchmark_suite_id,
                    "benchmark_suite_version": args.benchmark_suite_version,
                    "run_id": args.run_id,
                    "deployment_ref": args.deployment_ref,
                    "commit_sha": args.commit_sha,
                    "changed_since_evidence": args.changed,
                    "guard_connector_versions": _guard_versions(args.guard_version),
                    "required_status": args.require,
                    "mode": args.mode,
                    "lambda_cost": args.lambda_cost,
                },
                args.token,
                args.timeout,
            )
        else:
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


def _guard_versions(values: list[str]) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for value in values:
        if "=" not in value:
            raise RuntimeError(f"Invalid --guard-version value {value!r}; expected guard_key=version")
        guard_key, version = value.split("=", 1)
        if guard_key.strip() and version.strip():
            parsed[guard_key.strip()] = version.strip()
    return parsed


if __name__ == "__main__":
    raise SystemExit(main())
