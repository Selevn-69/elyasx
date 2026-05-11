# QA Bugs And Fix Directions

This file records the bugs found during the QA pass. No application code was changed.

## 1. Frontend Build Fails

**Severity:** Blocker

**Evidence:**

`npm run build` fails with:

```text
src/pages/admin/AdminDriversPage.tsx(32,10): error TS6133: 'pendingPayments' is declared but its value is never read.
src/pages/customer/OrderDetailPage.tsx(131,43): error TS6133: 's' is declared but its value is never read.
```

**Affected files:**

- `src/pages/admin/AdminDriversPage.tsx`
- `src/pages/customer/OrderDetailPage.tsx`

**Fix direction:**

- In `AdminDriversPage.tsx`, either remove the unused `pendingPayments` state entirely or actually render the pending payment rows in the driver modal.
- In `OrderDetailPage.tsx`, change `STATUS_STEPS.map((s, i) => ...)` to ignore the unused first argument, for example `STATUS_STEPS.map((_, i) => ...)`.
- Re-run `npm run build` after the change.

## 2. Points Discount Can Deduct Too Many Points

**Severity:** High

**Evidence:**

In `src/pages/customer/NewOrderStep3Page.tsx`, `pointsToUse` is capped by `availablePoints`, but not by `maxUsablePoints`.

Current logic:

```ts
const pointsToUse = usePoints ? Math.min(Math.max(0, parseInt(pointsInput) || 0), availablePoints) : 0
const maxUsablePoints = Math.min(availablePoints, Math.floor(deliveryFee * 10))
```

Example: if delivery fee is ₪5 and the customer has 1000 points, the useful cap is 50 points. The UI allows entering 1000 points, sends `points_to_use: 1000`, and the backend deducts 1000 points while the discount is only capped to the order total.

**Affected files:**

- `src/pages/customer/NewOrderStep3Page.tsx`
- `backend/routers/orders.py`

**Fix direction:**

- Frontend: cap `pointsToUse` by `maxUsablePoints`, not just `availablePoints`.
- Backend: also enforce the same cap using `floor(total_price * 10)` before deducting points. Do not rely on frontend validation for money/points logic.
- Add a backend test for trying to use more points than the order can consume.

## 3. Order Creation Is Not Atomic

**Severity:** High

**Evidence:**

`backend/routers/orders.py` creates an order through multiple independent database writes:

- base order insert
- status history insert
- type-specific insert
- customer points deduction
- payment insert
- transaction insert
- delivery offer insert

If one of the later operations fails, earlier records remain in the database.

**Affected file:**

- `backend/routers/orders.py`

**Fix direction:**

- Wrap the whole create-order flow in a single MySQL transaction.
- Commit only after all inserts/updates succeed.
- Roll back on any exception.
- Consider adding a database helper that accepts a callback or exposes one connection/cursor for multi-step operations.

## 4. Backend Allows Incomplete Typed Orders

**Severity:** Medium

**Evidence:**

In `backend/routers/orders.py`, type-specific inserts are conditional. A `food` order without `restaurant_id` can still create a base order with no `food_order` record. An `online` order without `store_name` can do the same.

**Affected file:**

- `backend/routers/orders.py`

**Fix direction:**

- Validate required fields before inserting anything:
  - `food`: require `restaurant_id` and `items_description`
  - `package`: require `description` and `weight`
  - `online`: require `store_name` and `product_link`
- Return `400` with a clear error message when fields are missing.
- Add API tests for each order type with missing required fields.

## 5. ESLint Fails

**Severity:** Medium

**Evidence:**

`npm run lint` reports 9 errors and 7 warnings.

Main errors:

- `@typescript-eslint/no-explicit-any` in several catch blocks and loose object types.
- `no-unused-vars` for `pendingPayments`.

Warnings:

- Several React hook dependency warnings.

**Affected files include:**

- `src/pages/admin/AdminCustomersPage.tsx`
- `src/pages/admin/AdminDriversPage.tsx`
- `src/pages/admin/AdminRestaurantsPage.tsx`
- `src/pages/customer/NewOrderStep2Page.tsx`
- `src/pages/customer/NewOrderStep3Page.tsx`
- `src/pages/customer/AddressesPage.tsx`
- `src/pages/customer/NotificationsPage.tsx`
- `src/pages/customer/SupportPage.tsx`
- `src/pages/driver/DriverActiveDeliveryPage.tsx`
- `src/pages/driver/DriverDashboardPage.tsx`
- `src/pages/driver/DriverDeliveriesPage.tsx`

**Fix direction:**

- Replace `catch (err: any)` with a typed helper for Axios errors, for example using `axios.isAxiosError`.
- Define proper interfaces for form/detail objects instead of `Record<string, any>`.
- Fix the unused state from bug 1.
- Review each hook warning. Either include the dependency safely, memoize the function with `useCallback`, or document why the effect intentionally runs once.
- Re-run `npm run lint`.

## 6. Backend TestClient Cannot Run

**Severity:** Low / Test Infrastructure

**Evidence:**

Trying to use FastAPI `TestClient` fails because `httpx` is missing:

```text
RuntimeError: The starlette.testclient module requires the httpx package to be installed.
```

`backend/requirements.txt` does not include `httpx`.

**Affected file:**

- `backend/requirements.txt`

**Fix direction:**

- Add `httpx` to backend test/dev dependencies.
- If this project keeps only one requirements file, add it to `backend/requirements.txt`.
- Then add backend smoke tests for auth, stats, order creation validation, points caps, and driver accept/decline flows.

