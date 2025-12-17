import logging
from sqlalchemy.orm import Session
from .models import Task, SagaLog
from .event_bus import EventBus
from datetime import datetime

logger = logging.getLogger(__name__)

class TaskCreationSaga:
    """
    Implementación del patrón SAGA para creación de tareas
    
    Flujo:
    1. Crear tarea en BD (Task Service)
    2. Enviar notificación (Notification Service)
    3. Si falla paso 2 -> Compensar: eliminar tarea
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def execute(self, task_data: dict, user_id: int) -> dict:
        """
        Ejecuta la SAGA completa
        Retorna: {"success": bool, "task": Task, "message": str}
        """
        saga_id = f"task_creation_{datetime.utcnow().timestamp()}"
        
        # Log inicio de SAGA
        self._log_saga(saga_id, "STARTED", "Task creation SAGA started")
        
        task = None
        
        try:
            # ========== PASO 1: Crear Tarea ==========
            logger.info(f"🔵 SAGA {saga_id} | STEP 1: Creating task")
            task = self._create_task(task_data, user_id)
            self._log_saga(saga_id, "TASK_CREATED", f"Task {task.id} created")
            
            # ========== PASO 2: Enviar Notificación ==========
            logger.info(f"🔵 SAGA {saga_id} | STEP 2: Sending notification")
            notification_sent = EventBus.publish_sync(
                "task_created",
                {
                    "task_id": task.id,
                    "user_id": user_id,
                    "title": task.title,
                    "saga_id": saga_id
                }
            )
            
            if not notification_sent:
                # ⚠️ Notificación falló -> COMPENSAR
                logger.warning(f"⚠️ SAGA {saga_id} | Notification failed, starting compensation")
                self._compensate_task_creation(task, saga_id)
                
                return {
                    "success": False,
                    "task": None,
                    "message": "Task creation failed: notification service unavailable"
                }
            
            # ========== SAGA COMPLETADA ==========
            self._log_saga(saga_id, "COMPLETED", f"SAGA completed for task {task.id}")
            logger.info(f"✅ SAGA {saga_id} | COMPLETED successfully")
            
            return {
                "success": True,
                "task": task,
                "message": "Task created successfully"
            }
            
        except Exception as e:
            # Error inesperado -> COMPENSAR si la tarea fue creada
            logger.error(f"💥 SAGA {saga_id} | Unexpected error: {str(e)}")
            
            if task:
                self._compensate_task_creation(task, saga_id)
            
            self._log_saga(saga_id, "FAILED", f"SAGA failed: {str(e)}")
            
            return {
                "success": False,
                "task": None,
                "message": f"Task creation failed: {str(e)}"
            }
    
    def _create_task(self, task_data: dict, user_id: int) -> Task:
        """Paso 1: Crear tarea en la base de datos"""
        task = Task(**task_data, user_id=user_id)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        logger.info(f"✅ Task {task.id} created in database")
        return task
    
    def _compensate_task_creation(self, task: Task, saga_id: str):
        """
        COMPENSACIÓN: Eliminar la tarea si algo falló
        Este es el ROLLBACK del SAGA
        """
        try:
            logger.warning(f"🔄 SAGA {saga_id} | COMPENSATING: Deleting task {task.id}")
            
            self.db.delete(task)
            self.db.commit()
            
            self._log_saga(
                saga_id, 
                "COMPENSATED", 
                f"Task {task.id} deleted (rollback)"
            )
            
            logger.info(f"✅ SAGA {saga_id} | Task {task.id} successfully deleted (compensated)")
            
        except Exception as e:
            logger.error(f"💥 SAGA {saga_id} | COMPENSATION FAILED: {str(e)}")
            self._log_saga(saga_id, "COMPENSATION_FAILED", str(e))
    
    def _log_saga(self, saga_id: str, status: str, details: str):
        """Registrar cada paso del SAGA para auditoría"""
        try:
            log = SagaLog(
                saga_id=saga_id,
                status=status,
                details=details,
                timestamp=datetime.utcnow()
            )
            self.db.add(log)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to log SAGA: {str(e)}")