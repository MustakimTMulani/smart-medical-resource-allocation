"""SQLite-backed resource inventory operations."""

from uuid import uuid4

from app.database.connection import get_connection
from app.models.resource import ResourceCreate, ResourceUpdate


def list_resources() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, name, cost, priority, category, status, quantity, location "
            "FROM resources ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]


def find_resource(resource_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, cost, priority, category, status, quantity, location "
            "FROM resources WHERE id = ?",
            (resource_id,),
        ).fetchone()
    return dict(row) if row else None


def add_resource(resource: ResourceCreate) -> dict:
    resource_id = resource.id or f"MED-{uuid4().hex[:8].upper()}"
    values = resource.model_dump(exclude={"id"})
    with get_connection() as connection:
        connection.execute(
            """INSERT INTO resources
               (id, name, cost, priority, category, status, quantity, location)
               VALUES (:id, :name, :cost, :priority, :category, :status, :quantity, :location)""",
            {"id": resource_id, **values},
        )
        row = connection.execute("SELECT * FROM resources WHERE id = ?", (resource_id,)).fetchone()
    return dict(row)


def replace_resource(resource_id: str, resource: ResourceUpdate) -> dict | None:
    values = resource.model_dump()
    with get_connection() as connection:
        cursor = connection.execute(
            """UPDATE resources
               SET name = :name, cost = :cost, priority = :priority,
                   category = :category, status = :status, quantity = :quantity,
                   location = :location
               WHERE id = :id""",
            {"id": resource_id, **values},
        )
        if cursor.rowcount == 0:
            return None
        row = connection.execute("SELECT * FROM resources WHERE id = ?", (resource_id,)).fetchone()
    return dict(row)


def remove_resource(resource_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
    return cursor.rowcount > 0
