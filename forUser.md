# ElyasX Frontend — Full Documentation

This document explains every file, function, and concept in the frontend of the ElyasX app in plain language. You did not write any of this code yourself, so this document is written assuming you're reading the code for the first time and want to understand exactly what everything does and why.

---

## How the App Works — The Big Picture

The app has three separate portals that share the same codebase:

- **Customer portal** — people who place delivery orders
- **Driver portal** — delivery drivers who accept and complete orders
- **Admin portal** — you (or your team) managing everything

All three talk to the same backend server (FastAPI, running on your computer at port 8000). The frontend (React, running at port 5173) sends HTTP requests to the backend, the backend queries the MySQL database, and the results come back to be displayed on screen.

**The technology stack:**
- **React** — a JavaScript library that lets you build interactive UIs out of components (reusable building blocks)
- **TypeScript** — JavaScript with types, so the code knows what shape the data should be (e.g. "this variable is a number, not a string")
- **Tailwind CSS** — a system for writing styles directly in the HTML using class names like `bg-orange-500` or `rounded-xl`
- **Vite** — the tool that compiles and serves the frontend code
- **Axios** — a library that makes HTTP requests (like `fetch` but with more features)
- **React Router** — the library that handles navigation between pages without reloading the browser

---

## How "State" Works in React

This is fundamental to understanding every page. React components use **state** — variables that, when changed, cause the screen to re-render (update). You declare state with `useState`:

```typescript
const [orders, setOrders] = useState([])
```

This creates:
- `orders` — the current value (starts as `[]`)
- `setOrders` — a function to update it

Every time `setOrders(newData)` is called, React re-draws the part of the screen that uses `orders`.

**`useEffect`** is a hook that runs code when the component first appears on screen (or when certain values change). It's used to load data from the API when a page opens:

```typescript
useEffect(() => {
  getCustomerOrders(customerId).then(res => setOrders(res.data))
}, [])  // empty [] means "run once when the page loads"
```

---

## How the API Layer Works

All backend communication goes through files in `src/api/`. These are thin wrappers that just construct HTTP requests — they don't contain any logic, they just call the backend and return the result.

### How `database.py` Works (Backend)

The backend never uses an ORM. All database access goes through three helpers defined in `backend/database.py`:

```python
query(sql, params=(), fetch="all")
```
Used for **SELECT** statements. `fetch="all"` (the default) returns a list of dicts. `fetch="one"` returns a single dict or `None`. Opens and closes its own connection on every call.

```python
execute(sql, params=())
```
Used for **INSERT / UPDATE / DELETE**. Auto-commits and returns `lastrowid` — useful after an INSERT to get the new row's ID without a second query.

```python
with transaction() as cur:
    cur.execute(...)
    cur.execute(...)
```
A context manager for **multi-step writes that must be atomic**. Opens one connection, yields a cursor, commits on success, and rolls back everything if any exception is raised. Used in `create_order` so that if anything fails mid-way (e.g. inserting the payment), the order row and everything else created before it are also rolled back automatically.

---

### `src/api/axios.ts` — The Base HTTP Client

```typescript
const api = axios.create({ baseURL: 'http://localhost:8000/api' })
api.interceptors.request.use((config) => {
  const customerId = localStorage.getItem('customer_id')
  if (customerId) config.headers['customer_id'] = customerId
  return config
})
```

This creates a shared Axios instance that:
1. Knows the backend address (`http://localhost:8000/api`) so you never have to repeat it
2. Automatically attaches the customer's ID to every request header so the backend knows who is asking

Every other API file imports this `api` object instead of creating their own.

**localStorage** is the browser's built-in key-value storage. It persists across page refreshes. This app uses it to remember who is logged in (customer ID, driver ID, admin flag, etc.).

---

### `src/api/auth.ts` — Login and Registration

| Function | What it does |
|---|---|
| `login(email, password)` | Posts email + password to `/auth/login`. Returns the customer's info (id, name, phone, email). |
| `register(name, phone, email, password)` | Creates a new customer account. Returns the same shape as login. |
| `driverLogin(phone, password)` | Drivers log in with phone + password (not email). Returns driver info. |
| `adminLogin(email, password)` | Admin login. Uses hardcoded credentials on the backend (admin@elyasx.com / admin123). |

**Backend queries:**

`login` — one query, checks both email and password match in the same lookup. Password is stripped before returning.
```sql
SELECT * FROM customer WHERE email = %s AND password = %s
```

`register` — three steps:
```sql
-- 1. Check if email is already taken
SELECT customer_id FROM customer WHERE email = %s

-- 2. Insert the new customer
INSERT INTO customer (name, phone, email, password) VALUES (%s, %s, %s, %s)

-- 3. Fetch and return the new row (password stripped before returning)
SELECT * FROM customer WHERE customer_id = %s
```

`driverLogin` — one query. Note it selects specific columns (no password returned):
```sql
SELECT driver_id, name, phone, status FROM driver WHERE phone = %s AND password = %s
```

`adminLogin` — one query against the admin table:
```sql
SELECT admin_id, name, email, role FROM admin WHERE email = %s AND password = %s
```

---

### `src/api/orders.ts` — Customer Orders

| Function | What it does |
|---|---|
| `getCustomerOrders(customerId)` | Gets all orders for a specific customer. Used on the Orders page and Dashboard. |
| `getOrderById(id)` | Gets full detail for one order including delivery info, payment, food/package/online sub-record. |
| `createOrder(data)` | Creates a new order. The data object contains the order type, price, and type-specific fields. |

**Backend queries:**

`getCustomerOrders` — two queries:
```sql
-- 1. Verify the customer exists
SELECT customer_id FROM customer WHERE customer_id = %s

-- 2. Get all their orders, newest first
SELECT * FROM `order` WHERE customer_id = %s ORDER BY created_at DESC
```

