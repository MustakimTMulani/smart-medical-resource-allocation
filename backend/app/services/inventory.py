"""SQLite-backed resource inventory operations."""

from uuid import uuid4

from app.database.connection import get_connection
from app.models.resource import ResourceCreate, ResourceUpdate

RESOURCE_COLUMNS = (
    "id, name, cost, priority, category, status, quantity, location, "
    "current_stock, minimum_stock"
)


def list_resources() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT {RESOURCE_COLUMNS} FROM resources ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]


def find_resource(resource_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            f"SELECT {RESOURCE_COLUMNS} FROM resources WHERE id = ?",
            (resource_id,),
        ).fetchone()
    return dict(row) if row else None


def add_resource(resource: ResourceCreate) -> dict:
    resource_id = resource.id or f"MED-{uuid4().hex[:8].upper()}"
    values = resource.model_dump(exclude={"id"})
    with get_connection() as connection:
        connection.execute(
            """INSERT INTO resources
               (id, name, cost, priority, category, status, quantity, location,
                current_stock, minimum_stock)
               VALUES (:id, :name, :cost, :priority, :category, :status, :quantity, :location,
                       :current_stock, :minimum_stock)""",
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
                   location = :location, current_stock = :current_stock,
                   minimum_stock = :minimum_stock
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


def get_inventory_summary() -> dict[str, int]:
    """Aggregate resource counts and shortage units from current SQLite data."""
    with get_connection() as connection:
        row = connection.execute(
            """SELECT COUNT(*) AS total_resource_types,
                      COALESCE(SUM(current_stock), 0) AS total_units_in_stock,
                      COALESCE(SUM(CASE WHEN current_stock < minimum_stock THEN 1 ELSE 0 END), 0)
                          AS low_stock_resource_count,
                      COALESCE(SUM(MAX(minimum_stock - current_stock, 0)), 0)
                          AS total_shortage_units
               FROM resources"""
        ).fetchone()
    return dict(row)
