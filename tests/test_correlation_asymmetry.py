from __future__ import annotations

import unittest

from stackcert.cass.residuals import residual_radius
from stackcert.cass.welfare import serial_pair_pass, welfare_from_sides
from stackcert.data.schemas import Architecture


class CorrelationAsymmetryTest(unittest.TestCase):
    def test_benign_positive_correlation_increases_welfare(self) -> None:
        low_corr_pass = serial_pair_pass(0.8, 0.8, 0.4, 0.4, -0.5)
        high_corr_pass = serial_pair_pass(0.8, 0.8, 0.4, 0.4, 0.5)
        self.assertGreater(high_corr_pass, low_corr_pass)
        self.assertGreater(
            welfare_from_sides(high_corr_pass, 0.1, 2.0),
            welfare_from_sides(low_corr_pass, 0.1, 2.0),
        )

    def test_adversarial_positive_correlation_decreases_welfare(self) -> None:
        low_corr_miss = serial_pair_pass(0.2, 0.2, 0.4, 0.4, -0.2)
        high_corr_miss = serial_pair_pass(0.2, 0.2, 0.4, 0.4, 0.8)
        self.assertGreater(high_corr_miss, low_corr_miss)
        self.assertLess(
            welfare_from_sides(0.9, high_corr_miss, 5.0),
            welfare_from_sides(0.9, low_corr_miss, 5.0),
        )

    def test_k2_residual_is_zero(self) -> None:
        self.assertEqual(residual_radius(Architecture("a+b", ("a", "b"))), 0.0)


if __name__ == "__main__":
    unittest.main()

