from __future__ import annotations

import unittest

from stackcert.data.schemas import BenchmarkCell, BenchmarkExample, Guard, GuardOutput
from stackcert.data.validation import validate_project


class DataValidationTest(unittest.TestCase):
    def test_missing_guard_outputs_are_errors(self) -> None:
        guards = [Guard("guard_a", "Guard A", "v1", "fixture")]
        cells = [BenchmarkCell("N/Safe", "benign", "fixture", 1.0)]
        examples = [
            BenchmarkExample("e1", "N/Safe", "h1"),
            BenchmarkExample("e2", "N/Safe", "h2"),
        ]
        outputs = [
            GuardOutput("run", "e1", "guard_a", 1.0, 0.0, True),
        ]

        report = validate_project(guards, cells, examples, outputs)
        self.assertFalse(report.complete)
        self.assertTrue(any(issue.code == "missing_outputs" for issue in report.issues))


if __name__ == "__main__":
    unittest.main()

