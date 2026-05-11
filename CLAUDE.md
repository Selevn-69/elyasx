# ElyasX Delivery Platform

## Project Description
Multi-service delivery web app supporting food delivery, package shipping, and online shopping proxy orders.

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS v4 + Vite
- Backend: FastAPI + MySQL
- Routing: React Router v6
- HTTP Client: Axios (connected to backend)

## Brand Colors
- Primary Orange: #F97316
- Background: #FFFFFF
- Cards: #F8F8F8
- Orange tint: #FFF7ED
- Text: #111111
- Muted text: #6B7280
- Border: #E5E5E5
- Font: Poppins

## Completed So Far
- ✅ Phase 1: Customer Portal (11 pages)
  - /login
  - / (Dashboard)
  - /new-order (3 steps)
  - /orders
  - /orders/:id
  - /addresses
  - /notifications
  - /support
  - /profile

- ✅ Phase 2: Driver Portal (4 pages)
  - /driver/login
  - /driver (Dashboard)
  - /driver/active
  - /driver/deliveries

- ✅ Phase 3: Admin Panel (8 pages)
  - /admin/login → AdminLoginPage (AuthLayout, sets localStorage "adminLoggedIn")
  - /admin → AdminDashboardPage (protected)
  - /admin/orders → AdminOrdersPage (protected)
  - /admin/drivers → AdminDriversPage (protected)
  - /admin/customers → AdminCustomersPage (protected)
  - /admin/payments → AdminPaymentsPage (protected)
  - /admin/support → AdminSupportPage (protected)
  - /admin/restaurants → AdminRestaurantsPage (protected)

## Folder Structure
src/
├── pages/
│   ├── auth/
│   ├── customer/
│   ├── driver/
│   └── admin/
├── layouts/
│   ├── MainLayout.tsx
│   ├── AuthLayout.tsx
│   ├── DriverLayout.tsx
│   └── AdminLayout.tsx
├── components/
│   ├── SideNavBar.tsx        (customer sidebar)
│   ├── TopHeader.tsx
│   ├── driver/
│   │   ├── DriverSidebar.tsx
│   │   └── DriverHeader.tsx
│   └── admin/
│       ├── AdminSidebar.tsx
│       └── AdminHeader.tsx
└── assets/
    └── logo.png              (also copied to public/logo.png)

## Logo
- Logo file: public/logo.png (served statically by Vite)
- Always reference as src="/logo.png" — never use /src/assets/ paths
- Used in: all 3 sidebars + all 3 login pages
- Size in sidebars: w-36 h-auto object-contain, centered with flex justify-center
- Size in login pages: w-36 h-auto object-contain mx-auto

## Admin Panel Notes
- Protected by localStorage "adminLoggedIn" === "true"
- AdminProtectedRoute in App.tsx redirects to /admin/login if not authenticated
- All admin pages use real API data (connected in Phase 5)
- Every table row opens a detail modal (600px wide, 2-col grid layout)
- Modal pattern: max-w-[600px], p-[24px], grid grid-cols-[auto_1fr] for details
- Status badges always use whitespace-nowrap to prevent wrapping

