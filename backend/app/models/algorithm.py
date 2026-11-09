"""Pydantic schemas for comparing knapsack algorithm results."""

from math import isfinite
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator


class AlgorithmResource(BaseModel):
    """A resource in the shared knapsack input format."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str | StrictInt
    name: str = Field(min_length=1, max_length=120)
    cost: StrictInt = Field(ge=0)
    priority: float = Field(ge=0, allow_inf_nan=False)

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, value: Any) -> Any:
        if isinstance(value, bool) or not isinstance(value, (str, int)):
            raise ValueError("id must be a non-empty string or integer")
        if isinstance(value, str) and not value.strip():
            raise ValueError("id must be a non-empty string or integer")
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value:
            raise ValueError("name must not be blank")
        return value

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, value: Any) -> Any:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("priority must be a finite non-negative number")
        if (isinstance(value, float) and not isfinite(value)) or value < 0:
            raise ValueError("priority must be a finite non-negative number")
        return value


class AlgorithmComparisonRequest(BaseModel):
    """Validated request shared by all three algorithms."""

    resources: list[AlgorithmResource]
    budget: StrictInt = Field(ge=0)

    @model_validator(mode="after")
    def unique_resource_ids(self) -> "AlgorithmComparisonRequest":
        ids = [resource.id for resource in self.resources]
        if len(ids) != len(set(ids)):
            raise ValueError("resource IDs must be unique")
        return self


class AlgorithmResultResponse(BaseModel):
    algorithm_name: str
    selected_resources: list[AlgorithmResource]
    total_cost: int
    total_priority: float
    remaining_budget: int
    guaranteed_optimal: bool
    execution_time_ms: float
    peak_python_memory_bytes: int | None


class AlgorithmComparisonSummary(BaseModel):
    fastest_algorithm: str
    lowest_python_memory_algorithm: str | None
    algorithms_matching_best_priority: list[str]
    greedy_matches_best_priority: bool


class AlgorithmComparisonResponse(BaseModel):
    input_resource_count: int
    available_budget: int
    best_priority_achieved: float
    memory_measurement: str
    results: list[AlgorithmResultResponse]
    comparison_summary: AlgorithmComparisonSummary

