"""Bottom-up dynamic programming solution to 0/1 knapsack."""

from collections.abc import Mapping, Sequence
from numbers import Real
from typing import Any

from .common import make_result, validate_input


def solve(items: Sequence[Mapping[str, Any]], budget: int) -> dict[str, Any]:
    """Fill a DP table and reconstruct an optimal resource selection."""
    resources = validate_input(items, budget)
    count = len(resources)
    # Rows mean how many resources have been considered; columns are budgets.
    table: list[list[Real]] = [[0] * (budget + 1) for _ in range(count + 1)]

    for row, item in enumerate(resources, start=1):
        cost, priority = item["cost"], item["priority"]
        for capacity in range(budget + 1):
            without_item = table[row - 1][capacity]
            with_item = (
                table[row - 1][capacity - cost] + priority
                if cost <= capacity
                else float("-inf")
            )
            table[row][capacity] = max(without_item, with_item)

    # Walk upward through the table: a strict improvement means this item
    # contributed to the best value for the current remaining capacity.
    selected_indices: list[int] = []
    capacity = budget
    for row in range(count, 0, -1):
        if table[row][capacity] > table[row - 1][capacity]:
            item_index = row - 1
            selected_indices.append(item_index)
            capacity -= resources[item_index]["cost"]

    selected_indices.reverse()
    selected = [resources[index] for index in selected_indices]
    return make_result(selected, algorithm="dynamic_programming", optimal=True)
