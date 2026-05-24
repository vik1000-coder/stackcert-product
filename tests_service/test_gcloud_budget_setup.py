from __future__ import annotations

import unittest

from scripts import gcloud_budget_setup


class GcloudBudgetSetupTest(unittest.TestCase):
    def test_find_budget_matches_display_name_and_project_scope(self) -> None:
        budget = {
            "name": "billingAccounts/abc/budgets/123",
            "displayName": "StackCert staging $10",
            "budgetFilter": {"projects": ["projects/project-123"]},
        }

        self.assertIs(
            gcloud_budget_setup.find_budget([budget], "StackCert staging $10", "project-123"),
            budget,
        )

    def test_find_budget_ignores_budget_for_other_project(self) -> None:
        budget = {
            "displayName": "StackCert staging $10",
            "budgetFilter": {"projects": ["projects/other-project"]},
        }

        self.assertIsNone(gcloud_budget_setup.find_budget([budget], "StackCert staging $10", "project-123"))


if __name__ == "__main__":
    unittest.main()
