from fastapi.testclient import TestClient
from app.main import app

from unittest.mock import patch, MagicMock
from app.dependencies import get_current_user_id

def override_get_current_user_id():
    return 1

app.dependency_overrides[get_current_user_id] = override_get_current_user_id

client = TestClient(app)

def test_create_task():
    # Mockear la ejecución de la Saga para no depender de RabbitMQ
    with patch("app.routes.TaskCreationSaga") as MockSaga:
        mock_instance = MockSaga.return_value
        # Configurar el retorno del mock
        mock_instance.execute.return_value = {
            "success": True, 
            "task": MagicMock(id=1, title="Test Task"),
            "saga_id": "test-saga-id"
        }
        
        response = client.post(
            "/tasks/",
            json={"title": "Test Task", "category": "Mixto", "priority": "Media"}
        )
        assert response.status_code == 200

def test_list_tasks():
    response = client.get("/tasks/")
    assert response.status_code == 200
