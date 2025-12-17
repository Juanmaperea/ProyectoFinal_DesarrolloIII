import httpx
import logging
from typing import Dict, Any
import asyncio
from threading import Thread

logger = logging.getLogger(__name__)

class EventBus:
    """
    Event Bus para Coreografía Pura
    Publicación asíncrona sin esperar respuesta (fire-and-forget)
    """
    
    NOTIFICATION_SERVICE_URL = "http://notification_service:8000"
    
    @staticmethod
    def publish_async_fire_and_forget(event_type: str, payload: Dict[Any, Any]):
        """
        Publica un evento de forma asíncrona sin esperar respuesta
        Fire-and-forget: el emisor no espera confirmación
        """
        def _publish():
            try:
                logger.info(f"📤 Publishing event (fire-and-forget): {event_type}")
                
                # Usar requests en thread separado para no bloquear
                import requests
                requests.post(
                    f"{EventBus.NOTIFICATION_SERVICE_URL}/events",
                    json={
                        "type": event_type,
                        "payload": payload
                    },
                    timeout=2  # Timeout corto, no esperamos respuesta larga
                )
                
                logger.info(f"✅ Event {event_type} published (fire-and-forget)")
                
            except Exception as e:
                # En coreografía pura, los errores NO detienen el flujo
                logger.warning(f"⚠️ Event {event_type} publish failed (expected in choreography): {str(e)}")
        
        # Ejecutar en thread separado para no bloquear
        thread = Thread(target=_publish, daemon=True)
        thread.start()
        logger.info(f"🚀 Event {event_type} dispatched asynchronously")
    
    @staticmethod
    async def publish_to_task_service(event_type: str, payload: Dict[Any, Any]) -> bool:
        """
        Publica eventos HACIA el Task Service (para compensaciones)
        Usado por otros servicios para notificar al Task Service
        """
        try:
            logger.info(f"📤 Publishing to Task Service: {event_type}")
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    "http://task_service:8000/events",
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
                    
        except Exception as e:
            logger.error(f"💥 Error publishing to Task Service: {str(e)}")
            return False