`getOrderById` — seven separate queries that build up the full order object:
```sql
-- 1. Base order + customer name/phone
SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
FROM `order` o
JOIN customer c ON o.customer_id = c.customer_id
WHERE o.order_id = %s

-- 2. Active delivery (excludes declined and offered rows; takes the most recent accepted one)
SELECT d.*, dr.name AS driver_name, dr.phone AS driver_phone,
       pa.city AS pickup_city, pa.street AS pickup_street, pa.building AS pickup_building,
       da.city AS dropoff_city, da.street AS dropoff_street, da.building AS dropoff_building
FROM delivery d
LEFT JOIN driver dr ON d.driver_id = dr.driver_id
LEFT JOIN address pa ON d.pickup_address_id = pa.address_id
LEFT JOIN address da ON d.dropoff_address_id = da.address_id
WHERE d.order_id = %s
  AND d.delivery_status NOT IN ('declined', 'offered')
ORDER BY d.delivery_id DESC
LIMIT 1

-- 3. Payment record
SELECT * FROM payment WHERE order_id = %s

-- 4. Package sub-record (NULL if not a package order)
SELECT * FROM package WHERE order_id = %s

-- 5. Online order sub-record (NULL if not an online order)
SELECT * FROM online_order WHERE order_id = %s

-- 6. Food order sub-record with restaurant name (NULL if not a food order)
SELECT fo.*, r.name AS restaurant_name
FROM food_order fo
JOIN restaurant r ON fo.restaurant_id = r.restaurant_id
WHERE fo.order_id = %s

-- 7. Full status history, newest first
SELECT h.*, s.status_name
FROM order_status_history h
JOIN order_status s ON h.status_id = s.status_id
WHERE h.order_id = %s
ORDER BY h.timestamp DESC
```

`createOrder` — runs inside a single `transaction()` so all steps succeed or all roll back. The steps in order:

```sql
-- 1. Validate customer exists and get their current points balance
SELECT customer_id, points FROM customer WHERE customer_id = %s

-- 2. Insert the order row (status always starts as 'pending')
INSERT INTO `order` (customer_id, order_type, total_price, status)
VALUES (%s, %s, %s, 'pending')

-- 3. Look up the status_id for 'pending' (the order_status table maps names to IDs)
SELECT status_id FROM order_status WHERE status_name = 'pending'

-- 4. Log the initial status in history
INSERT INTO order_status_history (order_id, status_id) VALUES (%s, %s)

-- 5a. For food orders:
INSERT INTO food_order (order_id, restaurant_id, items_description) VALUES (%s, %s, %s)

-- 5b. For package orders:
INSERT INTO package (order_id, description, weight, fragile) VALUES (%s, %s, %s, %s)

-- 5c. For online orders:
INSERT INTO online_order (order_id, store_name, product_link, notes) VALUES (%s, %s, %s, %s)

-- 6. If customer used points: deduct from their balance
--    (server-side cap: points_to_use is capped at min(customer_points, floor(total_price × 10)))
UPDATE customer SET points = points - %s WHERE customer_id = %s

-- 7. Create the payment record (status starts as 'pending')
INSERT INTO payment (order_id, amount, payment_method, payment_status, points_used)
VALUES (%s, %s, %s, 'pending', %s)

-- 8. Create the transaction record
INSERT INTO transaction (payment_id, transaction_status) VALUES (%s, 'pending')

-- 9. If a dropoff address was provided: find the best available driver
--    (fewest active deliveries, lowest driver_id as tiebreaker)
SELECT d.driver_id, COUNT(del.delivery_id) AS active_count
FROM driver d
LEFT JOIN delivery del ON d.driver_id = del.driver_id
  AND del.delivery_status NOT IN ('delivered', 'failed', 'declined')
WHERE d.status = 'available'
GROUP BY d.driver_id
ORDER BY active_count ASC, d.driver_id ASC
LIMIT 1

-- 10. If a driver was found: create the delivery offer (status = 'offered')
INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
VALUES (%s, %s, NULL, %s, 'offered')
```

The `total_price` stored is the post-discount price (after points are applied). If no driver is available, no delivery row is created and the order stays `pending`.

---

### `src/api/addresses.ts` — Saved Addresses

| Function | What it does |
|---|---|
| `getAddresses(customerId)` | Gets all saved delivery addresses for a customer. |
| `addAddress(data)` | Saves a new address (city, street, building, notes). |
| `deleteAddress(id)` | Deletes an address by its ID. |

**Backend queries:**

`getAddresses` — two queries:
```sql
-- 1. Verify customer exists
SELECT customer_id FROM customer WHERE customer_id = %s

-- 2. Get all their addresses
SELECT * FROM address WHERE customer_id = %s
```

`addAddress` — three queries:
```sql
-- 1. Verify customer exists
SELECT customer_id FROM customer WHERE customer_id = %s

-- 2. Insert the new address
INSERT INTO address (customer_id, city, street, building, notes)
VALUES (%s, %s, %s, %s, %s)

-- 3. Fetch and return the new address row
SELECT * FROM address WHERE address_id = %s
```

`deleteAddress` — two queries:
```sql
-- 1. Verify address exists
SELECT address_id FROM address WHERE address_id = %s

-- 2. Delete it
DELETE FROM address WHERE address_id = %s
```

---

### `src/api/notifications.ts` — Notifications

| Function | What it does |
|---|---|
| `getNotifications(customerId)` | Gets all notifications for a customer (read and unread). |
| `markAsRead(id)` | Marks one notification as read. |

**Backend queries:**

`getNotifications` — two queries:
```sql
-- 1. Verify customer exists
SELECT customer_id FROM customer WHERE customer_id = %s

-- 2. Get all their notifications, newest first
SELECT * FROM notification WHERE customer_id = %s ORDER BY created_at DESC
```

`markAsRead` — three queries:
```sql
-- 1. Verify notification exists
SELECT notification_id FROM notification WHERE notification_id = %s

-- 2. Mark it as read (status column is enum: 'read' / 'unread')
UPDATE notification SET status = 'read' WHERE notification_id = %s

-- 3. Fetch and return the updated row
SELECT * FROM notification WHERE notification_id = %s
```

---

### `src/api/support.ts` — Support Tickets

| Function | What it does |
|---|---|
| `getTickets(customerId)` | Gets all support tickets submitted by a customer. |
| `createTicket(data)` | Submits a new support ticket with an issue description. |

**Backend queries:**

`getTickets` (customer portal) — two queries:
```sql
-- 1. Verify customer exists
SELECT customer_id FROM customer WHERE customer_id = %s

-- 2. Get their tickets, newest first
SELECT * FROM support_ticket WHERE customer_id = %s ORDER BY ticket_id DESC
```

