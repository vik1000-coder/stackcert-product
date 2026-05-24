from __future__ import annotations

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

    def tearDown(self) -> None:
        object.__setattr__(settings, "environment", self.old_environment)
        object.__setattr__(settings, "supabase_url", self.old_supabase_url)
        object.__setattr__(settings, "supabase_secret_key", self.old_supabase_secret_key)
        object.__setattr__(settings, "supabase_jwt_secret", self.old_supabase_jwt_secret)

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


if __name__ == "__main__":
    unittest.main()
