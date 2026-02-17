# Deployment

KoboTrack deployment: **Vercel** (frontend) plus either **Render** or **Railway** (API + PostgreSQL). Follow one runbook in order.

---

## Option A — Deploy with Render (API + PostgreSQL)

Use this for the API and database. The frontend is deployed on **Vercel** (Step 4).

### Render Step 1 — Create PostgreSQL and get the database URL

1. Open [render.com](https://render.com) and sign in with **GitHub**.
2. In the dashboard, click **New +** → **PostgreSQL**.
3. **Name** the database (e.g. `koboTrack-db`). Choose **Free** (or a paid plan). **Region** — pick one. Click **Create Database**.
4. Wait until the database is **Available**. Open it and go to **Info** or **Connect**.
5. Copy **Internal Database URL** (for the API service on Render). Copy **External Database URL** (for running `prisma db push` from your PC). Save both.

### Render Step 2 — Create the API Web Service

1. In the Render dashboard, click **New +** → **Web Service**.
2. **Connect a repository** → select your KoboTrack repo (e.g. **SamBef/School-Project**). Authorize Render if asked.
3. **Configure:**
   - **Name:** e.g. `koboTrack-api`
   - **Region:** same as the database (or nearby).
   - **Branch:** `main` (or your default branch).
   - **Root Directory:** **`apps/api`** (required for the monorepo).
   - **Runtime:** **Node**.
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
4. **Instance type:** **Free** (or paid).
5. **Environment variables** — Add:
   - **`DATABASE_URL`** — Paste the **Internal Database URL** from Step 1 (Render will also offer to link the database; use the internal URL).
   - **`JWT_SECRET`** — Long random string (e.g. from PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])`).
   - **`FRONTEND_URL`** — Leave empty for now; set after Vercel deploy (Step 4).
   - **`SENDGRID_API_KEY`** and **`SENDGRID_FROM_EMAIL`** — Optional.
6. Click **Create Web Service**. Render will build and deploy. The service URL will be like **`https://koboTrack-api.onrender.com`** (or similar). Copy it (no trailing slash) — you’ll use it for Vercel and for `FRONTEND_URL`.

### Render Step 3 — Apply the database schema

1. On your PC, set **`DATABASE_URL`** in `apps/api/.env` to the **External Database URL** from Render Step 1 (or set it only for this run in PowerShell).
2. In PowerShell:
   ```powershell
   cd c:\Users\User\Desktop\DTTRASM\apps\api
   npx prisma db push
   ```
3. Revert `apps/api/.env` to your local DB URL afterward if you use one.
4. In Render, the API service may auto-redeploy; if the first deploy failed, trigger **Manual Deploy** from the dashboard.

### Render Step 4 — Vercel (frontend)

**Add new project** → **Import Git Repository** → select your KoboTrack repo. **Root Directory:** `apps/web`. **Framework Preset:** Vite (or leave auto). **Build Command:** `npm run build`. **Output Directory:** `dist`. **Environment variable:** `VITE_API_URL` = your **Render** API URL (e.g. `https://koboTrack-api.onrender.com`), no trailing slash. Deploy and copy your Vercel site URL (e.g. `https://kobo-track.vercel.app`).

### Render Step 5 — Wire frontend URL into API

1. In **Render** → your API **Web Service** → **Environment**.
2. Add or edit **`FRONTEND_URL`** = your **Vercel** site URL (e.g. `https://kobo-track.vercel.app`), no trailing slash. Save. Render will redeploy with the new variable.

### Render Step 6 — Post-deploy checks

Open the **Vercel** URL, register, log in, check Dashboard, invite (if SendGrid), smoke-test Transactions/Expenses/Export. Document the live URLs (Vercel URL = app, Render API URL = API).

**Render free tier:** The API may spin down after idle time; the first request can take 30–60 seconds (cold start). Subsequent requests are faster.

---

### Execute Render Steps 3–6 in order (no back-and-forth)

Do these in sequence. Have these ready before you start: **Render External Database URL** (from Step 1), **Render API URL** (from Step 2, e.g. `https://koboTrack-api.onrender.com`).

---

**Step 3 — Apply the database schema (on your PC only)**

1. Open **PowerShell** (or Terminal).
2. Go to the API folder:
   ```powershell
   cd c:\Users\User\Desktop\DTTRASM\apps\api
   ```
3. Set the production database URL for this run only (paste your **Render External Database URL** between the quotes):
   ```powershell
   $env:DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
   ```
