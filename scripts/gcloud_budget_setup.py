#!/usr/bin/env python3
"""Create or update a conservative StackCert project budget in Google Cloud Billing."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from typing import Any

DEFAULT_AMOUNT_USD = 50.0
DEFAULT_DISPLAY_NAME = "StackCert staging $50"
STACKCERT_STAGING_PREFIX = "StackCert staging $"


def run(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    if check and completed.returncode != 0:
        sys.stderr.write(completed.stderr)
        raise SystemExit(completed.returncode)
    return completed


def load_json(command: list[str]) -> Any:
    completed = run(command)
    return json.loads(completed.stdout or "null")


def billing_account_for_project(gcloud: str, project_id: str) -> str:
    payload = load_json([gcloud, "billing", "projects", "describe", project_id, "--format=json"])
    if not payload.get("billingEnabled"):
        raise SystemExit(f"Billing is not enabled for {project_id}; cannot create a project budget.")
    account = str(payload.get("billingAccountName") or "").removeprefix("billingAccounts/")
    if not account:
        raise SystemExit(f"No billing account was returned for {project_id}.")
    return account


def project_number(gcloud: str, project_id: str) -> str | None:
    completed = run([gcloud, "projects", "describe", project_id, "--format=json"], check=False)
    if completed.returncode != 0:
        return None
    payload = json.loads(completed.stdout or "{}")
    number = payload.get("projectNumber")
    return str(number) if number else None


def enable_budget_api(gcloud: str, project_id: str) -> None:
    run([gcloud, "services", "enable", "billingbudgets.googleapis.com", "--project", project_id])


def list_budgets(gcloud: str, billing_account: str, billing_project: str) -> list[dict[str, Any]]:
    payload = load_json(
        [
            gcloud,
            "billing",
            "budgets",
            "list",
            "--billing-account",
            billing_account,
            "--billing-project",
            billing_project,
            "--format=json",
        ]
    )
    return payload if isinstance(payload, list) else []


def find_budget(
    budgets: list[dict[str, Any]],
    display_name: str,
    project_id: str,
    project_number_value: str | None = None,
) -> dict[str, Any] | None:
    project_scopes = {project_id, f"projects/{project_id}"}
    if project_number_value:
        project_scopes.update({project_number_value, f"projects/{project_number_value}"})

    scoped_budgets: list[dict[str, Any]] = []
    for budget in budgets:
        projects = set((budget.get("budgetFilter") or {}).get("projects") or [])
        if not projects or project_scopes & projects:
            scoped_budgets.append(budget)

    for budget in scoped_budgets:
        if budget.get("displayName") == display_name:
            return budget

    for budget in scoped_budgets:
        if str(budget.get("displayName") or "").startswith(STACKCERT_STAGING_PREFIX):
            return budget

    return None


def create_budget(
    gcloud: str,
    billing_account: str,
    billing_project: str,
    project_id: str,
    display_name: str,
    amount_usd: float,
) -> dict[str, Any]:
    amount = f"{amount_usd:.2f}USD"
    payload = load_json(
        [
            gcloud,
            "billing",
            "budgets",
            "create",
            "--billing-account",
            billing_account,
            "--billing-project",
            billing_project,
            "--display-name",
            display_name,
            "--budget-amount",
            amount,
            "--calendar-period",
            "month",
            "--filter-projects",
            f"projects/{project_id}",
            "--credit-types-treatment",
            "exclude-all-credits",
            "--threshold-rule",
            "percent=0.50",
            "--threshold-rule",
            "percent=0.90",
            "--threshold-rule",
            "percent=1.00",
            "--threshold-rule",
            "percent=1.00,basis=forecasted-spend",
            "--format=json",
        ]
    )
    return payload if isinstance(payload, dict) else {}


def update_budget(
    gcloud: str,
    billing_project: str,
    budget_name: str,
    display_name: str,
    amount_usd: float,
) -> dict[str, Any]:
    amount = f"{amount_usd:.2f}USD"
    payload = load_json(
        [
            gcloud,
            "billing",
            "budgets",
            "update",
            budget_name,
            "--billing-project",
            billing_project,
            "--display-name",
            display_name,
            "--budget-amount",
            amount,
            "--format=json",
        ]
    )
    return payload if isinstance(payload, dict) else {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--amount-usd", type=float, default=DEFAULT_AMOUNT_USD)
    parser.add_argument("--billing-account")
    parser.add_argument("--billing-project")
    parser.add_argument("--display-name", default=DEFAULT_DISPLAY_NAME)
    parser.add_argument("--gcloud", default="gcloud")
    args = parser.parse_args()

    billing_account = args.billing_account or billing_account_for_project(args.gcloud, args.project_id)
    billing_project = args.billing_project or args.project_id
    project_number_value = project_number(args.gcloud, args.project_id)

    print(f"Ensuring Billing Budget API is enabled on quota project {billing_project}...")
    enable_budget_api(args.gcloud, billing_project)

    budgets: list[dict[str, Any]] = []
    last_error = ""
    for _ in range(6):
        completed = run(
            [
                args.gcloud,
                "billing",
                "budgets",
                "list",
                "--billing-account",
                billing_account,
                "--billing-project",
                billing_project,
                "--format=json",
            ],
            check=False,
        )
        if completed.returncode == 0:
            budgets = json.loads(completed.stdout or "[]")
            break
        last_error = completed.stderr
        time.sleep(10)
    else:
        sys.stderr.write(last_error)
        return 1

    existing = find_budget(budgets, args.display_name, args.project_id, project_number_value)
    if existing:
        budget = update_budget(
            args.gcloud,
            billing_project,
            str(existing.get("name")),
            args.display_name,
            args.amount_usd,
        )
        print(f"Updated budget: {budget.get('name')} ({budget.get('displayName')})")
        print(
            "Budget amount: $%.2f/month, gross usage before credits, alerts use the existing budget threshold rules."
            % args.amount_usd
        )
        return 0

    budget = create_budget(
        args.gcloud,
        billing_account,
        billing_project,
        args.project_id,
        args.display_name,
        args.amount_usd,
    )
    print(f"Created budget: {budget.get('name')} ({budget.get('displayName')})")
    print("Budget amount: $%.2f/month, gross usage before credits, alerts at 50%%, 90%%, 100%%, and forecasted 100%%." % args.amount_usd)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
