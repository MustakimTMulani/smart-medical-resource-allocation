"""Executable checks for the 0/1 knapsack algorithm implementations.

Run from the backend folder with:
    .\.venv\Scripts\python.exe test_algorithms.py
"""

from itertools import combinations
import unittest
from typing import Any, Callable

from app.algorithms.divide_conquer import solve as solve_divide_conquer
from app.algorithms.dynamic_programming import solve as solve_dynamic_programming
from app.algorithms.greedy import solve as solve_greedy
from app.database.sample_resources import SAMPLE_BUDGET, SAMPLE_RESOURCES


Algorithm = Callable[[list[dict[str, Any]], int], dict[str, Any]]
ALGORITHMS: tuple[tuple[str, Algorithm], ...] = (
    ("Divide and Conquer", solve_divide_conquer),
    ("Greedy", solve_greedy),
    ("Dynamic Programming", solve_dynamic_programming),
)

# This common example makes ratio-based greedy take the first item (value 60)
# and second item (value 100), for 160 total. DP instead chooses the latter
# two resources (cost 50, value 220).
GREEDY_COUNTEREXAMPLE_BUDGET = 50
GREEDY_COUNTEREXAMPLE = [
    {"id": "A", "name": "Resource A", "cost": 10, "priority": 60},
    {"id": "B", "name": "Resource B", "cost": 20, "priority": 100},
    {"id": "C", "name": "Resource C", "cost": 30, "priority": 120},
]


def brute_force_optimum(items: list[dict[str, Any]], budget: int) -> int | float:
    """Return a small dataset's exact optimum, independently of the algorithms."""
    best = 0
    for size in range(len(items) + 1):
        for selection in combinations(items, size):
            if sum(item["cost"] for item in selection) <= budget:
                best = max(best, sum(item["priority"] for item in selection))
    return best


class KnapsackAlgorithmChecks(unittest.TestCase):
    def assert_valid_result(
        self,
        result: dict[str, Any],
        items: list[dict[str, Any]],
        budget: int,
        *,
        optimal: bool,
    ) -> None:
        """Check feasibility, selected IDs, totals, and optimality metadata."""
        selected = result["selected_items"]
        selected_ids = [item["id"] for item in selected]
        valid_ids = {item["id"] for item in items}
        self.assertLessEqual(result["total_cost"], budget)
        self.assertTrue(set(selected_ids).issubset(valid_ids))
        self.assertEqual(len(selected_ids), len(set(selected_ids)))
        self.assertEqual(result["total_cost"], sum(item["cost"] for item in selected))
        self.assertEqual(result["total_priority"], sum(item["priority"] for item in selected))
        self.assertIs(result["optimal"], optimal)

    def test_sample_dataset_all_algorithms(self) -> None:
        results = {
            label: algorithm(SAMPLE_RESOURCES, SAMPLE_BUDGET)
            for label, algorithm in ALGORITHMS
        }
        for label, algorithm in ALGORITHMS:
            expected_optimal_flag = label != "Greedy"
            with self.subTest(algorithm=label):
                self.assert_valid_result(
                    results[label], SAMPLE_RESOURCES, SAMPLE_BUDGET,
                    optimal=expected_optimal_flag,
                )

        expected = brute_force_optimum(SAMPLE_RESOURCES, SAMPLE_BUDGET)
        self.assertEqual(results["Divide and Conquer"]["total_priority"], expected)
        self.assertEqual(results["Dynamic Programming"]["total_priority"], expected)
        self.assertEqual(
            results["Divide and Conquer"]["total_priority"],
            results["Dynamic Programming"]["total_priority"],
        )

    def test_greedy_counterexample_is_feasible_but_suboptimal(self) -> None:
        greedy_result = solve_greedy(GREEDY_COUNTEREXAMPLE, GREEDY_COUNTEREXAMPLE_BUDGET)
        dynamic_result = solve_dynamic_programming(
            GREEDY_COUNTEREXAMPLE, GREEDY_COUNTEREXAMPLE_BUDGET
        )
        self.assert_valid_result(
            greedy_result, GREEDY_COUNTEREXAMPLE, GREEDY_COUNTEREXAMPLE_BUDGET,
            optimal=False,
        )
        self.assert_valid_result(
            dynamic_result, GREEDY_COUNTEREXAMPLE, GREEDY_COUNTEREXAMPLE_BUDGET,
            optimal=True,
        )
        self.assertEqual(greedy_result["total_priority"], 160)
        self.assertEqual(dynamic_result["total_priority"], 220)
        self.assertLess(greedy_result["total_priority"], dynamic_result["total_priority"])

    def test_empty_input(self) -> None:
        for label, algorithm in ALGORITHMS:
            with self.subTest(algorithm=label):
                result = algorithm([], 0)
                self.assert_valid_result(result, [], 0, optimal=(label != "Greedy"))
                self.assertEqual(result["selected_items"], [])
                self.assertEqual(result["total_priority"], 0)

    def test_invalid_input_is_rejected_by_each_algorithm(self) -> None:
        invalid_cases = (
            ([{"id": "X", "name": "Missing priority", "cost": 2}], 5),
            ([{"id": "X", "name": "Negative cost", "cost": -1, "priority": 2}], 5),
            ([{"id": "X", "name": "Bad budget item", "cost": 1, "priority": 2}], -1),
        )
        for label, algorithm in ALGORITHMS:
            for items, budget in invalid_cases:
                with self.subTest(algorithm=label, items=items, budget=budget):
                    with self.assertRaises(ValueError):
                        algorithm(items, budget)


def print_comparison_table() -> None:
    """Print the requested comparison using the same sample input for each."""
    rows = []
    for label, algorithm in ALGORITHMS:
        result = algorithm(SAMPLE_RESOURCES, SAMPLE_BUDGET)
        names = ", ".join(item["name"] for item in result["selected_items"]) or "None"
        guarantee = "Yes (optimal)" if result["optimal"] else "No (heuristic)"
        rows.append((label, names, str(result["total_cost"]), str(result["total_priority"]), guarantee))

    headers = ("Algorithm name", "Selected resources", "Total cost", "Total priority", "Optimality guarantee")
    widths = [max(len(headers[i]), *(len(row[i]) for row in rows)) for i in range(len(headers))]
    print("\nSample dataset comparison (budget = 100)")
    print(" | ".join(headers[i].ljust(widths[i]) for i in range(len(headers))))
    print("-+-".join("-" * width for width in widths))
    for row in rows:
        print(" | ".join(row[i].ljust(widths[i]) for i in range(len(row))))


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(KnapsackAlgorithmChecks)
    test_result = unittest.TextTestRunner(verbosity=2).run(suite)
    print_comparison_table()
    raise SystemExit(0 if test_result.wasSuccessful() else 1)
