from __future__ import annotations

import unittest
from unittest.mock import patch

from stackcert_service.schemas import ReleaseGateEvaluateRequest
from stackcert_service.services import release_gates


class ReleaseGateTest(unittest.TestCase):
    def test_provisional_evidence_can_pass_lower_required_threshold(self) -> None:
        with (
            patch.object(release_gates.projects, "get_project", return_value={"id": "proj_demo", "name": "Demo", "environment": "production"}),
            patch.object(
                release_gates.mcp,
                "release_evidence_status",
                return_value={
                    "project_id": "proj_demo",
                    "status": "provisional",
                    "run_id": "run_demo",
                    "certificate_id": "cert_demo",
                    "release_evidence_id": "cert_demo",
                    "blocking_reasons": ["release_evidence_provisional"],
                    "recertification_required_on": ["model_change"],
                    "scope": "finite benchmark",
                },
            ),
        ):
            result = release_gates.evaluate_project_gate(
                "proj_demo",
                ReleaseGateEvaluateRequest(required_status="needs_measurement", environment="production"),
            )

        self.assertEqual(result["decision"], "pass")
        self.assertEqual(result["blocking_reasons"], [])

    def test_provisional_evidence_blocks_when_valid_required(self) -> None:
        with (
            patch.object(release_gates.projects, "get_project", return_value={"id": "proj_demo", "name": "Demo", "environment": "production"}),
            patch.object(
                release_gates.mcp,
                "release_evidence_status",
                return_value={
                    "project_id": "proj_demo",
                    "status": "provisional",
                    "run_id": "run_demo",
                    "certificate_id": "cert_demo",
                    "release_evidence_id": "cert_demo",
                    "blocking_reasons": ["release_evidence_provisional"],
                    "recertification_required_on": ["model_change"],
                    "scope": "finite benchmark",
                },
            ),
        ):
            result = release_gates.evaluate_project_gate(
                "proj_demo",
                ReleaseGateEvaluateRequest(required_status="valid", environment="production"),
            )

        self.assertEqual(result["decision"], "block")
        self.assertIn("release_evidence_provisional_does_not_meet_required_valid", result["blocking_reasons"])


if __name__ == "__main__":
    unittest.main()
