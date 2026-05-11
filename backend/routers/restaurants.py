from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import query, execute

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


class CreateRestaurantBody(BaseModel):
    name: str
    address: str
    phone: str
    cuisine_type: Optional[str] = None
    delivery_fee: float = 0.0


class UpdateRestaurantBody(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    cuisine_type: Optional[str] = None
    delivery_fee: Optional[float] = None


@router.get("/")
def get_restaurants():
    return query("SELECT * FROM restaurant ORDER BY restaurant_id")


@router.get("/{restaurant_id}")
def get_restaurant(restaurant_id: int):
    restaurant = query(
        "SELECT * FROM restaurant WHERE restaurant_id = %s",
        (restaurant_id,), fetch="one"
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant


@router.post("/")
def create_restaurant(body: CreateRestaurantBody):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not body.address.strip():
        raise HTTPException(status_code=400, detail="Address is required")
    if not body.phone.strip():
        raise HTTPException(status_code=400, detail="Phone is required")

    if body.delivery_fee < 0:
        raise HTTPException(status_code=400, detail="Delivery fee cannot be negative")

    new_id = execute(
        "INSERT INTO restaurant (name, address, phone, cuisine_type, delivery_fee) VALUES (%s, %s, %s, %s, %s)",
        (body.name.strip(), body.address.strip(), body.phone.strip(), body.cuisine_type, body.delivery_fee)
    )
    return query("SELECT * FROM restaurant WHERE restaurant_id = %s", (new_id,), fetch="one")


@router.put("/{restaurant_id}")
def update_restaurant(restaurant_id: int, body: UpdateRestaurantBody):
    restaurant = query(
        "SELECT * FROM restaurant WHERE restaurant_id = %s",
        (restaurant_id,), fetch="one"
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "delivery_fee" in fields and fields["delivery_fee"] < 0:
        raise HTTPException(status_code=400, detail="Delivery fee cannot be negative")

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    execute(
        f"UPDATE restaurant SET {set_clause} WHERE restaurant_id = %s",
        (*fields.values(), restaurant_id)
    )
    return query("SELECT * FROM restaurant WHERE restaurant_id = %s", (restaurant_id,), fetch="one")


@router.delete("/{restaurant_id}")
def delete_restaurant(restaurant_id: int):
    restaurant = query(
        "SELECT restaurant_id FROM restaurant WHERE restaurant_id = %s",
        (restaurant_id,), fetch="one"
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    linked = query(
        "SELECT food_order_id FROM food_order WHERE restaurant_id = %s LIMIT 1",
        (restaurant_id,), fetch="one"
    )
    if linked:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete restaurant with existing orders"
        )

    execute("DELETE FROM restaurant WHERE restaurant_id = %s", (restaurant_id,))
    return {"message": f"Restaurant {restaurant_id} deleted"}
