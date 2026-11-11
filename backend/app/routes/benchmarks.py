"""Read-only endpoint for previously generated benchmark CSV data."""

import csv
from math import isfinite
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.benchmark import BenchmarkResultsResponse, BenchmarkRunResponse

router = APIRouter(prefix="/api/algorithms", tags=["Algorithm benchmarks"])
BENCHMARK_RESULTS_PATH = Path(__file__).resolve().parents[2] / "benchmark_results.csv"
REQUIRED_COLUMNS = {
    "algorithm_name",
    "number_of_items",
    "budget",
    "execution_time_seconds",
    "memory_consumption_bytes",
    "total_cost",
    "total_priority",
    "is_optimal",
    "status",
}
MEMORY_DESCRIPTION = (
    "Average peak Python-tracked allocation measured with tracemalloc; not total process memory."
)


def _number(value: str | None, *, integer: bool = False) -> int | float | None:
    """Convert a non-negative CSV number; blank cells remain null."""
    if value is None or not value.strip():
        return None
    try:
        parsed = int(value) if integer else float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"invalid numeric value {value!r}") from error
    if parsed < 0 or isinstance(parsed, float) and not isfinite(parsed):
        raise ValueError(f"numeric value must be finite and non-negative: {value!r}")
    return parsed


def read_benchmark_csv(path: Path) -> list[BenchmarkRunResponse]:
    """Parse existing results; never starts or reruns the benchmarking module."""
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail="Benchmark results are unavailable. Generate backend/benchmark_results.csv first.",
        )

    try:
        with path.open("r", newline="", encoding="utf-8-sig") as csv_file:
            reader = csv.DictReader(csv_file)
            if reader.fieldnames is None or not REQUIRED_COLUMNS.issubset(reader.fieldnames):
                raise ValueError("CSV is missing one or more required benchmark columns")

            results: list[BenchmarkRunResponse] = []
            for line_number, row in enumerate(reader, start=2):
                if None in row or any(row.get(column) is None for column in REQUIRED_COLUMNS):
                    raise ValueError(f"row {line_number} has an invalid number of columns")

                algorithm_name = (row["algorithm_name"] or "").strip()
                raw_status = (row["status"] or "").strip()
                if not algorithm_name or not raw_status:
                    raise ValueError(f"row {line_number} is missing algorithm name or status")

                skipped = raw_status.lower().startswith("skipped")
                if not skipped and raw_status.lower() != "completed":
                    raise ValueError(f"row {line_number} has unsupported status {raw_status!r}")

                item_count = _number(row["number_of_items"], integer=True)
                budget = _number(row["budget"], integer=True)
                if item_count is None or item_count < 1 or budget is None:
                    raise ValueError(f"row {line_number} has an invalid item count or budget")

                if skipped:
                    # The CSV intentionally leaves skipped metrics empty. Return nulls.
                    execution_time = memory_bytes = total_cost = total_priority = None
                    is_optimal = None
                    status_detail = raw_status.partition(":")[2].strip() or "Benchmark run skipped."
                else:
                    execution_time = _number(row["execution_time_seconds"])
                    memory_bytes = _number(row["memory_consumption_bytes"])
                    total_cost = _number(row["total_cost"], integer=True)
                    total_priority = _number(row["total_priority"])
                    optimal_value = (row["is_optimal"] or "").strip().lower()
                    if None in (execution_time, memory_bytes, total_cost, total_priority):
                        raise ValueError(f"row {line_number} is missing a completed measurement")
                    if optimal_value not in {"true", "false"}:
                        raise ValueError(f"row {line_number} has an invalid is_optimal value")
                    is_optimal = optimal_value == "true"
                    status_detail = None

                results.append(BenchmarkRunResponse(
                    algorithm_name=algorithm_name,
                    number_of_items=item_count,
                    budget=budget,
                    average_execution_time_seconds=execution_time,
                    average_peak_memory_bytes=memory_bytes,
                    total_cost=total_cost,
                    total_priority=total_priority,
                    is_optimal=is_optimal,
                    status="skipped" if skipped else "completed",
                    status_detail=status_detail,
                ))
            return results
    except HTTPException:
        raise
    except (OSError, csv.Error, UnicodeError, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail=f"Benchmark results file is malformed or unreadable: {error}",
        ) from error


@router.get("/benchmarks", response_model=BenchmarkResultsResponse)
def get_benchmarks() -> BenchmarkResultsResponse:
    """Return saved benchmark measurements only; do not run benchmarks here."""
    return BenchmarkResultsResponse(
        memory_measurement=MEMORY_DESCRIPTION,
        results=read_benchmark_csv(BENCHMARK_RESULTS_PATH),
    )
