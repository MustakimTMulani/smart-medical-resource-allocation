"""Priority-to-cost greedy heuristic for 0/1 knapsack."""

from collections.abc import Mapping, Sequence
from math import inf
from typing import Any

from .common import make_result, validate_input


def solve(items: Sequence[Mapping[str, Any]], budget: int) -> dict[str, Any]:
    """Choose by descending priority/cost; this heuristic is not guaranteed optimal."""
    resources = validate_input(items, budget)

    def ratio(item: dict[str, Any]) -> float:
        # A positive-priority free resource has an infinite ratio; a zero-value
        # free resource has ratio zero to keep the ordering defined.
        if item["cost"] == 0:
            return inf if item["priority"] > 0 else 0.0
        return item["priority"] / item["cost"]

    # The original index provides a stable, deterministic tie-breaker.
    ordered = sorted(enumerate(resources), key=lambda pair: (-ratio(pair[1]), pair[0]))
    selected: list[dict[str, Any]] = []
    remaining = budget
    for _, item in ordered:
        if item["cost"] <= remaining:
            selected.append(item)
            remaining -= item["cost"]

    return make_result(selected, algorithm="greedy_heuristic", optimal=False)
