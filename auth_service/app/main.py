from fastapi import FastAPI
from .database import Base, engine
from .routes import router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service")

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "auth service running"}
