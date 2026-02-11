# Deployment

KoboTrack deployment: **Netlify** (frontend), **Railway** (API + PostgreSQL). Follow the runbook in order.

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
   - Copy that **full URL** (no trailing slash) and save it — you’ll use it in Netlify and for `FRONTEND_URL` later.

6. Trigger a **Deploy** (or wait for auto-deploy). The first deploy may fail until you run Step 3 (database schema). That’s expected.

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

## Step 4 — How to deploy the frontend on Netlify

**Where:** Netlify dashboard, then your GitHub repo.

**How:**

1. Open [netlify.com](https://www.netlify.com) and sign in (e.g. **Log in with GitHub**).
2. **Create a new site:**
   - Click **Add new site** → **Import an existing project** (or **Import from Git**).
   - Choose **GitHub**. Authorize Netlify if asked.
   - Pick the **GitHub account** and the **repository** (e.g. SamBef/School-Project). Click it.

3. **Configure the build (important):**
   - **Branch to deploy:** `main` (or your default branch).
   - **Base directory:** Click **Options** or **Edit settings**, then set **Base directory** to: **`apps/web`**.
   - **Build command:** `npm run build`
   - **Publish directory:** `apps/web/dist`
   - Leave other fields as default unless you use a different branch.

4. **Add the API URL before first deploy:**
   - Expand **Environment variables** (or **Advanced build settings** → **Environment variables**).
   - Click **Add a variable** or **New variable**.
   - **Key:** `VITE_API_URL`  
     **Value:** The Railway API URL from Step 2 (e.g. `https://your-api-name.up.railway.app`) — **no trailing slash**.

5. Click **Deploy site** (or **Deploy**). Wait until the build finishes (green “Published” or “Site is live”).

6. Copy your **site URL** (e.g. `https://random-name-123.netlify.app`) from the top of the site dashboard or the deploy summary. You’ll use it in Step 5.

---

## Step 5 — How to wire the frontend URL into the API

**Where:** Railway → your API service → Variables.

**How:**

1. Go back to [railway.app](https://railway.app) and open the **same project**.
2. Click the **API service** (the one you added from GitHub), not the PostgreSQL service.
3. Open the **Variables** tab.
4. Find **`FRONTEND_URL`** and set its value to your **Netlify site URL** (e.g. `https://random-name-123.netlify.app`). No trailing slash. If the variable didn’t exist, add it with **New Variable**.
5. Save. Railway often auto-redeploys when variables change; if not, use **Redeploy** or **Deploy** so the API restarts with the new `FRONTEND_URL`. CORS and email links will then use the Netlify URL.

---

## Step 6 — How to do post-deploy checks

**Where:** In your browser, on the live Netlify URL.

**How:**

1. Open the **Netlify site URL** (from Step 4) in a browser.
2. **Register:** Use “Register” or “Sign up”, create a business and user, and confirm you can **log in**.
3. **Dashboard:** After login, open the dashboard and confirm it loads (numbers can be zero).
4. **Invite (if you use SendGrid):** Send an invite to an email; open the email and check the link points to your Netlify URL (not localhost). If you don’t use SendGrid, use the invite link shown on screen and set a password.
5. **Quick smoke test:** Open **Transactions**, **Expenses**, and **Export** and confirm pages load without errors.
6. **Document:** Write down the **live URLs** (Netlify URL = main app, Railway URL = API) in your README or report.

---

## Admin app — How to deploy it

**Where:** Netlify again, as a **second site** (separate from the main web app). Then Railway API variables.

**How:**

1. **Create a second Netlify site** (same as Step 4, but different settings):
   - In Netlify: **Add new site** → **Import an existing project** → **GitHub** → select the **same repo** (e.g. SamBef/School-Project).
2. **Use admin build settings:**
   - **Base directory:** **`apps/admin`**
   - **Build command:** `npm run build`
   - **Publish directory:** **`apps/admin/dist`**
3. **Environment variable:**
   - **Key:** `VITE_API_URL`  
     **Value:** The **same** Railway API URL as the main app (e.g. `https://your-api-name.up.railway.app`) — no trailing slash.
4. **Deploy** and note the **admin site URL** (e.g. `https://your-admin-site.netlify.app`).

5. **Allow the admin app in the API (CORS):**
   - In **Railway** → your **API service** → **Variables**.
   - Add (or edit): **`ADMIN_FRONTEND_URL`** = your **admin Netlify URL** (e.g. `https://your-admin-site.netlify.app`). No trailing slash.
   - Save; redeploy the API if it doesn’t auto-redeploy.

6. **Create an admin user** (one-time): The API has an admin table; you must create an admin account. From your machine, with production `DATABASE_URL` in `apps/api/.env`, run (or use Railway’s script runner if available):
   ```powershell
   cd c:\Users\User\Desktop\DTTRASM\apps\api
   $env:ADMIN_EMAIL="your-admin@example.com"; $env:ADMIN_INITIAL_PASSWORD="YourSecurePassword"; node scripts/create-admin.js
   ```
   Then open the admin site URL, log in with that email and password, and confirm the dashboard and company list load.

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
