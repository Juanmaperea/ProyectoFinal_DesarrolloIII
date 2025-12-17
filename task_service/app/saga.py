import logging
from sqlalchemy.orm import Session
from .models import Task, SagaLog
from .rabbitmq_client import get_rabbitmq_client
from datetime import datetime

logger = logging.getLogger(__name__)

class TaskCreationSaga:
    """
    SAGA con RabbitMQ Message Broker
    
    Ventajas sobre HTTP directo:
    ✅ Desacoplamiento total entre servicios
    ✅ Garantía de entrega de mensajes (persistent + ACK)
    ✅ Reintentos automáticos en caso de fallo
    ✅ Los servicios no necesitan estar disponibles simultáneamente
    ✅ Escalabilidad: múltiples consumidores por cola
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.rabbitmq = get_rabbitmq_client()
    
    def execute(self, task_data: dict, user_id: int) -> dict:
        """
        Ejecuta PASO 1: Crear tarea
        Luego publica evento a RabbitMQ
        """
        saga_id = f"task_creation_{datetime.utcnow().timestamp()}"
        
        # Log inicio de SAGA
        self._log_saga(saga_id, "STARTED", "Task creation SAGA started (RabbitMQ)")
        
        try:
            # ========== PASO 1: Crear Tarea ==========
            logger.info(f"🔵 SAGA {saga_id} | STEP 1: Creating task")
            task = self._create_task(task_data, user_id, saga_id)
            self._log_saga(saga_id, "TASK_CREATED", f"Task {task.id} created")
            
            # ========== PASO 2: Publicar a RabbitMQ ==========
            logger.info(f"🔵 SAGA {saga_id} | STEP 2: Publishing to RabbitMQ")
            
            message = {
                "type": "task_created",
                "payload": {
                    "task_id": task.id,
                    "user_id": user_id,
                    "title": task.title,
                    "description": task.description,
                    "saga_id": saga_id
                }
            }
            
            # Publicar a exchange con routing key
            success = self.rabbitmq.publish(
                exchange="task_events",
                routing_key="task.created",
                message=message
            )
            
            if not success:
                # Si falla la publicación, compensar
                logger.error(f"❌ SAGA {saga_id} | Failed to publish to RabbitMQ")
                self._compensate_task_creation(task.id, saga_id, "Failed to publish event")
                
                return {
                    "success": False,
                    "task": None,
                    "message": "Failed to publish task creation event"
                }
            
            self._log_saga(saga_id, "EVENT_PUBLISHED", f"Event published to RabbitMQ for task {task.id}")
            logger.info(f"✅ SAGA {saga_id} | Task created and event published to RabbitMQ")
            
            return {
                "success": True,
                "task": task,
                "message": "Task created successfully",
                "saga_id": saga_id
            }
            
        except Exception as e:
            logger.error(f"💥 SAGA {saga_id} | Task creation failed: {str(e)}")
            self._log_saga(saga_id, "FAILED", f"Task creation failed: {str(e)}")
            
            return {
                "success": False,
                "task": None,
                "message": f"Task creation failed: {str(e)}"
            }
    
    def compensate(self, task_id: int, saga_id: str, reason: str):
        """
        Compensación ejecutada cuando se recibe un evento de fallo desde RabbitMQ
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
                f"Task {task_id} deleted (RabbitMQ triggered). Reason: {reason}"
            )
            
            logger.info(f"✅ SAGA {saga_id} | Compensation completed for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"💥 SAGA {saga_id} | COMPENSATION FAILED: {str(e)}")
            self._log_saga(saga_id, "COMPENSATION_FAILED", str(e))
            return False
    
    def _compensate_task_creation(self, task_id: int, saga_id: str, reason: str):
        """Compensación interna en caso de error al publicar"""
        try:
            task = self.db.query(Task).filter(Task.id == task_id).first()
            if task:
                self.db.delete(task)
                self.db.commit()
                logger.warning(f"🔄 Task {task_id} deleted (publish failed)")
        except Exception as e:
            logger.error(f"💥 Failed to compensate task {task_id}: {str(e)}")
    
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
    Handler para procesar eventos de compensación desde RabbitMQ
    """
    
    @staticmethod
    def handle_notification_failed(db: Session, payload: dict):
        """
        Maneja el evento 'notification_failed' recibido desde RabbitMQ
        """
        task_id = payload.get("task_id")
        saga_id = payload.get("saga_id")
        reason = payload.get("reason", "Notification service failed")
        
        logger.warning(f"🔴 Received NOTIFICATION_FAILED from RabbitMQ for task {task_id}")
        
        saga = TaskCreationSaga(db)
        success = saga.compensate(task_id, saga_id, reason)
        
        if success:
            logger.info(f"✅ Compensation completed for task {task_id}")
        else:
            logger.error(f"❌ Compensation FAILED for task {task_id}")
        
        return success
    
    @staticmethod
    def handle_notification_sent(db: Session, payload: dict):
        """
        Maneja el evento 'notification_sent' (confirmación de éxito)
        """
        task_id = payload.get("task_id")
        saga_id = payload.get("saga_id")
        
        logger.info(f"✅ Notification confirmed via RabbitMQ for task {task_id}")
        
        # Registrar en logs
        log = SagaLog(
            saga_id=saga_id,
            status="COMPLETED",
            details=f"Task {task_id} - Notification sent successfully (RabbitMQ)"
        )
        db.add(log)
        db.commit()
        
        return True