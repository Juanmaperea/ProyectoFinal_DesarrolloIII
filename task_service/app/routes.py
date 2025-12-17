from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Task
from .schemas import TaskCreate, TaskUpdate
from .dependencies import get_current_user_id
from .saga import TaskCreationSaga
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
    Crea una tarea utilizando el patrón SAGA
    Si falla la notificación, hace rollback automático
    """
    logger.info(f"🚀 Creating task for user {user_id}")
    
    # Ejecutar SAGA
    saga = TaskCreationSaga(db)
    result = saga.execute(task.dict(), user_id)
    
    if not result["success"]:
        logger.error(f"❌ Task creation failed: {result['message']}")
        raise HTTPException(
            status_code=503,
            detail=result["message"]
        )
    
    logger.info(f"✅ Task {result['task'].id} created successfully")
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