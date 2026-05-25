from __future__ import annotations

import unittest
from unittest.mock import patch

from stackcert_service.services import certificates


class EvidenceReadinessTest(unittest.TestCase):
    def test_readiness_blocks_missing_output_coverage(self) -> None:
        with (
            patch(
                "stackcert_service.services.certificates._run_summary_for_readiness",
                return_value={
                    "id": "run_missing",
                    "status": "complete",
                    "examples": 3,
                    "guards": 2,
                    "outputs": 5,
                    "benchmark_suite_id": "suite_1",
                    "certificate_status": "valid",
                    "measurement_actions": 0,
                },
            ),
            patch(
                "stackcert_service.services.certificates._certificate_payload_for_run",
                return_value={"status_compact": "valid"},
            ),
        ):
            readiness = certificates.evidence_readiness("run_missing")

        self.assertFalse(readiness["can_issue"])
        self.assertEqual(readiness["status"], "blocked")
        self.assertIn("missing_safety_check_coverage", {item["code"] for item in readiness["blockers"]})

    def test_readiness_allows_provisional_with_warning(self) -> None:
        with (
            patch(
                "stackcert_service.services.certificates._run_summary_for_readiness",
                return_value={
                    "id": "run_provisional",
                    "status": "complete",
                    "examples": 3,
                    "guards": 2,
                    "outputs": 6,
                    "benchmark_suite_id": "suite_1",
                    "certificate_status": "provisional",
                    "measurement_actions": 1,
                },
            ),
            patch(
                "stackcert_service.services.certificates._certificate_payload_for_run",
                return_value={"status_compact": "provisional"},
            ),
        ):
            readiness = certificates.evidence_readiness("run_provisional")

        self.assertTrue(readiness["can_issue"])
        self.assertEqual(readiness["status"], "warning")
        warning_codes = {item["code"] for item in readiness["warnings"]}
        self.assertIn("provisional_evidence", warning_codes)
        self.assertIn("recommended_followup_measurements", warning_codes)


if __name__ == "__main__":
    unittest.main()
