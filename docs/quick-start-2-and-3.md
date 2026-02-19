# Quick start: Step 2 (Configure environment) and Step 3 (Database)

Follow these in order after you have cloned the repo and run `npm install` (step 1).

**Repo:** [https://github.com/SamBef/School-Project](https://github.com/SamBef/School-Project)

---

## Step 2 — Configure environment (in order)

### 2.1 Create the API environment file

1. Open the folder `apps/api`.
2. Copy the file **`.env.example`** and paste it in the same folder.
3. Rename the copy to **`.env`** (no `.example`).
4. Open `apps/api/.env` and set these (replace placeholders with your real values):

| Variable | What to put |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection URL (e.g. Supabase: Project Settings → Database → Connection string; replace `[YOUR-PASSWORD]` with your DB password). |
| `DIRECT_URL` | Same value as `DATABASE_URL` for most setups (Supabase/local). |
| `JWT_SECRET` | A long random string (e.g. generate one; never commit the real value). |
| `SENDGRID_API_KEY` | Your SendGrid API key, or leave empty if you use SMTP. |
| `SENDGRID_FROM_EMAIL` | Sender email for invites/password reset (e.g. `noreply@yourdomain.com`). |
| **Or use SMTP (Gmail)** | Set `SMTP_USER` and `SMTP_PASS` (Gmail App Password) instead of SendGrid. |
| `FRONTEND_URL` | Web app URL (local: `http://localhost:5173`). |
| `PORT` | API port (optional; default is 3003; often 3004 in this project). |

**Windows TLS note:** If you see a credentials/TLS error when connecting to the database, add (dev only):  
`DATABASE_INSECURE_SSL=1`

### 2.2 Create the web app environment file

1. Open the folder `apps/web`.
2. Copy **`.env.example`** and paste it in the same folder.
3. Rename the copy to **`.env`**.
4. Open `apps/web/.env` and set:

| Variable | What to put |
|----------|-------------|
| `VITE_API_URL` | Base URL of your API with no trailing slash. Local: `http://localhost:3004` (or whatever port your API uses). |

### 2.3 (Optional) Admin app

- If you run the admin app and it uses a different API URL, copy `apps/admin/.env.example` to `apps/admin/.env` and set `VITE_ADMIN_API_URL` (or leave unset to use the default proxy in dev).

---

## Step 3 — Database (in order)

Run these from the **repository root** (the folder that contains `apps/` and `package.json`).

### 3.1 Generate Prisma client

```bash
npm run db:generate
```

This reads `apps/api/prisma/schema.prisma` and generates the database client.

### 3.2 Apply the schema to the database

```bash
npm run db:push
```

This creates or updates tables in the database pointed to by `DATABASE_URL` in `apps/api/.env`.

---

## Summary checklist

- [ ] `apps/api/.env` created from `.env.example` and required variables set (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, email).
- [ ] `apps/web/.env` created from `.env.example` and `VITE_API_URL` set.
- [ ] `npm run db:generate` run from repo root.
- [ ] `npm run db:push` run from repo root.

Then you can run the API and web app (step 4 in the README).
