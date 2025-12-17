from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Mixto"
    priority: Optional[str] = "Media"
    
    @validator('category')
    def validate_category(cls, v):
        valid_categories = ["Frontend", "Backend", "Full Stack", "Product Owner", "Scrum", "Mixto", "QA"]
        if v not in valid_categories:
            raise ValueError(f'Category must be one of {valid_categories}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ["Alta", "Media", "Baja"]
        if v not in valid_priorities:
            raise ValueError(f'Priority must be one of {valid_priorities}')
        return v

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ["todo", "doing", "done"]
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of {valid_statuses}')
        return v
    
    @validator('category')
    def validate_category(cls, v):
        if v is not None:
            valid_categories = ["Frontend", "Backend", "Full Stack", "Product Owner", "Scrum", "Mixto", "QA"]
            if v not in valid_categories:
                raise ValueError(f'Category must be one of {valid_categories}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        if v is not None:
            valid_priorities = ["Alta", "Media", "Baja"]
            if v not in valid_priorities:
                raise ValueError(f'Priority must be one of {valid_priorities}')
        return v

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    category: str
    priority: str
    code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True