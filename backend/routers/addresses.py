from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import query, execute

router = APIRouter(prefix="/addresses", tags=["Addresses"])


class AddressBody(BaseModel):
    customer_id: int
    city: str
    street: str
    building: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{address_id}")
def get_address(address_id: int):
    address = query(
        "SELECT * FROM address WHERE address_id = %s",
        (address_id,), fetch="one"
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address


@router.get("/customer/{customer_id}")
def get_addresses(customer_id: int):
    customer = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    addresses = query(
        "SELECT * FROM address WHERE customer_id = %s",
        (customer_id,)
    )
    return addresses


@router.post("/")
def create_address(body: AddressBody):
    customer = query(
        "SELECT customer_id FROM customer WHERE customer_id = %s",
        (body.customer_id,), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    new_id = execute(
        "INSERT INTO address (customer_id, city, street, building, notes) VALUES (%s, %s, %s, %s, %s)",
        (body.customer_id, body.city, body.street, body.building, body.notes)
    )
    address = query("SELECT * FROM address WHERE address_id = %s", (new_id,), fetch="one")
    return address


@router.delete("/{address_id}")
def delete_address(address_id: int):
    existing = query(
        "SELECT address_id FROM address WHERE address_id = %s",
        (address_id,), fetch="one"
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Address not found")

    execute("DELETE FROM address WHERE address_id = %s", (address_id,))
    return {"message": "Address deleted"}
