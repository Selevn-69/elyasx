# ElyasX

ElyasX is a delivery management project with a React/Vite frontend and a FastAPI backend backed by MySQL.

## Requirements

- Node.js and npm
- Python 3.11 or newer
- MySQL Server

## Database Setup

1. Create a MySQL database named `elyasx`.
2. Import the schema from `schema.sql`.
3. Create `backend/.env` if your local MySQL settings are different from the defaults:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=elyasx
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