## Current Phase
- ✅ Phase 4: Backend (FastAPI + MySQL) — fully implemented
- ✅ Phase 4 (connection): Frontend connected to backend via Axios
  - src/api/axios.ts — base instance (baseURL: http://localhost:8000/api), attaches customer_id header
  - src/api/auth.ts — login, register, driverLogin, adminLogin (POST /auth/admin/login)
  - src/api/orders.ts — getCustomerOrders, getOrderById, createOrder
  - src/api/addresses.ts — getAddresses, addAddress, deleteAddress
  - src/api/notifications.ts — getNotifications, markAsRead
  - src/api/support.ts — getTickets, createTicket
  - src/api/drivers.ts — getDriver, getDriverDeliveries, updateDeliveryStatus, updateDriverStatus, acceptDelivery, declineDelivery
  - src/api/admin.ts — getAdminStats, getAllOrders, getAllPayments, getAllTickets, getAllDrivers, getAllCustomers, getCustomerById, assignDriver, updateTicketStatus, getDriverPendingPayments, settleDriverPayments, addCustomerPoints, addDriverPoints, getAllRestaurants, createRestaurant, updateRestaurant, deleteRestaurant
- Connected pages: LoginPage, DashboardPage, OrdersPage, AddressesPage, NotificationsPage, SupportPage, ProfilePage, AdminLoginPage, all 8 Admin pages
- All connected pages show loading spinner + error message
- New order flow fully functional (Step1→Step2→Step3 via sessionStorage, real API submit)
- OrderDetailPage shows real data (tracking, driver, payment, type-specific details)
- Admin panel fully connected to backend via real API calls
- Driver portal fully connected to backend (login, dashboard, deliveries, active delivery page)
- Driver dashboard shows "Incoming Orders" (offered deliveries) with Accept/Decline buttons; polls every 5s
- Driver active page shows ALL active deliveries as individual cards with per-delivery action buttons
- Customer OrderDetailPage, OrdersPage, DashboardPage all poll every 5s for live status updates
- NewOrderStep2Page: dropoff_address_id included in sessionStorage; submit disabled when no addresses saved
- Rating system: customer rates driver after delivery (OrderDetailPage), driver sees avg rating (Dashboard + Deliveries), admin sees reviews list in driver modal
- Driver payment settlement: admin opens driver modal → sees pending cash payments summary (count, total collected, 20% company share) → "Confirm Payment Received" (marks all pending → completed) or "Late for Payment" (marks all → failed)
- Points system: customers and drivers both have points. Admin can add or subtract from either (negative values subtract; backend guards against going below 0)
- Points discount: on NewOrderStep3Page, customers with points see a "Use My Points" option — 10 pts = ₪1 discount. Points deducted from customer on order creation; transferred to the assigned driver when they accept the delivery
- Restaurant management: AdminRestaurantsPage allows add, edit, delete. Restaurants have delivery_fee per restaurant shown in customer order flow
- All currency displays use ₪ (shekel) — no $ anywhere in the UI
- AdminPaymentsPage shows both Full Amount and Revenue (20%) columns; totalRevenue card shows 20% cut

## New Order Flow (sessionStorage keys)
- newOrderType: 'food' | 'package' | 'online'
- newOrderDetails: JSON with total_price + type-specific fields
- POST /api/orders accepts all fields in one body, creates sub-record + payment automatically
- POST /api/orders also accepts `points_to_use` (int) — deducts from customer, applies discount (10 pts = ₪1), stores in payment.points_used

## Points System
- Both customer and driver tables have `points INT DEFAULT 0`
- `PATCH /customers/{id}/points` — body: { points: int }, adds (positive) or subtracts (negative); guards against going below 0
- `PATCH /drivers/{id}/points` — same behavior for drivers
- Admin can adjust either from their respective modals (Adjust Points section at the bottom)
- Points transfer: when a customer uses points on an order and a driver accepts, the driver receives those points (payment.points_used → driver.points)
- NewOrderStep3Page: "Use My Points" toggle only shown if customer has points; max capped at floor(delivery_fee × 10); discount shown in summary; points_to_use sent in order body
- Points cap enforced on BOTH sides: frontend caps pointsToUse by maxUsablePoints; backend caps by floor(total_price × 10) before deducting — do NOT rely on only one side

## Restaurant Management
- AdminRestaurantsPage: full CRUD — add, edit, delete
- DELETE blocked if restaurant has linked food orders
- `delivery_fee` per restaurant: shown in admin table, in customer restaurant dropdown (e.g. "Pizza Palace — ₪5.00 delivery"), and used as total_price in order summary
- NewOrderStep2Page: food order delivery fee comes from selected restaurant, not hardcoded

## Payments Page (AdminPaymentsPage)
- Table shows two amount columns: "Full Amount" (what customer paid) and "Revenue (20%)" (company cut)
- Total Revenue card also shows 20% cut of completed payments only
- Modal detail shows both "Full Amount" and "Revenue (20%)" rows

## Order Status Values (DB enum — must match exactly)
- pending, assigned, picked_up, on_the_way, delivered, cancelled

## localStorage Keys
- Customer: isLoggedIn, userName, userEmail, userPhone, customer_id
- Driver: driverLoggedIn, driverName, driverPhone, driver_id
- Admin: adminLoggedIn, adminName, adminId

## Backend Structure
backend/
├── main.py              ← FastAPI app, CORS for localhost:5173, all routers at /api prefix
├── database.py          ← MySQL connection via mysql-connector-python (host: localhost, db: elyasx)
├── routers/
│   ├── auth.py          ← /api/auth (login, logout, refresh)
│   ├── customers.py     ← /api/customers (CRUD)
│   ├── drivers.py       ← /api/drivers (CRUD + status + pending-payments + settle-payments + points)
│   ├── orders.py        ← /api/orders (CRUD + status)
│   ├── deliveries.py    ← /api/deliveries (CRUD + assign driver)
│   ├── payments.py      ← /api/payments (CRUD + refund)
│   ├── notifications.py ← /api/notifications (read, delete)
│   ├── support.py       ← /api/support (tickets + reply)
│   ├── restaurants.py   ← /api/restaurants (GET all, GET by id, POST create, PUT update, DELETE — blocked if orders exist)
│   └── admin.py         ← /api/admin (login, stats, user management)
├── schemas/
│   └── __init__.py      ← Pydantic schemas go here
└── requirements.txt

## Backend Run Command
cd backend && python -m uvicorn main:app --reload --port 8000

## Backend Notes
- All routes are fully implemented against real MySQL tables
- Passwords stored as plain text for now (no hashing yet)
- `order` is a MySQL reserved word — always wrap in backticks: `\`order\``
- database.py has three helpers:
  - `query(sql, params, fetch)` — SELECT, returns list or dict
  - `execute(sql, params)` — single INSERT/UPDATE/DELETE, auto-commits, returns lastrowid
  - `transaction()` — context manager that yields a cursor on a single connection; commits on success, rolls back on any exception. Use for multi-step writes that must be atomic.
- Driver table HAS a password column (VARCHAR DEFAULT '123456') — driver login requires both phone AND password
- Admin login uses hardcoded credentials: admin@elyasx.com / admin123
- Docs available at http://localhost:8000/docs when running
- `httpx` is in requirements.txt (needed for FastAPI TestClient)

## Actual Table Columns (exact — use these, don't guess)
- customer: customer_id, name, phone, email, password, points (INT DEFAULT 0)
- driver: driver_id, name, phone, status (enum: available/busy), password (VARCHAR DEFAULT '123456'), points (INT DEFAULT 0)
- address: address_id, customer_id, city, street, building, notes
- order: order_id, customer_id, order_type (enum: food/package/online), status, created_at, total_price
- delivery: delivery_id, order_id, driver_id, pickup_address_id (nullable — NULL for food/online), dropoff_address_id, delivery_status — NOTE: order_id is NOT unique; multiple rows per order exist (one per offer/decline cycle)
- package: package_id, order_id, description, weight, fragile
- online_order: online_order_id, order_id, store_name, product_link, notes
- food_order: food_order_id, order_id, restaurant_id, items_description
- restaurant: restaurant_id, name, address, phone, cuisine_type, delivery_fee (DECIMAL DEFAULT 0.00)
- admin: admin_id, name, email, password, role (enum: superadmin/staff)
- payment: payment_id, order_id, amount, payment_method, payment_status, points_used (INT DEFAULT 0)
- transaction: transaction_id, payment_id, transaction_date, transaction_status
- order_status: status_id, status_name
- order_status_history: history_id, order_id, status_id, timestamp
- notification: notification_id, customer_id, message, created_at, status (enum: read/unread)
- driver_rating: rating_id, driver_id, customer_id, rating, comment
- support_ticket: ticket_id, customer_id, order_id, issue_description, status (NO created_at column)

## Schema Changes vs Original DDL
Everything below was added or altered after the initial schema — apply these ALTER statements on any fresh DB before running the app.

### New columns on existing tables
```sql
-- Points balance for customers
ALTER TABLE customer ADD COLUMN points INT NOT NULL DEFAULT 0;

-- Driver login password + points balance
ALTER TABLE driver ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '123456';
ALTER TABLE driver ADD COLUMN points INT NOT NULL DEFAULT 0;

-- Track how many points a customer used on an order
ALTER TABLE payment ADD COLUMN points_used INT NOT NULL DEFAULT 0;
```

### Structural changes to existing tables
```sql
-- delivery.order_id: unique constraint REMOVED — multiple delivery rows per order
-- are allowed (one per offer/decline cycle, one accepted row at most)
ALTER TABLE delivery DROP INDEX order_id;  -- drop the UNIQUE constraint

-- delivery.pickup_address_id: made nullable — food and online orders have no
-- pickup address (driver collects from restaurant / fulfillment center)
ALTER TABLE delivery MODIFY pickup_address_id INT NULL;
ALTER TABLE delivery DROP FOREIGN KEY fk_delivery_pickup;
ALTER TABLE delivery ADD CONSTRAINT fk_delivery_pickup
    FOREIGN KEY (pickup_address_id) REFERENCES address(address_id)
    ON DELETE SET NULL;
```

### New tables (not in original DDL)
```sql
-- Restaurants for food orders
CREATE TABLE restaurant (
    restaurant_id  INT            PRIMARY KEY AUTO_INCREMENT,
    name           VARCHAR(150)   NOT NULL,
    address        VARCHAR(255)   NOT NULL,
    phone          VARCHAR(20)    NOT NULL,
    cuisine_type   VARCHAR(100),
    delivery_fee   DECIMAL(10,2)  NOT NULL DEFAULT 0.00
);

-- Food order sub-record (links order → restaurant)
CREATE TABLE food_order (
    food_order_id      INT   PRIMARY KEY AUTO_INCREMENT,
    order_id           INT   NOT NULL UNIQUE,
    restaurant_id      INT   NOT NULL,
    items_description  TEXT,
    CONSTRAINT fk_food_order_order
        FOREIGN KEY (order_id)      REFERENCES `order`(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_food_order_rest
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id) ON DELETE RESTRICT
);

-- Admin accounts
CREATE TABLE admin (
    admin_id  INT          PRIMARY KEY AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    email     VARCHAR(150) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    role      ENUM('superadmin', 'staff') NOT NULL DEFAULT 'staff'
);
```

## API Auth Endpoints
- POST /api/auth/login → { customer: { customer_id, name, phone, email } }
- POST /api/auth/register → { customer: { customer_id, name, phone, email } }
- POST /api/auth/driver/login { phone, password } → { driver: { driver_id, name, phone, status } }
- POST /api/auth/admin/login → { admin: { admin_id, name, email, role } }

## Auto-Assign Driver Logic (orders.py create_order)
- On order creation, if `dropoff_address_id` is provided, offer is sent to best available driver
- Query: pick driver with status='available', fewest active deliveries (NOT IN delivered/failed/declined), lowest driver_id as tiebreaker
- Creates delivery record with `delivery_status='offered'` and `pickup_address_id=NULL`
- Order stays `pending` until driver accepts — does NOT auto-set to 'assigned'
- Driver status is NOT auto-toggled by the system — drivers manage it themselves
- If no available driver, order stays 'pending' with no delivery record
- create_order validates required fields BEFORE any DB writes (returns 400 if missing):
  - food: restaurant_id + items_description required
  - package: description + weight required
  - online: store_name + product_link required
- create_order wraps all DB writes (order, status history, type sub-record, points deduction, payment, transaction, delivery offer) in a single `transaction()` — rolls back atomically on failure
- Points cap enforced server-side: points_to_use capped at min(customer_points, floor(total_price × 10)) before deducting

## Accept / Decline Flow (deliveries.py)
- `POST /deliveries/{id}/accept` → delivery: offered→pending, order→assigned, logs status history; also transfers payment.points_used to driver.points if customer used points on that order
- `POST /deliveries/{id}/decline` → delivery: offered→declined, then re-offer to next best available driver excluding all who already declined this order (same load-balance query)
- Re-offer creates a new delivery row for the next driver (multiple delivery rows per order are allowed)
- If all available drivers decline, order stays pending with no active offer

## Delivery Status Values (DB — must match exactly)
- offered, pending, picked_up, on_the_way, delivered, failed, declined
- `offered` = waiting for driver to accept; `declined` = driver rejected
- Changing delivery status to picked_up/on_the_way/delivered also syncs order status
- Driver status is never auto-toggled by deliveries — driver manages available/busy themselves

## get_order Delivery Query Note
- `GET /orders/{id}` fetches the delivery using `NOT IN ('declined','offered') ORDER BY delivery_id DESC LIMIT 1`
- This ensures the customer portal always sees the accepted/active delivery, not stale declined rows

## GET /orders (Admin) — Extra Fields
- Returns `customer_name`, `customer_phone`, and `driver_name` (subquery: active delivery driver, excludes declined/offered rows)

## GET /drivers — Extra Field
- Returns `total_deliveries` (count of delivered-status deliveries for each driver)

## GET /customers — Extra Field
- Returns `total_orders` (count of all orders for each customer via LEFT JOIN)

## GET /admin/stats — Fields
- `total_customers`, `total_drivers`, `total_orders`, `total_revenue` (all-time, 20% cut only)
- `orders_today`, `revenue_today` (20% cut only), `active_deliveries` (pending/picked_up/on_the_way), `available_drivers`, `open_tickets`

## PUT /orders/{id}/assign-driver
- Body: `{ driver_id: int }`
- Creates a new `offered` delivery row for the given driver (uses existing dropoff_address_id if available)
- Shown in AdminOrdersPage modal only for `pending` orders

## OrderDetailPage Pickup Text Logic
- food order: show `food_order.restaurant_name`
- online order: show `'ElyasX Fulfillment Center'` (hardcoded placeholder)
- package order with address: show `pickup_city, pickup_street[, pickup_building]`
- fallback: `'Pending assignment'`

## TopHeader Avatar
- No image — orange circle showing `localStorage.getItem('userName').charAt(0).toUpperCase()`

## notification table note
- notification.message is the body field (NOT message.desc or message.description)
- notification.status is enum('read','unread') not boolean

## Rating System
- `driver_rating` table: rating_id, driver_id, customer_id, rating (1-5), comment
- `POST /api/ratings` — body: { driver_id, customer_id, rating, comment? }
- `GET /api/ratings/driver/{id}` — returns { summary: { avg_rating, total }, ratings: [...with customer_name] }
- `GET /api/ratings/check/{driver_id}/{customer_id}` — returns { rated: bool, rating: obj | null }
- Customer portal (OrderDetailPage): rating section appears in sidebar after order is delivered + driver assigned; checks for existing rating; star UI with comment; submits once
- Driver portal (DriverDashboardPage): shows avg_rating in stats card if rated; DriverDeliveriesPage: shows real avg_rating from API (replaces hardcoded value)
- Admin portal (AdminDriversPage): loads full ratings list when opening driver modal

## Driver Payment Settlement
- Company takes 20% of every cash order the driver handles
- `GET /drivers/{id}/pending-payments` — returns { payments: [...], total_collected, company_share (20%), count }
  - Finds pending payments for orders where driver has an accepted (non-declined/non-offered) delivery row
  - No order status restriction — admin can settle at any time regardless of delivery state
  - MySQL DECIMAL amounts converted via float() before arithmetic to avoid TypeError
- `POST /drivers/{id}/settle-payments` — body: { action: 'completed' | 'failed' }
  - Bulk-updates all matching pending payments in one UPDATE...WHERE IN query
- Admin portal (AdminDriversPage): driver modal shows Cash Payment Settlement section with 3 summary cards (Orders, Collected, Owed 20%) and two action buttons; fetched in parallel with ratings via Promise.all
- total_revenue and revenue_today in /admin/stats also show the 20% cut, not the full order amount

## Build & Lint Status
- `npm run build` — passes clean (0 TypeScript errors)
- `npm run lint` — passes clean (0 errors, 0 warnings)
- ESLint pattern for Axios errors: `catch (err) { isAxiosError(err) ? err.response?.data?.detail : 'fallback' }` — import `{ isAxiosError } from 'axios'`
- Hook dependency warnings suppressed with `// eslint-disable-next-line react-hooks/exhaustive-deps` placed on the line BEFORE the closing `}, [])` (not before the `useEffect` declaration line)

## Known Scaling Limitations (not yet addressed)
- No pagination on any page or backend endpoint — all rows loaded at once
- 5-second polls fetch the full dataset every tick (OrdersPage, DashboardPage, DriverDashboard)
- NotificationsPage mark-all-read fires N parallel requests instead of a single batch endpoint
- GET /orders uses a correlated subquery per row to get driver_name (should be a JOIN at scale)
- No virtual scrolling on any table

## Rules
- Never modify existing customer or driver portal files unless asked
- Keep all styling consistent with brand colors
- Admin portal goes in src/pages/admin/
- Backend goes in a separate backend/ directory at the project root
- Always use src="/logo.png" for logo (never /src/assets/)
