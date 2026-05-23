from __future__ import annotations


def clipped_probability(value: float) -> float:
    return max(0.0, min(1.0, value))


def serial_pair_pass(q_a: float, q_b: float, std_a: float, std_b: float, correlation: float) -> float:
    return clipped_probability(q_a * q_b + correlation * std_a * std_b)


def welfare_from_sides(benign_pass: float, adversarial_miss: float, lambda_cost: float) -> float:
    return benign_pass - lambda_cost * adversarial_miss

