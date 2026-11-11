"""Stock thresholds, migration safety, and inventory summary API tests."""

import sqlite3
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


class InventoryStockEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "stock_test.db"
        self.database_patch = patch(
            "app.database.connection.get_database_path", return_value=self.database_path
        )
        self.database_patch.start()
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.database_patch.stop()
        self.temp_dir.cleanup()

    def create_resource(self, resource_id: str, current_stock: int, minimum_stock: int):
        return self.client.post("/api/resources", json={
            "id": resource_id,
            "name": f"Test resource {resource_id}",
            "cost": 100,
            "priority": 10,
            "current_stock": current_stock,
            "minimum_stock": minimum_stock,
        })

    def test_sufficient_stock_response_and_legacy_quantity_alias(self) -> None:
        response = self.create_resource("STOCK-OK", 10, 5)
        self.assertEqual(response.status_code, 201, response.text)
        resource = response.json()
        self.assertEqual(resource["current_stock"], 10)
        self.assertEqual(resource["minimum_stock"], 5)
        self.assertEqual(resource["quantity"], 10)
        self.assertEqual(resource["stock_status"], "Sufficient")
        self.assertEqual(resource["shortage_quantity"], 0)

    def test_low_stock_and_zero_stock_are_reported(self) -> None:
        low_response = self.create_resource("STOCK-LOW", 2, 5)
        zero_response = self.create_resource("STOCK-ZERO", 0, 4)
        self.assertEqual(low_response.status_code, 201, low_response.text)
        self.assertEqual(zero_response.status_code, 201, zero_response.text)
        self.assertEqual(low_response.json()["stock_status"], "Low Stock")
        self.assertEqual(low_response.json()["shortage_quantity"], 3)
        self.assertEqual(zero_response.json()["stock_status"], "Low Stock")
        self.assertEqual(zero_response.json()["shortage_quantity"], 4)

    def test_edit_updates_stock_and_derived_shortage(self) -> None:
        created = self.create_resource("STOCK-EDIT", 8, 3)
        self.assertEqual(created.status_code, 201, created.text)
        updated = self.client.put("/api/resources/STOCK-EDIT", json={
            "name": "Updated stock resource",
            "cost": 100,
            "priority": 10,
            "current_stock": 1,
            "minimum_stock": 4,
        })
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["stock_status"], "Low Stock")
        self.assertEqual(updated.json()["shortage_quantity"], 3)
        self.assertEqual(updated.json()["quantity"], 1)

    def test_invalid_stock_quantities_are_rejected(self) -> None:
        for field, value in (
            ("current_stock", -1),
            ("minimum_stock", -1),
            ("current_stock", 1.5),
            ("minimum_stock", True),
        ):
            with self.subTest(field=field, value=value):
                response = self.client.post("/api/resources", json={
                    "id": f"INVALID-{field}-{value}",
                    "name": "Invalid stock resource",
                    "cost": 100,
                    "priority": 10,
                    "current_stock": 2,
                    "minimum_stock": 1,
                    field: value,
                })
                self.assertEqual(response.status_code, 422)

    def test_inventory_summary_includes_stock_and_shortages(self) -> None:
        before = self.client.get("/api/resources/summary")
        self.assertEqual(before.status_code, 200, before.text)
        baseline = before.json()
        self.assertEqual(self.create_resource("SUMMARY-LOW", 2, 5).status_code, 201)
        self.assertEqual(self.create_resource("SUMMARY-OK", 9, 4).status_code, 201)

        response = self.client.get("/api/resources/summary")

        self.assertEqual(response.status_code, 200, response.text)
        summary = response.json()
        self.assertEqual(summary["total_resource_types"], baseline["total_resource_types"] + 2)
        self.assertEqual(summary["total_units_in_stock"], baseline["total_units_in_stock"] + 11)
        self.assertEqual(summary["low_stock_resource_count"], baseline["low_stock_resource_count"] + 1)
        self.assertEqual(summary["total_shortage_units"], baseline["total_shortage_units"] + 3)


class ExistingDatabaseMigrationTests(unittest.TestCase):
    def test_legacy_database_is_migrated_without_losing_resource_data(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "legacy_inventory.db"
            connection = sqlite3.connect(database_path)
            connection.execute(
                """CREATE TABLE resources (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    cost INTEGER NOT NULL,
                    priority INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    location TEXT NOT NULL
                )"""
            )
            connection.execute(
                """INSERT INTO resources
                   (id, name, cost, priority, category, status, quantity, location)
                   VALUES ('LEGACY-01', 'Legacy resource', 500, 40,
                           'Critical care', 'Available', 7, 'Ward 1')"""
            )
            connection.commit()
            connection.close()

            database_patch = patch(
                "app.database.connection.get_database_path", return_value=database_path
            )
            database_patch.start()
            try:
                with TestClient(app) as client:
                    response = client.get("/api/resources/LEGACY-01")
                    self.assertEqual(response.status_code, 200, response.text)
                    legacy = response.json()
                    self.assertEqual(legacy["name"], "Legacy resource")
                    self.assertEqual(legacy["current_stock"], 7)
                    self.assertEqual(legacy["quantity"], 7)
                    self.assertEqual(legacy["minimum_stock"], 0)
                    self.assertEqual(legacy["shortage_quantity"], 0)
                    self.assertEqual(client.get("/api/resources").json().__len__(), 1)
            finally:
                database_patch.stop()


if __name__ == "__main__":
    unittest.main(verbosity=2)
