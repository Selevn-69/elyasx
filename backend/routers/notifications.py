from fastapi import APIRouter, HTTPException
from database import query, execute

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/customer/{customer_id}")
def get_notifications(customer_id: int):
    customer = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    notifications = query(
        "SELECT * FROM notification WHERE customer_id = %s ORDER BY created_at DESC",
        (customer_id,)
    )
    return notifications


@router.put("/{notification_id}/read")
def mark_read(notification_id: int):
    notification = query(
        "SELECT notification_id FROM notification WHERE notification_id = %s",
        (notification_id,), fetch="one"
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    execute(
        "UPDATE notification SET status = 'read' WHERE notification_id = %s",
        (notification_id,)
    )
    updated = query(
        "SELECT * FROM notification WHERE notification_id = %s",
        (notification_id,), fetch="one"
    )
    return updated
