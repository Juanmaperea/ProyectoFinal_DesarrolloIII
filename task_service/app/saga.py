import logging
from sqlalchemy.orm import Session
from .models import Task, SagaLog
from .event_bus import EventBus
from datetime import datetime

logger = logging.getLogger(__name__)

class TaskCreationSaga:
    """
    SAGA con Coreografía Pura
    
    Diferencias con la versión anterior:
    - NO espera respuesta síncrona del Notification Service
    - Publica evento y continúa (fire-and-forget)
    - La compensación se ejecuta cuando RECIBE un evento de fallo
    - Cada servicio es autónomo y reacciona a eventos
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def execute(self, task_data: dict, user_id: int) -> dict:
        """
        Ejecuta PASO 1 del SAGA: Crear tarea
        Luego publica evento y retorna INMEDIATAMENTE
        """
        saga_id = f"task_creation_{datetime.utcnow().timestamp()}"
        
        # Log inicio de SAGA
        self._log_saga(saga_id, "STARTED", "Task creation SAGA started (choreography)")
        
        try:
            # ========== PASO 1: Crear Tarea ==========
            logger.info(f"🔵 SAGA {saga_id} | STEP 1: Creating task")
            task = self._create_task(task_data, user_id, saga_id)
            self._log_saga(saga_id, "TASK_CREATED", f"Task {task.id} created")
            
            # ========== PASO 2: Publicar Evento (Fire-and-Forget) ==========
            logger.info(f"🔵 SAGA {saga_id} | STEP 2: Publishing event (async)")
            EventBus.publish_async_fire_and_forget(
                "task_created",
                {
                    "task_id": task.id,
                    "user_id": user_id,
                    "title": task.title,
                    "saga_id": saga_id
                }
            )
            
            # ⚡ IMPORTANTE: En coreografía, retornamos INMEDIATAMENTE
            # No esperamos confirmación del Notification Service
            self._log_saga(saga_id, "EVENT_PUBLISHED", f"Event published for task {task.id}")
            logger.info(f"✅ SAGA {saga_id} | Task created and event published")
            
            return {
                "success": True,
                "task": task,
                "message": "Task created successfully",
                "saga_id": saga_id
            }
            
        except Exception as e:
            # Error en la creación de la tarea
            logger.error(f"💥 SAGA {saga_id} | Task creation failed: {str(e)}")
            self._log_saga(saga_id, "FAILED", f"Task creation failed: {str(e)}")
            
            return {
                "success": False,
                "task": None,
                "message": f"Task creation failed: {str(e)}"
            }
    
    def compensate(self, task_id: int, saga_id: str, reason: str):
        """
        Compensación ejecutada cuando se RECIBE un evento de fallo
        Esta función se llama desde el event handler
        """
        try:
            logger.warning(f"🔄 SAGA {saga_id} | COMPENSATING: Deleting task {task_id}")
            logger.warning(f"   Reason: {reason}")
            
            task = self.db.query(Task).filter(Task.id == task_id).first()
            
            if not task:
                logger.error(f"❌ SAGA {saga_id} | Task {task_id} not found for compensation")
                self._log_saga(saga_id, "COMPENSATION_FAILED", f"Task {task_id} not found")
                return False
            
            # Eliminar la tarea
            self.db.delete(task)
            self.db.commit()
            
            self._log_saga(
                saga_id, 
                "COMPENSATED", 
                f"Task {task_id} deleted. Reason: {reason}"
            )
            
            logger.info(f"✅ SAGA {saga_id} | Compensation completed for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"💥 SAGA {saga_id} | COMPENSATION FAILED: {str(e)}")
            self._log_saga(saga_id, "COMPENSATION_FAILED", str(e))
            return False
    
    def _create_task(self, task_data: dict, user_id: int, saga_id: str) -> Task:
        """Paso 1: Crear tarea en la base de datos con saga_id"""
        task = Task(**task_data, user_id=user_id, saga_id=saga_id)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        logger.info(f"✅ Task {task.id} created in database")
        return task
    
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


class SagaCompensationHandler:
    """
    Handler para procesar eventos de compensación
    Separado del SAGA principal para mejor organización
    """
    
    @staticmethod
    def handle_notification_failed(db: Session, payload: dict):
        """
        Maneja el evento 'notification_failed'
        Ejecuta la compensación correspondiente
        """
        task_id = payload.get("task_id")
        saga_id = payload.get("saga_id")
        reason = payload.get("reason", "Notification service failed")
        
        logger.warning(f"🔴 Received NOTIFICATION_FAILED event for task {task_id}")
        
        saga = TaskCreationSaga(db)
        success = saga.compensate(task_id, saga_id, reason)
        
        if success:
            logger.info(f"✅ Compensation completed for task {task_id}")
        else:
            logger.error(f"❌ Compensation FAILED for task {task_id}")
        
        return success