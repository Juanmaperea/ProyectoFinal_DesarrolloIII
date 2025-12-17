import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TASK_SERVICE_URL = "http://task_service:8000"

async def publish_event_to_task_service(event_type: str, payload: Dict[Any, Any]) -> bool:
    """
    Publica un evento HACIA el Task Service
    Usado para notificar éxito o fallo de la notificación
    
    Esta es la parte "coreografiada" donde el Notification Service
    le comunica al Task Service el resultado de su operación
    """
    try:
        logger.info(f"📤 Publishing event to Task Service: {event_type}")
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{TASK_SERVICE_URL}/tasks/events",
                json={
                    "type": event_type,
                    "payload": payload
                }
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Event {event_type} delivered to Task Service")
                return True
            else:
                logger.error(f"❌ Failed to deliver {event_type}: {response.status_code}")
                return False
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ Timeout publishing event {event_type} to Task Service")
        return False
    except Exception as e:
        logger.error(f"💥 Error publishing to Task Service: {str(e)}")
        return False