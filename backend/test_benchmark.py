"""Small smoke tests for synthetic benchmark generation and CSV output."""

import csv
from pathlib import Path
import tempfile
import unittest

from app.algorithms.benchmark import (
    DIVIDE_CONQUER_MAX_ITEMS,
    generate_dataset,
    run_benchmarks,
)


class BenchmarkChecks(unittest.TestCase):
    def test_dataset_is_reproducible(self) -> None:
        self.assertEqual(generate_dataset(5, 123), generate_dataset(5, 123))
        items, budget = generate_dataset(5, 123)
        self.assertEqual(len(items), 5)
        self.assertGreater(budget, 0)

    def test_benchmark_rows_and_csv_are_valid(self) -> None:
        sizes = (5, DIVIDE_CONQUER_MAX_ITEMS + 1)
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "benchmark.csv"
            rows = run_benchmarks(output, sizes=sizes, repeats=1, seed=123)
            self.assertEqual(len(rows), len(sizes) * 3)
            self.assertTrue(output.exists())
            with output.open(newline="", encoding="utf-8") as csv_file:
                saved = list(csv.DictReader(csv_file))
            self.assertEqual(len(saved), len(rows))
            for size in sizes:
                group = [row for row in saved if int(row["number_of_items"]) == size]
                self.assertEqual(len(group), 3)
                self.assertEqual(len({row["budget"] for row in group}), 1)

            for row in rows:
                self.assertIn(int(row["number_of_items"]), sizes)
                if row["status"] == "completed":
                    self.assertGreaterEqual(float(row["execution_time_seconds"]), 0)
                    self.assertGreater(float(row["memory_consumption_bytes"]), 0)
                    self.assertGreaterEqual(int(row["total_cost"]), 0)
                    self.assertGreaterEqual(int(row["total_priority"]), 0)
                    self.assertIsInstance(row["is_optimal"], bool)
            skipped = [row for row in rows if row["status"].startswith("skipped")]
            self.assertEqual(len(skipped), 1)
            self.assertEqual(skipped[0]["algorithm_name"], "Divide and Conquer")
            self.assertEqual(skipped[0]["execution_time_seconds"], "")
            self.assertEqual(skipped[0]["memory_consumption_bytes"], "")
            self.assertEqual(skipped[0]["is_optimal"], "")
            saved_completed = [row for row in saved if row["status"] == "completed"]
            self.assertTrue(all(row["is_optimal"] in ("True", "False") for row in saved_completed))


if __name__ == "__main__":
    unittest.main(verbosity=2)