`getTickets` (admin portal — called via `getAllTickets()` in admin.ts) — one query with a JOIN to get the customer name:
```sql
SELECT t.*, c.name AS customer_name
FROM support_ticket t
JOIN customer c ON t.customer_id = c.customer_id
ORDER BY t.ticket_id DESC
```

`createTicket` — up to four queries:
```sql
-- 1. Verify customer exists
SELECT customer_id FROM customer WHERE customer_id = %s

-- 2. If order_id was provided, verify that order exists
SELECT order_id FROM `order` WHERE order_id = %s

-- 3. Insert the ticket (status always starts as 'open')
INSERT INTO support_ticket (customer_id, order_id, issue_description, status)
VALUES (%s, %s, %s, 'open')

-- 4. Fetch and return the new ticket row
SELECT * FROM support_ticket WHERE ticket_id = %s
```

`updateTicketStatus` (admin only, via `updateTicketStatus()` in admin.ts) — three queries:
```sql
-- 1. Verify ticket exists
SELECT ticket_id FROM support_ticket WHERE ticket_id = %s

-- 2. Update the status
UPDATE support_ticket SET status = %s WHERE ticket_id = %s

-- 3. Fetch and return the updated row
SELECT * FROM support_ticket WHERE ticket_id = %s
```

---

### `src/api/drivers.ts` — Driver Operations

| Function | What it does |
|---|---|
| `getDriver(driverId)` | Gets a single driver's info including their average rating. |
| `getDriverDeliveries(driverId)` | Gets all deliveries assigned to a driver (all statuses). |
| `updateDeliveryStatus(id, status)` | Changes a delivery's status (e.g. pending → picked_up → delivered). Also updates the order status automatically on the backend. |
| `updateDriverStatus(id, status)` | Toggles the driver between "available" and "busy". |
| `acceptDelivery(id)` | Driver accepts an offered delivery. Changes status from offered → pending and order to assigned. |
| `declineDelivery(id)` | Driver declines. The backend then offers it to the next best available driver. |

**Backend queries:**

`getDriver` — one query that computes the average rating in the same SELECT using a LEFT JOIN (so it returns NULL rather than error if unrated):
```sql
SELECT d.driver_id, d.name, d.phone, d.status, d.points,
       ROUND(AVG(r.rating), 1) AS avg_rating,
       COUNT(r.rating_id) AS total_ratings
FROM driver d
LEFT JOIN driver_rating r ON d.driver_id = r.driver_id
WHERE d.driver_id = %s
GROUP BY d.driver_id
```

`getDriverDeliveries` — two queries:
```sql
-- 1. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 2. Get all their deliveries with full address and customer detail
SELECT d.*,
       o.order_type, o.total_price, o.status AS order_status, o.created_at,
       c.name AS customer_name, c.phone AS customer_phone,
       pa.city AS pickup_city, pa.street AS pickup_street, pa.building AS pickup_building,
       da.city AS dropoff_city, da.street AS dropoff_street, da.building AS dropoff_building
FROM delivery d
JOIN `order` o ON d.order_id = o.order_id
JOIN customer c ON o.customer_id = c.customer_id
LEFT JOIN address pa ON d.pickup_address_id = pa.address_id
LEFT JOIN address da ON d.dropoff_address_id = da.address_id
WHERE d.driver_id = %s
ORDER BY d.delivery_id DESC
```

`updateDeliveryStatus` — two or three queries. The second UPDATE only runs for statuses that have a matching order status (`picked_up`, `on_the_way`, `delivered`):
```sql
-- 1. Verify delivery exists and get its order_id
SELECT * FROM delivery WHERE delivery_id = %s

-- 2. Update the delivery status
UPDATE delivery SET delivery_status = %s WHERE delivery_id = %s

-- 3. Sync the parent order's status (only for picked_up / on_the_way / delivered)
UPDATE `order` SET status = %s WHERE order_id = %s
```

`updateDriverStatus` — three queries:
```sql
-- 1. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 2. Update status
UPDATE driver SET status = %s WHERE driver_id = %s

-- 3. Fetch and return the updated row
SELECT driver_id, name, phone, status FROM driver WHERE driver_id = %s
```

`acceptDelivery` — up to five queries:
```sql
-- 1. Fetch the delivery row (need order_id and driver_id)
SELECT * FROM delivery WHERE delivery_id = %s

-- 2. Move delivery from offered → pending
UPDATE delivery SET delivery_status = 'pending' WHERE delivery_id = %s

-- 3. Move order to assigned
UPDATE `order` SET status = 'assigned' WHERE order_id = %s

-- 4. Look up status_id for 'assigned' and log it
SELECT status_id FROM order_status WHERE status_name = 'assigned'
INSERT INTO order_status_history (order_id, status_id) VALUES (%s, %s)

-- 5. Check if the customer used points on this order
SELECT points_used FROM payment WHERE order_id = %s

-- 6. If points_used > 0: transfer those points to the driver
UPDATE driver SET points = points + %s WHERE driver_id = %s
```

`declineDelivery` — three to four queries plus an optional INSERT:
```sql
-- 1. Fetch the delivery row
SELECT * FROM delivery WHERE delivery_id = %s

-- 2. Mark this delivery as declined
UPDATE delivery SET delivery_status = 'declined' WHERE delivery_id = %s

-- 3. Find the next best available driver, skipping anyone who already declined
--    or has an active offer for this same order
SELECT d.driver_id, COUNT(del.delivery_id) AS active_count
FROM driver d
LEFT JOIN delivery del ON d.driver_id = del.driver_id
  AND del.delivery_status NOT IN ('delivered', 'failed', 'declined')
WHERE d.status = 'available'
  AND d.driver_id NOT IN (
    SELECT driver_id FROM delivery
    WHERE order_id = %s AND delivery_status IN ('declined', 'offered')
  )
GROUP BY d.driver_id
ORDER BY active_count ASC, d.driver_id ASC
LIMIT 1

-- 4. If a next driver was found: create a new 'offered' delivery row for them
--    (the order can have multiple delivery rows — one per offer/decline cycle)
INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
VALUES (%s, %s, NULL, %s, 'offered')
```

If no driver is found, the order stays `pending` with no active offer.

---

### `src/api/ratings.ts` — Driver Ratings

