from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import query, execute

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterBody(BaseModel):
    name: str
    phone: str
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


class DriverLoginBody(BaseModel):
    phone: str
    password: str


@router.post("/register")
def register(body: RegisterBody):
    existing = query(
        "SELECT customer_id FROM customer WHERE email = %s",
        (body.email,), fetch="one"
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_id = execute(
        "INSERT INTO customer (name, phone, email, password) VALUES (%s, %s, %s, %s)",
        (body.name, body.phone, body.email, body.password)
    )
    customer = query("SELECT * FROM customer WHERE customer_id = %s", (new_id,), fetch="one")
    customer.pop("password", None)
    return {"message": "Registered successfully", "customer": customer}


@router.post("/login")
def login(body: LoginBody):
    customer = query(
        "SELECT * FROM customer WHERE email = %s AND password = %s",
        (body.email, body.password), fetch="one"
    )
    if not customer:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    customer.pop("password", None)
    return {"message": "Login successful", "customer": customer}


@router.post("/driver/login")
def driver_login(body: DriverLoginBody):
    driver = query(
        "SELECT driver_id, name, phone, status FROM driver WHERE phone = %s AND password = %s",
        (body.phone, body.password), fetch="one"
    )
    if not driver:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    return {"message": "Login successful", "driver": driver}


class AdminLoginBody(BaseModel):
    email: str
    password: str


@router.post("/admin/login")
def admin_login(body: AdminLoginBody):
    admin = query(
        "SELECT admin_id, name, email, role FROM admin WHERE email = %s AND password = %s",
        (body.email, body.password), fetch="one"
    )
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "admin": admin}
