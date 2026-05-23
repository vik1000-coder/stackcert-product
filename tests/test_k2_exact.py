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


if __name__ == "__main__":
    unittest.main()

