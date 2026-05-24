from __future__ import annotations

import unittest

from stackcert.cass.certificates import CassEngine
from stackcert.cass.moments import pair_key
from stackcert.data.schemas import BenchmarkCell, BenchmarkExample, Guard, GuardOutput, WelfareProfile


def output(run_id: str, guard_id: str, example_id: str, block: int) -> GuardOutput:
    return GuardOutput(
        run_id=run_id,
        guard_id=guard_id,
        example_id=example_id,
        pass_probability=1.0 - block,
        block_probability=float(block),
        binary_pass=block == 0,
    )


class K2ExactnessTest(unittest.TestCase):
    def test_k2_product_moment_matches_empirical_serial_pass(self) -> None:
        cells = [BenchmarkCell("N/Safe", "benign", "fixture", 1.0)]
        examples = [
            BenchmarkExample(f"e{i}", "N/Safe", f"h{i}", prompt_redacted=f"example {i}")
            for i in range(4)
        ]
        guards = [
            Guard("guard_a", "Guard A", "v1", "fixture"),
            Guard("guard_b", "Guard B", "v1", "fixture"),
        ]
        a_blocks = [1, 1, 0, 0]
        b_blocks = [1, 0, 1, 0]
        outputs = []
        for example, a_block, b_block in zip(examples, a_blocks, b_blocks):
            outputs.append(output("run", "guard_a", example.example_id, a_block))
            outputs.append(output("run", "guard_b", example.example_id, b_block))

        engine = CassEngine(
            guards,
            cells,
            examples,
            outputs,
            WelfareProfile("balanced", 1.0),
            run_id="run",
            measured_pairs={(pair_key("guard_a", "guard_b"), "N/Safe")},
        )
        pair_arch = next(arch for arch in engine.architectures if arch.guard_ids == ("guard_a", "guard_b"))
        center, low, high = engine.serial_pass_interval(pair_arch, "N/Safe")

        self.assertAlmostEqual(center, 0.25)
        self.assertAlmostEqual(low, 0.25)
        self.assertAlmostEqual(high, 0.25)

    def test_unmeasured_pair_interval_uses_rho_prior_inside_feasible_bounds(self) -> None:
        cells = [BenchmarkCell("N/Safe", "benign", "fixture", 1.0)]
        examples = [
            BenchmarkExample(f"e{i}", "N/Safe", f"h{i}", prompt_redacted=f"example {i}")
            for i in range(4)
        ]
        guards = [
            Guard("guard_a", "Guard A", "v1", "fixture"),
            Guard("guard_b", "Guard B", "v1", "fixture"),
        ]
        a_blocks = [1, 1, 0, 0]
        b_blocks = [1, 0, 1, 0]
        outputs = []
        for example, a_block, b_block in zip(examples, a_blocks, b_blocks):
            outputs.append(output("run", "guard_a", example.example_id, a_block))
            outputs.append(output("run", "guard_b", example.example_id, b_block))

        engine = CassEngine(
            guards,
            cells,
            examples,
            outputs,
            WelfareProfile("balanced", 1.0),
            run_id="run",
            rho_prior=0.25,
        )
        interval = engine.pair_interval(pair_key("guard_a", "guard_b"), "N/Safe")

        self.assertFalse(interval.measured)
        self.assertAlmostEqual(interval.low, -0.25)
        self.assertAlmostEqual(interval.high, 0.25)
        self.assertAlmostEqual(interval.center, 0.0)
        self.assertAlmostEqual(interval.radius, 0.25)

    def test_comparison_gap_center_matches_welfare_difference(self) -> None:
        cells = [
            BenchmarkCell("A/Harm", "adversarial", "fixture", 0.5),
            BenchmarkCell("N/Safe", "benign", "fixture", 0.5),
        ]
        examples = [
            *(BenchmarkExample(f"a{i}", "A/Harm", f"ah{i}") for i in range(4)),
            *(BenchmarkExample(f"n{i}", "N/Safe", f"nh{i}") for i in range(4)),
        ]
        guards = [
            Guard("guard_a", "Guard A", "v1", "fixture"),
            Guard("guard_b", "Guard B", "v1", "fixture"),
        ]
        outputs = []
        for idx in range(4):
            outputs.append(output("run", "guard_a", f"a{idx}", 1 if idx < 2 else 0))
            outputs.append(output("run", "guard_b", f"a{idx}", 0 if idx < 2 else 1))
            outputs.append(output("run", "guard_a", f"n{idx}", 0))
            outputs.append(output("run", "guard_b", f"n{idx}", 0))
        measured = {(pair_key("guard_a", "guard_b"), cell.cell_id) for cell in cells}
        engine = CassEngine(
            guards,
            cells,
            examples,
            outputs,
            WelfareProfile("balanced", 1.0),
            run_id="run",
            measured_pairs=measured,
        )
        estimates = {estimate.architecture.architecture_id: estimate for estimate in engine.welfare_estimates()}

        for comparison in engine.all_comparisons():
            expected_gap = (
                estimates[comparison.incumbent.architecture_id].welfare_center
                - estimates[comparison.competitor.architecture_id].welfare_center
            )
            self.assertAlmostEqual(comparison.gap_center, expected_gap)
            self.assertAlmostEqual(comparison.gap_radius, 0.0)
            self.assertAlmostEqual(comparison.gap_low, expected_gap)
            self.assertAlmostEqual(comparison.gap_high, expected_gap)


if __name__ == "__main__":
    unittest.main()
