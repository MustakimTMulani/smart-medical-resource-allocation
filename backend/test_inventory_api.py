"""Inventory CRUD endpoint tests using an isolated temporary SQLite database."""

from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


RESOURCE = {
    "name": "Portable suction unit",
    "cost": 42000,
    "priority": 84,
    "category": "Critical care",
    "status": "Available",
    "quantity": 3,
    "location": "Ward 2",
}


class InventoryEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "test_inventory.db"
        self.database_path_patch = patch(
            "app.database.connection.get_database_path",
            return_value=self.database_path,
        )
        self.database_path_patch.start()
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        if self.client_context is not None:
            self.client_context.__exit__(None, None, None)
        self.database_path_patch.stop()
        self.temp_dir.cleanup()

    def test_list_and_get_seeded_resources(self) -> None:
        response = self.client.get("/api/resources")
        self.assertEqual(response.status_code, 200)
        resources = response.json()
        self.assertEqual(len(resources), 8)
        self.assertTrue({"id", "name", "cost", "priority"}.issubset(resources[0]))

        single = self.client.get("/api/resources/MED-001")
        self.assertEqual(single.status_code, 200)
        self.assertEqual(single.json()["name"], "ICU ventilator")
        self.assertEqual(self.client.get("/api/resources/missing-id").status_code, 404)

    def test_create_resource_and_reject_duplicate_id(self) -> None:
        response = self.client.post("/api/resources", json={**RESOURCE, "id": "TEST-001"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["id"], "TEST-001")
        self.assertEqual(response.json()["cost"], RESOURCE["cost"])

        duplicate = self.client.post("/api/resources", json={**RESOURCE, "id": "TEST-001"})
        self.assertEqual(duplicate.status_code, 409)

    def test_create_can_generate_id(self) -> None:
        response = self.client.post("/api/resources", json=RESOURCE)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["id"].startswith("MED-"))

    def test_update_existing_resource(self) -> None:
        update = {**RESOURCE, "name": "Updated suction unit", "cost": 45000, "priority": 90}
        response = self.client.put("/api/resources/MED-001", json=update)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], "MED-001")
        self.assertEqual(response.json()["name"], "Updated suction unit")
        self.assertEqual(response.json()["cost"], 45000)
        self.assertEqual(self.client.put("/api/resources/missing-id", json=update).status_code, 404)

    def test_delete_existing_resource(self) -> None:
        response = self.client.delete("/api/resources/MED-001")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/resources/MED-001").status_code, 404)
        self.assertEqual(self.client.delete("/api/resources/MED-001").status_code, 404)

    def test_validation_rejects_invalid_fields(self) -> None:
        negative_cost = self.client.post("/api/resources", json={**RESOURCE, "cost": -1})
        invalid_priority = self.client.post("/api/resources", json={**RESOURCE, "priority": 101})
        missing_name = self.client.post("/api/resources", json={"cost": 100, "priority": 10})
        self.assertEqual(negative_cost.status_code, 422)
        self.assertEqual(invalid_priority.status_code, 422)
        self.assertEqual(missing_name.status_code, 422)

    def test_records_persist_after_backend_restart(self) -> None:
        created = self.client.post("/api/resources", json={**RESOURCE, "id": "PERSIST-01"})
        self.assertEqual(created.status_code, 201)
        self.client_context.__exit__(None, None, None)
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()
        persisted = self.client.get("/api/resources/PERSIST-01")
        self.assertEqual(persisted.status_code, 200)
        self.assertEqual(persisted.json()["name"], RESOURCE["name"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