| Function | What it does |
|---|---|
| `submitRating(driverId, customerId, rating, comment?)` | Customer submits a 1–5 star rating for a driver after delivery. |
| `checkRating(driverId, customerId)` | Checks if this customer has already rated this driver. Returns `{ rated: true/false, rating: obj }`. |
| `getDriverRatings(driverId)` | Gets all ratings for a driver, including each reviewer's name. Used by admin. |

**Backend queries:**

`submitRating` — three queries:
```sql
-- 1. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 2. Insert the rating (rating must be 1–5, validated before this)
INSERT INTO driver_rating (driver_id, customer_id, rating, comment)
VALUES (%s, %s, %s, %s)

-- 3. Fetch and return the new rating row
SELECT * FROM driver_rating WHERE rating_id = %s
```

`checkRating` — one query. Returns the most recent rating if any:
```sql
SELECT * FROM driver_rating
WHERE driver_id = %s AND customer_id = %s
ORDER BY rating_id DESC
LIMIT 1
```
The response is `{ rated: true, rating: {...} }` if a row is found, or `{ rated: false, rating: null }` if not.

`getDriverRatings` — three queries:
```sql
-- 1. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 2. Get all individual ratings with customer names (LEFT JOIN so anonymous ratings show too)
SELECT r.*, c.name AS customer_name
FROM driver_rating r
LEFT JOIN customer c ON r.customer_id = c.customer_id
WHERE r.driver_id = %s
ORDER BY r.rating_id DESC

-- 3. Get the aggregate summary
SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total
FROM driver_rating
WHERE driver_id = %s
```

---

### `src/api/admin.ts` — Admin Operations

| Function | What it does |
|---|---|
| `getAdminStats()` | Gets the dashboard numbers: total orders, revenue (20% cut), available drivers, etc. |
| `getAllOrders()` | Gets every order in the system with customer name, phone, and assigned driver name. |
| `getAllPayments()` | Gets every payment record with customer name, order type, and order status. |
| `getAllTickets()` | Gets all support tickets with the customer's name. |
| `getAllDrivers()` | Gets all drivers with their avg rating, total ratings, and total deliveries. |
| `getAllCustomers()` | Gets all customers with their total order count. |
| `getCustomerById(id)` | Gets full detail for one customer including their addresses and order history. |
| `assignDriver(orderId, driverId)` | Admin manually offers an order to a specific driver. |
| `updateTicketStatus(ticketId, status)` | Admin changes a ticket's status to in_progress or resolved. |
| `getDriverPendingPayments(driverId)` | Gets all pending cash payments for a driver's accepted orders, plus totals and 20% company share. |
| `settleDriverPayments(driverId, action)` | Bulk-marks all of a driver's pending payments as either "completed" (paid) or "failed" (late). |

**Backend queries:**

`getAdminStats` — nine separate queries, each a single COUNT or SUM. All revenue figures multiply by 0.20 in Python before returning (the backend stores full amounts, the 20% cut is computed at read time):
```sql
SELECT COUNT(*) AS count FROM customer
SELECT COUNT(*) AS count FROM driver
SELECT COUNT(*) AS count FROM `order`

-- Total all-time revenue (20% of completed payments only)
SELECT SUM(amount) AS total FROM payment WHERE payment_status = 'completed'

-- Orders created today
SELECT COUNT(*) AS count FROM `order` WHERE DATE(created_at) = CURDATE()

-- Revenue today (20% of completed payments on today's orders)
SELECT SUM(p.amount) AS total FROM payment p
JOIN `order` o ON p.order_id = o.order_id
WHERE p.payment_status = 'completed' AND DATE(o.created_at) = CURDATE()

-- Active deliveries (accepted but not finished)
SELECT COUNT(*) AS count FROM delivery
WHERE delivery_status NOT IN ('delivered', 'failed', 'declined', 'offered')

SELECT COUNT(*) AS count FROM driver WHERE status = 'available'
SELECT COUNT(*) AS count FROM support_ticket WHERE status = 'open'
```

`getAllOrders` — one query. The driver name is fetched via a correlated subquery per row (picks the accepted delivery, ignoring declined/offered rows):
```sql
SELECT o.*, c.name AS customer_name, c.phone AS customer_phone,
       (SELECT dr.name FROM delivery del
        JOIN driver dr ON del.driver_id = dr.driver_id
        WHERE del.order_id = o.order_id
          AND del.delivery_status NOT IN ('declined', 'offered')
        ORDER BY del.delivery_id DESC LIMIT 1) AS driver_name
FROM `order` o
JOIN customer c ON o.customer_id = c.customer_id
ORDER BY o.created_at DESC
```

`getAllPayments` — one query:
```sql
SELECT p.*, o.order_type, o.status AS order_status,
       c.name AS customer_name
FROM payment p
JOIN `order` o ON p.order_id = o.order_id
JOIN customer c ON o.customer_id = c.customer_id
ORDER BY p.payment_id DESC
```

`getAllTickets` — one query (same as admin support page uses):
```sql
SELECT t.*, c.name AS customer_name
FROM support_ticket t
JOIN customer c ON t.customer_id = c.customer_id
ORDER BY t.ticket_id DESC
```

`getAllDrivers` — one query. Uses a LEFT JOIN for ratings (so unrated drivers still appear) and a correlated subquery for total completed deliveries:
```sql
SELECT d.driver_id, d.name, d.phone, d.status, d.points,
       ROUND(AVG(r.rating), 1) AS avg_rating,
       COUNT(DISTINCT r.rating_id) AS total_ratings,
       (SELECT COUNT(*) FROM delivery del
        WHERE del.driver_id = d.driver_id
          AND del.delivery_status = 'delivered') AS total_deliveries
FROM driver d
LEFT JOIN driver_rating r ON d.driver_id = r.driver_id
GROUP BY d.driver_id
ORDER BY d.driver_id
```

`getAllCustomers` — one query. LEFT JOIN so customers with zero orders still appear:
```sql
SELECT c.customer_id, c.name, c.phone, c.email, c.points,
       COUNT(o.order_id) AS total_orders
FROM customer c
LEFT JOIN `order` o ON c.customer_id = o.customer_id
GROUP BY c.customer_id
ORDER BY c.customer_id
```

