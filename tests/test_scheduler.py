from __future__ import annotations

import unittest

from stackcert.cass.certificates import CassEngine
from stackcert.cass.scheduler import greedy_measurement_plan
from stackcert.data.schemas import BenchmarkCell, BenchmarkExample, Guard, GuardOutput, WelfareProfile


def out(guard_id: str, example_id: str, block: int) -> GuardOutput:
    return GuardOutput(
        run_id="sched",
        guard_id=guard_id,
        example_id=example_id,
        pass_probability=1.0 - block,
        block_probability=float(block),
        binary_pass=block == 0,
    )


class SchedulerTest(unittest.TestCase):
    def test_scheduler_recommends_measurements_for_unresolved_comparisons(self) -> None:
        cells = [
            BenchmarkCell("A/Harm", "adversarial", "fixture", 0.5),
            BenchmarkCell("N/Safe", "benign", "fixture", 0.5),
        ]
        examples = [
            *(BenchmarkExample(f"a{i}", "A/Harm", f"ah{i}") for i in range(6)),
            *(BenchmarkExample(f"n{i}", "N/Safe", f"nh{i}") for i in range(6)),
        ]
        guards = [
            Guard("guard_a", "Guard A", "v1", "fixture"),
            Guard("guard_b", "Guard B", "v1", "fixture"),
            Guard("guard_c", "Guard C", "v1", "fixture"),
        ]
        patterns = {
            "guard_a": [1, 1, 1, 0, 0, 0],
            "guard_b": [0, 0, 0, 1, 1, 1],
            "guard_c": [1, 0, 1, 0, 1, 0],
        }
        outputs: list[GuardOutput] = []
        for idx in range(6):
            for guard_id, pattern in patterns.items():
                outputs.append(out(guard_id, f"a{idx}", pattern[idx]))
                outputs.append(out(guard_id, f"n{idx}", 0 if guard_id != "guard_c" else idx % 2))

        engine = CassEngine(
            guards,
            cells,
            examples,
            outputs,
            WelfareProfile("balanced", 1.0),
            run_id="sched",
            rho_prior=0.6,
        )
        result = greedy_measurement_plan(engine, budget_fraction=0.5)

        self.assertGreaterEqual(len(result.actions), 1)
        self.assertGreaterEqual(len(result.measured_pairs), 1)


if __name__ == "__main__":
    unittest.main()

