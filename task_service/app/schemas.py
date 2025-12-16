from pydantic import BaseModel
from typing import Optional

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    status: Optional[str]

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str

    class Config:
        orm_mode = True
