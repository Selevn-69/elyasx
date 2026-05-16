from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path

from routers import auth, customers, addresses, drivers, orders, deliveries, payments, notifications, support, ratings, admin, restaurants

load_dotenv(Path(__file__).parent / ".env")


def get_allowed_origins():
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


app = FastAPI(title="ElyasX API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(deliveries.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(ratings.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(restaurants.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ElyasX API running"}
