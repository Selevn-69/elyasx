from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import query, execute

router = APIRouter(prefix="/support", tags=["Support"])

VALID_STATUSES = ["open", "in_progress", "resolved", "closed"]


class CreateTicketBody(BaseModel):
    customer_id: int
    order_id: Optional[int] = None
    issue_description: str


class UpdateStatusBody(BaseModel):
    status: str


@router.get("/")
def get_tickets():
    tickets = query(
        """
        SELECT t.*, c.name AS customer_name
        FROM support_ticket t
        JOIN customer c ON t.customer_id = c.customer_id
        ORDER BY t.ticket_id DESC
        """
    )
    return tickets


@router.get("/customer/{customer_id}")
def get_tickets_by_customer(customer_id: int):
    customer = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    tickets = query(
        "SELECT * FROM support_ticket WHERE customer_id = %s ORDER BY ticket_id DESC",
        (customer_id,)
    )
    return tickets


@router.post("/")
def create_ticket(body: CreateTicketBody):
    customer = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (body.customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if body.order_id:
        order = query(
            "SELECT order_id FROM `order` WHERE order_id = %s",
            (body.order_id,), fetch="one"
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

    new_id = execute(
        "INSERT INTO support_ticket (customer_id, order_id, issue_description, status) VALUES (%s, %s, %s, 'open')",
        (body.customer_id, body.order_id, body.issue_description)
    )
    ticket = query("SELECT * FROM support_ticket WHERE ticket_id = %s", (new_id,), fetch="one")
    return ticket


@router.put("/{ticket_id}/status")
def update_ticket_status(ticket_id: int, body: UpdateStatusBody):
    ticket = query(
        "SELECT ticket_id FROM support_ticket WHERE ticket_id = %s",
        (ticket_id,), fetch="one"
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {VALID_STATUSES}")

    execute(
        "UPDATE support_ticket SET status = %s WHERE ticket_id = %s",
        (body.status, ticket_id)
    )
    updated = query("SELECT * FROM support_ticket WHERE ticket_id = %s", (ticket_id,), fetch="one")
    return updated
