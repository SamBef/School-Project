# Setup & installation

Step-by-step setup for KoboTrack (web + API + database + email).

---

## Prerequisites

- **Node.js** 18 or later ([nodejs.org](https://nodejs.org))
- **npm** 9+ (comes with Node)
- **PostgreSQL** (local install or Railway)
- **Git**
- **SendGrid** account (for invite and password-reset emails)

---

## 1. Clone and install

```bash
git clone <repository-url>
cd DTTRASM
npm install
```

This installs dependencies for the root workspace and for `apps/web` and `apps/api`.

---

## 2. Database (PostgreSQL)

### Option A: Local PostgreSQL

1. Install PostgreSQL and create a database, e.g. `kobotrack`.
2. Set `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env` (see step 4). For local you can use the same value for both.

### Option B: Railway

1. Create a project on [Railway](https://railway.app).
2. Add a PostgreSQL service.
3. Copy the connection URL into `apps/api/.env` as both `DATABASE_URL` and `DIRECT_URL` (same value).

### Option C: Neon (or other pooled Postgres)

1. Create a project and database. You get two URLs: **pooled** (for the app) and **direct** (for migrations).
2. Set `DATABASE_URL` to the pooled connection string and `DIRECT_URL` to the direct (non-pooler) connection string. Both typically include `?sslmode=require`.

---

## 3. SendGrid

1. Sign up at [SendGrid](https://sendgrid.com).
2. Create an API key with “Mail Send” permission.
3. (Optional) Verify a sender identity for invite and password-reset emails.
4. Put the API key in `apps/api/.env` as `SENDGRID_API_KEY`.

---

## 4. Environment variables

**For a clearer, step-by-step guide:** see [Configuration environments — clear guide](configuration-guide.md).

### API (`apps/api/.env`)

Copy from `apps/api/.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooled URL for Neon) |
| `DIRECT_URL` | Same as `DATABASE_URL` for local/Railway; for Neon use the direct (non-pooler) URL. Required for migrations. |
| `JWT_SECRET` | Secret for signing JWTs (long, random string) |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Sender email for invites and password reset |
| `FRONTEND_URL` | Base URL of the web app (e.g. `http://localhost:5173`) |
| `DATABASE_INSECURE_SSL` | **Dev only.** Set to `1` if you see a TLS/credentials error on Windows. Never set in production. |

### Web (`apps/web/.env`)

Copy from `apps/web/.env.example` and set:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the API (e.g. `http://localhost:3005`) |

---

## 5. Database schema

From the repo root:

```bash
npm run db:generate
npm run db:push
```

Or from `apps/api`:

```bash
npm run db:generate
npm run db:push
```

---

## 6. Run locally

**Terminal 1 — API:**

```bash
npm run dev:api
```

**Terminal 2 — Web:**

```bash
npm run dev:web
```

- Web: usually `http://localhost:5173`
- API: usually `http://localhost:3005`

---

## Step-by-step screenshots and signup instructions

Screenshots and signup instructions will be added here as the app is built and flows are finalized. They will cover:

- Account signup (owner registration)
- Business profile setup
- Inviting workers by email
- Logging in as Owner / Manager / Cashier
- Creating a transaction and generating a receipt
- Adding an expense and viewing the dashboard
- Exporting PDF/CSV

Placeholder: *Screenshots and captions to be inserted.*

---

## Deployment

- Set `NODE_ENV=production`. Do **not** set `DATABASE_INSECURE_SSL` in production.
- Use a single connection URL for `DATABASE_URL` and `DIRECT_URL` unless your provider (e.g. Neon) requires a separate direct URL for migrations.
- Run `prisma migrate deploy` (or `db:migrate`) as part of your deploy step so the schema is applied.

## Adding AI or other services later

The database layer is a standard Prisma + PostgreSQL setup. You can add new tables, services, or external APIs (e.g. AI) without changing how the app connects to the database. Keep `DATABASE_URL` / `DIRECT_URL` and the env normalization as-is.

---

## Troubleshooting

- **DB connection fails:** Check `DATABASE_URL` and `DIRECT_URL`, network, and that PostgreSQL is running.
- **TLS / "No credentials are available in the security package" (Windows):** Set `DATABASE_INSECURE_SSL=1` in `apps/api/.env` for **local development only**. Use a local Postgres or fix SSL on your machine for a long-term fix.
- **CORS errors:** Ensure `FRONTEND_URL` in the API matches the URL you use for the web app.
- **Emails not sending:** Verify `SENDGRID_API_KEY` and sender verification in SendGrid.
