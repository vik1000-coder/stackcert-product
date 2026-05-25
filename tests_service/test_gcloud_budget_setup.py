from __future__ import annotations

import unittest

from scripts import gcloud_budget_setup


class GcloudBudgetSetupTest(unittest.TestCase):
    def test_find_budget_matches_display_name_and_project_scope(self) -> None:
        budget = {
            "name": "billingAccounts/abc/budgets/123",
            "displayName": "StackCert staging $50",
            "budgetFilter": {"projects": ["projects/project-123"]},
        }

        self.assertIs(
            gcloud_budget_setup.find_budget([budget], "StackCert staging $50", "project-123"),
            budget,
        )

    def test_find_budget_matches_previous_stackcert_budget_name_for_project_number(self) -> None:
        budget = {
            "name": "billingAccounts/abc/budgets/123",
            "displayName": "StackCert staging $10",
            "budgetFilter": {"projects": ["projects/301810500938"]},
        }

        self.assertIs(
            gcloud_budget_setup.find_budget(
                [budget],
                "StackCert staging $50",
                "project-e7840c42-f298-4bd9-bff",
                "301810500938",
            ),
            budget,
        )

    def test_find_budget_ignores_budget_for_other_project(self) -> None:
        budget = {
            "displayName": "StackCert staging $50",
            "budgetFilter": {"projects": ["projects/other-project"]},
        }

        self.assertIsNone(gcloud_budget_setup.find_budget([budget], "StackCert staging $50", "project-123"))


if __name__ == "__main__":
    unittest.main()
