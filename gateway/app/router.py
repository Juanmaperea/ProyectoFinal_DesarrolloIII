from fastapi import APIRouter, Request
from fastapi.responses import Response, JSONResponse
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

AUTH_SERVICE_URL = "http://auth_service:8000"
TASK_SERVICE_URL = "http://task_service:8000"


def forward_headers(request: Request):
    headers = {}
    if "authorization" in request.headers:
        headers["Authorization"] = request.headers["authorization"]
    return headers


async def proxy_response(r: httpx.Response):
    return Response(
        content=r.content,
        status_code=r.status_code,
        media_type=r.headers.get("content-type")
    )


@router.post("/login")
async def login(request: Request):
    try:
        body = await request.json()
        logger.info(f"Login attempt for: {body.get('email')}")
        
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{AUTH_SERVICE_URL}/login",
                json=body
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


@router.post("/register")
async def register(request: Request):
    try:
        body = await request.json()
        logger.info(f"Register attempt for: {body.get('email')}")
        
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{AUTH_SERVICE_URL}/register",
                json=body
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Register error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


# ← NUEVO: endpoint para obtener info del usuario actual
@router.get("/me")
async def get_me(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{AUTH_SERVICE_URL}/me",
                headers=forward_headers(request)
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Get me error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


@router.api_route("/tasks/", methods=["GET", "POST"])
async def tasks(request: Request):
    try:
        body = None
        if request.method == "POST":
            body = await request.json()
        
        # Obtener query params para filtros
        query_params = dict(request.query_params)
        
        async with httpx.AsyncClient() as client:
            r = await client.request(
                request.method,
                f"{TASK_SERVICE_URL}/tasks/",
                headers=forward_headers(request),
                json=body,
                params=query_params
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Tasks error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


# ← NUEVO: endpoint para consultar tarea por código
@router.get("/tasks/code/{code}")
async def task_by_code(code: str, request: Request):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{TASK_SERVICE_URL}/tasks/code/{code}",
                headers=forward_headers(request)
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Task by code error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


@router.get("/tasks/{task_id}")
async def get_task(task_id: int, request: Request):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{TASK_SERVICE_URL}/tasks/{task_id}",
                headers=forward_headers(request)
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Get task error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


@router.api_route("/tasks/{task_id}", methods=["PUT", "DELETE"])
async def task_detail(task_id: int, request: Request):
    try:
        body = None
        if request.method == "PUT":
            body = await request.json()
        
        async with httpx.AsyncClient() as client:
            r = await client.request(
                request.method,
                f"{TASK_SERVICE_URL}/tasks/{task_id}",
                headers=forward_headers(request),
                json=body
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"Task detail error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )


@router.get("/tasks/saga-logs")
async def saga_logs(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{TASK_SERVICE_URL}/tasks/saga-logs",
                headers=forward_headers(request)
            )
        return await proxy_response(r)
    except Exception as e:
        logger.error(f"SAGA logs error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Gateway error: {str(e)}"}
        )