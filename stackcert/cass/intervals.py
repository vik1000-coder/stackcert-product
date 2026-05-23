from __future__ import annotations

from stackcert.data.schemas import BenchmarkCell, FirstOrderStats, PairInterval, PairStatistics


def pair_interval_for(
    pair: tuple[str, str],
    cell: BenchmarkCell,
    pair_stats: PairStatistics,
    first_order: dict[tuple[str, str], FirstOrderStats],
    *,
    measured_pairs: set[tuple[tuple[str, str], str]],
    rho_prior: float,
    use_feasible_bounds: bool = True,
    reveal_oracle_for_invalid_prior: bool = True,
) -> PairInterval:
    measured = (pair, cell.cell_id) in measured_pairs
    if measured:
        low = high = center = pair_stats.correlation
        radius = 0.0
    else:
        feasible_low, feasible_high = pair_stats.feasible_low, pair_stats.feasible_high
        if use_feasible_bounds:
            low = max(-rho_prior, feasible_low)
            high = min(rho_prior, feasible_high)
            if low > high:
                low, high = feasible_low, feasible_high
        else:
            low, high = -rho_prior, rho_prior

        if reveal_oracle_for_invalid_prior and not low <= pair_stats.correlation <= high:
            low, high = (feasible_low, feasible_high) if use_feasible_bounds else (-1.0, 1.0)

        center = (low + high) / 2.0
        radius = (high - low) / 2.0

    return PairInterval(
        guard_a=pair[0],
        guard_b=pair[1],
        cell_id=cell.cell_id,
        side=cell.side,
        low=low,
        high=high,
        center=center,
        radius=radius,
        measured=measured,
        feasible_low=pair_stats.feasible_low,
        feasible_high=pair_stats.feasible_high,
        n_examples=first_order[(pair[0], cell.cell_id)].n_examples,
    )

