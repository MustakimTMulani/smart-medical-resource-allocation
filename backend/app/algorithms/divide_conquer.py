"""Recursive, exhaustive divide-and-conquer solution to 0/1 knapsack."""

from collections.abc import Mapping, Sequence
from numbers import Real
from typing import Any

from .common import make_result, validate_input


def solve(items: Sequence[Mapping[str, Any]], budget: int) -> dict[str, Any]:
    """Recursively include or reject every resource; runtime is O(2^n)."""
    resources = validate_input(items, budget)

    def choose(index: int, remaining: int) -> tuple[Real, tuple[int, ...]]:
        if index == len(resources):
            return 0, ()

        # Branch one rejects the current item.
        best_value, best_indices = choose(index + 1, remaining)
        item = resources[index]

        # Branch two selects it once, only when it fits the remaining budget.
        if item["cost"] <= remaining:
            value, indices = choose(index + 1, remaining - item["cost"])
            value += item["priority"]
            if value > best_value:  # Keep ties deterministic by preferring rejection.
                return value, (index,) + indices
        return best_value, best_indices

    _, selected_indices = choose(0, budget)
    selected = [resources[index] for index in selected_indices]
    return make_result(selected, algorithm="divide_and_conquer", optimal=True)
