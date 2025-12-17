from fastapi import FastAPI, HTTPException
from .consumer import consume_event
from .event_publisher import publish_event_to_task_service
import random
import logging
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Notification Service")

# Variable para simular fallos
FAILURE_RATE = 0.3  # 30% de probabilidad de fallo

@app.post("/events")
async def receive_event(event: dict):
    """
    Recibe eventos de otros servicios (COREOGRAFÍA)
    
    Cambios vs versión anterior:
    - Procesa el evento de forma asíncrona
    - Publica evento de respuesta (success/failure)
    - NO retorna error HTTP, siempre retorna 200
    - Los errores se comunican vía eventos
    """
    event_type = event.get("type")
    payload = event.get("payload")
    saga_id = payload.get("saga_id", "unknown")
    task_id = payload.get("task_id")
    
    logger.info(f"📨 Notification Service received event: {event_type} | SAGA: {saga_id}")
    
    # Solo procesamos eventos task_created
    if event_type != "task_created":
        logger.warning(f"⚠️ Ignoring event type: {event_type}")
        return {"status": "event ignored"}
    
    # 🎲 Simular procesamiento (puede fallar)
    try:
        if random.random() < FAILURE_RATE:
            # FALLO SIMULADO
            logger.error(f"💥 SIMULATED FAILURE for SAGA {saga_id}")
            
            # Publicar evento de fallo HACIA Task Service
            await publish_event_to_task_service(
                "notification_failed",
                {
                    "task_id": task_id,
                    "saga_id": saga_id,
                    "reason": "Notification service temporarily unavailable (simulated)",
                    "user_id": payload.get("user_id")
                }
            )
            
            # ⚡ IMPORTANTE: Retornamos 200 (no HTTP error)
            # El fallo se comunica vía evento
            logger.info(f"📤 Sent 'notification_failed' event to Task Service")
            return {"status": "notification failed (event sent)"}
        
        else:
            # ÉXITO
            consume_event(event_type, payload)
            logger.info(f"✅ Notification sent successfully | SAGA: {saga_id}")
            
            # Publicar evento de éxito HACIA Task Service
            await publish_event_to_task_service(
                "notification_sent",
                {
                    "task_id": task_id,
                    "saga_id": saga_id,
                    "user_id": payload.get("user_id")
                }
            )
            
            logger.info(f"📤 Sent 'notification_sent' event to Task Service")
            return {"status": "notification sent (event sent)"}
    
    except Exception as e:
        # Error inesperado
        logger.error(f"💥 Unexpected error in notification service: {str(e)}")
        
        # Publicar evento de fallo
        await publish_event_to_task_service(
            "notification_failed",
            {
                "task_id": task_id,
                "saga_id": saga_id,
                "reason": f"Unexpected error: {str(e)}",
                "user_id": payload.get("user_id")
            }
        )
        
        # Retornar 200 (el fallo se comunicó vía evento)
        return {"status": "notification failed (error, event sent)"}


@app.get("/health")
def health():
    return {"status": "notification service running"}


@app.post("/config/failure-rate")
def set_failure_rate(rate: float):
    """
    Endpoint para configurar el % de fallos simulados
    """
    global FAILURE_RATE
    
    if not 0 <= rate <= 1:
        raise HTTPException(status_code=400, detail="Rate must be between 0 and 1")
    
    FAILURE_RATE = rate
    logger.info(f"⚙️ Failure rate set to {rate * 100}%")
    
    return {
        "message": f"Failure rate set to {rate * 100}%",
        "current_rate": FAILURE_RATE
    }