`getCustomerById` — three queries (builds a nested object):
```sql
-- 1. Customer detail
SELECT customer_id, name, phone, email, points FROM customer WHERE customer_id = %s

-- 2. Their saved addresses
SELECT * FROM address WHERE customer_id = %s

-- 3. Their order history
SELECT * FROM `order` WHERE customer_id = %s ORDER BY created_at DESC
```

`assignDriver` — four queries:
```sql
-- 1. Verify order exists
SELECT order_id FROM `order` WHERE order_id = %s

-- 2. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 3. Get the dropoff_address_id from the most recent delivery row (if any)
SELECT dropoff_address_id FROM delivery
WHERE order_id = %s ORDER BY delivery_id DESC LIMIT 1

-- 4. Create a new 'offered' delivery row for this driver
INSERT INTO delivery (order_id, driver_id, pickup_address_id, dropoff_address_id, delivery_status)
VALUES (%s, %s, NULL, %s, 'offered')
```

`getDriverPendingPayments` — two queries. The subquery finds orders where this driver has an accepted (non-declined, non-offered) delivery row:
```sql
-- 1. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 2. Get all pending payments for their accepted orders
SELECT p.payment_id, p.order_id, p.amount, p.payment_method, p.payment_status,
       o.order_type, o.created_at
FROM payment p
JOIN `order` o ON p.order_id = o.order_id
WHERE p.payment_status = 'pending'
  AND o.order_id IN (
    SELECT DISTINCT order_id FROM delivery
    WHERE driver_id = %s AND delivery_status NOT IN ('declined', 'offered')
  )
ORDER BY o.created_at ASC
```
The 20% `company_share` is calculated in Python: `sum(amounts) * 0.20`. The DB stores full amounts.

`settleDriverPayments` — three queries. The bulk UPDATE uses a dynamic `IN (...)` clause built in Python:
```sql
-- 1. Verify driver exists
SELECT driver_id FROM driver WHERE driver_id = %s

-- 2. Collect the payment IDs to update (same subquery as above)
SELECT p.payment_id FROM payment p
JOIN `order` o ON p.order_id = o.order_id
WHERE p.payment_status = 'pending'
  AND o.order_id IN (
    SELECT DISTINCT order_id FROM delivery
    WHERE driver_id = %s AND delivery_status NOT IN ('declined', 'offered')
  )

-- 3. Bulk update all of them in one statement
--    action is either 'completed' (paid) or 'failed' (late/missed)
UPDATE payment SET payment_status = %s WHERE payment_id IN (%s, %s, ...)
```

---

## How Routing Works

The app uses React Router. Each URL maps to a component. The mapping is defined in `src/App.tsx`. When you navigate to `/orders`, React Router shows the `OrdersPage` component without reloading the browser.

There are also **protected routes** — wrappers that check localStorage before showing a page. If the check fails, you're redirected to the appropriate login page. For example, `AdminProtectedRoute` checks `localStorage.getItem('adminLoggedIn') === 'true'` before allowing access to any `/admin/...` page.

---

## Layouts

Layouts are wrapper components that provide the shell (sidebar, header) around every page. The page content is rendered inside the layout.

- **`MainLayout`** — used by the customer portal. Has the left sidebar (`SideNavBar`) and top header (`TopHeader`).
- **`DriverLayout`** — used by the driver portal. Has `DriverSidebar` and `DriverHeader`.
- **`AdminLayout`** — used by the admin portal. Has `AdminSidebar` and `AdminHeader`.
- **`AuthLayout`** — used by all three login pages. Has no sidebar, just a centered card.

---

## Customer Portal Pages

### `LoginPage` (`/login`)

**What it does:** The combined login/register page for customers.

**State variables:**
- `activeForm` — which tab is shown: `'login'` or `'register'`
- `visible` — controls a fade animation when switching tabs
- Login fields: `loginEmail`, `loginPassword`, `loginError`, `loginLoading`
- Register fields: `regName`, `regPhone`, `regEmail`, `regPassword`, `regConfirm`, `regError`, `regLoading`

**Functions:**
- `switchTab(tab)` — switches between the Login and Register forms with a 150ms fade-out/fade-in animation. Clears any existing error messages.
- `handleLogin(e)` — called when the login form is submitted. Calls `login(email, password)`. On success, saves `isLoggedIn`, `userName`, `customer_id`, `userEmail`, `userPhone` to localStorage, then navigates to `/`. On failure, shows the error message from the backend.
- `handleRegister(e)` — called when the register form is submitted. First checks that passwords match (client-side). Then calls `register(...)`. On success, does the same localStorage saves as login and navigates to `/`.

**`SocialButtons` component (inside this file):** A helper sub-component that renders the "Or continue with" divider and Google/Apple buttons. These buttons are currently non-functional (no backend connection). The `from` prop controls the animation stagger delay.

**`s(i)` helper function:** Returns a CSS animation style with a staggered delay based on index `i`. This creates the "fields slide up one by one" entrance animation.

---

### `DashboardPage` (`/`)

**What it does:** The customer home screen. Shows an active order banner if there's an in-progress order, three service cards to start a new order, a table of the 3 most recent orders, and quick stats.

**State variables:**
- `orders` — all orders for this customer
- `loading`, `error`

**Data loading:** Fetches all customer orders on mount. Polls every 5 seconds to catch live status changes (e.g. driver starts moving).

**Key logic:**
- `activeOrder` — finds the first order with status `assigned`, `picked_up`, or `on_the_way`. If one exists, shows the orange banner at the top with a "Track Order" button.
- `recentOrders` — takes only `orders.slice(0, 3)` for the table (most recent 3).

**The 5-second poll:** `setInterval` runs `getCustomerOrders` every 5000ms. The `return () => clearInterval(interval)` at the end of `useEffect` stops the timer when you navigate away from the page (cleanup function).

---

### `OrdersPage` (`/orders`)

**What it does:** Shows a full table of all the customer's orders. Clicking "View" navigates to that order's detail page.

**State variables:**
- `orders`, `loading`, `error`

**Data loading:** Same as DashboardPage — fetches all orders and polls every 5 seconds.

**No filtering or search** — all orders are shown in the table, newest first (the backend returns them in that order).

---

### `OrderDetailPage` (`/orders/:id`)

**What it does:** The most complex customer page. Shows full order details: a visual progress tracker, type-specific info (food/package/online), pickup and dropoff addresses, a map placeholder image, a driver card with a call button, payment summary, and (after delivery) a rating section.

