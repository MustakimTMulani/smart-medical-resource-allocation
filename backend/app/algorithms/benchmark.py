"""Reproducible timing and peak-memory benchmarks for the knapsack methods.

Run from ``backend`` with ``python -m app.algorithms.benchmark``. The default
run writes ``backend/benchmark_results.csv`` and uses identical generated
inputs and budgets for all algorithms at each requested dataset size.
"""

import argparse
import csv
import random
import time
import tracemalloc
from pathlib import Path
from typing import Any, Callable

from .divide_conquer import solve as solve_divide_conquer
from .dynamic_programming import solve as solve_dynamic_programming
from .greedy import solve as solve_greedy

DEFAULT_SIZES = (10, 15, 20, 25, 30)
DEFAULT_REPEATS = 3
DEFAULT_SEED = 20261108
# Divide and Conquer explores an exponential number of branches (about 2^n).
# At higher sizes it is intentionally recorded as skipped instead of risking a
# benchmark run that takes an impractically long time.
DIVIDE_CONQUER_MAX_ITEMS = 18

RESOURCE_NAMES = ("Ventilator", "Defibrillator", "Patient monitor", "Oxygen cylinder", "Infusion pump", "Ultrasound unit", "PPE bundle", "Emergency medicine kit", "Dialysis machine", "Surgical instrument set")

Algorithm = Callable[[list[dict[str, Any]], int], dict[str, Any]]
ALGORITHMS: tuple[tuple[str, Algorithm], ...] = (
    ("Divide and Conquer", solve_divide_conquer),
    ("Greedy", solve_greedy),
    ("Dynamic Programming", solve_dynamic_programming),
)
CSV_FIELDS = (
    "algorithm_name",
    "number_of_items",
    "budget",
    "execution_time_seconds",
    "memory_consumption_bytes",
    "total_cost",
    "total_priority",
    "is_optimal",
    "status",
)


def generate_dataset(item_count: int, seed: int) -> tuple[list[dict[str, Any]], int]:
    """Create deterministic, plausible medical resource options and a budget."""
    if isinstance(item_count, bool) or not isinstance(item_count, int) or item_count < 1:
        raise ValueError("item_count must be a positive integer")
    rng = random.Random(seed + item_count)
    items = [
        {
            "id": f"MED-{index + 1:03d}",
            "name": RESOURCE_NAMES[index % len(RESOURCE_NAMES)] + (f" {index // len(RESOURCE_NAMES) + 1}" if index >= len(RESOURCE_NAMES) else ""),
            "cost": rng.randint(10, 100),
            "priority": rng.randint(1, 100),
        }
        for index in range(item_count)
    ]
    # The budget allows a meaningful subset rather than making all items fit.
    budget = max(1, int(sum(item["cost"] for item in items) * 0.30))
    return items, budget


def _validate_result(
    result: dict[str, Any], items: list[dict[str, Any]], budget: int
) -> None:
    """Fail loudly if an algorithm returns an infeasible or inconsistent result."""
    selected = result["selected_items"]
    source_by_id = {item["id"]: item for item in items}
    selected_ids = [item["id"] for item in selected]
    if len(selected_ids) != len(set(selected_ids)):
        raise AssertionError("algorithm selected a resource more than once")
    if not set(selected_ids).issubset(source_by_id):
        raise AssertionError("algorithm returned a resource outside the input dataset")
    if result["total_cost"] != sum(item["cost"] for item in selected):
        raise AssertionError("algorithm returned an incorrect total cost")
    if result["total_priority"] != sum(item["priority"] for item in selected):
        raise AssertionError("algorithm returned an incorrect total priority")
    if result["total_cost"] > budget:
        raise AssertionError("algorithm exceeded the benchmark budget")


def _mean(values: list[float]) -> float:
    return sum(values) / len(values)


