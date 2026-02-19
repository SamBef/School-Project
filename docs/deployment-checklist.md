# Deployment checklist — main app, admin app, API

Use this before deploying so both apps and the API are ready for production.

---

## 1. Environment variables

### API (`apps/api/.env`)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | PostgreSQL (e.g. Supabase). Password URL-encoded. |
| `DIRECT_URL` | Yes | Same as `DATABASE_URL` for Supabase pooler; or direct DB URL. |
| `JWT_SECRET` | Yes | Long random string. **Never** use the dev value in production. |
| `FRONTEND_URL` | Yes | Main app origin for CORS and email links (e.g. `https://app.yourdomain.com`). |
| `ADMIN_FRONTEND_URL` | Yes | Admin app origin for CORS and reset links (e.g. `https://admin.yourdomain.com`). |
| `PORT` | Optional | Default 3003. Set on your host (e.g. Render, Railway). |
| `SMTP_*` or `SENDGRID_*` | For emails | Invites, forgot-password, reset. |
| `OPENAI_API_KEY` | Optional | For KoboAI features. |

Do **not** set `NODE_TLS_REJECT_UNAUTHORIZED=0` or `DATABASE_INSECURE_SSL=1` in production.

### Main web app (`apps/web`)

- **Build-time:** Set `VITE_API_URL` to your **production API URL** (e.g. `https://api.yourdomain.com`), no trailing slash.  
- If unset at build time, the app will show “API URL is not configured” when users try to use it.

### Admin app (`apps/admin`)

- **Build-time:** Set `VITE_ADMIN_API_URL` (or `VITE_API_URL`) to your **production API URL** (e.g. `https://api.yourdomain.com`).  
- If unset in production build, the first API call will fail with a message to set the env and rebuild.

---

## 2. Database

- Run migrations (or `npx prisma db push`) against the **production** database **before** first deploy.  
- Create at least one admin user: from `apps/api`,  
  `ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_INITIAL_PASSWORD=... node scripts/create-admin.js`  
  (use a strong password and keep it secret).

---

## 3. API

- CORS is driven by `FRONTEND_URL` and `ADMIN_FRONTEND_URL`. Both must match the deployed app origins exactly (scheme + host + port if non-default).  
- Health: `GET /health` should return 200. Use it for readiness checks.  
- Smoke test (optional): with the API running,  
  `API_URL=https://api.yourdomain.com node apps/api/scripts/smoke-test-api.js`  
  (from repo root or `apps/api`).

---

## 4. Builds and EPERM (Windows)

- `npm run build` and `npx prisma …` can hit **EPERM** when run from Cursor/IDE.  
- Run them from a **normal PowerShell (or terminal) outside Cursor**:  
  - From repo root: `npm run build:web` then `npm run build:admin` (or add a `build:all` script that runs both + API).  
  - Or per app: `cd apps/web` → `npm run build`; `cd apps/admin` → `npm run build`; `cd apps/api` → `npx prisma generate` / `npx prisma db push`.  
- Same for running tests and lint if you use them before deploy.  
- **Lint:** Each app has an ESLint config (`.eslintrc.cjs`) and lints `src` only. Run `npm run lint` from root to lint all workspaces.

---

## 5. Pre-deploy checks

- [ ] API: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_FRONTEND_URL` set for production.  
- [ ] Main app: `VITE_API_URL` set to production API URL and app built with it.  
- [ ] Admin app: `VITE_ADMIN_API_URL` (or `VITE_API_URL`) set to production API URL and app built with it.  
- [ ] Database: schema applied; at least one admin user created.  
- [ ] No dev-only env (e.g. `NODE_TLS_REJECT_UNAUTHORIZED=0`) in production.  
- [ ] Main app: login, register, forgot-password, and at least one protected route work.  
- [ ] Admin app: login (name + password), forgot-password, profile, companies list, and create company work.

---

## 6. Testing before deploy

- **API:** From `apps/api`: `npm run test` (unit); `npm run test:smoke` (with API running).  
- **Web:** From `apps/web`: `npm run test` (Vitest).  
- **Lint:** From root: `npm run lint` (all workspaces).  
- **Manual:** After building, run the main app and admin app (e.g. `npm run preview` in each or serve `dist`), then: login/register, create transaction, open profile, switch theme; admin: login, companies list, create company, company detail, add user, profile, forgot/reset password.

---

## 7. Ports (local reference)

- API: default `3003`; project often uses `3004` in `.env`.  
- Main app dev: `5173`.  
- Admin app dev: `5174`.  
- Smoke test default: `http://localhost:3004` (set `API_URL` if your API uses another port).
