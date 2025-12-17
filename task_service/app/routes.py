from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Task
from .schemas import TaskCreate, TaskUpdate
from .dependencies import get_current_user_id
from .saga import TaskCreationSaga, SagaCompensationHandler
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Crea una tarea usando COREOGRAFÍA PURA
    
    Cambios vs versión anterior:
    - Retorna INMEDIATAMENTE después de crear la tarea
    - NO espera respuesta del Notification Service
    - La compensación se ejecuta cuando RECIBE un evento de fallo
    """
    logger.info(f"🚀 Creating task for user {user_id} (choreography)")
    
    # Ejecutar SAGA (solo paso 1 + publicar evento)
    saga = TaskCreationSaga(db)
    result = saga.execute(task.dict(), user_id)
    
    if not result["success"]:
        logger.error(f"❌ Task creation failed: {result['message']}")
        raise HTTPException(
            status_code=500,
            detail=result["message"]
        )
    
    # ⚡ Retornar inmediatamente (coreografía)
    logger.info(f"✅ Task {result['task'].id} created (saga_id: {result['saga_id']})")
    return result["task"]

@router.get("/")
def list_tasks(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return db.query(Task).filter(Task.user_id == user_id).all()

@router.put("/{task_id}")
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    db_task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user_id
    ).first()

    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    for key, value in task.dict(exclude_unset=True).items():
        setattr(db_task, key, value)

    db.commit()
    return db_task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


@router.get("/saga-logs")
def get_saga_logs(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Endpoint para ver los logs de SAGAs (útil para debugging)
    """
    from .models import SagaLog
    logs = db.query(SagaLog).order_by(SagaLog.timestamp.desc()).limit(50).all()
    
    return [
        {
            "saga_id": log.saga_id,
            "status": log.status,
            "details": log.details,
            "timestamp": log.timestamp.isoformat()
        }
        for log in logs
    ]


# ========== NUEVO: Event Handler Endpoint ==========
@router.post("/events")
def handle_event(event: dict, db: Session = Depends(get_db)):
    """
    Endpoint para RECIBIR eventos de otros servicios
    Implementa la parte de "escuchar" en la coreografía
    """
    event_type = event.get("type")
    payload = event.get("payload")
    
    logger.info(f"📨 Task Service received event: {event_type}")
    
    # Manejar evento de notificación fallida
    if event_type == "notification_failed":
        success = SagaCompensationHandler.handle_notification_failed(db, payload)
        
        if success:
            return {"status": "compensation executed", "event": event_type}
        else:
            raise HTTPException(
                status_code=500,
                detail="Compensation failed"
            )
    
    # Manejar evento de notificación exitosa (opcional, para logging)
    elif event_type == "notification_sent":
        task_id = payload.get("task_id")
        saga_id = payload.get("saga_id")
        
        logger.info(f"✅ Notification confirmed for task {task_id}")
        
        # Registrar en logs
        from .models import SagaLog
        log = SagaLog(
            saga_id=saga_id,
            status="COMPLETED",
            details=f"Task {task_id} - Notification sent successfully"
        )
        db.add(log)
        db.commit()
        
        return {"status": "event processed", "event": event_type}
    
    # Evento desconocido
    else:
        logger.warning(f"⚠️ Unknown event type: {event_type}")
        return {"status": "event ignored", "event": event_type}