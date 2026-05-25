from __future__ import annotations

import argparse
import json
import time

from fastapi import HTTPException

from stackcert_service.config import settings
from stackcert_service.services import jobs


def main() -> int:
    parser = argparse.ArgumentParser(description="Run queued StackCert worker jobs.")
    parser.add_argument("--project-id", default=settings.demo_project_id)
    parser.add_argument("--all-projects", action="store_true", help="Claim runnable jobs across all projects visible to the backend service role.")
    parser.add_argument("--worker-id", default=None)
    parser.add_argument("--max-jobs", type=int, default=1)
    parser.add_argument("--sleep-seconds", type=float, default=0.0)
    args = parser.parse_args()

    processed = []
    project_id = None if args.all_projects else args.project_id
    for index in range(max(1, args.max_jobs)):
        try:
            job = jobs.run_next_job(project_id, worker_id=args.worker_id)
        except HTTPException as exc:
            if exc.status_code == 404:
                break
            raise
        processed.append({"job_id": job["id"], "status": job["status"], "summary": job.get("summary", {})})
        if args.sleep_seconds > 0 and index < args.max_jobs - 1:
            time.sleep(args.sleep_seconds)
    print(json.dumps({"processed": processed, "processed_count": len(processed)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
