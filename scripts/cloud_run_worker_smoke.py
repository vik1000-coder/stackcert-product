#!/usr/bin/env python3
"""Smoke-check the deployed StackCert Cloud Run worker job."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Any

DEFAULT_HEADERS = {"User-Agent": "StackCertCloudRunWorkerSmoke/1.0"}


def read_json(url: str, headers: dict[str, str] | None = None) -> tuple[int, dict[str, Any]]:
    request = urllib.request.Request(url, headers={**DEFAULT_HEADERS, "Accept": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8", errors="replace")
        try:
            return error.code, json.loads(text)
        except json.JSONDecodeError:
            return error.code, {"error": text}


def post_json(url: str, body: dict[str, Any], headers: dict[str, str] | None = None) -> tuple[int, dict[str, Any]]:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={**DEFAULT_HEADERS, "Accept": "application/json", "Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
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


def fetch_supabase_token(args: argparse.Namespace) -> str:
    anon_key = os.environ.get(args.anon_key_env)
    require(bool(anon_key), f"{args.anon_key_env} must be set")
    status, payload = post_json(
        f"{args.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
        {"email": args.email, "password": args.password},
        {"apikey": anon_key or ""},
    )
    require(status == 200, f"Supabase token request returned {status}: {payload}")
    token = str(payload.get("access_token") or "")
    require(token.startswith("ey"), "Supabase token response did not include a JWT access token")
    return token


def execute_cloud_run_job(args: argparse.Namespace) -> None:
    command = [
        args.gcloud,
        "run",
        "jobs",
        "execute",
        args.job_name,
        "--project",
        args.project_id,
        "--region",
        args.region,
        "--wait",
        "--quiet",
    ]
    completed = subprocess.run(command, check=False, text=True, capture_output=True, timeout=args.execute_timeout_seconds)
    if completed.returncode != 0:
        raise AssertionError(
            "Cloud Run worker job execution failed:\n"
            f"stdout:\n{completed.stdout[-2000:]}\n"
            f"stderr:\n{completed.stderr[-2000:]}"
        )


def wait_for_job_complete(api_base: str, job_id: str, headers: dict[str, str], timeout_seconds: int) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_payload: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        status, payload = read_json(f"{api_base}/api/jobs/{job_id}", headers)
        require(status == 200, f"job read returned {status}: {payload}")
        last_payload = payload
        job = payload.get("job") if isinstance(payload, dict) else None
        if isinstance(job, dict) and job.get("status") in {"complete", "complete_with_errors", "failed", "canceled"}:
            return job
        time.sleep(2)
    raise AssertionError(f"Timed out waiting for worker job {job_id}; last payload: {last_payload}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True, help="Base URL for the deployed StackCert API")
    parser.add_argument("--supabase-url", required=True, help="Supabase project URL for auth")
    parser.add_argument("--email", required=True, help="Smoke-test user email")
    parser.add_argument("--password", required=True, help="Smoke-test user password")
    parser.add_argument("--project-id", required=True, help="Google Cloud project id")
    parser.add_argument("--region", default="us-central1")
    parser.add_argument("--job-name", default="stackcert-worker")
    parser.add_argument("--gcloud", default=os.environ.get("GCLOUD_BIN", "gcloud"))
    parser.add_argument("--poll-timeout-seconds", type=int, default=180)
    parser.add_argument("--execute-timeout-seconds", type=int, default=900)
    parser.add_argument(
        "--anon-key-env",
        default="STACKCERT_SMOKE_SUPABASE_ANON_KEY",
        help="Environment variable containing the Supabase publishable/anon key",
    )
    args = parser.parse_args()

    api_base = args.api_url.rstrip("/")
    token = fetch_supabase_token(args)
    headers = {"Authorization": f"Bearer {token}"}
    status, payload = post_json(
        f"{api_base}/api/projects/proj_acme_copilot/evaluation-jobs",
        {
            "guard_ids": ["lexical_guard", "rules_policy"],
            "examples_per_cell": 1,
            "seed": int(time.time()) % 10_000,
            "adapter_mode": "deterministic_fixture",
            "execution_mode": "queued",
        },
        headers,
    )
    require(status == 200, f"queued job create returned {status}: {payload}")
    job = payload.get("job") if isinstance(payload, dict) else None
    require(isinstance(job, dict), f"queued job payload was unexpected: {payload}")
    job_id = str(job["id"])
    require(job.get("status") == "queued", f"worker smoke expected a queued job, got: {job}")

    execute_cloud_run_job(args)
    completed = wait_for_job_complete(api_base, job_id, headers, args.poll_timeout_seconds)
    require(completed.get("status") in {"complete", "complete_with_errors"}, f"worker job did not complete cleanly: {completed}")
    require(completed.get("locked_by") is None, f"worker lease should be cleared after completion: {completed}")
    print(json.dumps({"status": "cloud run worker smoke OK", "job_id": job_id, "final_status": completed.get("status")}, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, urllib.error.URLError, json.JSONDecodeError, subprocess.SubprocessError) as exc:
        print(f"cloud run worker smoke failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
