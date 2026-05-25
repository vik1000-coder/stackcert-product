from __future__ import annotations

import hashlib
import os
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

from stackcert_service.config import settings
from stackcert_service.security import auth


class AuthTest(unittest.TestCase):
    def setUp(self) -> None:
        self.old_environment = settings.environment
        self.old_supabase_url = settings.supabase_url
        self.old_supabase_secret_key = settings.supabase_secret_key
        self.old_supabase_jwt_secret = settings.supabase_jwt_secret
        self.old_machine_hashes = os.environ.get("STACKCERT_MCP_MACHINE_TOKEN_HASHES")
        self.old_machine_scopes = os.environ.get("STACKCERT_MCP_MACHINE_TOKEN_SCOPES")

    def tearDown(self) -> None:
        object.__setattr__(settings, "environment", self.old_environment)
        object.__setattr__(settings, "supabase_url", self.old_supabase_url)
        object.__setattr__(settings, "supabase_secret_key", self.old_supabase_secret_key)
        object.__setattr__(settings, "supabase_jwt_secret", self.old_supabase_jwt_secret)
        if self.old_machine_hashes is None:
            os.environ.pop("STACKCERT_MCP_MACHINE_TOKEN_HASHES", None)
        else:
            os.environ["STACKCERT_MCP_MACHINE_TOKEN_HASHES"] = self.old_machine_hashes
        if self.old_machine_scopes is None:
            os.environ.pop("STACKCERT_MCP_MACHINE_TOKEN_SCOPES", None)
        else:
            os.environ["STACKCERT_MCP_MACHINE_TOKEN_SCOPES"] = self.old_machine_scopes

    def test_production_can_validate_token_through_supabase_auth_endpoint(self) -> None:
        object.__setattr__(settings, "environment", "production")
        object.__setattr__(settings, "supabase_jwt_secret", None)
        object.__setattr__(settings, "supabase_url", "https://example.supabase.co")
        object.__setattr__(settings, "supabase_secret_key", "server-only-key")
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            "id": "user_123",
            "email": "user@example.com",
            "app_metadata": {"role": "security"},
        }

        with patch.object(auth.httpx, "get", return_value=response) as get:
            principal = auth.current_principal("Bearer remote-token")

        self.assertEqual(principal.user_id, "user_123")
        self.assertEqual(principal.email, "user@example.com")
        self.assertEqual(principal.role, "security")
        get.assert_called_once()
        headers = get.call_args.kwargs["headers"]
        self.assertEqual(headers["authorization"], "Bearer remote-token")
        self.assertEqual(headers["apikey"], "server-only-key")

    def test_production_auth_endpoint_rejects_invalid_token(self) -> None:
        object.__setattr__(settings, "environment", "production")
        object.__setattr__(settings, "supabase_jwt_secret", None)
        object.__setattr__(settings, "supabase_url", "https://example.supabase.co")
        object.__setattr__(settings, "supabase_secret_key", "server-only-key")
        response = Mock()
        response.status_code = 401

        with patch.object(auth.httpx, "get", return_value=response), self.assertRaises(HTTPException) as context:
            auth.current_principal("Bearer bad-token")

        self.assertEqual(context.exception.status_code, 401)

    def test_mcp_machine_token_hash_authenticates_without_supabase(self) -> None:
        object.__setattr__(settings, "environment", "production")
        object.__setattr__(settings, "supabase_jwt_secret", None)
        object.__setattr__(settings, "supabase_url", None)
        object.__setattr__(settings, "supabase_secret_key", None)
        token = "stackcert_mcp_test_token"
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        os.environ["STACKCERT_MCP_MACHINE_TOKEN_HASHES"] = f"ci:{digest}"
        os.environ["STACKCERT_MCP_MACHINE_TOKEN_SCOPES"] = "ci=mcp:read|mcp:write"

        principal = auth.current_mcp_principal(f"Bearer {token}")

        self.assertEqual(principal.user_id, "machine:ci")
        self.assertEqual(principal.principal_type, "machine")
        self.assertIn("mcp:write", principal.scopes)

    def test_machine_token_does_not_authenticate_general_app_routes(self) -> None:
        object.__setattr__(settings, "environment", "production")
        object.__setattr__(settings, "supabase_jwt_secret", None)
        object.__setattr__(settings, "supabase_url", None)
        object.__setattr__(settings, "supabase_secret_key", None)
        token = "stackcert_mcp_readonly"
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        os.environ["STACKCERT_MCP_MACHINE_TOKEN_HASHES"] = f"ci:{digest}"

        with self.assertRaises(HTTPException) as context:
            auth.current_principal(f"Bearer {token}")

        self.assertEqual(context.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
