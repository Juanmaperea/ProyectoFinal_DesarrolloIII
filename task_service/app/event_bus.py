import httpx
import logging
from typing import Dict, Any
import asyncio

logger = logging.getLogger(__name__)

class EventBus:
    """Bus de eventos simple para comunicación entre microservicios"""
    
    NOTIFICATION_SERVICE_URL = "http://notification_service:8000"
    
    @staticmethod
    async def publish_async(event_type: str, payload: Dict[Any, Any]) -> bool:
        """
        Publica un evento de forma asíncrona
        Retorna True si fue exitoso, False si falló
        """
        try:
            logger.info(f"📤 Publishing event: {event_type} | Payload: {payload}")
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{EventBus.NOTIFICATION_SERVICE_URL}/events",
                    json={
                        "type": event_type,
                        "payload": payload
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"✅ Event {event_type} published successfully")
                    return True
                else:
                    logger.error(f"❌ Event {event_type} failed: {response.status_code}")
                    return False
                    
        except httpx.TimeoutException:
            logger.error(f"⏱️ Timeout publishing event {event_type}")
            return False
        except Exception as e:
            logger.error(f"💥 Error publishing event {event_type}: {str(e)}")
            return False
    
    @staticmethod
    def publish_sync(event_type: str, payload: Dict[Any, Any]) -> bool:
        """Wrapper síncrono para publicar eventos"""
        try:
            return asyncio.run(EventBus.publish_async(event_type, payload))
        except Exception as e:
            logger.error(f"Error in sync publish: {str(e)}")
            return False