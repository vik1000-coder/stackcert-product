#!/usr/bin/env python3
"""Smoke-test the signed generic release-gate webhook with one valid and one invalid signature."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.request


def post_json(url: str, raw_body: bytes, headers: dict[str, str]) -> tuple[int, dict[str, object]]:
    request = urllib.request.Request(
        url,
        data=raw_body,
        headers={"User-Agent": "StackCertReleaseWebhookSmoke/1.0", "Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8", errors="replace")
        try:
            return error.code, json.loads(text)
        except json.JSONDecodeError:
            return error.code, {"error": text}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def signature(secret: str, timestamp: str, raw_body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), timestamp.encode("utf-8") + b"." + raw_body, hashlib.sha256).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--secret-env", default="STACKCERT_RELEASE_WEBHOOK_SECRET")
    parser.add_argument("--run-id")
    parser.add_argument("--environment", default="production")
    parser.add_argument("--required-status", default="needs_measurement")
    args = parser.parse_args()

    secret = os.environ.get(args.secret_env)
    require(bool(secret), f"{args.secret_env} must contain the webhook signing secret")
    body = {
        "event_id": f"webhook-smoke-{int(time.time())}",
        "event_source": "release_gate_webhook_smoke",
        "event_type": "deployment_candidate",
        "environment": args.environment,
        "required_status": args.required_status,
        "mode": "fail",
        "lambda_cost": 5,
    }
    if args.run_id:
        body["run_id"] = args.run_id
    raw_body = json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8")
    timestamp = str(int(time.time()))
    url = f"{args.api_url.rstrip('/')}/api/projects/{args.project_id}/release-gates/webhook"
    valid_status, valid_payload = post_json(
        url,
        raw_body,
        {
            "X-StackCert-Timestamp": timestamp,
            "X-StackCert-Signature": "sha256=" + signature(secret or "", timestamp, raw_body),
        },
    )
    require(valid_status == 200, f"valid webhook returned {valid_status}: {valid_payload}")
    release_gate = valid_payload.get("release_gate")
    require(isinstance(release_gate, dict), f"valid webhook lacked release_gate: {valid_payload}")
    require(release_gate.get("decision") in {"pass", "warn", "block"}, f"unexpected release decision: {release_gate}")

    invalid_status, _ = post_json(
        url,
        raw_body,
        {
            "X-StackCert-Timestamp": timestamp,
            "X-StackCert-Signature": "sha256=" + ("0" * 64),
        },
    )
    require(invalid_status == 401, f"invalid signature should fail with 401, got {invalid_status}")
    print(f"release-gate webhook smoke OK: decision={release_gate.get('decision')}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"release-gate webhook smoke failed: {error}", file=sys.stderr)
        raise SystemExit(1)
