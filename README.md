# ElyasX

ElyasX is a delivery management project with a React/Vite frontend and a FastAPI backend backed by MySQL.

## Requirements

- Node.js and npm
- Python 3.11 or newer
- MySQL Server

## Database Setup

1. Create or use a MySQL database.
2. Import the schema from `schema.sql`.
3. Create `backend/.env` with your database connection:

```env
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_password
DB_NAME=your_database_name
CORS_ORIGINS=http://localhost:5173
```

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API will run at `http://127.0.0.1:8000`.

## Frontend Setup

Open a second terminal from the project root:

```bash
npm install
npm run dev
```

The frontend will run at the URL printed by Vite, usually `http://localhost:5173`.

To point the frontend at a deployed backend instead of local FastAPI, create a root `.env` file:

```env
VITE_API_BASE_URL=http://your_backend_host:8000/api
```

## How to Use the Site

The site has three separate portals:

1. Customer Portal: open `/login`. Customers can register or sign in, create delivery orders, manage saved addresses, track orders, view notifications, contact support, use points, and rate drivers after delivery.
2. Driver Portal: open `/driver/login`. Drivers can sign in, set their availability, accept or decline offered deliveries, view the active delivery, and review delivery history/profile details.
3. Admin Portal: open `/admin/login`. Admins can view the dashboard, manage orders, assign drivers, manage drivers/customers/restaurants, review payments, settle driver payments, handle support tickets, and adjust points.

Default admin login:

```text
Email: admin@elyasx.com
Password: admin123
```

Customer accounts can be created from the Customer Portal registration form. Driver accounts should exist in the database before using the Driver Portal.

## Professor Report

The project report is included at:

```text
reports/ElyasX_Project_Report_v3.docx
```

## Build

```bash
npm run build
```

## Smart Driver Assignment ML

The backend includes a course/demo smart driver assignment feature in `backend/ml`. It uses synthetic training data and a self-contained logistic regression model saved as `backend/ml/driver_assignment_model.json`.

Order creation and driver decline re-assignment both rank available drivers through `backend/ml/driver_assignment.py`. The scorer first keeps the least-loaded available drivers, then applies the ML model within that group. If the model file is missing, the backend falls back to a simple heuristic so order creation still works.

To regenerate the demo dataset and model:

```bash
cd backend/ml
python generate_synthetic_driver_data.py
python train_driver_assignment_model.py
```

Run the backend from the `backend` directory after regenerating the model.
