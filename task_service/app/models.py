from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from datetime import datetime
from .database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default="pending")
    user_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SagaLog(Base):
    """
    Tabla para registrar el estado de las SAGAs
    Permite auditoría y debugging de transacciones distribuidas
    """
    __tablename__ = "saga_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    saga_id = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False)  # STARTED, TASK_CREATED, COMPLETED, COMPENSATED, FAILED
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<SagaLog {self.saga_id} - {self.status}>"