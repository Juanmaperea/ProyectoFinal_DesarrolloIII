from fastapi import FastAPI, HTTPException
import random
import logging
import sys
import os

# Agregar el directorio padre al path para importar rabbitmq_client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rabbitmq_client import RabbitMQClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Notification Service")

# Cliente RabbitMQ
rabbitmq_client = None

# Variable para simular fallos
FAILURE_RATE = 0.3  # 30% de probabilidad de fallo


# ========== Procesador de Eventos ==========
def process_task_event(message: dict):
    """
    Callback para procesar eventos de Task Service
    """
    event_type = message.get("type")
    payload = message.get("payload", {})
    
    task_id = payload.get("task_id")
    saga_id = payload.get("saga_id", "unknown")
    user_id = payload.get("user_id")
    
    logger.info(f"📨 Processing task event: {event_type} | Task: {task_id} | SAGA: {saga_id}")
    
    if event_type != "task_created":
        logger.warning(f"⚠️ Ignoring event type: {event_type}")
        return
    
    # 🎲 Simular procesamiento (puede fallar)
    try:
        if random.random() < FAILURE_RATE:
            # FALLO SIMULADO
            logger.error(f"💥 SIMULATED FAILURE for SAGA {saga_id}")
            
            # Publicar evento de fallo a RabbitMQ
            rabbitmq_client.publish(
                exchange="notification_events",
                routing_key="notification.failed",
                message={
                    "type": "notification_failed",
                    "payload": {
                        "task_id": task_id,
                        "saga_id": saga_id,
                        "reason": "Notification service temporarily unavailable (simulated)",
                        "user_id": user_id
                    }
                }
            )
            
            logger.info(f"📤 Published 'notification_failed' to RabbitMQ")
            
        else:
            # ÉXITO
            logger.info(f"📧 Notification Service | User {user_id} - Task {task_id} created successfully")
            logger.info(f"✅ Notification sent successfully | SAGA: {saga_id}")
            
            # Publicar evento de éxito a RabbitMQ
            rabbitmq_client.publish(
                exchange="notification_events",
                routing_key="notification.sent",
                message={
                    "type": "notification_sent",
                    "payload": {
                        "task_id": task_id,
                        "saga_id": saga_id,
                        "user_id": user_id
                    }
                }
            )
            
            logger.info(f"📤 Published 'notification_sent' to RabbitMQ")
    
    except Exception as e:
        # Error inesperado
        logger.error(f"💥 Unexpected error in notification service: {str(e)}")
        
        # Publicar evento de fallo
        rabbitmq_client.publish(
            exchange="notification_events",
            routing_key="notification.failed",
            message={
                "type": "notification_failed",
                "payload": {
                    "task_id": task_id,
                    "saga_id": saga_id,
                    "reason": f"Unexpected error: {str(e)}",
                    "user_id": user_id
                }
            }
        )


# ========== Eventos del ciclo de vida ==========
@app.on_event("startup")
def startup_event():
    """
    Iniciar consumidor de RabbitMQ al arrancar
    """
    global rabbitmq_client
    
    try:
        logger.info("🚀 Starting Notification Service...")
        
        # Conectar a RabbitMQ
        rabbitmq_client = RabbitMQClient()
        rabbitmq_client.connect()
        
        # Iniciar consumidor en background
        rabbitmq_client.start_consuming_background(
            queue_name="notification_service_tasks",
            callback=process_task_event,
            routing_keys=[
                ("task_events", "task.created")
            ]
        )
        
        logger.info("✅ RabbitMQ consumer started successfully")
        
    except Exception as e:
        logger.error(f"💥 Failed to start RabbitMQ consumer: {str(e)}")
        logger.warning("⚠️ Notification Service running WITHOUT RabbitMQ consumer")


@app.on_event("shutdown")
def shutdown_event():
    """
    Cerrar conexiones al detener
    """
    try:
        if rabbitmq_client:
            rabbitmq_client.close()
        logger.info("👋 RabbitMQ connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")


# ========== Endpoints ==========
@app.get("/health")
def health():
    rabbitmq_status = "connected" if rabbitmq_client and rabbitmq_client.connection and not rabbitmq_client.connection.is_closed else "disconnected"
    return {
        "status": "notification service running",
        "rabbitmq": rabbitmq_status,
        "failure_rate": f"{FAILURE_RATE * 100}%"
    }


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


# ========== Endpoint legacy (opcional) ==========
@app.post("/events")
async def receive_event(event: dict):
    """
    Endpoint HTTP legacy para compatibilidad
    En producción, solo usarías RabbitMQ
    """
    logger.info("⚠️ Received event via HTTP (legacy mode)")
    logger.info("💡 Tip: Use RabbitMQ for production")
    
    # Procesar igual que un mensaje de RabbitMQ
    process_task_event(event)
    
    return {"status": "processed via HTTP (legacy)"}