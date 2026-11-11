"""Pydantic schemas for medical resource inventory requests and responses."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, computed_field, field_validator, model_validator


ResourceStatus = Literal["Available", "Allocated", "Maintenance"]
StockStatus = Literal["Low Stock", "Sufficient"]


class ResourceFields(BaseModel):
    """Fields stored for a resource; id/name/cost/priority match the algorithms."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    cost: int = Field(ge=0)
    priority: int = Field(ge=0, le=100)
    category: str = Field(default="Critical care", min_length=1, max_length=60)
    status: ResourceStatus = "Available"
    quantity: int = Field(default=0, ge=0)
    current_stock: StrictInt = Field(default=0, ge=0)
    minimum_stock: StrictInt = Field(default=0, ge=0)
    location: str = Field(default="Unassigned", min_length=1, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def keep_legacy_quantity_compatible(cls, values: object) -> object:
        """Treat legacy quantity as current stock when the new field is omitted.

        If both are provided, current_stock is canonical and quantity is kept as
        its legacy API/database alias so existing clients remain compatible.
        """
        if not isinstance(values, dict):
            return values
        normalized = dict(values)
        if "current_stock" not in normalized:
            normalized["current_stock"] = normalized.get("quantity", 0)
        normalized["quantity"] = normalized["current_stock"]
        normalized.setdefault("minimum_stock", 0)
        return normalized

    @field_validator("name", "category", "location")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class ResourceCreate(ResourceFields):
    """Create schema; id is optional because the API can generate one."""

    id: str | None = Field(default=None, min_length=1, max_length=32)


class ResourceUpdate(ResourceFields):
    """Full replacement schema for updating an existing resource."""


class ResourceResponse(ResourceFields):
    """Resource fields returned by the inventory API."""

    id: str = Field(min_length=1, max_length=32)

    @computed_field
    @property
    def stock_status(self) -> StockStatus:
        """Flag a shortage only when stock is below its configured threshold."""
        return "Low Stock" if self.current_stock < self.minimum_stock else "Sufficient"

    @computed_field
    @property
    def shortage_quantity(self) -> int:
        """Return the number of units needed to reach the minimum stock level."""
        return max(self.minimum_stock - self.current_stock, 0)


class InventorySummaryResponse(BaseModel):
    """Aggregate stock and shortage values across the inventory."""

    total_resource_types: int = Field(ge=0)
    total_units_in_stock: int = Field(ge=0)
    low_stock_resource_count: int = Field(ge=0)
    total_shortage_units: int = Field(ge=0)
