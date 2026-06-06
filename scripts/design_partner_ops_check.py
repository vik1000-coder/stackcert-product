"""Check non-Sentry design-partner production readiness evidence.

The script is intentionally local/read-only. It records the operational evidence
StackCert needs before real design-partner customer data enters the hosted pilot:
alerts, uptime checks, Supabase backup/restore, Auth email setup, and support
ownership. Sentry is intentionally not required by this checklist.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ReadinessCheck:
    key: str
    label: str
    evidence_prompt: str


REQUIRED_CHECKS = (
    ReadinessCheck(
        "api_health_uptime_check",
        "API health uptime check",
        "Uptime check id or URL proving /api/health is monitored.",
    ),
    ReadinessCheck(
        "authenticated_projects_uptime_check",
        "Authenticated projects uptime check",
        "Uptime check id or run id proving authenticated /api/projects is monitored.",
    ),
    ReadinessCheck(
        "cloudflare_proxy_uptime_check",
        "Cloudflare same-origin API proxy uptime check",
        "Uptime check id or run id proving the frontend-origin API proxy is monitored.",
    ),
    ReadinessCheck(
        "cloud_run_alerts",
        "Cloud Run log-based alerts",
        "Alert policy ids for API 5xx, worker dead letters, provider failures, and release-gate errors.",
    ),
    ReadinessCheck(
        "alert_notification_channels",
        "Alert notification channels",
        "Notification channel ids attached to the StackCert alert policies and the support destination they notify.",
    ),
    ReadinessCheck(
        "supabase_restore_rehearsal",
        "Supabase backup/restore rehearsal",
        "Restore date, source snapshot, restored target, operator, and verification command.",
    ),
    ReadinessCheck(
        "supabase_full_restore_rehearsal",
        "Supabase full restore rehearsal",
        "Repeatable restore evidence covering public/private schemas plus Supabase Storage metadata or private artifacts.",
    ),
    ReadinessCheck(
        "supabase_auth_email",
        "Supabase Auth sender and lifecycle email setup",
        "Sender domain, confirmation policy, invite copy, and account lifecycle copy review evidence.",
    ),
    ReadinessCheck(
        "customer_data_contract",
        "Customer data handling contract",
        "Pilot data mode, retention, deletion/export owner, and allowed artifact types.",
    ),
    ReadinessCheck(
        "support_owner",
        "Design-partner support owner",
        "Named owner, escalation channel, response target, and rollback contact.",
    ),
)


def readiness_report(evidence: dict[str, Any]) -> dict[str, Any]:
    items = []
    for check in REQUIRED_CHECKS:
        value = evidence.get(check.key)
        present = bool(str(value or "").strip())
        items.append(
            {
                **asdict(check),
                "status": "complete" if present else "missing",
                "evidence": str(value).strip() if present else "",
            }
        )
    missing = [item["key"] for item in items if item["status"] == "missing"]
    return {
        "status": "ready" if not missing else "missing_evidence",
        "sentry_required": False,
        "missing": missing,
        "items": items,
    }


def evidence_template() -> dict[str, str]:
    return {check.key: "" for check in REQUIRED_CHECKS}


def _read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("evidence JSON must be an object")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-json", type=Path, help="JSON object with readiness evidence keyed by check id.")
    parser.add_argument("--print-template", action="store_true", help="Print an empty evidence JSON template.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when required evidence is missing.")
    args = parser.parse_args(argv)

    if args.print_template:
        print(json.dumps(evidence_template(), indent=2, sort_keys=True))
        return 0

    evidence = _read_json(args.evidence_json) if args.evidence_json else {}
    report = readiness_report(evidence)
    print(json.dumps(report, indent=2, sort_keys=True))
    if args.strict and report["status"] != "ready":
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
