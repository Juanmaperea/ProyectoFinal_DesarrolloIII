from .events import handle_task_created

def consume_event(event_type: str, payload: dict):
    if event_type == "task_created":
        handle_task_created(payload)
