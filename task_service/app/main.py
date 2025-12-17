from fastapi import FastAPI
from .database import Base, engine, SessionLocal
from .routes import router
from .rabbitmq_client import get_rabbitmq_client
from .saga import SagaCompensationHandler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Service")

app.include_router(router)


# ========== Consumidor de RabbitMQ ==========
def process_notification_event(message: dict):
    """
    Callback para procesar eventos del Notification Service
    """
    event_type = message.get("type")
    payload = message.get("payload", {})
    
    logger.info(f"📨 Processing event from RabbitMQ: {event_type}")
    
    # Crear una sesión de DB para este procesamiento
    db = SessionLocal()
    
    try:
        if event_type == "notification_failed":
            SagaCompensationHandler.handle_notification_failed(db, payload)
            
        elif event_type == "notification_sent":
            SagaCompensationHandler.handle_notification_sent(db, payload)
            
        else:
            logger.warning(f"⚠️ Unknown event type: {event_type}")
    
    finally:
        db.close()


@app.on_event("startup")
def startup_event():
    """
    Iniciar consumidor de RabbitMQ al arrancar FastAPI
    """
    try:
        logger.info("🚀 Starting Task Service...")
        
        # Obtener cliente de RabbitMQ
        rabbitmq = get_rabbitmq_client()
        
        # Iniciar consumidor en background (no bloquea FastAPI)
        rabbitmq.start_consuming_background(
            queue_name="task_service_notifications",
            callback=process_notification_event,
            routing_keys=[
                ("notification_events", "notification.failed"),
                ("notification_events", "notification.sent")
            ]
        )
        
        logger.info("✅ RabbitMQ consumer started successfully")
        
    except Exception as e:
        logger.error(f"💥 Failed to start RabbitMQ consumer: {str(e)}")
        logger.warning("⚠️ Task Service running WITHOUT RabbitMQ consumer")


@app.on_event("shutdown")
def shutdown_event():
    """
    Cerrar conexiones al detener FastAPI
    """
    try:
        rabbitmq = get_rabbitmq_client()
        rabbitmq.close()
        logger.info("👋 RabbitMQ connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")


@app.get("/health")
def health():
    return {"status": "task service running", "rabbitmq": "connected"}