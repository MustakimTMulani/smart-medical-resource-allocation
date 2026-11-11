"""Tests for reading saved benchmark CSV data through the API."""

import csv
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.algorithms.benchmark import CSV_FIELDS
from app.main import app


class BenchmarkEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.csv_path = Path(self.temp_dir.name) / "benchmark_results.csv"
        self.path_patch = patch("app.routes.benchmarks.BENCHMARK_RESULTS_PATH", self.csv_path)
        self.database_path_patch = patch(
            "app.database.connection.get_database_path",
            return_value=Path(self.temp_dir.name) / "test_inventory.db",
        )
        self.path_patch.start()
        self.database_path_patch.start()
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.database_path_patch.stop()
        self.path_patch.stop()
        self.temp_dir.cleanup()

    def write_csv(self, rows: list[dict[str, object]]) -> None:
        with self.csv_path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
            writer.writeheader()
            writer.writerows(rows)

    @staticmethod
    def completed_row(**overrides: object) -> dict[str, object]:
        row: dict[str, object] = {
            "algorithm_name": "Dynamic Programming",
            "number_of_items": 10,
            "budget": 160,
            "execution_time_seconds": "0.000286733",
            "memory_consumption_bytes": "18434.67",
            "total_cost": 139,
            "total_priority": 287,
            "is_optimal": "True",
            "status": "completed",
        }
        row.update(overrides)
        return row

    def test_reads_completed_csv_rows_as_structured_json(self) -> None:
        self.write_csv([self.completed_row()])

        response = self.client.get("/api/algorithms/benchmarks")

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertIn("tracemalloc", payload["memory_measurement"])
        result = payload["results"][0]
        self.assertEqual(result["algorithm_name"], "Dynamic Programming")
        self.assertEqual(result["number_of_items"], 10)
        self.assertEqual(result["budget"], 160)
        self.assertAlmostEqual(result["average_execution_time_seconds"], 0.000286733)
        self.assertAlmostEqual(result["average_peak_memory_bytes"], 18434.67)
        self.assertEqual(result["total_priority"], 287)
        self.assertIs(result["is_optimal"], True)
        self.assertEqual(result["status"], "completed")

    def test_missing_csv_returns_clear_service_error(self) -> None:
        response = self.client.get("/api/algorithms/benchmarks")

        self.assertEqual(response.status_code, 503)
        self.assertIn("Generate backend/benchmark_results.csv", response.json()["detail"])

    def test_malformed_csv_returns_clear_service_error(self) -> None:
        self.csv_path.write_text("algorithm_name,number_of_items\nGreedy,10\n", encoding="utf-8")

        response = self.client.get("/api/algorithms/benchmarks")

        self.assertEqual(response.status_code, 503)
        self.assertIn("malformed", response.json()["detail"])

    def test_skipped_row_preserves_status_and_null_measurements(self) -> None:
        self.write_csv([{
            "algorithm_name": "Divide and Conquer",
            "number_of_items": 20,
            "budget": 335,
            "execution_time_seconds": "",
            "memory_consumption_bytes": "",
            "total_cost": "",
            "total_priority": "",
            "is_optimal": "",
            "status": "skipped: safety cap is 18 items",
        }])

        response = self.client.get("/api/algorithms/benchmarks")

        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()["results"][0]
        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["status_detail"], "safety cap is 18 items")
        self.assertIsNone(result["average_execution_time_seconds"])
        self.assertIsNone(result["average_peak_memory_bytes"])
        self.assertIsNone(result["total_priority"])
        self.assertIsNone(result["is_optimal"])

    def test_completed_row_with_invalid_measurement_is_rejected(self) -> None:
        self.write_csv([self.completed_row(execution_time_seconds="not-a-number")])

        response = self.client.get("/api/algorithms/benchmarks")

        self.assertEqual(response.status_code, 503)
        self.assertIn("invalid numeric", response.json()["detail"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
