#!/usr/bin/env python3
"""Create or rotate StackCert Cloud Run runtime secrets in Secret Manager."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


DEFAULT_SUPABASE_PROJECT_REF = "cgwiwmfzpektpyquiveg"


def run(
    command: list[str],
    *,
    input_text: str | None = None,
    check: bool = True,
    quiet: bool = False,
) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        command,
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and completed.returncode != 0:
        if not quiet:
            sys.stderr.write(completed.stderr)
        raise SystemExit(completed.returncode)
    return completed


def key_value(item: dict[str, Any]) -> str | None:
    value = item.get("api_key") or item.get("key") or item.get("value") or item.get("secret")
    if not value:
        return None
    text = str(value)
    if not text.isascii() or "·" in text:
        return None
    return text


def load_supabase_secret_key(keys_path: Path, prefer: str) -> str:
    data = json.loads(keys_path.read_text())
    if not isinstance(data, list):
        raise SystemExit(f"{keys_path} did not contain a Supabase API key list")

    secret_keys = [
        item
        for item in data
        if item.get("type") == "secret" and (item.get("secret_jwt_template") or {}).get("role") == "service_role"
    ]
    legacy_keys = [item for item in data if item.get("id") == "service_role" or item.get("name") == "service_role"]

    ordered: list[dict[str, Any]]
    if prefer == "secret":
        ordered = secret_keys + legacy_keys
    elif prefer == "legacy":
        ordered = legacy_keys + secret_keys
    else:
        ordered = secret_keys + legacy_keys

    for item in ordered:
        value = key_value(item)
        if value:
            return value
    raise SystemExit(f"{keys_path} did not contain a usable secret/service-role API key")


def secret_exists(gcloud: str, project_id: str, name: str) -> bool:
    completed = run(
        [gcloud, "secrets", "describe", name, "--project", project_id, "--format", "value(name)"],
        check=False,
        quiet=True,
    )
    return completed.returncode == 0


def upsert_secret(gcloud: str, project_id: str, name: str, value: str) -> str:
    if secret_exists(gcloud, project_id, name):
        run([gcloud, "secrets", "versions", "add", name, "--data-file=-", "--project", project_id], input_text=value)
        return "version-added"

    run(
        [
            gcloud,
            "secrets",
            "create",
            name,
            "--replication-policy=automatic",
            "--data-file=-",
            "--project",
            project_id,
        ],
        input_text=value,
    )
    return "created"


def grant_access(gcloud: str, project_id: str, secret_name: str, service_account_email: str) -> None:
    run(
        [
            gcloud,
            "secrets",
            "add-iam-policy-binding",
            secret_name,
            "--member",
            f"serviceAccount:{service_account_email}",
            "--role",
            "roles/secretmanager.secretAccessor",
            "--project",
            project_id,
            "--quiet",
        ],
        quiet=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-id", required=True, help="GCP project id")
    parser.add_argument("--gcloud", default=os.getenv("GCLOUD_BIN", "gcloud"), help="Path to the gcloud binary")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="Supabase project URL")
    parser.add_argument("--supabase-project-ref", default=DEFAULT_SUPABASE_PROJECT_REF, help="Supabase project ref")
    parser.add_argument(
        "--supabase-keys-json",
        default=os.getenv("SUPABASE_KEYS_JSON", "/tmp/stackcert_supabase_keys.json"),
        help="JSON output from `supabase projects api-keys --output json`",
    )
    parser.add_argument(
        "--prefer-key",
        choices=("auto", "secret", "legacy"),
        default="auto",
        help="Prefer the current sb_secret key or the legacy service_role key",
    )
    parser.add_argument(
        "--service-account-email",
        help="Optional Cloud Run runtime service account to grant secret accessor access",
    )
    args = parser.parse_args()

    supabase_url = args.supabase_url or f"https://{args.supabase_project_ref}.supabase.co"
    supabase_secret_key = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or load_supabase_secret_key(Path(args.supabase_keys_json), args.prefer_key)
    )

    secrets = {
        "stackcert-supabase-url": supabase_url,
        "stackcert-supabase-secret-key": supabase_secret_key,
    }
    for name, value in secrets.items():
        action = upsert_secret(args.gcloud, args.project_id, name, value)
        print(f"{name}: {action}")
        if args.service_account_email:
            grant_access(args.gcloud, args.project_id, name, args.service_account_email)
            print(f"{name}: granted secretAccessor to {args.service_account_email}")

    print("cloud run secrets ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
