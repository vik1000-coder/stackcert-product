#!/usr/bin/env python3
"""Read-only cost guardrail checks before a StackCert Cloud Run deploy."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    stdout: str
    stderr: str


def run(command: list[str]) -> CommandResult:
    completed = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    return CommandResult(completed.returncode, completed.stdout, completed.stderr)


def load_json(command: list[str]) -> tuple[Any | None, CommandResult]:
    result = run(command)
    if result.returncode != 0:
        return None, result
    try:
        return json.loads(result.stdout or "null"), result
    except json.JSONDecodeError:
        return None, CommandResult(result.returncode, result.stdout, result.stderr or "invalid JSON output")


def fail(message: str) -> None:
    print(f"FAIL: {message}")


def ok(message: str) -> None:
    print(f"OK: {message}")


def warn(message: str) -> None:
    print(f"WARN: {message}")


def project_number(gcloud: str, project_id: str) -> str | None:
    payload, result = load_json([gcloud, "projects", "describe", project_id, "--format=json"])
    if result.returncode != 0 or not isinstance(payload, dict):
        warn(f"Could not read project metadata for {project_id}: {result.stderr.strip()}")
        return None
    number = payload.get("projectNumber")
    return str(number) if number else None


def billing_info(gcloud: str, project_id: str) -> tuple[str | None, bool]:
    payload, result = load_json([gcloud, "billing", "projects", "describe", project_id, "--format=json"])
    if result.returncode != 0 or not isinstance(payload, dict):
        fail(f"Could not read billing status for {project_id}: {result.stderr.strip()}")
        return None, False

    enabled = bool(payload.get("billingEnabled"))
    account = str(payload.get("billingAccountName") or "")
    if enabled and account:
        ok(f"Billing is enabled for {project_id} on {account}")
        return account.removeprefix("billingAccounts/"), True

    fail(f"Billing is not enabled for {project_id}; Cloud Run deploy cannot proceed there.")
    return None, False


def budget_is_visible(gcloud: str, billing_account: str, project_id: str, number: str | None) -> bool:
    payload, result = load_json(
        [
            gcloud,
            "billing",
            "budgets",
            "list",
            "--billing-account",
            billing_account,
            "--billing-project",
            project_id,
            "--format=json",
        ]
    )
    if result.returncode != 0:
        fail(
            "Could not verify a billing budget through gcloud. Create/verify a project-scoped "
            f"budget for {project_id} in the console before deploy. gcloud said: {result.stderr.strip()}"
        )
        return False

    budgets = payload if isinstance(payload, list) else []
    if not budgets:
        fail(f"No budgets are visible for billing account {billing_account}. Create one before deploying.")
        return False

    project_tokens = {project_id, f"projects/{project_id}"}
    if number:
        project_tokens.add(f"projects/{number}")

    matching: list[dict[str, Any]] = []
    for budget in budgets:
        display_name = str(budget.get("displayName") or "")
        filter_payload = budget.get("budgetFilter") or {}
        projects = {str(item) for item in filter_payload.get("projects") or []}
        if project_tokens & projects or project_id.lower() in display_name.lower():
            matching.append(budget)

    if matching:
        names = ", ".join(str(budget.get("displayName") or budget.get("name")) for budget in matching)
        ok(f"Found visible budget(s) that appear scoped to {project_id}: {names}")
        return True

    warn("Budgets are visible, but none obviously match this project by scope or name.")
    fail(f"Create a project-scoped budget for {project_id} before deploying.")
    return False


def run_service_guardrails(gcloud: str, project_id: str, region: str, service: str, max_instances: int) -> bool:
    payload, result = load_json(
        [
            gcloud,
            "run",
            "services",
            "describe",
            service,
            "--region",
            region,
            "--project",
            project_id,
            "--format=json",
        ]
    )
    if result.returncode != 0:
        ok(f"Cloud Run service {service} does not exist yet in {region}; first deploy can use safe staging limits.")
        return True

    if not isinstance(payload, dict):
        fail(f"Could not parse Cloud Run service {service}.")
        return False

    annotations = ((payload.get("spec") or {}).get("template") or {}).get("metadata", {}).get("annotations", {})
    min_scale = annotations.get("autoscaling.knative.dev/minScale") or "0"
    max_scale = annotations.get("autoscaling.knative.dev/maxScale") or "unset"
    if str(min_scale) != "0":
        fail(f"{service} has minScale={min_scale}; staging should keep min instances at 0.")
        return False
    if max_scale != "unset" and int(max_scale) > max_instances:
        fail(f"{service} has maxScale={max_scale}; staging cap should be <= {max_instances}.")
        return False
    ok(f"Existing Cloud Run service {service} has staging-safe scale annotations.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--region", default="us-central1")
    parser.add_argument("--service", default="stackcert-api")
    parser.add_argument("--gcloud", default="gcloud")
    parser.add_argument("--max-instances", type=int, default=1)
    parser.add_argument(
        "--allow-unverified-budget",
        action="store_true",
        help="Allow success when billing is enabled but budget visibility cannot be verified.",
    )
    args = parser.parse_args()

    print(f"Cost preflight for project={args.project_id} region={args.region} service={args.service}")
    print("This script is read-only. It does not enable APIs, create resources, or deploy.")

    billing_account, billing_ok = billing_info(args.gcloud, args.project_id)
    budget_ok = False
    if billing_account:
        budget_ok = budget_is_visible(args.gcloud, billing_account, args.project_id, project_number(args.gcloud, args.project_id))
        if args.allow_unverified_budget and not budget_ok:
            warn("Budget verification was bypassed by --allow-unverified-budget.")
            budget_ok = True

    scale_ok = run_service_guardrails(args.gcloud, args.project_id, args.region, args.service, args.max_instances)

    if billing_ok and budget_ok and scale_ok:
        ok("Cost preflight passed.")
        return 0

    fail("Cost preflight did not pass. Do not deploy until the failed items are fixed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
