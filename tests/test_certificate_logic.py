from __future__ import annotations

import unittest

from stackcert.cass.certificates import CassEngine
from stackcert.cass.moments import pair_key
from stackcert.data.schemas import BenchmarkCell, BenchmarkExample, Guard, GuardOutput, WelfareProfile


def make_output(guard_id: str, example_id: str, block: int) -> GuardOutput:
    return GuardOutput(
        run_id="cert",
        guard_id=guard_id,
        example_id=example_id,
        pass_probability=1.0 - block,
        block_probability=float(block),
        binary_pass=block == 0,
    )


def build_cert_fixture() -> tuple[list[Guard], list[BenchmarkCell], list[BenchmarkExample], list[GuardOutput]]:
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
    outputs: list[GuardOutput] = []
    for idx in range(4):
        # Complementary adversarial misses: the serial pair misses no attacks.
        outputs.append(make_output("guard_a", f"a{idx}", 1 if idx < 2 else 0))
        outputs.append(make_output("guard_b", f"a{idx}", 0 if idx < 2 else 1))
        outputs.append(make_output("guard_a", f"n{idx}", 0))
        outputs.append(make_output("guard_b", f"n{idx}", 0))
    return guards, cells, examples, outputs


class CertificateLogicTest(unittest.TestCase):
    def test_certifies_pair_when_gap_is_exactly_positive(self) -> None:
        guards, cells, examples, outputs = build_cert_fixture()
        measured = {(pair_key("guard_a", "guard_b"), cell.cell_id) for cell in cells}
        engine = CassEngine(
            guards,
            cells,
            examples,
            outputs,
            WelfareProfile("high_safety", 1.0),
            run_id="cert",
            measured_pairs=measured,
        )

        winner = engine.certified_winner()
        self.assertIsNotNone(winner)
        self.assertEqual(winner.guard_ids, ("guard_a", "guard_b"))
        certificate = engine.build_certificate()
        self.assertEqual(certificate.status, "certified_winner")

    def test_does_not_certify_tied_architectures(self) -> None:
        guards, cells, examples, outputs = build_cert_fixture()
        # Make guard_b identical to guard_a, so single guards and pair tie.
        replaced: list[GuardOutput] = []
        a_by_example = {out.example_id: out for out in outputs if out.guard_id == "guard_a"}
        for out in outputs:
            if out.guard_id == "guard_b":
                a = a_by_example[out.example_id]
                replaced.append(make_output("guard_b", out.example_id, 1 if a.binary_block else 0))
            else:
                replaced.append(out)
        measured = {(pair_key("guard_a", "guard_b"), cell.cell_id) for cell in cells}
        engine = CassEngine(
            guards,
            cells,
            examples,
            replaced,
            WelfareProfile("high_safety", 1.0),
            run_id="tie",
            measured_pairs=measured,
        )
        self.assertIsNone(engine.certified_winner())


if __name__ == "__main__":
    unittest.main()

