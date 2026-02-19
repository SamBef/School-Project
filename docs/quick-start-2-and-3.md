# Quick start: Step 2 (Configure environment) and Step 3 (Database)

Follow these in order after you have cloned the repo and run `npm install` (step 1).

**Repo:** [https://github.com/SamBef/School-Project](https://github.com/SamBef/School-Project)

---

## Step 2 — Configure environment

**Use the full guide:** [**Configuration environments — clear guide**](configuration-guide.md). It explains:

- Which env files you need (API, web, admin)
- Exactly what each variable means and where to get values
- Required vs optional, and local vs production examples
- A checklist at the end

**Short version:**

1. **API** — In `apps/api`, copy `.env.example` → `.env`. Fill in: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, email (Gmail **or** SendGrid), `FRONTEND_URL`. See [configuration-guide.md](configuration-guide.md#1-api-environment-appsapienv).
2. **Web** — In `apps/web`, copy `.env.example` → `.env`. Set `VITE_API_URL` (e.g. `http://localhost:3004`). See [configuration-guide.md](configuration-guide.md#2-web-app-environment-appswebenv).
3. **Admin** — Optional. Only if the admin app uses a different API: copy `apps/admin/.env.example` → `.env` and set `VITE_ADMIN_API_URL` if needed. See [configuration-guide.md](configuration-guide.md#3-admin-app-environment-appsadminenv--optional).

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

- [ ] **Env:** [Configuration guide](configuration-guide.md) followed — `apps/api/.env` and `apps/web/.env` created and filled.
- [ ] **DB:** `npm run db:generate` then `npm run db:push` run from repo root.

Then you can run the API and web app (step 4 in the README).
