def handle_task_created(event: dict):
    task_id = event.get("task_id")
    user_id = event.get("user_id")

    print(
        f"📧 Notification Service | "
        f"User {user_id} - Task {task_id} created successfully"
    )
