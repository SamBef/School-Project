# KoboTrack Admin — Platform administration

The admin app is a **separate web app** for platform administrators. It lets you view and monitor companies (businesses) using KoboTrack **without exposing confidential data**: only aggregate counts and last activity are shown. No transaction details, expense details, or user PII.

---

## Purpose

- **Manage companies:** See all businesses on the platform (name, location, currency, team size, activity counts, last activity).
- **Confidentiality:** No access to individual transactions, expenses, or user emails from the admin UI. Data is summary-only.
- **Future-ready:** The structure supports adding pro features later (e.g. auditing tools, support for SMEs).

---

## Setup

### 1. Database

The API uses an `Admin` model. After pulling the latest code:

```bash
npm run db:generate
npm run db:push
```

### 2. Create an admin user

From `apps/api`, run the one-off script (use a strong password and remove it from env after):

```bash
cd apps/api
ADMIN_EMAIL=you@example.com ADMIN_INITIAL_PASSWORD=yourSecret node scripts/create-admin.js
```

Or with npm:

```bash
ADMIN_EMAIL=you@example.com ADMIN_INITIAL_PASSWORD=yourSecret npm run admin:create --workspace=apps/api
```

Then **unset `ADMIN_INITIAL_PASSWORD`** in your environment so it is not stored.

### 3. CORS (if admin app is on a different origin)

If the admin app runs on a different host (e.g. `http://localhost:5174` or `https://admin.yourdomain.com`), set in the API `.env`:

```
ADMIN_FRONTEND_URL="http://localhost:5174"
```

So the API allows that origin for credentials.

### 4. Run the admin app

From the repo root:

```bash
npm run dev:admin
```

The admin app runs at **http://localhost:5174** (web app stays on 5173). Sign in with the admin email and password you created.

---

## API (admin only)

- **POST /admin/auth/login** — Body: `{ email, password }`. Returns `{ token }` (JWT with `adminId`, `admin: true`). Company user tokens are not accepted.
- **GET /admin/businesses** — Returns `{ businesses }`: each has `id`, `name`, `primaryLocation`, `createdAt`, `baseCurrencyCode`, `userCount`, `transactionCount`, `expenseCount`, `lastActivityAt`. No business contact details or transaction/expense records.

All admin routes require the admin JWT in `Authorization: Bearer <token>`.

---

## App structure

- **apps/admin** — Vite + React app (port 5174).
- **apps/api** — Admin model, `scripts/create-admin.js`, `/admin/auth` and `/admin/businesses` routes, `requireAdmin` middleware.

Design tokens and layout are aligned with the main KoboTrack web app for consistency.
