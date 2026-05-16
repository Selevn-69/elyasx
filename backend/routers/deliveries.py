from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from database import query, execute, get_connection
from ml.driver_assignment import choose_best_driver

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])

VALID_STATUSES = ["pending", "picked_up", "on_the_way", "delivered", "failed"]

DELIVERY_TO_ORDER_STATUS = {
    "picked_up": "picked_up",
    "on_the_way": "on_the_way",
    "delivered": "delivered",
}


class CreateDeliveryBody(BaseModel):
    order_id: int
    driver_id: int
    pickup_address_id: int
    dropoff_address_id: int


class UpdateStatusBody(BaseModel):
    status: str


@router.get("/")
def get_deliveries():
    deliveries = query(
        """
        SELECT d.*, dr.name AS driver_name, dr.phone AS driver_phone,
               o.order_type, o.total_price, o.status AS order_status
        FROM delivery d
        JOIN driver dr ON d.driver_id = dr.driver_id
        JOIN `order` o ON d.order_id = o.order_id
        ORDER BY d.delivery_id DESC
        """
    )
    return deliveries


@router.get("/driver/{driver_id}")
def get_deliveries_by_driver(driver_id: int):
    driver = query(
        "SELECT driver_id FROM driver WHERE driver_id = %s",
        (driver_id,), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    deliveries = query(
        """
        SELECT d.*,
               o.order_type, o.total_price, o.status AS order_status, o.created_at,
               c.name AS customer_name, c.phone AS customer_phone,
               pa.city AS pickup_city, pa.street AS pickup_street, pa.building AS pickup_building,
               da.city AS dropoff_city, da.street AS dropoff_street, da.building AS dropoff_building
        FROM delivery d
        JOIN `order` o ON d.order_id = o.order_id
        JOIN customer c ON o.customer_id = c.customer_id
        LEFT JOIN address pa ON d.pickup_address_id = pa.address_id
        LEFT JOIN address da ON d.dropoff_address_id = da.address_id
        WHERE d.driver_id = %s
        ORDER BY d.delivery_id DESC
        """,
        (driver_id,)
    )
    return deliveries


@router.post("/")
def create_delivery(body: CreateDeliveryBody):
    order = query(
        "SELECT order_id FROM `order` WHERE order_id = %s",
        (body.order_id,), fetch="one"
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    driver = query(
        "SELECT driver_id FROM driver WHERE driver_id = %s",
        (body.driver_id,), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    existing = query(
        "SELECT delivery_id FROM delivery WHERE order_id = %s",
        (body.order_id,), fetch="one"
    )
    if existing:
        raise HTTPException(status_code=400, detail="Delivery already exists for this order")

    new_id = execute(
        """
        INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
        VALUES (%s, %s, %s, %s, 'pending')
        """,
        (body.order_id, body.driver_id, body.pickup_address_id, body.dropoff_address_id)
    )

    delivery = query("SELECT * FROM delivery WHERE delivery_id = %s", (new_id,), fetch="one")
    return delivery


@router.put("/{delivery_id}/status")
def update_delivery_status(delivery_id: int, body: UpdateStatusBody):
    delivery = query(
        "SELECT * FROM delivery WHERE delivery_id = %s",
        (delivery_id,), fetch="one"
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {VALID_STATUSES}")

    execute(
        "UPDATE delivery SET delivery_status = %s WHERE delivery_id = %s",
        (body.status, delivery_id)
    )

    # Sync order status
    if body.status in DELIVERY_TO_ORDER_STATUS:
        execute(
            "UPDATE `order` SET status = %s WHERE order_id = %s",
            (DELIVERY_TO_ORDER_STATUS[body.status], delivery["order_id"])
        )

    updated = query("SELECT * FROM delivery WHERE delivery_id = %s", (delivery_id,), fetch="one")
    return updated


@router.post("/{delivery_id}/accept")
def accept_delivery(delivery_id: int):
    delivery = query(
        "SELECT * FROM delivery WHERE delivery_id = %s",
        (delivery_id,), fetch="one"
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery["delivery_status"] != "offered":
        raise HTTPException(status_code=400, detail="Delivery is not in offered state")

    execute(
        "UPDATE delivery SET delivery_status = 'pending' WHERE delivery_id = %s",
        (delivery_id,)
    )
    execute(
        "UPDATE `order` SET status = 'assigned' WHERE order_id = %s",
        (delivery["order_id"],)
    )
    status_row = query(
        "SELECT status_id FROM order_status WHERE status_name = 'assigned'",
        fetch="one"
    )
    if status_row:
        execute(
            "INSERT INTO order_status_history (order_id, status_id) VALUES (%s, %s)",
            (delivery["order_id"], status_row["status_id"])
        )

    # Transfer customer points to driver if any were used on this order
    payment = query(
        "SELECT points_used FROM payment WHERE order_id = %s",
        (delivery["order_id"],), fetch="one"
    )
    if payment and payment["points_used"] > 0:
        execute(
            "UPDATE driver SET points = points + %s WHERE driver_id = %s",
            (payment["points_used"], delivery["driver_id"])
        )

    return query("SELECT * FROM delivery WHERE delivery_id = %s", (delivery_id,), fetch="one")


@router.post("/{delivery_id}/decline")
def decline_delivery(delivery_id: int):
    delivery = query(
        "SELECT * FROM delivery WHERE delivery_id = %s",
        (delivery_id,), fetch="one"
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery["delivery_status"] != "offered":
        raise HTTPException(status_code=400, detail="Delivery is not in offered state")

    order_id = delivery["order_id"]
    dropoff_address_id = delivery["dropoff_address_id"]

    execute(
        "UPDATE delivery SET delivery_status = 'declined' WHERE delivery_id = %s",
        (delivery_id,)
    )

    order = query(
        """
        SELECT o.customer_id, o.order_type, c.points AS customer_points,
               COALESCE(p.payment_method, 'cash') AS payment_method
        FROM `order` o
        JOIN customer c ON o.customer_id = c.customer_id
        LEFT JOIN payment p ON o.order_id = p.order_id
        WHERE o.order_id = %s
        """,
        (order_id,), fetch="one"
    )
    excluded = query(
        """
        SELECT DISTINCT driver_id
        FROM delivery
        WHERE order_id = %s AND delivery_status IN ('declined', 'offered')
        """,
        (order_id,)
    )
    excluded_driver_ids = [row["driver_id"] for row in excluded]

    next_driver = None
    if order:
        conn = get_connection()
        try:
            cur = conn.cursor(dictionary=True)
            next_driver = choose_best_driver(cur, {
                "customer_id": order["customer_id"],
                "customer_points": order["customer_points"],
                "order_type": order["order_type"],
                "payment_method": order["payment_method"],
                "dropoff_address_id": dropoff_address_id,
                "exclude_driver_ids": excluded_driver_ids,
            })
        finally:
            conn.close()

    if next_driver:
        execute(
            """
            INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
            VALUES (%s, %s, NULL, %s, 'offered')
            """,
            (order_id, next_driver["driver_id"], dropoff_address_id)
        )

    return {"declined": True, "reassigned_to": next_driver["driver_id"] if next_driver else None}
