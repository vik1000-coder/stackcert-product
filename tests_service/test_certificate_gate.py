from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "certificate_gate.py"
SPEC = importlib.util.spec_from_file_location("certificate_gate", SCRIPT_PATH)
certificate_gate = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(certificate_gate)


class CertificateGateTest(unittest.TestCase):
    def test_gate_allows_valid_certificate(self) -> None:
        result = certificate_gate.evaluate_gate(
            {
                "status": "valid",
                "certificate_id": "cert_demo",
                "scope": "project:demo",
                "blocking_reasons": [],
                "not_a_guarantee": True,
            },
            required_status="valid",
        )

        self.assertTrue(result["ok"])
        self.assertEqual(result["certificate_id"], "cert_demo")

    def test_gate_blocks_provisional_when_valid_required(self) -> None:
        result = certificate_gate.evaluate_gate({"status": "provisional"}, required_status="valid")

        self.assertFalse(result["ok"])
        self.assertIn("certificate_provisional_does_not_meet_required_valid", result["blocking_reasons"])

    def test_warn_mode_exits_zero_with_machine_readable_failure(self) -> None:
        completed = subprocess.run(
            [
                sys.executable,
                str(SCRIPT_PATH),
                "--base-url",
                "http://127.0.0.1:1",
                "--mode",
                "warn",
                "--timeout",
                "0.01",
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(completed.returncode, 0)
        payload = json.loads(completed.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["status"], "missing")


if __name__ == "__main__":
    unittest.main()
