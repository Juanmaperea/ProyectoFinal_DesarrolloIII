from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
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
