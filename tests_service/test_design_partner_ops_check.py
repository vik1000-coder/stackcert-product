import unittest

from scripts import design_partner_ops_check


class DesignPartnerOpsCheckTest(unittest.TestCase):
    def test_report_requires_non_sentry_design_partner_evidence(self) -> None:
        report = design_partner_ops_check.readiness_report({})

        self.assertEqual(report["status"], "missing_evidence")
        self.assertFalse(report["sentry_required"])
        self.assertIn("api_health_uptime_check", report["missing"])
        self.assertIn("supabase_restore_rehearsal", report["missing"])
        self.assertNotIn("sentry", " ".join(report["missing"]).lower())

    def test_report_is_ready_when_all_required_evidence_is_present(self) -> None:
        evidence = {key: f"evidence for {key}" for key in design_partner_ops_check.evidence_template()}
        report = design_partner_ops_check.readiness_report(evidence)

        self.assertEqual(report["status"], "ready")
        self.assertEqual(report["missing"], [])
        self.assertTrue(all(item["status"] == "complete" for item in report["items"]))

    def test_template_matches_required_checks(self) -> None:
        template = design_partner_ops_check.evidence_template()

        self.assertEqual(set(template), {check.key for check in design_partner_ops_check.REQUIRED_CHECKS})


if __name__ == "__main__":
    unittest.main()
