from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts import cloud_run_secrets


class CloudRunSecretsScriptTest(unittest.TestCase):
    def write_keys(self) -> Path:
        handle = tempfile.NamedTemporaryFile("w", delete=False)
        with handle:
            json.dump(
                [
                    {
                        "id": "service_role",
                        "name": "service_role",
                        "type": "legacy",
                        "api_key": "legacy-service-key",
                    },
                    {
                        "id": "secret-default",
                        "name": "default",
                        "type": "secret",
                        "secret_jwt_template": {"role": "service_role"},
                        "api_key": "sb_secret_current",
                    },
                ],
                handle,
            )
        return Path(handle.name)

    def test_load_supabase_secret_key_prefers_current_secret_key(self) -> None:
        keys_path = self.write_keys()

        try:
            self.assertEqual(cloud_run_secrets.load_supabase_secret_key(keys_path, "auto"), "sb_secret_current")
            self.assertEqual(cloud_run_secrets.load_supabase_secret_key(keys_path, "secret"), "sb_secret_current")
        finally:
            keys_path.unlink(missing_ok=True)

    def test_load_supabase_secret_key_can_prefer_legacy_key(self) -> None:
        keys_path = self.write_keys()

        try:
            self.assertEqual(cloud_run_secrets.load_supabase_secret_key(keys_path, "legacy"), "legacy-service-key")
        finally:
            keys_path.unlink(missing_ok=True)

    def test_load_supabase_secret_key_skips_masked_secret_key(self) -> None:
        handle = tempfile.NamedTemporaryFile("w", delete=False)
        with handle:
            json.dump(
                [
                    {
                        "id": "service_role",
                        "name": "service_role",
                        "type": "legacy",
                        "api_key": "legacy-service-key",
                    },
                    {
                        "id": "secret-default",
                        "name": "default",
                        "type": "secret",
                        "secret_jwt_template": {"role": "service_role"},
                        "api_key": "sb_secret_cRU_h··························",
                    },
                ],
                handle,
            )
        keys_path = Path(handle.name)

        try:
            self.assertEqual(cloud_run_secrets.load_supabase_secret_key(keys_path, "auto"), "legacy-service-key")
        finally:
            keys_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
