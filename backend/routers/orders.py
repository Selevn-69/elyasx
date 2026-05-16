from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from database import query, execute, transaction
from ml.driver_assignment import choose_best_driver

router = APIRouter(prefix="/orders", tags=["Orders"])

VALID_STATUSES = ["pending", "assigned", "picked_up", "on_the_way", "delivered", "cancelled"]


class CreateOrderBody(BaseModel):
    customer_id: int
    order_type: Literal["food", "package", "online"]
    total_price: float
    payment_method: str = "cash"
    points_to_use: int = 0
    dropoff_address_id: Optional[int] = None
    # food specific
    restaurant_id: Optional[int] = None
    items_description: Optional[str] = None
    # package specific
    description: Optional[str] = None
    weight: Optional[float] = None
    fragile: bool = False
    # online specific
    store_name: Optional[str] = None
    product_link: Optional[str] = None
    notes: Optional[str] = None


class UpdateStatusBody(BaseModel):
    status: str


class AssignDriverBody(BaseModel):
    driver_id: int


@router.get("/")
def get_orders():
    orders = query(
        """
        SELECT o.*, c.name AS customer_name, c.phone AS customer_phone,
               (SELECT dr.name FROM delivery del
                JOIN driver dr ON del.driver_id = dr.driver_id
                WHERE del.order_id = o.order_id
                  AND del.delivery_status NOT IN ('declined', 'offered')
                ORDER BY del.delivery_id DESC LIMIT 1) AS driver_name
        FROM `order` o
        JOIN customer c ON o.customer_id = c.customer_id
        ORDER BY o.created_at DESC
        """
    )
    return orders


@router.get("/customer/{customer_id}")
def get_orders_by_customer(customer_id: int):
    customer = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    orders = query(
        "SELECT * FROM `order` WHERE customer_id = %s ORDER BY created_at DESC",
        (customer_id,)
    )
    return orders


