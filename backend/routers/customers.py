from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import query, execute

router = APIRouter(prefix="/customers", tags=["Customers"])


class UpdateCustomerBody(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class AddPointsBody(BaseModel):
    points: int


@router.get("/")
def get_customers():
    customers = query(
        """
        SELECT c.customer_id, c.name, c.phone, c.email, c.points,
               COUNT(o.order_id) AS total_orders
        FROM customer c
        LEFT JOIN `order` o ON c.customer_id = o.customer_id
        GROUP BY c.customer_id
        ORDER BY c.customer_id
        """
    )
    return customers


@router.get("/{customer_id}")
def get_customer(customer_id: int):
    customer = query(
        "SELECT customer_id, name, phone, email, points FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    addresses = query(
        "SELECT * FROM address WHERE customer_id = %s",
        (customer_id,)
    )
    orders = query(
        "SELECT * FROM `order` WHERE customer_id = %s ORDER BY created_at DESC",
        (customer_id,)
    )

    customer["addresses"] = addresses
    customer["orders"] = orders
    return customer


@router.put("/{customer_id}")
def update_customer(customer_id: int, body: UpdateCustomerBody):
    existing = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    execute(
        f"UPDATE customer SET {set_clause} WHERE customer_id = %s",
        (*fields.values(), customer_id)
    )
    updated = query(
        "SELECT customer_id, name, phone, email, points FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    return updated


@router.patch("/{customer_id}/points")
def add_points(customer_id: int, body: AddPointsBody):
    existing = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")

    if body.points == 0:
        raise HTTPException(status_code=400, detail="Points cannot be zero")

    if body.points < 0:
        current = query("SELECT points FROM customer WHERE customer_id = %s", (customer_id,), fetch="one")
        if current["points"] + body.points < 0:
            raise HTTPException(status_code=400, detail=f"Cannot subtract more than current balance ({current['points']} pts)")

    execute(
        "UPDATE customer SET points = points + %s WHERE customer_id = %s",
        (body.points, customer_id)
    )
    updated = query(
        "SELECT customer_id, name, phone, email, points FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    return updated
