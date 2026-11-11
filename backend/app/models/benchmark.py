"""Response schemas for reading existing benchmark measurements."""

from typing import Literal

from pydantic import BaseModel, Field


class BenchmarkRunResponse(BaseModel):
    algorithm_name: str
    number_of_items: int = Field(ge=1)
    budget: int = Field(ge=0)
    average_execution_time_seconds: float | None = Field(default=None, ge=0)
    average_peak_memory_bytes: float | None = Field(default=None, ge=0)
    total_cost: int | None = Field(default=None, ge=0)
    total_priority: float | None = Field(default=None, ge=0)
    is_optimal: bool | None = None
    status: Literal["completed", "skipped"]
    status_detail: str | None = None


class BenchmarkResultsResponse(BaseModel):
    memory_measurement: str
    results: list[BenchmarkRunResponse]
