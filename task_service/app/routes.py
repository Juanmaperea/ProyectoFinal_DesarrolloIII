from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Task, SagaLog
from .schemas import TaskCreate, TaskUpdate
from .dependencies import get_current_user_id
from .saga import TaskCreationSaga, SagaCompensationHandler
import logging
import random
import string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_task_code():
    """Genera un código único para la tarea (ej: TASK-A1B2C3)"""
    return f"TASK-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"

@router.post("/")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Crea una tarea usando COREOGRAFÍA PURA"""
    logger.info(f"🚀 Creating task for user {user_id} (choreography)")
    
    saga = TaskCreationSaga(db)
    result = saga.execute(task.dict(), user_id)
    
    if not result["success"]:
        logger.error(f"❌ Task creation failed: {result['message']}")
        raise HTTPException(
            status_code=500,
            detail=result["message"]
        )
    
    logger.info(f"✅ Task {result['task'].id} created (saga_id: {result['saga_id']})")
    return result["task"]

@router.get("/")
def list_tasks(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    status: str = Query(None, description="Filtrar por estado"),
    category: str = Query(None, description="Filtrar por categoría"),
    priority: str = Query(None, description="Filtrar por prioridad"),
    search: str = Query(None, description="Buscar por título o descripción")
):
    """Lista tareas con filtros opcionales"""
    query = db.query(Task).filter(Task.user_id == user_id)
    
    if status:
        query = query.filter(Task.status == status)
    if category:
        query = query.filter(Task.category == category)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(
            (Task.title.ilike(f"%{search}%")) | 
            (Task.description.ilike(f"%{search}%"))
        )
    
    return query.order_by(Task.created_at.desc()).all()


# ← CORREGIDO: Este endpoint debe ir ANTES de /code/{code} y /{task_id}
@router.get("/saga-logs")
def get_saga_logs(db: Session = Depends(get_db)):
    """Endpoint para ver los logs de SAGAs - NO requiere user_id"""
    try:
        logger.info("📊 Fetching SAGA logs")
        logs = db.query(SagaLog).order_by(SagaLog.timestamp.desc()).limit(50).all()
        
        result = [
            {
                "saga_id": log.saga_id,
                "status": log.status,
                "details": log.details,
                "timestamp": log.timestamp.isoformat()
            }
            for log in logs
        ]
        
        logger.info(f"✅ Returning {len(result)} SAGA logs")
        return result
    except Exception as e:
        logger.error(f"❌ Error fetching SAGA logs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching SAGA logs: {str(e)}"
        )


@router.get("/code/{code}")
def get_task_by_code(
    code: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Consulta una tarea por su código único"""
    task = db.query(Task).filter(
        Task.code == code.upper(),
        Task.user_id == user_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task


@router.get("/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Obtiene una tarea específica"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task


@router.put("/{task_id}")
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Actualiza una tarea"""
    db_task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user_id
    ).first()

    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    for key, value in task.dict(exclude_unset=True).items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)
    return db_task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Elimina una tarea"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


@router.post("/events")
def handle_event(event: dict, db: Session = Depends(get_db)):
    """Endpoint para RECIBIR eventos de otros servicios"""
    event_type = event.get("type")
    payload = event.get("payload")
    
    logger.info(f"📨 Task Service received event: {event_type}")
    
    if event_type == "notification_failed":
        success = SagaCompensationHandler.handle_notification_failed(db, payload)
        
        if success:
            return {"status": "compensation executed", "event": event_type}
        else:
            raise HTTPException(
                status_code=500,
                detail="Compensation failed"
            )
    
    elif event_type == "notification_sent":
        task_id = payload.get("task_id")
        saga_id = payload.get("saga_id")
        
        logger.info(f"✅ Notification confirmed for task {task_id}")
        
        log = SagaLog(
            saga_id=saga_id,
            status="COMPLETED",
            details=f"Task {task_id} - Notification sent successfully"
        )
        db.add(log)
        db.commit()
        
        return {"status": "event processed", "event": event_type}
    
    else:
        logger.warning(f"⚠️ Unknown event type: {event_type}")
        return {"status": "event ignored", "event": event_type}