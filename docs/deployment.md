# Deployment

KoboTrack deployment: **Netlify** (frontend), **Railway** (API + PostgreSQL).

---

## Deployment runbook (do in this order)

### Step 1 — Railway: project and database

1. Go to [railway.app](https://railway.app) and sign in (or sign up with GitHub).
2. **New project** → **Deploy from GitHub repo** (or **Empty project** if you prefer to add services manually).
3. If you chose “Empty project”: **Add service** → **Database** → **PostgreSQL**.  
   If you deployed from repo: **Add service** → **Database** → **PostgreSQL**.
4. Open the PostgreSQL service → **Variables** (or **Connect**) and copy **`DATABASE_URL`**. Save it somewhere safe; you will need it for the API service.

### Step 2 — Railway: API service

1. In the same project, **Add service** → **GitHub Repo** → select your KoboTrack repo (e.g. `SamBef/School-Project`).
2. Open the new service (the one that’s not PostgreSQL).
3. **Settings** (or **Configure**):
   - **Root directory / Build path:** `apps/api` (so Railway runs commands from the API app).
   - **Build command:** `npm install && npx prisma generate`
   - **Start command:** `npm start`
   - **Watch paths:** leave default or set `apps/api` if needed.
4. **Variables:** Add these (replace placeholders; get `DATABASE_URL` from the PostgreSQL service’s variables — Railway can reference it as `${{Postgres.DATABASE_URL}}` or copy the value):
   - `DATABASE_URL` — from PostgreSQL (reference or paste).
   - `JWT_SECRET` — generate a long random string (e.g. `openssl rand -base64 32`).
   - `FRONTEND_URL` — leave empty for now; set after Step 4 (your Netlify URL).
   - `SENDGRID_API_KEY` — optional; from [SendGrid](https://app.sendgrid.com/settings/api_keys). Needed for invite and password-reset emails.
   - `SENDGRID_FROM_EMAIL` — optional; e.g. `noreply@yourdomain.com`.
5. **Settings** → **Networking** → **Generate domain** (or **Public networking**) so the API gets a public URL, e.g. `https://your-api-name.up.railway.app`.
6. Copy the **public URL** of the API (no trailing slash). You will need it for Netlify and for `FRONTEND_URL` later.

### Step 3 — Apply database schema

The API uses Prisma; the schema must be applied to the production database once.

- **Option A (from your machine):** Set `DATABASE_URL` in your local `.env` (or a one-off env) to the Railway Postgres URL, then from the repo root run:
  ```bash
  cd apps/api && npx prisma db push
  ```
- **Option B (Railway shell):** If your Railway plan supports a shell/console for the API service, run there:
  ```bash
  npx prisma db push
  ```
- If you use migrations instead of `db push`, run `npx prisma migrate deploy` in the same way.

After this, the API should start without schema errors. Redeploy or restart the API service if it failed before.

### Step 4 — Netlify: frontend (web app)

1. Go to [netlify.com](https://www.netlify.com) and sign in (e.g. with GitHub).
2. **Add new site** → **Import an existing project** → **GitHub** → select your KoboTrack repo.
3. **Build settings:**
   - **Base directory:** `apps/web`
   - **Build command:** `npm run build`
   - **Publish directory:** `apps/web/dist`
4. **Environment variables** → **Add variable** (or **Edit settings** → **Environment**):
   - `VITE_API_URL` = your Railway API URL (e.g. `https://your-api-name.up.railway.app`) — **no trailing slash**.
5. **Deploy site**. Wait for the build to finish and note the site URL (e.g. `https://your-site-name.netlify.app`).

### Step 5 — Wire frontend URL into API

1. Back in **Railway** → your API service → **Variables**.
2. Set **`FRONTEND_URL`** to your Netlify site URL (e.g. `https://your-site-name.netlify.app`). This is used for CORS and for links in invite/password-reset emails.
3. Redeploy the API service so the new variable is applied (or trigger a redeploy).

### Step 6 — Post-deploy checks

1. Open the **Netlify URL** in a browser.
2. **Register** a new business and confirm you can log in.
3. **Dashboard** — confirm it loads and shows data (or zeros).
4. **Invite** (if you set SendGrid): send an invite and confirm the email link uses the Netlify URL. Without SendGrid, the invite link is shown on screen; open it and set password.
5. **Transactions / Expenses / Export** — quick smoke test.
6. Document the **live URLs** in the project README or report (Netlify URL = app, Railway API URL = API).

### Optional — Admin app

To deploy the admin app (e.g. on Netlify as a second site or a subdomain):

- Build from **Base directory** `apps/admin`, **Publish** `apps/admin/dist`, and set **`VITE_API_URL`** to the same Railway API URL.
- In Railway API **Variables**, set **`ADMIN_FRONTEND_URL`** to the admin site URL (for CORS).

---

## Reference: build and env

### Frontend (Netlify)

| Setting            | Value               |
|--------------------|---------------------|
| Base directory     | `apps/web`          |
| Build command      | `npm run build`     |
| Publish directory  | `apps/web/dist`     |
| Env var            | `VITE_API_URL` = Railway API URL (no trailing slash) |

### Backend (Railway)

| Setting       | Value                                              |
|---------------|----------------------------------------------------|
| Root directory| `apps/api`                                         |
| Build command | `npm install && npx prisma generate`              |
| Start command | `npm start`                                        |
| Required vars | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`       |
| Optional vars | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `PORT` |

### Database

- One-time: run **`npx prisma db push`** (or **`npx prisma migrate deploy`**) against the production `DATABASE_URL` so tables exist.
