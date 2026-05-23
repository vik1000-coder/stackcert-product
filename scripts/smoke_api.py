from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


BASE_URL = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8000"
ENDPOINTS = (
    "/api/health",
    "/api/workspaces",
    "/api/projects",
    "/api/runs/real_main_2000/overview?lambda_cost=5",
    "/api/runs/real_main_2000/ranking?lambda_cost=5",
    "/api/runs/real_main_2000/certificate.json?lambda_cost=5",
    "/api/projects/proj_acme_copilot/certificate-status?lambda_cost=5",
    "/api/integrations/agent-platforms",
)


def fetch(endpoint: str) -> dict[str, object]:
    url = f"{BASE_URL}{endpoint}"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status != 200:
            raise RuntimeError(f"{endpoint} returned {response.status}")
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    for endpoint in ENDPOINTS:
        payload = fetch(endpoint)
        if endpoint == "/api/health" and payload.get("status") != "ok":
            raise RuntimeError("health endpoint did not return ok")
        print(f"ok {endpoint}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (urllib.error.URLError, RuntimeError) as exc:
        print(f"smoke failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
