from __future__ import annotations

import argparse
import json
import os
import socket
import time
from typing import Any

from fastapi import HTTPException

from stackcert_service.config import settings
from stackcert_service.services import jobs


def run_worker_once(
    *,
    project_id: str | None = None,
    all_projects: bool = False,
    worker_id: str | None = None,
    max_jobs: int = 1,
    sleep_seconds: float = 0.0,
    lease_seconds: int = jobs.DEFAULT_LEASE_SECONDS,
) -> dict[str, Any]:
    worker_id = worker_id or os.getenv("STACKCERT_WORKER_ID") or _default_worker_id()
    project_scope = None if all_projects else (project_id or settings.demo_project_id)
    processed: list[dict[str, Any]] = []
    max_jobs = max(1, min(int(max_jobs), 25))

    for index in range(max_jobs):
        try:
            job = jobs.run_next_job(project_scope, worker_id=worker_id, lease_seconds=lease_seconds)
        except HTTPException as exc:
            if exc.status_code == 404:
                break
            raise
        processed.append(
            {
                "job_id": job["id"],
                "project_id": job.get("project_id"),
                "run_id": job.get("run_id"),
                "status": job["status"],
                "summary": job.get("summary", {}),
            }
        )
        if sleep_seconds > 0 and index < max_jobs - 1:
            time.sleep(sleep_seconds)

    return {
        "worker_id": worker_id,
        "project_scope": "*" if all_projects else project_scope,
        "processed": processed,
        "processed_count": len(processed),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run queued StackCert worker jobs.")
    parser.add_argument("--project-id", default=os.getenv("STACKCERT_WORKER_PROJECT_ID") or settings.demo_project_id)
    parser.add_argument("--all-projects", action="store_true", default=_env_bool("STACKCERT_WORKER_ALL_PROJECTS"))
    parser.add_argument("--worker-id", default=os.getenv("STACKCERT_WORKER_ID"))
    parser.add_argument("--max-jobs", type=int, default=int(os.getenv("STACKCERT_WORKER_MAX_JOBS", "1")))
    parser.add_argument("--sleep-seconds", type=float, default=float(os.getenv("STACKCERT_WORKER_SLEEP_SECONDS", "0")))
    parser.add_argument("--lease-seconds", type=int, default=int(os.getenv("STACKCERT_WORKER_LEASE_SECONDS", str(jobs.DEFAULT_LEASE_SECONDS))))
    args = parser.parse_args()

    result = run_worker_once(
        project_id=args.project_id,
        all_projects=args.all_projects,
        worker_id=args.worker_id,
        max_jobs=args.max_jobs,
        sleep_seconds=args.sleep_seconds,
        lease_seconds=args.lease_seconds,
    )
    print(json.dumps(result, sort_keys=True))
    return 0


def _default_worker_id() -> str:
    return f"cloud-run-job:{socket.gethostname()}"


def _env_bool(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


if __name__ == "__main__":
    raise SystemExit(main())
