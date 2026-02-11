# API reference

KoboTrack REST API — base URL: `VITE_API_URL` (e.g. `http://localhost:3000`).

All protected routes require header: `Authorization: Bearer <token>`.

---

## Authentication (Phase 2)

- **Register:** `POST /auth/register` — body: `{ businessName, businessEmail, businessPhone, primaryLocation, ownerEmail, password }` → creates business + owner user; returns `{ token, user, business }`.
- **Login:** `POST /auth/login` — body: `{ email, password }` → returns `{ token, user, business }`.
- **Me:** `GET /auth/me` — requires auth; returns `{ user, business }`.
- **Forgot password:** `POST /auth/forgot-password` — body: `{ email }`; sends reset email (always returns 200).
- **Reset password:** `POST /auth/reset-password` — body: `{ token, newPassword }` (token from email link).
- **Set password (invite):** `POST /auth/set-password` — body: `{ token, newPassword }` (token from invite email); returns `{ token, user, business }`.

---

## Users and invites (Phase 2)

- **Invite worker:** `POST /users/invite` — body: `{ email, role }` with `role`: `MANAGER` or `CASHIER`. Owner only.
- **List users:** `GET /users` — Owner only. Returns all users for the business.
- **User count:** `GET /users/count` — Any authenticated user. Returns `{ total, active, pending }`.

---

## Transactions (Phase 3)

- **Create:** `POST /transactions` — body: `{ items: [{ name, quantity, unitPrice }], paymentMethod }`. Any authenticated user. Auto-generates a receipt with sequential number.
- **List:** `GET /transactions` — query: `dateFrom`, `dateTo`, `limit` (default 50), `offset` (default 0). Returns `{ transactions, total, limit, offset }`.
- **Get detail:** `GET /transactions/:id` — Returns transaction with receipt and line items.
- **Delete:** `DELETE /transactions/:id` — Owner/Manager only. Cascades receipt deletion.

**Payment methods:** `CASH`, `CARD`, `MOBILE_MONEY`, `BANK_TRANSFER`, `OTHER`

---

## Expenses (Phase 3)

- **Create:** `POST /expenses` — body: `{ description, category, amount, date }`. Owner/Manager only.
- **List:** `GET /expenses` — query: `dateFrom`, `dateTo`, `category`, `limit`, `offset`. Owner/Manager only.
- **Update:** `PATCH /expenses/:id` — body: `{ description?, category?, amount?, date? }`. Owner/Manager only.
- **Delete:** `DELETE /expenses/:id` — Owner/Manager only.

**Categories:** `RENT`, `STOCK_INVENTORY`, `UTILITIES`, `TRANSPORT`, `MISCELLANEOUS`

---

## Dashboard (Phase 3)

- **Get summary:** `GET /dashboard` — Any authenticated user. Returns:
```json
{
  "currency": "USD",
  "today": { "transactionCount": 0, "revenue": 0, "expenses": 0, "netProfit": 0 },
  "allTime": { "transactionCount": 0, "revenue": 0, "expenses": 0, "netProfit": 0 }
}
```

---

## Export (Phase 3)

- **PDF report:** `GET /export/pdf` — query: `dateFrom`, `dateTo`. Owner/Manager only. Returns PDF file.
- **CSV report:** `GET /export/csv` — query: `dateFrom`, `dateTo`, `type` (`transactions` | `expenses` | `all`). Owner/Manager only. Returns CSV file.
- **Single receipt:** `GET /export/receipt/:transactionId` — Any authenticated user. Returns receipt PDF.

---

## Error responses

All errors return JSON with a `message` field:

```json
{
  "message": "Human-readable error description."
}
```

| Status | Meaning |
|---|---|
| 400 | Validation error (missing fields, invalid data) |
| 401 | Not authenticated or session expired |
| 403 | Insufficient role/permissions |
| 404 | Resource not found |
| 500 | Server error |
