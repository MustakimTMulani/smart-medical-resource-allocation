"""Algorithm comparison endpoint for the shared 0/1 knapsack input."""

import threading
import time
import tracemalloc
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter

from app.algorithms.divide_conquer import solve as solve_divide_conquer
from app.algorithms.dynamic_programming import solve as solve_dynamic_programming
from app.algorithms.greedy import solve as solve_greedy
from app.models.algorithm import (
    AlgorithmComparisonRequest,
    AlgorithmComparisonResponse,
    AlgorithmComparisonSummary,
    AlgorithmResultResponse,
)

router = APIRouter(prefix="/api/algorithms", tags=["Algorithm comparison"])
_SOLVERS: tuple[tuple[str, Callable[..., dict[str, Any]]], ...] = (
    ("Divide and Conquer", solve_divide_conquer),
    ("Greedy", solve_greedy),
    ("Dynamic Programming", solve_dynamic_programming),
)
_TRACEMALLOC_LOCK = threading.Lock()
_MEMORY_DESCRIPTION = (
    "Peak Python-tracked allocation measured with tracemalloc; not total process memory."
)


def _measure_peak_python_memory(
    solver: Callable[..., dict[str, Any]], resources: list[dict[str, Any]], budget: int
) -> int | None:
    """Measure an isolated run, without taking ownership of an existing tracer."""
    with _TRACEMALLOC_LOCK:
        if tracemalloc.is_tracing():
            return None
        tracemalloc.start()
        try:
            solver(resources, budget)
            _, peak_bytes = tracemalloc.get_traced_memory()
            return peak_bytes
        finally:
            tracemalloc.stop()


@router.post("/compare", response_model=AlgorithmComparisonResponse)
def compare_algorithms(
    request: AlgorithmComparisonRequest,
) -> AlgorithmComparisonResponse:
    """Run every existing solver on the same validated resource list and budget.

    Time and peak Python allocation are measured in separate solver runs so
    tracemalloc overhead does not contaminate the reported execution time.
    """
    # This one list object and budget value are passed to every solver unchanged.
    resources = [resource.model_dump() for resource in request.resources]
    budget = request.budget
    measured: list[tuple[dict[str, Any], float, int | None]] = []

    for _, solver in _SOLVERS:
        started = time.perf_counter()
        result = solver(resources, budget)
        elapsed_ms = (time.perf_counter() - started) * 1000
        peak_bytes = _measure_peak_python_memory(solver, resources, budget)
        measured.append((result, elapsed_ms, peak_bytes))

    results = [
        AlgorithmResultResponse(
            algorithm_name=result["algorithm"],
            selected_resources=result["selected_items"],
            total_cost=result["total_cost"],
            total_priority=result["total_priority"],
            remaining_budget=budget - result["total_cost"],
            guaranteed_optimal=result["optimal"],
            execution_time_ms=elapsed_ms,
            peak_python_memory_bytes=peak_bytes,
        )
        for result, elapsed_ms, peak_bytes in measured
    ]
    best_priority = max((result.total_priority for result in results), default=0)
    matching = [
        result.algorithm_name
        for result in results
        if result.total_priority == best_priority
    ]
    memory_results = [result for result in results if result.peak_python_memory_bytes is not None]
    lowest_memory = min(memory_results, key=lambda result: result.peak_python_memory_bytes) if memory_results else None
    fastest = min(results, key=lambda result: result.execution_time_ms)
    greedy_result = next(result for result in results if result.algorithm_name == "greedy_heuristic")

    return AlgorithmComparisonResponse(
        input_resource_count=len(resources),
        available_budget=budget,
        best_priority_achieved=best_priority,
        memory_measurement=_MEMORY_DESCRIPTION,
        results=results,
        comparison_summary=AlgorithmComparisonSummary(
            fastest_algorithm=fastest.algorithm_name,
            lowest_python_memory_algorithm=lowest_memory.algorithm_name if lowest_memory else None,
            algorithms_matching_best_priority=matching,
            greedy_matches_best_priority=greedy_result.total_priority == best_priority,
        ),
    )