**State variables:**
- `order` — the full order object including nested delivery, payment, food/package/online sub-records
- `loading`, `error`
- `selectedRating`, `hoveredStar` — for the interactive star rating UI
- `ratingComment` — the text comment
- `existingRating` — if the customer already rated this driver, stores their previous rating
- `ratingChecked` — becomes true once the rating check API call completes (prevents showing the form before we know)
- `submittingRating`
- `ratingFetchedRef` — a `useRef` (not state) used as a flag to ensure the rating check API is only called once even though the order polls every 5 seconds

**Data loading:** Fetches the order on mount and polls every 5 seconds for live status updates.

**Rating check logic:**
```typescript
useEffect(() => {
  if (ratingFetchedRef.current) return   // already ran once, stop
  if (order?.status !== 'delivered') return  // only check after delivered
  if (!driverId || !customerId) return
  ratingFetchedRef.current = true  // mark as done so polling doesn't re-run it
  checkRating(driverId, customerId).then(...)
}, [order?.status, order?.delivery?.driver_id])
```
Without the `useRef` guard, the 5-second poll would call `checkRating` over and over.

**`handleSubmitRating()`** — Calls `submitRating(...)`. On success, sets `existingRating` locally so the form switches to the "You gave X stars" view without refetching.

**Progress tracker:** `STATUS_STEPS` is an array of the 5 order statuses in order. The current step index is found with `STATUS_STEPS.indexOf(order.status)`. The progress bar width is calculated as a percentage.

**Pickup text logic:**
- Food order → shows the restaurant name
- Online order → shows "ElyasX Fulfillment Center" (hardcoded)
- Package with address → shows the pickup city and street
- Fallback → "Pending assignment"

---

### `NewOrderStep1Page` (`/new-order`)

**What it does:** Step 1 of 3 for placing a new order. Shows three big cards: Food Delivery, Package Shipping, Online Order.

**`handleSelect(type)`** — saves the chosen type (`'food'`, `'package'`, or `'online'`) to `sessionStorage` under the key `newOrderType`, clears any leftover details from a previous attempt, then navigates to `/new-order-details`.

**sessionStorage vs localStorage:** `sessionStorage` is like localStorage but is cleared when the browser tab is closed. It's used here because order-in-progress data is temporary.

---

### `NewOrderStep2Page` (`/new-order-details`)

**What it does:** Step 2 — fills in the order details and picks a dropoff address. The fields shown depend on the order type saved in Step 1.

**State variables:** A full set of form fields for each order type (food: restaurant + items description; package: description + weight + fragile checkbox; online: store name + product link + notes), plus `dropoffAddressId`, `addresses`, `restaurants`, `loading`.

**Data loading:** Always fetches the customer's saved addresses. If the order type is food, also fetches the list of restaurants from the backend. This all happens in parallel with `Promise.all`.

**`handleNext(e)`** — Validates the form, builds a `details` object with all the filled-in fields plus `total_price` (hardcoded at $10) and `dropoff_address_id`, saves it to `sessionStorage` as JSON under `newOrderDetails`, then navigates to `/payment`.

**Address validation:** If the customer has no saved addresses, the submit button is disabled and a message with a link to `/addresses` is shown instead of the dropdown.

---

### `NewOrderStep3Page` (`/payment`)

**What it does:** Step 3 — payment method selection and final order submission. Currently only Cash on Delivery is active; Pay with Card is displayed but greyed out and non-clickable ("Coming soon").

**Data:** Reads `newOrderType` and `newOrderDetails` from sessionStorage. These were saved in Steps 1 and 2.

**`handlePlaceOrder()`** — Calls `createOrder(...)` with the customer ID, order type, `payment_method: 'cash'`, and all the details from Step 2 spread into the object. On success, clears sessionStorage and navigates to the new order's detail page (`/orders/:id`). If it fails, shows an error and lets the user try again.

---

### `AddressesPage` (`/addresses`)

**What it does:** Shows all saved delivery addresses as cards. Has an "Add New" button that opens a modal form.

**State variables:**
- `addresses`, `loading`, `error`
- `showModal` — controls modal visibility
- Form fields: `city`, `street`, `building`, `notes`
- `saving`, `formError`

**Functions:**
- `fetchAddresses()` — calls `getAddresses` and updates state. Called once on mount and again after successfully adding a new address to refresh the list.
- `handleAdd(e)` — submits the form, calls `addAddress(...)`. On success, clears the form, closes the modal, and calls `fetchAddresses()` to reload the list.
- `handleDelete(id)` — calls `deleteAddress(id)`. On success, removes the address from the local state immediately (no re-fetch needed) using `filter`.

**Delete button visibility:** The delete button uses `opacity-0 group-hover:opacity-100` — it's invisible until you hover over the card.

---

### `NotificationsPage` (`/notifications`)

**What it does:** Shows all notifications for the customer. Unread ones are highlighted in orange. Clicking one marks it as read. There's a "Mark All as Read" button.

**State variables:**
- `notifications`, `loading`, `error`

**Functions:**
- `handleMarkRead(id)` — calls `markAsRead(id)`. On success, updates just that notification in local state (changes its `status` to `'read'`) without re-fetching everything.
- `handleMarkAllRead()` — filters to get all unread notifications, then calls `markAsRead` for all of them in parallel with `Promise.all`. Then sets all notifications to read locally. **Note: this fires one API request per notification, which is a known scaling weakness.**
- `formatTime(dateStr)` — converts a date to a human-friendly relative time like "5 MINS AGO" or "3 HOURS AGO". Falls back to "Jan 15" style for older notifications.

---

### `SupportPage` (`/support`)

**What it does:** Split into two panels — left panel has a form to submit a new ticket, right panel lists existing tickets.

**State variables:**
- `tickets`, `loading`
- `issueDescription` — the text in the new ticket textarea
- `submitting`, `submitError`

**`handleSubmit(e)`** — calls `createTicket(...)`. On success, prepends the new ticket to the front of the `tickets` array locally (so it appears at the top immediately) without re-fetching.

---

### `ProfilePage` (`/profile`)

**What it does:** Shows the customer's name, email, phone, ID, and loyalty points. Has an "Edit Profile" button that opens a modal to change name and phone.

