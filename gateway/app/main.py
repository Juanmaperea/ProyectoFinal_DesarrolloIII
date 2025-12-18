from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .router import router
import logging
import uuid
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [Request-ID: %(request_id)s] - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="API Gateway")

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        # Add request_id to logging context (using a simple workaround for demo or structlog ideally)
        # For simplicity in standard logging, we might just log it manually or use a filter.
        # Here we just set it in the scope for other tools if needed, and log it manually.
        
        logger.info(f"Incoming request {request.method} {request.url.path} with ID: {request_id}", extra={"request_id": request_id})
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

app.add_middleware(RequestIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "gateway running"}