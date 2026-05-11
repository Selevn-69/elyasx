from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import query, execute

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminLoginBody(BaseModel):
    email: str
    password: str


@router.post("/login")
def admin_login(body: AdminLoginBody):
    # Hardcoded admin credentials for now
    if body.email != "admin@elyasx.com" or body.password != "admin123":
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {"message": "Admin login successful", "role": "admin"}


@router.get("/stats")
def get_stats():
    total_customers = query("SELECT COUNT(*) AS count FROM customer", fetch="one")
    total_drivers = query("SELECT COUNT(*) AS count FROM driver", fetch="one")
    total_orders = query("SELECT COUNT(*) AS count FROM `order`", fetch="one")
    total_revenue = query(
        "SELECT SUM(amount) AS total FROM payment WHERE payment_status = 'completed'",
        fetch="one"
    )
    orders_today = query(
        "SELECT COUNT(*) AS count FROM `order` WHERE DATE(created_at) = CURDATE()",
        fetch="one"
    )
    revenue_today = query(
        """
        SELECT SUM(p.amount) AS total FROM payment p
        JOIN `order` o ON p.order_id = o.order_id
        WHERE p.payment_status = 'completed' AND DATE(o.created_at) = CURDATE()
        """,
        fetch="one"
    )
    active_deliveries = query(
        "SELECT COUNT(*) AS count FROM delivery WHERE delivery_status NOT IN ('delivered', 'failed', 'declined', 'offered')",
        fetch="one"
    )
    available_drivers = query(
        "SELECT COUNT(*) AS count FROM driver WHERE status = 'available'",
        fetch="one"
    )
    open_tickets = query(
        "SELECT COUNT(*) AS count FROM support_ticket WHERE status = 'open'",
        fetch="one"
    )
    orders_by_status = query(
        "SELECT status, COUNT(*) AS count FROM `order` GROUP BY status"
    )

    return {
        "total_customers": total_customers["count"],
        "total_drivers": total_drivers["count"],
        "total_orders": total_orders["count"],
        "total_revenue": round(float(total_revenue["total"] or 0) * 0.20, 2),
        "orders_today": orders_today["count"],
        "revenue_today": round(float(revenue_today["total"] or 0) * 0.20, 2),
        "active_deliveries": active_deliveries["count"],
        "available_drivers": available_drivers["count"],
        "open_tickets": open_tickets["count"],
        "orders_by_status": orders_by_status,
    }


@router.get("/users")
def get_all_users():
    customers = query("SELECT customer_id, name, phone, email FROM customer ORDER BY customer_id")
    drivers = query("SELECT driver_id, name, phone, status FROM driver ORDER BY driver_id")
    return {"customers": customers, "drivers": drivers}


@router.patch("/users/driver/{driver_id}/status")
def update_driver_status(driver_id: int, status: str):
    if status not in ("available", "busy"):
        raise HTTPException(status_code=400, detail="Status must be 'available' or 'busy'")
    driver = query("SELECT driver_id FROM driver WHERE driver_id = %s", (driver_id,), fetch="one")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    execute("UPDATE driver SET status = %s WHERE driver_id = %s", (status, driver_id))
    return {"message": f"Driver {driver_id} status updated to {status}"}
