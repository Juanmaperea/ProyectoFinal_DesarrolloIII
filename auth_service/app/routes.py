from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import hash_password, verify_password, create_access_token

router = APIRouter()

class UserIn(BaseModel):
    email: str
    password: str
    name: str  # ← NUEVO: campo nombre

class UserLogin(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(user: UserIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    db_user = User(
        email=user.email,
        password=hash_password(user.password),
        name=user.name  # ← NUEVO: guardar nombre
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"message": "User registered"}


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(db_user.id),
        "name": db_user.name  # ← NUEVO: incluir nombre en token
    })

    return {
        "access_token": token,
        "user": {  # ← NUEVO: devolver info del usuario
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.name
        }
    }


# ← NUEVO: endpoint para obtener info del usuario
@router.get("/me")
def get_current_user(authorization: str = Depends(lambda x: x), db: Session = Depends(get_db)):
    from .security import decode_token
    try:
        token = authorization.split()[1]
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")