4. Apply the schema:
   ```powershell
   npx prisma db push
   ```
5. You should see “Your database is now in sync with your schema” or similar. Clear the env var so later commands don’t use production:
   ```powershell
   Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
   ```
6. **Render dashboard:** Open [dashboard.render.com](https://dashboard.render.com) → your **API Web Service**. If the latest deploy **failed**, click **Manual Deploy** → **Deploy latest commit**. Otherwise do nothing. Leave this tab open.

---

**Step 4 — Deploy the frontend on Vercel (Vercel only)**

1. Open [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. **Add New** → **Project** (or **Import Git Repository**). Select your KoboTrack repo (e.g. **SamBef/School-Project**).
3. **Configure Project:**  
   - **Root Directory:** click **Edit** and set to **`apps/web`** (required for the monorepo).  
   - **Framework Preset:** Vite (auto-detected or select Vite).  
   - **Build Command:** `npm run build`  
   - **Output Directory:** `dist`  
4. **Environment Variables** → **Add** → **Key:** `VITE_API_URL`, **Value:** your **Render API URL** (e.g. `https://koboTrack-api.onrender.com`), **no trailing slash**. Apply to Production (and Preview if you want).
5. Click **Deploy**. Wait until the build finishes.
6. Copy your **Vercel site URL** from the dashboard (e.g. `https://kobo-track.vercel.app` or `https://your-project.vercel.app`). Paste it into a notepad — you need it for Step 5.

---

**Step 5 — Set FRONTEND_URL in Render (Render only)**

Do this so the API allows requests from your Vercel site (CORS) and uses the correct URL in invite/reset emails.

1. **Open Render:** Go to [dashboard.render.com](https://dashboard.render.com) in your browser and sign in if needed.
2. **Open your API service:** On the dashboard you’ll see a list of services. Click the **API Web Service** you created in Step 2 (e.g. **koboTrack-api** or the name you gave it). Do **not** click the PostgreSQL database.
3. **Open Environment:** On the service page you’ll see tabs or a left sidebar (Overview, Logs, **Environment**, Metrics, Settings, etc.). Click **Environment**.
4. **Add or edit FRONTEND_URL:**
   - If **FRONTEND_URL** is already in the list: click its **value** (or the **Edit** / pencil icon next to it). In the **Value** field, type or paste your **Vercel site URL** from Step 4 (e.g. `https://kobo-track.vercel.app`). **No trailing slash.** Click **Save** or **Update**.
   - If **FRONTEND_URL** is not in the list: click **Add Environment Variable** (or **+ Add**). In **Key**, type exactly: **`FRONTEND_URL`**. In **Value**, paste your **Vercel site URL** from Step 4 (e.g. `https://kobo-track.vercel.app`). **No trailing slash.** Click **Save** or **Add**.
5. **Confirm:** The **Environment** tab should show **FRONTEND_URL** with your Vercel URL as the value. Render will redeploy the API automatically; you can go to the **Logs** or **Events** tab to see the new deploy. Wait for it to finish (optional but recommended) before testing the app in Step 6.

---

**Step 6 — Post-deploy checks (browser only)**

1. Open your **Vercel site URL** in a browser (the one you set as FRONTEND_URL).
2. **Register:** Create a new business and user; confirm you can **log in**.
3. **Dashboard:** After login, open the dashboard and confirm it loads (numbers can be zero).
4. **Invite (if you use SendGrid):** Send an invite; open the email and check the link uses your Vercel URL. Without SendGrid, use the invite link shown on screen and set a password.
5. **Smoke test:** Open **Transactions**, **Expenses**, and **Export** and confirm the pages load without errors.
6. **Document:** Write down the **live URLs** — Vercel URL = app, Render API URL = API — in your README or report.

You’re done. No need to go back to earlier steps if you followed the order above.

---

### Host the admin app (Render + Vercel)

Use this when your API is on **Render** (Option A). The admin app is a **second Vercel project** from the same repo, plus one env var on Render and one admin user.

**Before you start:** Have your **Render API URL** (e.g. `https://school-project.onrender.com`). You’ll get the **admin site URL** after Step 1.

---

**Admin Step 1 — Deploy the admin app on Vercel (second project)**

1. Open [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. **Add New** → **Project** → select the **same repo** (e.g. **SamBef/School-Project**). Do **not** use your existing main app project; create a **new** project for the admin app.
3. **Configure Project:**
   - **Root Directory:** set to **`apps/admin`** (required for the monorepo).
   - **Framework Preset:** Vite. **Build Command:** `npm run build`. **Output Directory:** `dist`.
4. **Environment Variables** → **Add** → **Key:** `VITE_API_URL`, **Value:** your **Render API URL** (same as main app), **no trailing slash**.
5. Click **Deploy**. Wait until the build finishes.
6. Copy your **admin site URL** (e.g. `https://kobo-track-admin.vercel.app`). Paste it into a notepad — you need it for Admin Step 2 and to log in later.

---

**Admin Step 2 — Allow the admin app in the API (Render CORS)**

1. Open [dashboard.render.com](https://dashboard.render.com) and sign in.
2. Click your **API Web Service** (e.g. **School-Project**).
3. Open the **Environment** tab.
4. **Add Environment Variable** (or edit if it exists):
   - **Key:** `ADMIN_FRONTEND_URL`
   - **Value:** the **admin Vercel URL** from Admin Step 1 (e.g. `https://kobo-track-admin.vercel.app`) — **no trailing slash**.
5. Click **Save**. Render will redeploy the API. Wait for the deploy to finish so the admin app can call the API (CORS).

---

**Admin Step 3 — Create an admin user (one-time)**

The admin app needs at least one admin account. You create it from your PC by running a script that writes to the **production** database on Render. Do this once; then you can log in to the admin site with that email and password.

---

**3a — Get the External Database URL from Render**

1. Open [dashboard.render.com](https://dashboard.render.com) and sign in.
2. On the dashboard you’ll see your services. Click the **PostgreSQL** service (your database), **not** the **School-Project** (API) service.
3. On the database page, open the **Info** tab (or **Connect**). Find **External Database URL** (or **Connection string (external)**). It starts with `postgresql://` and is different from the Internal URL.
4. Click to **copy** the full External Database URL and paste it into a notepad. You’ll use it in step 3c.

---

**3b — Open PowerShell and go to the API folder**

1. On your PC, open **PowerShell** (Windows key → type “PowerShell” → open it).
2. Run:
   ```powershell
   cd c:\Users\User\Desktop\DTTRASM\apps\api
   ```
   (If your project is elsewhere, use that path instead.) You should now be in the `apps\api` folder.

---

**3c — Set the three environment variables (one command per line)**

Run these three commands in **the same PowerShell window**, one after the other. Replace the placeholders with your real values.

1. **DATABASE_URL** — paste your **Render External Database URL** between the quotes (the one you copied in 3a):
   ```powershell
   $env:DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```
   Use your full URL; it’s usually long and may contain special characters. Keep the quotes.

2. **ADMIN_EMAIL** — the email you want to use to log in to the admin app:
   ```powershell
   $env:ADMIN_EMAIL="your-admin@example.com"
   ```
   Replace with your real email (e.g. `samuelsefa004@gmail.com`).

3. **ADMIN_INITIAL_PASSWORD** — the password you want for that admin account (choose a strong one):
   ```powershell
   $env:ADMIN_INITIAL_PASSWORD="YourSecurePassword"
   ```
   Replace with your real password. Avoid spaces in the password when typing in PowerShell, or put it in quotes if it has spaces.

---

**3d — Run the create-admin script**

1. In the **same** PowerShell window (still in `apps\api`), run:
   ```powershell
   node scripts/create-admin.js
   ```
2. You should see either:
   - **“Admin created for your-admin@example.com”** — success; that email is now an admin.
   - **“Admin already exists for your-admin@example.com”** — that admin was created earlier; you can still use it to log in.
3. If you see an error (e.g. “Can’t reach database” or “Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD”), check that you ran all three `$env:...` commands in 3c and that `DATABASE_URL` is the **External** URL from Render.

---

**3e — Clear the environment variables (so you don’t use production by mistake later)**

Run these three commands in the same PowerShell window:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_INITIAL_PASSWORD -ErrorAction SilentlyContinue
```

After this, the admin account is ready. Go to **Admin Step 4** and log in to the admin site with the email and password you set in 3c.

---

**Admin Step 4 — Log in to the admin app**

1. Open your **admin site URL** (from Admin Step 1) in a browser.
2. Log in with the **email** and **password** you set in Admin Step 3.
3. Confirm the dashboard loads (companies table, platform stats). You can open a company to see detail and activity.

You’re done. Bookmark the admin site URL for future use.

---

## Option B — Deploy with Railway (API + PostgreSQL)

---

## Step 1 — Where to create the project and how to add PostgreSQL (Railway)

**Where:** In the Railway dashboard, in your account.

**How:**

1. Open [railway.app](https://railway.app) in your browser.
2. Click **Login** (or **Start a New Project** if not logged in) and sign in with **GitHub**.
3. On the dashboard you’ll see **New Project**. Click it.
4. You’ll see options like **Deploy from GitHub repo** and **Empty project**.
   - **Easiest:** Click **Empty project**. That creates a project with no services. You’ll add PostgreSQL and the API next.
   - (Alternatively you can **Deploy from GitHub repo** first and add PostgreSQL afterward; the order doesn’t matter for “project + Postgres”.)
5. **Add PostgreSQL:**
   - In your new (possibly empty) project, click **+ New** (or **Add service**).
   - Choose **Database**.
   - Click **Add PostgreSQL** (or **PostgreSQL**). Railway will create a Postgres service and attach it to the project.
6. **Get the database URL:**
   - Click the **PostgreSQL** service card in the project.
   - Open the **Variables** tab (or **Connect** / **Data** depending on Railway’s UI). You’ll see **`DATABASE_URL`**.
   - Click to copy **`DATABASE_URL`** and save it in a notepad or password manager. You’ll paste it into the API service in Step 2.

You now have a project and a PostgreSQL database. Next: add the API service.

---

## Step 2 — How to add and configure the API service (Railway)

**Where:** Same Railway project as Step 1.

**How:**

1. **Add a service from GitHub:**
   - In the project view, click **+ New** (or **Add service**).
   - Select **GitHub Repo** (or **Deploy from GitHub**). Authorize Railway for GitHub if asked.
   - Choose your KoboTrack repo (e.g. **SamBef/School-Project**). Confirm. Railway will add a new service that builds from that repo.

2. **Point the service at the API folder:**
   - Click the **new service** (the one that’s not PostgreSQL). Its name might be the repo name.
   - Go to the **Settings** tab (or **Configure**).
   - Find **Root Directory**, **Build path**, or **Source** and set it to: **`apps/api`**. Save if there’s a Save button.

   **What the root directory does:** Railway clones your whole repo (the monorepo). By default it would run build and start from the **repo root**, where there is no API code — only the root `package.json`. Setting **Root Directory** to **`apps/api`** tells Railway: “Treat this folder as the project root.” From then on, every command (build, start) runs **inside** `apps/api`. So `npm install` installs the API’s dependencies (from `apps/api/package.json`), `npx prisma generate` reads `apps/api/prisma/schema.prisma`, and `npm start` runs the API’s start script (e.g. `node src/index.js`). Without this, Railway would look for `package.json` at the repo root and the API would not run correctly.

3. **Set build and start commands:**
   - In the same **Settings**:
     - **Build Command:** `npm install && npx prisma generate`
     - **Start Command:** `npm start`
   - Save.

   **What happens after (each deploy):** When Railway deploys, it (1) clones the repo, (2) changes into the root directory you set (`apps/api`), (3) runs the **build command** there: `npm install` installs dependencies, then `npx prisma generate` creates the Prisma client from your schema (no database tables are created yet — that’s Step 3). (4) Railway then runs the **start command** `npm start`, which starts your API server (e.g. `node src/index.js`). The server listens on the port Railway provides and is exposed via the public URL you generate in step 5 below.

4. **Add environment variables:**
   - Open the **Variables** tab for this API service.
   - Add (or edit) these variables. Use **New Variable** or **Add variable** for each:
     - **`DATABASE_URL`** — Paste the value you copied from the PostgreSQL service in Step 1. (Some UIs let you reference it, e.g. `${{Postgres.DATABASE_URL}}`; if so, you can use that instead of pasting.)
     - **`JWT_SECRET`** — Any long random string (e.g. run in PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])` and paste the result).
     - **`FRONTEND_URL`** — Leave empty for now; you’ll set it in Step 5.
     - **`SENDGRID_API_KEY`** and **`SENDGRID_FROM_EMAIL`** — Optional; only if you use SendGrid for emails.

5. **Give the API a public URL:**
   - In **Settings**, find **Networking** or **Public networking**.
   - Click **Generate domain** (or **Enable public access**). Railway will assign a URL like `https://something.up.railway.app`.
   - Copy that **full URL** (no trailing slash) and save it — you’ll use it in Vercel and for `FRONTEND_URL` later.

6. Trigger a **Deploy** (or wait for auto-deploy). The first deploy may fail until you run Step 3 (database schema). That’s expected.

**Config from repo:** The repo has `apps/api/railway.json` with build and start commands. In Railway → API service → **Settings** → **Config-as-code**, you can set **Railway Config File** (or config file path) to **`apps/api/railway.json`** so Railway uses those commands from the repo instead of only the dashboard.

---

## Step 3 — How to apply the database schema

**Where:** Either on your own machine (recommended) or in Railway’s shell for the API service, using the production `DATABASE_URL`.

**How (from your machine):**

1. On your PC, open the project folder (e.g. `c:\Users\User\Desktop\DTTRASM`).
2. Create or edit `apps/api/.env` and set **only** the production database URL (temporarily):
   ```env
   DATABASE_URL="postgresql://...paste the Railway Postgres URL here..."
   ```
   Use the exact `DATABASE_URL` you copied from Railway in Step 1.
3. Open PowerShell (or Terminal) and run:
   ```powershell
   cd c:\Users\User\Desktop\DTTRASM\apps\api
   npx prisma db push
   ```
4. You should see a message that the schema was applied. If there’s an error, check that `DATABASE_URL` is correct and that your IP is allowed (Railway’s Postgres is usually reachable from the internet).
5. (Optional) Remove or revert the production `DATABASE_URL` from `apps/api/.env` after Step 3 so you don’t accidentally run local commands against production.

**Alternative (Railway shell):** If your Railway plan has a “Shell” or “Console” for the API service, open it, then run `npx prisma db push` there (Railway will use the service’s `DATABASE_URL`).

After this, redeploy or restart the API service in Railway so it starts with the schema in place.

---

## Step 4 — How to deploy the frontend on Vercel

**Where:** Vercel dashboard, then your GitHub repo.

**How:**

1. Open [vercel.com](https://vercel.com) and sign in (e.g. **Continue with GitHub**).
2. **Add New** → **Project** → **Import Git Repository** → select your KoboTrack repo (e.g. **SamBef/School-Project**).

3. **Configure Project:** **Root Directory:** set to **`apps/web`**. **Framework Preset:** Vite. **Build Command:** `npm run build`. **Output Directory:** `dist`.

4. **Environment Variables** → **Add** → **Key:** `VITE_API_URL`, **Value:** your **API** public URL (Render or Railway), **no trailing slash**. Apply to Production (and Preview if desired).

5. Click **Deploy**. Wait until the build finishes (green “Published” or “Site is live”).

6. Copy your **site URL** (e.g. `https://kobo-track.vercel.app`) from the dashboard. You’ll use it in Step 5.

---

## Step 5 — How to wire the frontend URL into the API

**Where:** Railway → your API service → Variables.

**How:**

1. Go back to [railway.app](https://railway.app) and open the **same project**.
2. Click the **API service** (the one you added from GitHub), not the PostgreSQL service.
3. Open the **Variables** tab.
4. Find **`FRONTEND_URL`** and set its value to your **Vercel site URL** (e.g. `https://kobo-track.vercel.app`). No trailing slash. If the variable didn’t exist, add it with **New Variable**.
5. Save. Railway often auto-redeploys when variables change; if not, use **Redeploy** or **Deploy** so the API restarts with the new `FRONTEND_URL`. CORS and email links will then use the Vercel URL.

---

## Step 6 — How to do post-deploy checks

**Where:** In your browser, on the live Vercel URL.

**How:**

1. Open the **Vercel site URL** (from Step 4) in a browser.
2. **Register:** Use “Register” or “Sign up”, create a business and user, and confirm you can **log in**.
3. **Dashboard:** After login, open the dashboard and confirm it loads (numbers can be zero).
4. **Invite (if you use SendGrid):** Send an invite to an email; open the email and check the link points to your Vercel URL (not localhost). If you don’t use SendGrid, use the invite link shown on screen and set a password.
5. **Quick smoke test:** Open **Transactions**, **Expenses**, and **Export** and confirm pages load without errors.
6. **Document:** Write down the **live URLs** (Vercel URL = main app, Railway URL = API) in your README or report.

---

## Admin app — How to deploy it (reference)

For **Render (Option A)**, use the full walkthrough: **Host the admin app (Render + Vercel)** above (Admin Steps 1–4).

For **Railway (Option B)**: Create a **second Vercel project** from the same repo with **Root Directory** `apps/admin`, **Output Directory** `dist`, and **VITE_API_URL** = your Railway API URL. Then in **Railway** → API service → **Variables**, add **ADMIN_FRONTEND_URL** = your admin Vercel URL (no trailing slash). Create an admin user once: from your machine set `DATABASE_URL` (production), `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, then run `node scripts/create-admin.js` from `apps/api`.

---

## Deploy from the terminal (Railway CLI)

If you prefer to deploy and set variables from your machine:

1. **Install the CLI** (one time): `npm install -g @railway/cli`
2. **Log in** (one time; opens browser): run **`railway login`** in PowerShell or CMD and complete the login in the browser.
3. **Link the API service** (one time): run **`cd apps\api`** then **`railway link`**. Select your **workspace**, **project** (e.g. joyful-exploration), **environment** (e.g. production), and — when the CLI asks — the **service** (e.g. eloquent-stillness). Linking from `apps/api` and selecting the API service avoids “Failed to upload code 404” when you deploy.
4. **Deploy:** from the repo root run **`.\scripts\deploy-railway.ps1`** (the script runs `railway up` from `apps/api`). Or run **`cd apps\api`** then **`railway up`**.
5. **Set FRONTEND_URL:** after your Vercel site is live, run  
   **`railway variables set FRONTEND_URL=https://your-project.vercel.app`** (use your real Vercel URL, no trailing slash).
6. **Generate domain (if not done):** in the Railway dashboard → API service → Settings → Networking → **Generate domain**, or run **`railway domain`** if the CLI supports it.

You can also run the script: from repo root, **`.\scripts\deploy-railway.ps1`** (after you’ve run `railway login` and **`railway link` from `apps\api`** and selected the API service). To set FRONTEND_URL at deploy time: **`.\scripts\deploy-railway.ps1 -FrontendUrl "https://your-project.vercel.app"`**

**If you get “Failed to upload code with status code 404”:** **Workaround:** Your API service was created from **Deploy from GitHub repo**. Railway does not accept CLI uploads for those services. Use GitHub as the source: push your code to GitHub, then in Railway open the API service → **Deployments** → **Redeploy** (or **Deploy latest commit**) to trigger a new build from the repo. Set Variables and Generate domain in the dashboard. Use **`railway variables set`** from `apps\api` to change env vars; use **`railway redeploy`** to trigger a redeploy from GitHub (no upload).

---

## Troubleshooting: “Failed to fetch” on login

If the main app (Vercel) shows **“Failed to fetch”** when you try to log in, the browser cannot reach the API or the request is blocked. The app now shows a clearer message when it can:

- **“API URL is not configured…”** → The built site has no API URL. In **Vercel** → your project → **Settings** → **Environment Variables**, add **VITE_API_URL** = your **Render API URL** (e.g. `https://school-project.onrender.com`), **no trailing slash**. Then **Redeploy** the project (or push a new commit) so the new value is baked into the build.
- **“Cannot reach the API at https://…”** → The URL is set but the request fails (network error or CORS). Do all of the following:
  1. **Render API URL:** In Render → **School-Project** (API service) → copy the service URL from the top (e.g. `https://school-project.onrender.com`). Open **that URL + /health** in a new tab (e.g. `https://school-project.onrender.com/health`). You should see `{"status":"ok",...}`. If it doesn’t load or times out, the API may be sleeping (free tier); wait 30–60 seconds and try again, then try login again.
  2. **VITE_API_URL:** In Vercel → **Environment Variables**, **VITE_API_URL** must be **exactly** that Render URL (no trailing slash). If you changed it, **redeploy** the project.
  3. **FRONTEND_URL (CORS):** In Render → **School-Project** → **Environment**, **FRONTEND_URL** must be **exactly** your main app URL (e.g. `https://kobo-track.vercel.app`), **no trailing slash**. Save and wait for the API to redeploy.

**If the console says "blocked by CORS policy: No 'Access-Control-Allow-Origin' header":** Set **FRONTEND_URL** on Render to **exactly** your Vercel URL (e.g. `https://kobo-track.vercel.app`), no trailing slash, save, wait for redeploy, then check **Logs** for `CORS allowed origins: https://kobo-track.vercel.app`. If the API crashes on startup, fix those errors first.

After any change to env vars on Vercel, **redeploy** the project so the frontend is rebuilt with the correct API URL.

---

## Reference: build and env

### Frontend (Vercel)

| Setting            | Value               |
|--------------------|---------------------|
| Root Directory     | `apps/web`          |
| Build command      | `npm run build`     |
| Output Directory   | `dist`              |
| Env var            | `VITE_API_URL` = Render or Railway API URL (no trailing slash) |

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