def benchmark_dataset(
    items: list[dict[str, Any]], budget: int, repeats: int = DEFAULT_REPEATS
) -> list[dict[str, Any]]:
    """Measure each algorithm repeatedly and return one averaged row per method.

    Timing and memory are collected in separate passes. This keeps tracemalloc's
    instrumentation overhead out of execution-time measurements. Each pass
    shuffles method order reproducibly to reduce systematic order effects.
    """
    if isinstance(repeats, bool) or not isinstance(repeats, int) or repeats < 1:
        raise ValueError("repeats must be a positive integer")
    item_count = len(items)
    skipped_divide = item_count > DIVIDE_CONQUER_MAX_ITEMS
    runnable = [
        (name, solver)
        for name, solver in ALGORITHMS
        if not (name == "Divide and Conquer" and skipped_divide)
    ]
    # Each call receives the same data values; solvers validate/copy internally.
    timing_samples: dict[str, list[float]] = {name: [] for name, _ in runnable}
    memory_samples: dict[str, list[float]] = {name: [] for name, _ in runnable}
    final_results: dict[str, dict[str, Any]] = {}
    order_rng = random.Random(DEFAULT_SEED + item_count)

    for _ in range(repeats):
        order = list(runnable)
        order_rng.shuffle(order)
        for name, solver in order:
            start = time.perf_counter()
            result = solver(items, budget)
            elapsed = time.perf_counter() - start
            _validate_result(result, items, budget)
            timing_samples[name].append(elapsed)
            final_results[name] = result

    # Memory pass: input creation is outside the traced region, while each
    # algorithm's own validation and working allocations are included.
    for _ in range(repeats):
        order = list(runnable)
        order_rng.shuffle(order)
        for name, solver in order:
            if tracemalloc.is_tracing():
                raise RuntimeError("benchmark_dataset requires tracemalloc to be stopped initially")
            tracemalloc.start()
            try:
                result = solver(items, budget)
                _, peak_bytes = tracemalloc.get_traced_memory()
            finally:
                tracemalloc.stop()
            _validate_result(result, items, budget)
            memory_samples[name].append(float(peak_bytes))
            final_results[name] = result

    optimal_priority = final_results["Dynamic Programming"]["total_priority"]
    rows: list[dict[str, Any]] = []
    for name, _ in ALGORITHMS:
        if name == "Divide and Conquer" and skipped_divide:
            rows.append({
                "algorithm_name": name,
                "number_of_items": item_count,
                "budget": budget,
                "execution_time_seconds": "",
                "memory_consumption_bytes": "",
                "total_cost": "",
                "total_priority": "",
                "is_optimal": "",
                "status": f"skipped: safety cap is {DIVIDE_CONQUER_MAX_ITEMS} items",
            })
            continue

        result = final_results[name]
        rows.append({
            "algorithm_name": name,
            "number_of_items": item_count,
            "budget": budget,
            "execution_time_seconds": f"{_mean(timing_samples[name]):.9f}",
            "memory_consumption_bytes": f"{_mean(memory_samples[name]):.2f}",
            "total_cost": result["total_cost"],
            "total_priority": result["total_priority"],
            # This reports whether this particular selection matches the exact
            # DP optimum, not merely the solver's general guarantee.
            "is_optimal": result["total_priority"] == optimal_priority,
            "status": "completed",
        })
    return rows


def run_benchmarks(
    output_csv: str | Path,
    *,
    sizes: tuple[int, ...] = DEFAULT_SIZES,
    repeats: int = DEFAULT_REPEATS,
    seed: int = DEFAULT_SEED,
) -> list[dict[str, Any]]:
    """Benchmark configured sizes and save all rows to a CSV file."""
    if not sizes or any(isinstance(size, bool) or not isinstance(size, int) or size < 1 for size in sizes):
        raise ValueError("sizes must contain positive integers")
    if len(set(sizes)) != len(sizes):
        raise ValueError("sizes must not contain duplicates")
    all_rows: list[dict[str, Any]] = []
    for size in sizes:
        items, budget = generate_dataset(size, seed)
        all_rows.extend(benchmark_dataset(items, budget, repeats))

    destination = Path(output_csv)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(all_rows)
    return all_rows


def main() -> None:
    """Command-line entry point for a full benchmark run."""
    backend_dir = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=backend_dir / "benchmark_results.csv",
        help="CSV destination (default: backend/benchmark_results.csv)",
    )
    parser.add_argument("--repeats", type=int, default=DEFAULT_REPEATS)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()
    rows = run_benchmarks(args.output, repeats=args.repeats, seed=args.seed)
    print(f"Saved {len(rows)} benchmark rows to {args.output}")
    print("\nAlgorithm                 Items  Budget  Avg time (s)  Avg peak memory (bytes)  Priority  Optimal  Status")
    for row in rows:
        print(
            f"{row['algorithm_name']:<25} {row['number_of_items']:>5}  {row['budget']:>6}  "
            f"{str(row['execution_time_seconds']):>12}  {str(row['memory_consumption_bytes']):>23}  "
            f"{str(row['total_priority']):>8}  {str(row['is_optimal']):>7}  {row['status']}"
        )


if __name__ == "__main__":
    main()

