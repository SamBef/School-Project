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
2. Set `DATABASE_URL` in `apps/api/.env` (see step 4).

### Option B: Railway

1. Create a project on [Railway](https://railway.app).
2. Add a PostgreSQL service.
3. Copy the `DATABASE_URL` from the service variables into `apps/api/.env`.

---

## 3. SendGrid

1. Sign up at [SendGrid](https://sendgrid.com).
2. Create an API key with “Mail Send” permission.
3. (Optional) Verify a sender identity for invite and password-reset emails.
4. Put the API key in `apps/api/.env` as `SENDGRID_API_KEY`.

---

## 4. Environment variables

### API (`apps/api/.env`)

Copy from `apps/api/.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (long, random string) |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Sender email for invites and password reset |
| `FRONTEND_URL` | Base URL of the web app (e.g. `http://localhost:5173`) |

### Web (`apps/web/.env`)

Copy from `apps/web/.env.example` and set:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the API (e.g. `http://localhost:3000`) |

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
- API: usually `http://localhost:3000`

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

## Troubleshooting

- **DB connection fails:** Check `DATABASE_URL`, network, and that PostgreSQL is running.
- **CORS errors:** Ensure `FRONTEND_URL` in the API matches the URL you use for the web app.
- **Emails not sending:** Verify `SENDGRID_API_KEY` and sender verification in SendGrid.
