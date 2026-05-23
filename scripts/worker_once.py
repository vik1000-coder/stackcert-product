from __future__ import annotations

import argparse
import json

from stackcert_service.config import settings
from stackcert_service.services import jobs


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one queued StackCert job.")
    parser.add_argument("--project-id", default=settings.demo_project_id)
    parser.add_argument("--worker-id", default=None)
    args = parser.parse_args()
    job = jobs.run_next_job(args.project_id, worker_id=args.worker_id)
    print(json.dumps({"job_id": job["id"], "status": job["status"], "summary": job.get("summary", {})}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
