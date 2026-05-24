from __future__ import annotations

import json
import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from scripts import gcloud_cost_preflight


class GcloudCostPreflightTest(unittest.TestCase):
    def test_billing_info_fails_closed_when_billing_disabled(self) -> None:
        result = gcloud_cost_preflight.CommandResult(
            0,
            json.dumps({"projectId": "demo-project", "billingEnabled": False, "billingAccountName": ""}),
            "",
        )

        with patch.object(gcloud_cost_preflight, "run", return_value=result):
            with redirect_stdout(io.StringIO()):
                account, enabled = gcloud_cost_preflight.billing_info("gcloud", "demo-project")

        self.assertIsNone(account)
        self.assertFalse(enabled)

    def test_budget_visibility_matches_project_scope(self) -> None:
        result = gcloud_cost_preflight.CommandResult(
            0,
            json.dumps(
                [
                    {
                        "displayName": "StackCert staging budget",
                        "budgetFilter": {"projects": ["projects/123456"]},
                    }
                ]
            ),
            "",
        )

        with patch.object(gcloud_cost_preflight, "run", return_value=result):
            with redirect_stdout(io.StringIO()):
                self.assertTrue(
                    gcloud_cost_preflight.budget_is_visible("gcloud", "billing-account", "stackcert-staging", "123456")
                )

    def test_budget_visibility_fails_when_budget_list_is_unavailable(self) -> None:
        result = gcloud_cost_preflight.CommandResult(1, "", "billingbudgets.googleapis.com is disabled")

        with patch.object(gcloud_cost_preflight, "run", return_value=result):
            with redirect_stdout(io.StringIO()):
                self.assertFalse(
                    gcloud_cost_preflight.budget_is_visible("gcloud", "billing-account", "stackcert-staging", "123456")
                )


if __name__ == "__main__":
    unittest.main()
