# Configuration environments — clear guide

This guide explains **which environment files you need** and **exactly what to put in each**, so the API, web app, and admin app work correctly.

---

## Overview: three apps, three env files

| App | Folder | Env file | Purpose |
|-----|--------|----------|---------|
| **API** (backend) | `apps/api` | `.env` | Database, secrets, email, URLs. **Required.** |
| **Web** (main app) | `apps/web` | `.env` | Tells the frontend where the API is. **Required.** |
| **Admin** (platform admin) | `apps/admin` | `.env` | Only if the admin app talks to a different API. **Optional.** |

You create each `.env` by copying the corresponding `.env.example` in that folder, then editing the copy.

---

## 1. API environment (`apps/api/.env`)

**Create the file**

1. Go to the folder `apps/api`.
2. Copy the file `.env.example` and paste it in the same folder.
3. Rename the copy to `.env` (remove `.example`).
4. Open `.env` in a text editor and fill in the values below.

---

### Required: database

The API needs a PostgreSQL database. You must set both:

| Variable | Meaning | Example |
|----------|---------|---------|
| `DATABASE_URL` | Connection string to your PostgreSQL database. | See options below. |
| `DIRECT_URL` | Same as `DATABASE_URL` for Supabase and most setups. | Copy the same value as `DATABASE_URL`. |

**Where to get the URL**

- **Supabase:** Project → Settings → Database → Connection string (URI). Replace `[YOUR-PASSWORD]` with your database password.
- **Local PostgreSQL:** `postgresql://postgres:YOUR_PASSWORD@localhost:5432/kobotrack`
- **Railway / Neon:** Use the URL they give you. For Neon, use the *direct* URL for `DIRECT_URL` if they provide two.

**Windows TLS note:** If you get an error like "No credentials are available in the security package" when the API starts, add this line (dev only, never in production):

```env
DATABASE_INSECURE_SSL=1
```

---

### Required: JWT secret

| Variable | Meaning | Example |
|----------|---------|---------|
| `JWT_SECRET` | A long random string used to sign login tokens. Never share or commit. | e.g. `my-super-secret-string-at-least-32-chars` |

Use a different value in production.

---

### Required: email (choose one option)

The app sends invite and password-reset emails. Use **either** Gmail (easier for dev) **or** SendGrid.

**Option A — Gmail (good for local development)**

| Variable | Meaning | Example |
|----------|---------|---------|
| `SMTP_USER` | Your Gmail address. | `you@gmail.com` |
| `SMTP_PASS` | Gmail *App Password* (not your normal password). | Create one at [Google App Passwords](https://myaccount.google.com/apppasswords). |

**Option B — SendGrid (good for production)**

| Variable | Meaning | Example |
|----------|---------|---------|
| `SENDGRID_API_KEY` | API key from SendGrid. | Create at [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys). |
| `SENDGRID_FROM_EMAIL` | Sender address for emails (must be verified in SendGrid). | `noreply@yourdomain.com` |

You can leave SendGrid empty if you use Gmail; you can leave Gmail empty if you use SendGrid.

---

### Required: frontend URL

| Variable | Meaning | Example (local) |
|----------|---------|------------------|
| `FRONTEND_URL` | Full URL of the main web app. Used for CORS and links in emails. | `http://localhost:5173` |

Use your real deployed URL in production (e.g. `https://app.yourdomain.com`).

---

### Optional

| Variable | Meaning | Default |
|----------|---------|---------|
| `PORT` | Port the API listens on. | `3003` (this project often uses `3004`; set if needed). |
| `ADMIN_FRONTEND_URL` | URL of the admin app if it runs on a different origin (for CORS). | Not set. e.g. `http://localhost:5174` |
| `OPENAI_API_KEY` | For "Suggest category" on expenses. If unset, that feature returns 503. | Not set. |

---

## 2. Web app environment (`apps/web/.env`)

**Create the file**

1. Go to the folder `apps/web`.
2. Copy `.env.example` and paste it in the same folder.
3. Rename the copy to `.env`.
4. Open `.env` and set the variable below.

---

### Required: API URL

| Variable | Meaning | Example (local) |
|----------|---------|------------------|
| `VITE_API_URL` | Base URL of the API, **no trailing slash**. The web app calls this URL for all requests. | `http://localhost:3004` |

Use the same port (or host) as the API. If your API runs on port 3004, use `http://localhost:3004`. In production, use your API domain (e.g. `https://api.yourdomain.com`).

---

## 3. Admin app environment (`apps/admin/.env`) — optional

You only need this if the **admin app** should talk to an API that is different from the main app (e.g. different port or host).

**Create the file (only if needed)**

1. Go to the folder `apps/admin`.
2. Copy `.env.example` and paste it in the same folder.
3. Rename the copy to `.env`.
4. Set one of the variables below if needed.

| Variable | Meaning | When to set |
|----------|---------|-------------|
| `VITE_ADMIN_API_URL` | API URL used by the admin app. | Only if the admin app uses a different API than the main app. |
| `VITE_API_URL` | Fallback API URL for the admin app. | Only if you need to override the default (e.g. for production build). |

**If you don’t create `apps/admin/.env`:** In development, the admin app usually uses the Vite proxy and talks to the same API as the main app (e.g. `localhost:3004`). So for local dev you can skip this file.

---

## Quick checklist

- [ ] **API:** `apps/api/.env` exists (from `.env.example`).  
  - [ ] `DATABASE_URL` and `DIRECT_URL` set.  
  - [ ] `JWT_SECRET` set.  
  - [ ] Email: either Gmail (`SMTP_USER`, `SMTP_PASS`) or SendGrid (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`).  
  - [ ] `FRONTEND_URL` set (e.g. `http://localhost:5173`).  
- [ ] **Web:** `apps/web/.env` exists.  
  - [ ] `VITE_API_URL` set (e.g. `http://localhost:3004`).  
- [ ] **Admin:** Only if needed: `apps/admin/.env` with `VITE_ADMIN_API_URL` or `VITE_API_URL`.

After this, run [Step 3 (Database)](quick-start-2-and-3.md#step-3--database-in-order) from the repo root: `npm run db:generate` then `npm run db:push`.