**State variables:**
- `customer`, `loading`, `error`
- `showEdit`, `editName`, `editPhone`, `saving`, `saveError`

**Data loading:** Calls `GET /customers/{customerId}` directly via the `api` instance (no dedicated wrapper function).

**`handleSave(e)`** — calls `PUT /customers/{customerId}` with the new name and phone. On success, updates the `customer` state and also updates `userName` and `userPhone` in localStorage so the sidebar avatar letter updates immediately.

---

## Driver Portal Pages

### `DriverLoginPage` (`/driver/login`)

**What it does:** Login form for drivers. Uses phone number + password (not email).

**`handleSubmit(e)`** — calls `driverLogin(phone, password)`. On success, saves `driverLoggedIn`, `driver_id`, `driverName`, `driverPhone` to localStorage, then navigates to `/driver`.

---

### `DriverDashboardPage` (`/driver`)

**What it does:** The driver's main screen. Shows their current status (available/busy) with a toggle switch, a stats card (total deliveries, active count, avg rating), a section for incoming order offers, and a section for active deliveries.

**State variables:**
- `driver` — the driver's full info including status and avg_rating
- `deliveries` — all deliveries (all statuses)
- `loading`, `togglingStatus`, `respondingTo`

**Data loading:** Fetches driver info and all deliveries in parallel with `Promise.all`. Then polls deliveries every 5 seconds to catch new incoming orders in real time. The interval is cleaned up on unmount.

**Computed values (calculated from `deliveries` array, no extra API call):**
- `offeredDeliveries` — deliveries with status `'offered'` (new order offers)
- `activeDeliveries` — status `pending`, `picked_up`, or `on_the_way`
- `completedCount` — status `'delivered'`
- `activeCount` — length of activeDeliveries

**Functions:**
- `handleToggleStatus()` — flips the driver's status between available and busy by calling `updateDriverStatus(...)`. Updates local state with the backend's confirmed new status.
- `handleAccept(deliveryId)` — calls `acceptDelivery(deliveryId)`. On success, updates that delivery's status to `'pending'` in local state (it moves from the "Incoming" section to the "Active" section immediately).
- `handleDecline(deliveryId)` — calls `declineDelivery(deliveryId)`. On success, removes that delivery from local state entirely.

**The toggle switch UI:** It's a custom CSS toggle built from a `div` with Tailwind classes. The `readOnly checked={isAvailable}` on the hidden `<input>` is just for CSS state. The actual click handler is on the `<label>`.

---

### `DriverActiveDeliveryPage` (`/driver/active`)

**What it does:** Shows all currently active deliveries (those the driver has accepted but not yet delivered) as individual cards with action buttons to advance each through the status flow.

**State variables:**
- `deliveries` — only active ones (pending, picked_up, on_the_way)
- `loading`, `updating` (which delivery ID is currently being updated)

**Data loading:** Fetches all driver deliveries and filters to only the active ones. No polling here (driver manually refreshes or comes back from dashboard).

