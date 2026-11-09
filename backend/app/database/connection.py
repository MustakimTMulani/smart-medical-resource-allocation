"""SQLite connection helpers and one-time starter inventory initialization."""

from contextlib import contextmanager
import os
from pathlib import Path
import sqlite3
from typing import Iterator


def get_database_path() -> Path:
    """Use an override for tests, otherwise store inventory beside this module."""
    configured = os.getenv("MEDALLOC_DB_PATH")
    return Path(configured) if configured else Path(__file__).with_name("inventory.db")


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    """Yield a row-enabled connection and commit or roll back the transaction."""
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    """Create the table and seed starter data only when the table is empty."""
    starter_rows = [
        ("MED-001", "ICU ventilator", 185000, 98, "Critical care", "Available", 8, "Critical care"),
        ("MED-002", "Patient monitor", 72000, 91, "Monitoring", "Available", 14, "ICU"),
        ("MED-003", "Defibrillator", 96000, 95, "Emergency", "Allocated", 6, "Emergency"),
        ("MED-004", "Infusion pump", 38500, 82, "Critical care", "Available", 22, "Surgical ward"),
        ("MED-005", "Portable ultrasound", 245000, 76, "Diagnostics", "Available", 4, "Radiology"),
        ("MED-006", "Oxygen concentrator", 52000, 88, "Respiratory", "Maintenance", 11, "Respiratory care"),
        ("MED-007", "Emergency medicine kit", 12800, 86, "Emergency", "Available", 35, "Emergency"),
        ("MED-008", "Dialysis machine", 315000, 72, "Renal care", "Allocated", 3, "Renal unit"),
    ]
    with get_connection() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS resources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                cost INTEGER NOT NULL CHECK(cost >= 0),
                priority INTEGER NOT NULL CHECK(priority >= 0 AND priority <= 100),
                category TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('Available', 'Allocated', 'Maintenance')),
                quantity INTEGER NOT NULL CHECK(quantity >= 0),
                location TEXT NOT NULL
            )"""
        )
        count = connection.execute("SELECT COUNT(*) FROM resources").fetchone()[0]
        if count == 0:
            connection.executemany(
                """INSERT INTO resources
                   (id, name, cost, priority, category, status, quantity, location)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                starter_rows,
            )
