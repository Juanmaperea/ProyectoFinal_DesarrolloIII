from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "gateway running"}
    # Verify Tracing: X-Request-ID header should be present
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 0
