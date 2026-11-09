"""Shared input validation and result formatting for knapsack algorithms."""

from collections.abc import Mapping, Sequence
from math import isfinite
from numbers import Real
from typing import Any


def validate_input(items: Sequence[Mapping[str, Any]], budget: int) -> list[dict[str, Any]]:
    """Validate and copy the shared item format: id, name, cost, priority.

    Costs and budget are non-negative integers so the DP table has discrete
    capacities. Priority may be any non-negative finite real number.
    """
    if isinstance(items, (str, bytes)) or not isinstance(items, Sequence):
        raise ValueError("items must be a sequence of item objects")
    if isinstance(budget, bool) or not isinstance(budget, int) or budget < 0:
        raise ValueError("budget must be a non-negative integer")

    validated: list[dict[str, Any]] = []
    seen_ids: set[str | int] = set()
    required = {"id", "name", "cost", "priority"}
    for index, item in enumerate(items):
        if not isinstance(item, Mapping):
            raise ValueError(f"item at index {index} must be an object")
        missing = required - item.keys()
        if missing:
            raise ValueError(f"item at index {index} is missing: {', '.join(sorted(missing))}")

        item_id, name, cost, priority = item["id"], item["name"], item["cost"], item["priority"]
        if isinstance(item_id, bool) or not isinstance(item_id, (str, int)) or (isinstance(item_id, str) and not item_id.strip()):
            raise ValueError(f"item at index {index} must have a non-empty string or integer id")
        if item_id in seen_ids:
            raise ValueError(f"duplicate item id: {item_id!r}")
        seen_ids.add(item_id)
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"item at index {index} must have a non-empty name")
        if isinstance(cost, bool) or not isinstance(cost, int) or cost < 0:
            raise ValueError(f"item at index {index} cost must be a non-negative integer")
        # Integers cannot be infinite; avoid converting very large integers to float.
        invalid_float = isinstance(priority, float) and not isfinite(priority)
        if isinstance(priority, bool) or not isinstance(priority, Real) or invalid_float or priority < 0:
            raise ValueError(f"item at index {index} priority must be a non-negative finite number")

        # Preserve optional metadata but make a fresh dictionary for each item.
        validated.append({**item, "id": item_id, "name": name, "cost": cost, "priority": priority})
    return validated


def make_result(selected_items: list[dict[str, Any]], *, algorithm: str, optimal: bool) -> dict[str, Any]:
    """Return the standard result fields used by each algorithm."""
    return {
        "algorithm": algorithm,
        "selected_items": selected_items,
        "total_cost": sum(item["cost"] for item in selected_items),
        "total_priority": sum(item["priority"] for item in selected_items),
        "optimal": optimal,
    }
