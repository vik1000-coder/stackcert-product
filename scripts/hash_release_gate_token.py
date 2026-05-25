from __future__ import annotations

import argparse
import hashlib
import secrets


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a StackCert release-gate machine token hash.")
    parser.add_argument("--token-id", default="ci")
    parser.add_argument("--token", default=None)
    parser.add_argument("--project-id", default="proj_acme_copilot")
    parser.add_argument("--scopes", default="release_gate:read")
    args = parser.parse_args()

    token = args.token or f"stackcert_release_gate_{secrets.token_urlsafe(32)}"
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    print(f"token: {token}")
    print(f"hashes: STACKCERT_RELEASE_GATE_TOKEN_HASHES={args.token_id}:{digest}")
    print(f"scopes: STACKCERT_RELEASE_GATE_TOKEN_SCOPES={args.token_id}={args.scopes}")
    print(f"projects: STACKCERT_RELEASE_GATE_TOKEN_PROJECTS={args.token_id}={args.project_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
