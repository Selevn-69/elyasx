from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import query, execute

router = APIRouter(prefix="/payments", tags=["Payments"])


class CreatePaymentBody(BaseModel):
    order_id: int
    amount: float
    payment_method: str


@router.get("/")
def get_payments():
    payments = query(
        """
        SELECT p.*, o.order_type, o.status AS order_status,
               c.name AS customer_name
        FROM payment p
        JOIN `order` o ON p.order_id = o.order_id
        JOIN customer c ON o.customer_id = c.customer_id
        ORDER BY p.payment_id DESC
        """
    )
    return payments


@router.get("/order/{order_id}")
def get_payment_by_order(order_id: int):
    order = query(
        "SELECT order_id FROM `order` WHERE order_id = %s",
        (order_id,), fetch="one"
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = query(
        "SELECT * FROM payment WHERE order_id = %s",
        (order_id,), fetch="one"
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this order")

    payment["transaction"] = query(
        "SELECT * FROM transaction WHERE payment_id = %s",
        (payment["payment_id"],), fetch="one"
    )
    return payment


@router.post("/")
def create_payment(body: CreatePaymentBody):
    order = query(
        "SELECT order_id FROM `order` WHERE order_id = %s",
        (body.order_id,), fetch="one"
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    existing = query(
        "SELECT payment_id FROM payment WHERE order_id = %s",
        (body.order_id,), fetch="one"
    )
    if existing:
        raise HTTPException(status_code=400, detail="Payment already exists for this order")

    new_id = execute(
        "INSERT INTO payment (order_id, amount, payment_method, payment_status) VALUES (%s, %s, %s, 'pending')",
        (body.order_id, body.amount, body.payment_method)
    )

    execute(
        "INSERT INTO transaction (payment_id, transaction_status) VALUES (%s, 'pending')",
        (new_id,)
    )

    payment = query("SELECT * FROM payment WHERE payment_id = %s", (new_id,), fetch="one")
    return payment
