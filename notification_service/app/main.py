from fastapi import FastAPI
from .consumer import consume_event

app = FastAPI(title="Notification Service")

@app.post("/events")
def receive_event(event: dict):
    event_type = event.get("type")
    payload = event.get("payload")

    consume_event(event_type, payload)

    return {"status": "event processed"}

@app.get("/health")
def health():
    return {"status": "notification service running"}
