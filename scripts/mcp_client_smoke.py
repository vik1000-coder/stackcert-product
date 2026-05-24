#!/usr/bin/env python3
"""Smoke-check StackCert MCP using the official Python MCP client SDK."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from typing import Any

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


async def fetch_supabase_token(args: argparse.Namespace) -> str | None:
    if not (args.supabase_url and args.email and args.password):
        return None
    anon_key = os.environ.get(args.anon_key_env)
    require(bool(anon_key), f"{args.anon_key_env} must be set for authenticated MCP smoke checks")
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"{args.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
            json={"email": args.email, "password": args.password},
            headers={"apikey": anon_key or ""},
        )
    require(response.status_code == 200, f"Supabase token request returned {response.status_code}: {response.text[:240]}")
    token = str(response.json().get("access_token") or "")
    require(token.startswith("ey"), "Supabase token response did not include a JWT access token")
    return token


async def run_smoke(args: argparse.Namespace) -> None:
    token = args.bearer_token or await fetch_supabase_token(args)
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    api_base = args.api_url.rstrip("/")
    async with httpx.AsyncClient(headers=headers, timeout=30.0) as http_client:
        async with streamable_http_client(f"{api_base}/api/mcp", http_client=http_client) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                tools = await session.list_tools()
                tool_names = {tool.name for tool in tools.tools}
                require("get_release_evidence_status" in tool_names, "MCP tools/list did not include get_release_evidence_status")
                resources = await session.list_resources()
                resource_uris = {str(resource.uri) for resource in resources.resources}
                require(
                    "stackcert://projects/proj_acme_copilot/release-evidence-status" in resource_uris,
                    "MCP resources/list did not include release-evidence-status",
                )
                result = await session.call_tool(
                    "get_release_evidence_status",
                    {"project_id": args.project_id, "lambda_cost": args.lambda_cost},
                )
                structured = result.structuredContent or {}
                require(isinstance(structured, dict), "MCP tool result did not include structuredContent")
                require(structured.get("not_a_guarantee") is True, "MCP release evidence did not include limitations flag")
                deploy_gate = structured.get("deploy_gate")
                require(isinstance(deploy_gate, dict), f"MCP release evidence lacked deploy_gate: {json.dumps(structured)[:240]}")
                require(deploy_gate.get("decision") in {"pass", "review"}, f"Unexpected deploy gate decision: {deploy_gate}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True, help="Base URL for the StackCert API")
    parser.add_argument("--project-id", default="proj_acme_copilot", help="Project id to query through MCP")
    parser.add_argument("--lambda-cost", type=float, default=5.0, help="CASS lambda cost for release evidence status")
    parser.add_argument("--bearer-token", help="Existing bearer token for authenticated MCP endpoints")
    parser.add_argument("--supabase-url", help="Supabase project URL for optional password auth")
    parser.add_argument("--email", help="Smoke-test user email")
    parser.add_argument("--password", help="Smoke-test user password")
    parser.add_argument(
        "--anon-key-env",
        default="STACKCERT_SMOKE_SUPABASE_ANON_KEY",
        help="Environment variable containing the Supabase publishable/anon key",
    )
    args = parser.parse_args()
    asyncio.run(run_smoke(args))
    print("mcp client smoke OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, httpx.HTTPError) as exc:
        print(f"mcp client smoke failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
