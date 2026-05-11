from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import query, execute

router = APIRouter(prefix="/ratings", tags=["Ratings"])


class CreateRatingBody(BaseModel):
    driver_id: int
    customer_id: Optional[int] = None
    rating: int
    comment: Optional[str] = None


@router.post("/")
def submit_rating(body: CreateRatingBody):
    driver = query(
        "SELECT driver_id FROM driver WHERE driver_id = %s",
        (body.driver_id,), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    new_id = execute(
        "INSERT INTO driver_rating (driver_id, customer_id, rating, comment) VALUES (%s, %s, %s, %s)",
        (body.driver_id, body.customer_id, body.rating, body.comment)
    )
    rating = query("SELECT * FROM driver_rating WHERE rating_id = %s", (new_id,), fetch="one")
    return rating


@router.get("/driver/{driver_id}")
def get_driver_ratings(driver_id: int):
    driver = query(
        "SELECT driver_id FROM driver WHERE driver_id = %s",
        (driver_id,), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    ratings = query(
        """
        SELECT r.*, c.name AS customer_name
        FROM driver_rating r
        LEFT JOIN customer c ON r.customer_id = c.customer_id
        WHERE r.driver_id = %s
        ORDER BY r.rating_id DESC
        """,
        (driver_id,)
    )
    summary = query(
        "SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total FROM driver_rating WHERE driver_id = %s",
        (driver_id,), fetch="one"
    )
    return {"summary": summary, "ratings": ratings}


@router.get("/check/{driver_id}/{customer_id}")
def check_rating(driver_id: int, customer_id: int):
    rating = query(
        "SELECT * FROM driver_rating WHERE driver_id = %s AND customer_id = %s ORDER BY rating_id DESC LIMIT 1",
        (driver_id, customer_id), fetch="one"
    )
    return {"rated": rating is not None, "rating": rating}
