#!/usr/bin/env python3
"""Smoke-check a deployed StackCert web/API/Auth environment."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


DEFAULT_HEADERS = {"User-Agent": "StackCertDeploymentSmoke/1.0"}


def read_url(url: str, headers: dict[str, str] | None = None) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={**DEFAULT_HEADERS, **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def post_json(url: str, body: dict[str, object], headers: dict[str, str] | None = None) -> tuple[int, dict[str, object]]:
    payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        headers={**DEFAULT_HEADERS, "Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8", errors="replace")
        try:
            parsed: dict[str, object] = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"error": text}
        return error.code, parsed


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web-url", required=True, help="Public URL for the deployed web index.html")
    parser.add_argument("--api-url", required=True, help="Base URL for the deployed StackCert API")
    parser.add_argument("--supabase-url", help="Supabase project URL for Auth smoke checks")
    parser.add_argument("--email", help="Demo or test user email for Auth smoke checks")
    parser.add_argument("--password", help="Demo or test user password for Auth smoke checks")
    parser.add_argument(
        "--anon-key-env",
        default="STACKCERT_SMOKE_SUPABASE_ANON_KEY",
        help="Environment variable containing the Supabase anon/publishable key",
    )
    args = parser.parse_args()

    web_status, web_body = read_url(args.web_url)
    require(web_status == 200, f"web URL returned {web_status}")
    require("StackCert" in web_body, "web URL did not return the StackCert app shell")

    api_base = args.api_url.rstrip("/")
    health_status, health_body = read_url(f"{api_base}/api/health")
    require(health_status == 200, f"health returned {health_status}: {health_body[:200]}")

    denied_status, _ = read_url(f"{api_base}/api/projects")
    require(denied_status in {401, 403}, f"unauthenticated projects should be denied, got {denied_status}")

    token = None
    if args.supabase_url and args.email and args.password:
        anon_key = os.environ.get(args.anon_key_env)
        require(bool(anon_key), f"{args.anon_key_env} must be set for Auth smoke checks")
        auth_status, auth_payload = post_json(
            f"{args.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
            {"email": args.email, "password": args.password},
            {"apikey": anon_key or ""},
        )
        require(auth_status == 200, f"auth token request returned {auth_status}: {auth_payload}")
        token = str(auth_payload.get("access_token") or "")
        require(token.startswith("ey"), "auth response did not include a JWT access token")

    if token:
        auth_headers = {"Authorization": f"Bearer {token}"}
        authed_status, authed_body = read_url(f"{api_base}/api/projects", auth_headers)
        require(authed_status == 200, f"authenticated projects returned {authed_status}: {authed_body[:200]}")
        require("proj_acme_copilot" in authed_body, "authenticated projects did not include the demo project")

        readiness_status, readiness_body = read_url(
            f"{api_base}/api/runs/real_main_2000/certificate/readiness?lambda_cost=5",
            auth_headers,
        )
        require(readiness_status == 200, f"evidence readiness returned {readiness_status}: {readiness_body[:200]}")
        readiness_payload = json.loads(readiness_body)
        readiness = readiness_payload.get("readiness")
        require(isinstance(readiness, dict), f"evidence readiness payload was unexpected: {readiness_payload}")
        require(readiness.get("can_issue") is True, f"demo evidence should be issuable: {readiness}")

        manifest_status, manifest_body = read_url(f"{api_base}/api/mcp/manifest", auth_headers)
        require(manifest_status == 200, f"MCP manifest returned {manifest_status}: {manifest_body[:200]}")
        require("get_release_evidence_status" in manifest_body, "MCP manifest did not include release evidence tool")

        initialize_status, initialize_payload = post_json(
            f"{api_base}/api/mcp",
            {
                "jsonrpc": "2.0",
                "id": "deployment-smoke-init",
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-06-18",
                    "capabilities": {},
                    "clientInfo": {"name": "stackcert-deployment-smoke", "version": "0.1"},
                },
            },
            auth_headers,
        )
        require(initialize_status == 200, f"MCP initialize returned {initialize_status}: {initialize_payload}")
        require(initialize_payload.get("jsonrpc") == "2.0", f"MCP initialize payload was unexpected: {initialize_payload}")

        tool_status, tool_payload = post_json(
            f"{api_base}/api/mcp",
            {
                "jsonrpc": "2.0",
                "id": "deployment-smoke-release-status",
                "method": "tools/call",
                "params": {
                    "name": "get_release_evidence_status",
                    "arguments": {"project_id": "proj_acme_copilot", "lambda_cost": 5},
                },
            },
            auth_headers,
        )
        require(tool_status == 200, f"MCP release evidence tool returned {tool_status}: {tool_payload}")
        result = tool_payload.get("result") if isinstance(tool_payload, dict) else None
        structured = result.get("structuredContent") if isinstance(result, dict) else None
        require(isinstance(structured, dict), f"MCP release evidence payload lacked structuredContent: {tool_payload}")
        require(structured.get("not_a_guarantee") is True, "MCP release evidence did not include the limitations flag")
        deploy_gate = structured.get("deploy_gate")
        require(isinstance(deploy_gate, dict), f"MCP release evidence lacked deploy_gate: {tool_payload}")
        require(deploy_gate.get("decision") in {"pass", "review"}, f"MCP deploy gate decision was unexpected: {deploy_gate}")

    print("deployment smoke OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"deployment smoke failed: {error}", file=sys.stderr)
        raise SystemExit(1)
