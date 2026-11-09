"""Tests for the algorithm comparison endpoint."""

from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.algorithms.divide_conquer import solve as divide_conquer
from app.algorithms.dynamic_programming import solve as dynamic_programming
from app.algorithms.greedy import solve as greedy
from app.main import app


COUNTEREXAMPLE = [
    {"id": "A", "name": "Resource A", "cost": 10, "priority": 60},
    {"id": "B", "name": "Resource B", "cost": 20, "priority": 100},
    {"id": "C", "name": "Resource C", "cost": 30, "priority": 120},
]


class AlgorithmComparisonEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path_patch = patch(
            "app.database.connection.get_database_path",
            return_value=Path(self.temp_dir.name) / "test_inventory.db",
        )
        self.database_path_patch.start()
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.database_path_patch.stop()
        self.temp_dir.cleanup()

    def test_executes_all_algorithms_with_structured_results(self) -> None:
        response = self.client.post(
            "/api/algorithms/compare",
            json={"resources": COUNTEREXAMPLE, "budget": 50},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["input_resource_count"], 3)
        self.assertEqual(payload["available_budget"], 50)
        self.assertEqual(payload["best_priority_achieved"], 220)
        self.assertIn("Python-tracked", payload["memory_measurement"])
        self.assertIn("not total process memory", payload["memory_measurement"])
        self.assertEqual(len(payload["results"]), 3)
        by_name = {result["algorithm_name"]: result for result in payload["results"]}
        self.assertEqual(set(by_name), {"divide_and_conquer", "greedy_heuristic", "dynamic_programming"})
        for result in by_name.values():
            self.assertLessEqual(result["total_cost"], 50)
            self.assertEqual(result["remaining_budget"], 50 - result["total_cost"])
            self.assertGreaterEqual(result["execution_time_ms"], 0)
            memory = result["peak_python_memory_bytes"]
            self.assertTrue(memory is None or isinstance(memory, int) and memory >= 0)
        self.assertTrue(by_name["divide_and_conquer"]["guaranteed_optimal"])
        self.assertFalse(by_name["greedy_heuristic"]["guaranteed_optimal"])
        self.assertTrue(by_name["dynamic_programming"]["guaranteed_optimal"])
        self.assertEqual(by_name["greedy_heuristic"]["total_priority"], 160)
        self.assertEqual(by_name["dynamic_programming"]["total_priority"], 220)
        self.assertFalse(payload["comparison_summary"]["greedy_matches_best_priority"])

    def test_empty_resources_are_supported(self) -> None:
        response = self.client.post("/api/algorithms/compare", json={"resources": [], "budget": 0})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["best_priority_achieved"], 0)
        self.assertTrue(all(not result["selected_resources"] for result in response.json()["results"]))

    def test_rejects_invalid_budget_and_resource_values(self) -> None:
        invalid_requests = (
            {"resources": [], "budget": -1},
            {"resources": [], "budget": 1.5},
            {"resources": [{"id": "X", "name": "Bad cost", "cost": -1, "priority": 1}], "budget": 2},
            {"resources": [{"id": "X", "name": "Float cost", "cost": 1.2, "priority": 1}], "budget": 2},
            {"resources": [{"id": "X", "name": "Bad priority", "cost": 1, "priority": -0.1}], "budget": 2},
            {"resources": [{"id": "X", "cost": 1, "priority": 1}], "budget": 2},
            {"resources": [{"id": "X", "name": "NaN", "cost": 1, "priority": "NaN"}], "budget": 2},
        )
        for body in invalid_requests:
            with self.subTest(body=body):
                self.assertEqual(self.client.post("/api/algorithms/compare", json=body).status_code, 422)

    def test_rejects_duplicate_ids(self) -> None:
        duplicate = [COUNTEREXAMPLE[0], {**COUNTEREXAMPLE[1], "id": "A"}]
        response = self.client.post(
            "/api/algorithms/compare", json={"resources": duplicate, "budget": 50}
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("unique", response.text)

    def test_all_solvers_receive_same_resource_list_and_budget(self) -> None:
        with (
            patch("app.routes.algorithms.solve_divide_conquer", wraps=divide_conquer) as dc,
            patch("app.routes.algorithms.solve_greedy", wraps=greedy) as gr,
            patch("app.routes.algorithms.solve_dynamic_programming", wraps=dynamic_programming) as dp,
            patch(
                "app.routes.algorithms._SOLVERS",
                new=(
                    ("Divide and Conquer", dc),
                    ("Greedy", gr),
                    ("Dynamic Programming", dp),
                ),
            ),
        ):
            response = self.client.post(
                "/api/algorithms/compare", json={"resources": COUNTEREXAMPLE, "budget": 50}
            )
        self.assertEqual(response.status_code, 200, response.text)
        calls = [dc.call_args_list, gr.call_args_list, dp.call_args_list]
        self.assertTrue(all(len(call_list) == 2 for call_list in calls))
        resource_references = [call_list[0].args[0] for call_list in calls]
        self.assertTrue(all(reference is resource_references[0] for reference in resource_references))
        self.assertEqual(resource_references[0], COUNTEREXAMPLE)
        for call_list in calls:
            for call in call_list:
                self.assertEqual(call.args[1], 50)
                self.assertIs(call.args[0], resource_references[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)