@router.get("/{order_id}")
def get_order(order_id: int):
    order = query(
        """
        SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
        FROM `order` o
        JOIN customer c ON o.customer_id = c.customer_id
        WHERE o.order_id = %s
        """,
        (order_id,), fetch="one"
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order["delivery"] = query(
        """
        SELECT d.*, dr.name AS driver_name, dr.phone AS driver_phone,
               pa.city AS pickup_city, pa.street AS pickup_street, pa.building AS pickup_building,
               da.city AS dropoff_city, da.street AS dropoff_street, da.building AS dropoff_building
        FROM delivery d
        LEFT JOIN driver dr ON d.driver_id = dr.driver_id
        LEFT JOIN address pa ON d.pickup_address_id = pa.address_id
        LEFT JOIN address da ON d.dropoff_address_id = da.address_id
        WHERE d.order_id = %s
          AND d.delivery_status NOT IN ('declined', 'offered')
        ORDER BY d.delivery_id DESC
        LIMIT 1
        """,
        (order_id,), fetch="one"
    )
    order["payment"] = query(
        "SELECT * FROM payment WHERE order_id = %s",
        (order_id,), fetch="one"
    )
    order["package"] = query(
        "SELECT * FROM package WHERE order_id = %s",
        (order_id,), fetch="one"
    )
    order["online_order"] = query(
        "SELECT * FROM online_order WHERE order_id = %s",
        (order_id,), fetch="one"
    )
    order["food_order"] = query(
        """
        SELECT fo.*, r.name AS restaurant_name
        FROM food_order fo
        JOIN restaurant r ON fo.restaurant_id = r.restaurant_id
        WHERE fo.order_id = %s
        """,
        (order_id,), fetch="one"
    )
    order["status_history"] = query(
        """
        SELECT h.*, s.status_name
        FROM order_status_history h
        JOIN order_status s ON h.status_id = s.status_id
        WHERE h.order_id = %s
        ORDER BY h.timestamp DESC
        """,
        (order_id,)
    )
    return order


@router.post("/")
def create_order(body: CreateOrderBody):
    # Validate required fields per order type before any DB writes
    if body.order_type == "food":
        if not body.restaurant_id or not body.items_description:
            raise HTTPException(status_code=400, detail="food orders require restaurant_id and items_description")
    elif body.order_type == "package":
        if not body.description or body.weight is None:
            raise HTTPException(status_code=400, detail="package orders require description and weight")
    elif body.order_type == "online":
        if not body.store_name or not body.product_link:
            raise HTTPException(status_code=400, detail="online orders require store_name and product_link")

    customer = query(
        "SELECT customer_id, points FROM customer WHERE customer_id = %s",
        (body.customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    points_to_use = max(0, body.points_to_use)
    if points_to_use > 0:
        # Server-side cap: points cannot discount more than the order total
        max_usable = int(body.total_price * 10)
        points_to_use = min(points_to_use, max_usable)
        if points_to_use > customer["points"]:
            raise HTTPException(status_code=400, detail="Not enough points")
        discount = points_to_use / 10.0
        final_price = max(0.0, round(body.total_price - discount, 2))
    else:
        points_to_use = 0
        final_price = body.total_price

    try:
        with transaction() as cur:
            cur.execute(
                "INSERT INTO `order` (customer_id, order_type, total_price, status) VALUES (%s, %s, %s, 'pending')",
                (body.customer_id, body.order_type, final_price)
            )
            new_id = cur.lastrowid

            cur.execute("SELECT status_id FROM order_status WHERE status_name = 'pending'")
            status_row = cur.fetchone()
            if status_row:
                cur.execute(
                    "INSERT INTO order_status_history (order_id, status_id) VALUES (%s, %s)",
                    (new_id, status_row["status_id"])
                )

            if body.order_type == "food":
                cur.execute(
                    "INSERT INTO food_order (order_id, restaurant_id, items_description) VALUES (%s, %s, %s)",
                    (new_id, body.restaurant_id, body.items_description)
                )
            elif body.order_type == "package":
                cur.execute(
                    "INSERT INTO package (order_id, description, weight, fragile) VALUES (%s, %s, %s, %s)",
                    (new_id, body.description, body.weight, 1 if body.fragile else 0)
                )
            elif body.order_type == "online":
                cur.execute(
                    "INSERT INTO online_order (order_id, store_name, product_link, notes) VALUES (%s, %s, %s, %s)",
                    (new_id, body.store_name, body.product_link, body.notes)
                )

            if points_to_use > 0:
                cur.execute(
                    "UPDATE customer SET points = points - %s WHERE customer_id = %s",
                    (points_to_use, body.customer_id)
                )

            cur.execute(
                "INSERT INTO payment (order_id, amount, payment_method, payment_status, points_used) VALUES (%s, %s, %s, 'pending', %s)",
                (new_id, final_price, body.payment_method, points_to_use)
            )
            payment_id = cur.lastrowid
            cur.execute(
                "INSERT INTO transaction (payment_id, transaction_status) VALUES (%s, 'pending')",
                (payment_id,)
            )

            if body.dropoff_address_id:
                available_driver = choose_best_driver(cur, {
                    "customer_id": body.customer_id,
                    "customer_points": customer["points"],
                    "order_type": body.order_type,
                    "payment_method": body.payment_method,
                    "dropoff_address_id": body.dropoff_address_id,
                })
                if available_driver:
                    cur.execute(
                        """
                        INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
                        VALUES (%s, %s, NULL, %s, 'offered')
                        """,
                        (new_id, available_driver["driver_id"], body.dropoff_address_id)
                    )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")

    return query("SELECT * FROM `order` WHERE order_id = %s", (new_id,), fetch="one")


@router.put("/{order_id}/status")
def update_order_status(order_id: int, body: UpdateStatusBody):
    order = query(
        "SELECT order_id FROM `order` WHERE order_id = %s",
        (order_id,), fetch="one"
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {VALID_STATUSES}")

    execute(
        "UPDATE `order` SET status = %s WHERE order_id = %s",
        (body.status, order_id)
    )

    status_row = query(
        "SELECT status_id FROM order_status WHERE status_name = %s",
        (body.status,), fetch="one"
    )
    if status_row:
        execute(
            "INSERT INTO order_status_history (order_id, status_id) VALUES (%s, %s)",
            (order_id, status_row["status_id"])
        )

    updated = query("SELECT * FROM `order` WHERE order_id = %s", (order_id,), fetch="one")
    return updated


@router.put("/{order_id}/assign-driver")
def assign_driver_to_order(order_id: int, body: AssignDriverBody):
    order = query("SELECT order_id FROM `order` WHERE order_id = %s", (order_id,), fetch="one")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    driver = query("SELECT driver_id FROM driver WHERE driver_id = %s", (body.driver_id,), fetch="one")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    existing = query(
        "SELECT dropoff_address_id FROM delivery WHERE order_id = %s ORDER BY delivery_id DESC LIMIT 1",
        (order_id,), fetch="one"
    )
    dropoff_id = existing["dropoff_address_id"] if existing else None

    execute(
        """
        INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
        VALUES (%s, %s, NULL, %s, 'offered')
        """,
        (order_id, body.driver_id, dropoff_id)
    )
    return {"message": f"Order {order_id} offered to driver {body.driver_id}"}
