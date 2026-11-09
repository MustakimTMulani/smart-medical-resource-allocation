"""Pydantic schemas for medical resource inventory requests and responses."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ResourceStatus = Literal["Available", "Allocated", "Maintenance"]


class ResourceFields(BaseModel):
    """Fields stored for a resource; id/name/cost/priority match the algorithms."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    cost: int = Field(ge=0)
    priority: int = Field(ge=0, le=100)
    category: str = Field(default="Critical care", min_length=1, max_length=60)
    status: ResourceStatus = "Available"
    quantity: int = Field(default=0, ge=0)
    location: str = Field(default="Unassigned", min_length=1, max_length=100)

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
