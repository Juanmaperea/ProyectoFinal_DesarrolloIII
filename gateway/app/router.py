from fastapi import APIRouter, Request
from fastapi.responses import Response
import httpx

router = APIRouter()

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
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{AUTH_SERVICE_URL}/login",
            json=await request.json()
        )
    return await proxy_response(r)


@router.post("/register")
async def register(request: Request):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{AUTH_SERVICE_URL}/register",
            json=await request.json()
        )
    return await proxy_response(r)


@router.api_route("/tasks/", methods=["GET", "POST"])
async def tasks(request: Request):
    async with httpx.AsyncClient() as client:
        r = await client.request(
            request.method,
            f"{TASK_SERVICE_URL}/tasks/",
            headers=forward_headers(request),
            json=await request.json() if request.method != "GET" else None
        )
    return await proxy_response(r)


@router.api_route("/tasks/{task_id}/", methods=["PUT", "DELETE"])
async def task_detail(task_id: int, request: Request):
    async with httpx.AsyncClient() as client:
        r = await client.request(
            request.method,
            f"{TASK_SERVICE_URL}/tasks/{task_id}/",
            headers=forward_headers(request),
            json=await request.json() if request.method == "PUT" else None
        )
    return await proxy_response(r)
