from fastapi import FastAPI, HTTPException
from .consumer import consume_event
import random
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Notification Service")

# Variable para simular fallos (útil para testing del SAGA)
FAILURE_RATE = 0.3  # 30% de probabilidad de fallo

@app.post("/events")
def receive_event(event: dict):
    """
    Recibe eventos de otros servicios
    Simula fallos aleatorios para probar el patrón SAGA
    """
    event_type = event.get("type")
    payload = event.get("payload")
    saga_id = payload.get("saga_id", "unknown")
    
    logger.info(f"📨 Received event: {event_type} | SAGA: {saga_id}")
    
    # 🎲 Simular fallo aleatorio (para testing de SAGA)
    if random.random() < FAILURE_RATE:
        logger.error(f"💥 SIMULATED FAILURE for SAGA {saga_id}")
        raise HTTPException(
            status_code=500, 
            detail="Notification service temporarily unavailable"
        )
    
    # Procesar evento normalmente
    consume_event(event_type, payload)
    
    logger.info(f"✅ Event processed successfully | SAGA: {saga_id}")
    return {"status": "event processed"}

@app.get("/health")
def health():
    return {"status": "notification service running"}

@app.post("/config/failure-rate")
def set_failure_rate(rate: float):
    """
    Endpoint para configurar el % de fallos simulados
    Útil para testing: POST /config/failure-rate con body {"rate": 0.5}
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