#!/usr/bin/env python3
"""Hash a StackCert MCP machine token for environment configuration."""

from __future__ import annotations

import argparse
import hashlib
import secrets


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-id", default="ci", help="Human-readable token id used in STACKCERT_MCP_MACHINE_TOKEN_HASHES")
    parser.add_argument("--token", help="Existing token to hash. If omitted, a new token is generated.")
    args = parser.parse_args()

    token = args.token or f"stackcert_mcp_{secrets.token_urlsafe(32)}"
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    print(f"token: {token}")
    print(f"env: STACKCERT_MCP_MACHINE_TOKEN_HASHES={args.token_id}:{digest}")
    print(f"scopes: STACKCERT_MCP_MACHINE_TOKEN_SCOPES={args.token_id}=mcp:read")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
