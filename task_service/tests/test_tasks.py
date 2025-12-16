from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

HEADERS = {"X-User-Id": "1"}

def test_create_task():
    response = client.post(
        "/tasks/",
        json={"title": "Test Task"},
        headers=HEADERS
    )
    assert response.status_code == 200

def test_list_tasks():
    response = client.get("/tasks/", headers=HEADERS)
    assert response.status_code == 200
