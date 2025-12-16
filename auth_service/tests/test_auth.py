from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register():
    response = client.post("/register", json={
        "email": "test@test.com",
        "password": "123456"
    })
    assert response.status_code in [200, 400]

def test_login():
    response = client.post("/login", json={
        "email": "test@test.com",
        "password": "123456"
    })
    assert response.status_code in [200, 401]