**`handleUpdateStatus(deliveryId, newStatus)`** — calls `updateDeliveryStatus(...)`. 
- If the new status is `'delivered'` or `'failed'`, the delivery is removed from the list (it's no longer active).
- Otherwise (e.g. pending → picked_up), the delivery is updated in place with the new status.

**Button logic per card:**
- "Mark Picked Up" is enabled only when status is `'pending'`
- "Mark Delivered" is enabled only when status is `'picked_up'` or `'on_the_way'`
- Both are disabled while an update is in progress (`isUpdating`)

**Call button:** A real `<a href="tel:...">` link. On a phone it dials directly.

---

### `DriverDeliveriesPage` (`/driver/deliveries`)

**What it does:** Shows the driver's full delivery history in a table, plus summary stats: total earnings, completed count, avg rating, total deliveries count.

**State variables:**
- `deliveries`, `avgRating`, `loading`

**Data loading:** Fetches deliveries and driver info in parallel with `Promise.all`. `avgRating` comes from the driver info endpoint (not calculated locally).

**Earnings calculation:** `totalEarnings` = sum of `total_price` for all deliveries with status `'delivered'`. The driver earned money on completed ones only.

---

## Admin Portal Pages

### `AdminLoginPage` (`/admin/login`)

**What it does:** Login form for admins. Has a show/hide password toggle button.

**`handleSubmit(e)`** — calls `adminLogin(email, password)`. Backend checks against hardcoded credentials (`admin@elyasx.com` / `admin123`). On success, saves `adminLoggedIn`, `adminName`, `adminId` to localStorage, navigates to `/admin`.

---

### `AdminDashboardPage` (`/admin`)

**What it does:** The admin overview screen. Four stat cards at top, then a table of the 10 most recent orders. Clicking any row opens a detail modal.

**State variables:**
- `stats` — the stats object from the backend
- `orders` — last 10 orders
- `selectedOrder` — which order's modal is open
- `loading`

**Data loading:** Fetches stats and all orders in parallel. Takes only `.slice(0, 10)` of orders for the table.

**Stat cards:** Built from an array of objects (`statCards`) so they can be mapped over. The Revenue card has `accent: true` which gives it the orange background treatment.

**Modal:** Clicking a row sets `selectedOrder`. The modal shows the order details in the standard 2-column grid layout. Clicking outside the modal (on the dark backdrop) closes it.

---

### `AdminOrdersPage` (`/admin/orders`)

**What it does:** Full orders management. Filter tabs, search, summary cards, and a table where every row opens a detail modal. Pending orders show an "Assign Driver" dropdown in their modal.

**State variables:**
- `orders`, `drivers`, `loading`
- `activeFilter`, `search`
- `selectedOrder`, `selectedDriverId`, `assigning`

**Data loading:** Fetches all orders and all drivers in parallel on mount (drivers needed for the assign dropdown).

**Filtering:** `filtered` is computed from `orders` by applying the active filter and search string. This is done entirely in the browser — no extra API calls.

**`handleAssign()`** — calls `assignDriver(orderId, driverId)`. Then re-fetches all orders from the API and finds the updated order to keep the modal open and refreshed.

**Assign dropdown:** Only shown in the modal when `selectedOrder.status === 'pending'`. Available drivers listed first, then busy ones.

---

### `AdminDriversPage` (`/admin/drivers`)

**What it does:** Driver management. Filter by available/busy, search by name or phone, summary cards, table with a "View" button that opens a detailed modal.

**State variables:**
- `drivers`, `loading`, `activeFilter`, `search`
- `selectedDriver` — the driver whose modal is open
- `driverRatings`, `ratingsLoading`
- `pendingPayments`, `paymentSummary`, `paymentsLoading`
- `settlingAction` — which button is in progress: `'completed'`, `'failed'`, or `null`

**`handleViewDriver(driver)`** — opens the modal. Fetches ratings and pending payments in parallel with `Promise.all`. Updates all related state on completion.

**`handleSettlePayments(action)`** — calls `settleDriverPayments(driverId, action)`. On success, clears `pendingPayments` and sets `paymentSummary` to zeros (the section now shows "No pending payments").

**Modal sections:**
1. Driver header (avatar, name, ID, status badge)
2. Info grid (phone, rating, total deliveries)
3. **Cash Payment Settlement** — 3 cards (order count, total collected, 20% owed), two action buttons
4. **Recent Reviews** — scrollable list of star ratings with customer names and comments

---

### `AdminCustomersPage` (`/admin/customers`)

**What it does:** Customer list with search. Clicking "View" opens a modal that lazy-loads the full customer detail (addresses + order history).

**State variables:**
- `customers`, `loading`, `search`
- `selectedCustomer` — full detail object including addresses and orders
- `modalLoading` — spinner while the detail is being fetched

**`handleViewCustomer(id)`** — clears `selectedCustomer` (shows loading spinner), sets `modalLoading = true`, then fetches full customer detail. The modal opens in a loading state and fills in when data arrives.

**Customer orders in modal:** Shows `.slice(0, 5)` — the 5 most recent orders only.

---

### `AdminPaymentsPage` (`/admin/payments`)

**What it does:** All payments with filter tabs (All / Completed / Pending / Failed). Summary cards at top. Clicking a row opens a detail modal.

**State variables:**
- `payments`, `loading`, `activeFilter`, `selectedPayment`

**Revenue card:** Shows only completed payments summed. Note: this is the full order amount. The actual 20% company revenue is tracked separately in the admin stats.

**No edit functionality** — payments are read-only in this view. Settlement happens through the driver modal in `AdminDriversPage`.

---

### `AdminSupportPage` (`/admin/support`)

**What it does:** Support ticket management. Filter tabs, table, modal with status update buttons.

**State variables:**
- `tickets`, `loading`, `activeFilter`, `selectedTicket`, `updatingStatus`

**`handleStatusUpdate(ticketId, status)`** — calls `updateTicketStatus(...)`. Then re-fetches all tickets and finds the updated ticket to keep the modal open and refreshed.

**Button rules in modal:**
- If ticket is `open`: shows "Mark In Progress" + "Mark Resolved"
- If ticket is `in_progress`: shows only "Mark Resolved"
- If ticket is `resolved` or `closed`: no buttons shown

---

## How the New Order Flow Passes Data Between Pages

The 3-step order flow uses `sessionStorage` as a temporary scratchpad. Here's the full chain:

1. **Step 1 (`/new-order`)** → user picks type → saved as `sessionStorage.setItem('newOrderType', 'food')`
2. **Step 2 (`/new-order-details`)** → user fills in details → saved as `sessionStorage.setItem('newOrderDetails', JSON.stringify({...}))`
3. **Step 3 (`/payment`)** → reads both from sessionStorage → builds the final API call → on success, clears sessionStorage and goes to order detail

If the user navigates away mid-flow and comes back to Step 2, it reads the saved type. If there's no type saved, it redirects back to Step 1.

---

## How Authentication / Protection Works

There is no session token or JWT. Authentication state is stored purely in `localStorage`:

| Who | Key checked | Value |
|---|---|---|
| Customer | `isLoggedIn` | `'true'` |
| Driver | `driverLoggedIn` | `'true'` |
| Admin | `adminLoggedIn` | `'true'` |

In `App.tsx`, protected route wrappers check these keys. If the key is missing or not `'true'`, you're redirected to the appropriate login page. If a user clears their browser storage, they get logged out.

**Logging out** simply means removing these keys from localStorage and navigating to the login page.

---

## How Status Badges Work

Every status value from the database has a corresponding color class defined in a lookup object at the top of each page:

```typescript
const statusClass: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  // ...
}
```

In the JSX, it's used like:
```typescript
<span className={statusClass[order.status] ?? 'bg-gray-100 text-gray-700'}>
```

The `?? 'bg-gray-100 text-gray-700'` is a fallback — if the status isn't in the lookup (e.g. an unexpected value), it shows a neutral gray badge.

---

## How Modals Work

All modals in this app follow the same pattern:

```tsx
{selectedItem && (
  <div
    className="fixed inset-0 bg-black/40 ..."
    onClick={() => setSelectedItem(null)}   // click backdrop to close
  >
    <div onClick={e => e.stopPropagation()}> // prevent backdrop click from firing
      {/* modal content */}
    </div>
  </div>
)}
```

- `fixed inset-0` makes the backdrop cover the entire screen
- `bg-black/40` is a semi-transparent black overlay
- `onClick` on the outer div closes the modal
- `e.stopPropagation()` on the inner div prevents clicks inside the modal from bubbling up to the backdrop and closing it

---

## How `Promise.all` Is Used

When a page needs data from two different API endpoints at the same time, `Promise.all` fires both requests simultaneously and waits for both to finish:

```typescript
Promise.all([getAdminStats(), getAllOrders()])
  .then(([statsRes, ordersRes]) => {
    setStats(statsRes.data)
    setOrders(ordersRes.data)
  })
```

This is faster than doing them one after the other. If either request fails, the whole `Promise.all` fails (which means both pieces of data might not load — this is a tradeoff).

---

## Key Things That Don't Exist Yet

- **No real logout button** in the driver or customer sidebar (would just clear localStorage)
- **No pagination** — all pages load all data at once
- **No real Google/Apple login** — those buttons are placeholders on the customer login page
- **No "Forgot Password" flow** — the link exists but goes nowhere
- **Pay with Card** — shown as "Coming soon" on Step 3
- **No message functionality** — the "Message" button on the OrderDetailPage driver card does nothing
- **Passwords are stored as plain text** in the database (no hashing)
