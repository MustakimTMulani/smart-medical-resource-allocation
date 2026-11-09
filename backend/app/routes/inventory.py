"""REST endpoints for the medical resource inventory."""

import sqlite3

from fastapi import APIRouter, HTTPException, Response, status

from app.models.resource import ResourceCreate, ResourceResponse, ResourceUpdate
from app.services.inventory import (
    add_resource,
    find_resource,
    list_resources,
    remove_resource,
    replace_resource,
)

router = APIRouter(prefix="/api/resources", tags=["Medical inventory"])


@router.get("", response_model=list[ResourceResponse])
def get_resources() -> list[dict]:
    """Return all inventory resources."""
    return list_resources()


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(resource_id: str) -> dict:
    """Return one resource or a 404 when the ID is unknown."""
    resource = find_resource(resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(resource: ResourceCreate) -> dict:
    """Create a resource; generate an ID when the request omits one."""
    try:
        return add_resource(resource)
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A resource with this ID already exists.",
        ) from error


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(resource_id: str, resource: ResourceUpdate) -> dict:
    """Replace all editable fields on an existing resource."""
    updated = replace_resource(resource_id, resource)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return updated


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: str) -> Response:
    """Delete one resource and return an empty 204 response."""
    if not remove_resource(resource_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
