from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, List
from database import query, execute

router = APIRouter(prefix="/drivers", tags=["Drivers"])


class UpdateStatusBody(BaseModel):
    status: Literal["available", "busy"]


class SettlePaymentsBody(BaseModel):
    action: Literal["completed", "failed"]


class AddPointsBody(BaseModel):
    points: int


@router.get("/")
def get_drivers():
    drivers = query(
        """
        SELECT d.driver_id, d.name, d.phone, d.status, d.points,
               ROUND(AVG(r.rating), 1) AS avg_rating,
               COUNT(DISTINCT r.rating_id) AS total_ratings,
               (SELECT COUNT(*) FROM delivery del WHERE del.driver_id = d.driver_id AND del.delivery_status = 'delivered') AS total_deliveries
        FROM driver d
        LEFT JOIN driver_rating r ON d.driver_id = r.driver_id
        GROUP BY d.driver_id
        ORDER BY d.driver_id
        """
    )
    return drivers


@router.get("/{driver_id}")
def get_driver(driver_id: int):
    driver = query(
        """
        SELECT d.driver_id, d.name, d.phone, d.status, d.points,
               ROUND(AVG(r.rating), 1) AS avg_rating,
               COUNT(r.rating_id) AS total_ratings
        FROM driver d
        LEFT JOIN driver_rating r ON d.driver_id = r.driver_id
        WHERE d.driver_id = %s
        GROUP BY d.driver_id
        """,
        (driver_id,), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@router.patch("/{driver_id}/points")
def add_driver_points(driver_id: int, body: AddPointsBody):
    driver = query("SELECT driver_id FROM driver WHERE driver_id = %s", (driver_id,), fetch="one")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if body.points == 0:
        raise HTTPException(status_code=400, detail="Points cannot be zero")

    if body.points < 0:
        current = query("SELECT points FROM driver WHERE driver_id = %s", (driver_id,), fetch="one")
        if current["points"] + body.points < 0:
            raise HTTPException(status_code=400, detail=f"Cannot subtract more than current balance ({current['points']} pts)")

    execute(
        "UPDATE driver SET points = points + %s WHERE driver_id = %s",
        (body.points, driver_id)
    )
    return query(
        "SELECT driver_id, name, phone, status, points FROM driver WHERE driver_id = %s",
        (driver_id,), fetch="one"
    )


@router.put("/{driver_id}/status")
def update_driver_status(driver_id: int, body: UpdateStatusBody):
    driver = query(
        "SELECT driver_id FROM driver WHERE driver_id = %s",
        (driver_id,), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    execute(
        "UPDATE driver SET status = %s WHERE driver_id = %s",
        (body.status, driver_id)
    )
    updated = query(
        "SELECT driver_id, name, phone, status FROM driver WHERE driver_id = %s",
        (driver_id,), fetch="one"
    )
    return updated


@router.get("/{driver_id}/pending-payments")
def get_driver_pending_payments(driver_id: int):
    driver = query("SELECT driver_id FROM driver WHERE driver_id = %s", (driver_id,), fetch="one")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    payments = query(
        """
        SELECT p.payment_id, p.order_id, p.amount, p.payment_method, p.payment_status,
               o.order_type, o.created_at
        FROM payment p
        JOIN `order` o ON p.order_id = o.order_id
        WHERE p.payment_status = 'pending'
          AND o.order_id IN (
            SELECT DISTINCT order_id FROM delivery
            WHERE driver_id = %s AND delivery_status NOT IN ('declined', 'offered')
          )
        ORDER BY o.created_at ASC
        """,
        (driver_id,)
    )

    total_collected = sum(float(p["amount"]) for p in payments)
    company_share = round(total_collected * 0.20, 2)

    return {
        "payments": payments,
        "total_collected": round(total_collected, 2),
        "company_share": company_share,
        "count": len(payments),
    }


@router.post("/{driver_id}/settle-payments")
def settle_driver_payments(driver_id: int, body: SettlePaymentsBody):
    driver = query("SELECT driver_id FROM driver WHERE driver_id = %s", (driver_id,), fetch="one")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    pending = query(
        """
        SELECT p.payment_id FROM payment p
        JOIN `order` o ON p.order_id = o.order_id
        WHERE p.payment_status = 'pending'
          AND o.order_id IN (
            SELECT DISTINCT order_id FROM delivery
            WHERE driver_id = %s AND delivery_status NOT IN ('declined', 'offered')
          )
        """,
        (driver_id,)
    )

    if not pending:
        return {"message": "No pending payments to settle", "updated": 0}

    ids = [p["payment_id"] for p in pending]
    placeholders = ", ".join(["%s"] * len(ids))
    execute(
        f"UPDATE payment SET payment_status = %s WHERE payment_id IN ({placeholders})",
        tuple([body.action] + ids)
    )

    return {"message": f"Settled {len(ids)} payments as {body.action}", "updated": len(ids)}
