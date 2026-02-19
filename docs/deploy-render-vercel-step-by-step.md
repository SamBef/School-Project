# Deploy step by step: Render (API) + Vercel (Web & Admin)

You chose: **Database = Supabase**, **API = Render**, **Web = Vercel**, **Admin = Vercel**.

This guide is **one click at a time**. It also tells you **exactly where to get every value** for Render’s environment variables.

---

# Step 2 — Deploy the API on Render (click by click)

---

## Part A — Create the Web Service on Render

1. Open your browser and go to **https://render.com**.
2. If you are not logged in: click **Get Started** or **Sign In** → choose **Sign in with GitHub** → authorize Render.
3. You should see the **Dashboard**. At the top right, click the blue button **New +**.
4. In the menu that opens, click **Web Service**.
5. If you see “Connect a repository” or a list of Git providers:
   - Click **GitHub** (or **Connect account** next to GitHub).
   - In the GitHub popup, choose **Authorize Render** (or grant access to your repos).
   - You may be sent back to Render; if you see the repo list, continue. If not, click **New +** → **Web Service** again.
6. You should now see **Create new Web Service** and a list of your GitHub repositories.
7. Find **School-Project** (or the repo name you use). Click the **Connect** button on the right of that row.
8. The page will change to a form titled **Create new Web Service**. Do not click **Create Web Service** yet.

---

## Part B — Fill in the form (each field, one by one)

9. **Name**  
   - Find the **Name** field at the top.  
   - Type: `kobotrack-api` (or any name you like, lowercase, hyphens only).  
   - This will be in your URL: `https://kobotrack-api.onrender.com`.

10. **Region**  
    - Find the **Region** dropdown.  
    - Click it and choose one, e.g. **Frankfurt (EU Central)** or **Oregon (US West)**.

11. **Branch**  
    - Find **Branch**.  
    - Leave or set to: `main`.

12. **Root Directory**  
    - Find **Root Directory**. It may say “Leave blank for repository root”.  
    - Click in the box and type exactly: `apps/api`  
    - This is required so Render runs the API app, not the whole repo.

13. **Runtime**  
    - Find **Runtime**.  
    - Select **Node** (should be default).

14. **Build Command**  
    - Find **Build Command**.  
    - Clear any default and type exactly:  
      `npm install && npx prisma generate`

15. **Start Command**  
    - Find **Start Command**.  
    - Type: `npm start`  
    - (If it already says `npm start`, leave it.)

Do **not** click **Create Web Service** yet. Next you add environment variables.

---

## Part C — Where to get every value for Render environment variables

Before you add variables on Render, get the values from the places below. You will paste them in Part D.

---

### 1. NODE_VERSION

- **Value to use:** `20`  
- **Where to get it:** You don’t get it anywhere. Just type: `20`.

---

### 2. DATABASE_URL

- **Where to get it (Supabase):**
  1. Open **https://supabase.com** and log in.
  2. Click your **project** (the one you use for this app).
  3. In the **left sidebar**, click the **gear icon** (Project Settings).
  4. In the left menu of Settings, click **Database**.
  5. Scroll to **Connection string**.
  6. Click the **URI** tab (not “Session mode” or “Transaction” if you see tabs).
  7. You will see a string like:  
     `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres?sslmode=require`  
     or  
     `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
  8. Click **Copy** (or select all and copy).
  9. Paste into Notepad (or any text editor).
  10. Find `[YOUR-PASSWORD]` in the string. Replace it with your **real database password** (the one you set for this Supabase project).  
  11. If your password has special characters, replace them like this so the URL still works:  
      - `@` → `%40`  
      - `#` → `%23`  
      - `$` → `%24`  
      - `%` → `%25`  
      - `&` → `%26`  
      - `+` → `%2B`  
      - `=` → `%3D`  
  12. Copy the **entire** string from Notepad. This is your **DATABASE_URL** value.

---

### 3. DIRECT_URL

- **Value to use:** The **same** string you used for **DATABASE_URL** (same Supabase connection string).  
- **Where to get it:** Copy the same value from your Notepad (the one you fixed with your password).

---

### 4. JWT_SECRET

- **Where to get it:** Generate a new random string (do not use your dev one).
  - Open a **terminal** (PowerShell or Command Prompt) on your PC.
  - Run:  
    `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Copy the long string that appears (e.g. 64 characters). That is your **JWT_SECRET** for production.

---

### 5. FRONTEND_URL (placeholder for now)

- **Value to use:** `https://kobotrack.vercel.app`  
- **Where to get it:** You don’t get it from anywhere yet. Type it as-is. You will change it to your real Vercel web URL after you deploy the web app in Step 3.

---

### 6. ADMIN_FRONTEND_URL (placeholder for now)

- **Value to use:** `https://kobotrack-admin.vercel.app`  
- **Where to get it:** Same as above — type it for now. You will change it to your real admin URL after Step 3.

---

### 7. SMTP_USER (if you use Gmail for emails)

- **Value to use:** Your Gmail address, e.g. `you@gmail.com`.  
- **Where to get it:** The Gmail address you will use to send invite and password-reset emails. Type it in.

---

### 8. SMTP_PASS (if you use Gmail)

- **Where to get it (Gmail App Password):**
  1. Open **https://myaccount.google.com** and sign in.
  2. Click **Security** in the left menu.
  3. Under “How you sign in to Google”, find **2-Step Verification**. If it’s off, turn it **on** first (you need it for App Passwords).
  4. Back on **Security**, find **App passwords** (under “How you sign in to Google”). Click it.
  5. You may be asked for your Google password again.
  6. At “Select app”: choose **Mail** (or **Other** and type e.g. “KoboTrack”).
  7. At “Select device”: choose **Windows Computer** (or any).
  8. Click **Generate**.
  9. A **16-character password** appears (with spaces). Copy it and **remove the spaces** — use only the 16 letters/numbers. That is your **SMTP_PASS** value.

If you use **SendGrid** instead of Gmail, skip SMTP_USER and SMTP_PASS and use SENDGRID_API_KEY and SENDGRID_FROM_EMAIL (see below).

---

### 9. SENDGRID_API_KEY (only if you use SendGrid, not Gmail)

- **Where to get it:**
  1. Open **https://app.sendgrid.com** and log in.
  2. Click **Settings** (in the left sidebar) → **API Keys**.
  3. Click **Create API Key**.
  4. Name it (e.g. “KoboTrack production”).
  5. Choose **Restricted Access** and enable at least **Mail Send**.
  6. Click **Create & View**.
  7. Copy the key that appears **once** (you won’t see it again). That is your **SENDGRID_API_KEY** value.

---

### 10. SENDGRID_FROM_EMAIL (only if you use SendGrid)

- **Value to use:** An email address you have **verified** in SendGrid as a sender.  
- **Where to get it:** SendGrid → **Settings** → **Sender Authentication** — use a verified single sender or domain address (e.g. `noreply@yourdomain.com`).

---

**Do not add these in production:**  
`DATABASE_INSECURE_SSL`, `NODE_TLS_REJECT_UNAUTHORIZED`

---

## Part D — Add the environment variables on Render

16. On the same **Create new Web Service** page, scroll down to the **Environment** section (or the **Environment** tab/section).
17. Click **Add Environment Variable** (or **+ Add**). You will see two boxes: **Key** and **Value**.
18. Add each variable **one by one**:

    - **Key:** `NODE_VERSION`    
      **Value:** `20`  
      Then click **Add** (or the next **Add Environment Variable**).

    - **Key:** `DATABASE_URL`  
      **Value:** (paste the long Supabase string you prepared in Part C, item 2)

    - **Key:** `DIRECT_URL`  
      **Value:** (same as DATABASE_URL)

    - **Key:** `JWT_SECRET`  
      **Value:** (paste the 64-character string you generated in Part C, item 4)

    - **Key:** `FRONTEND_URL`  
      **Value:** `https://kobotrack.vercel.app`

    - **Key:** `ADMIN_FRONTEND_URL`  
      **Value:** `https://kobotrack-admin.vercel.app`

    - **Key:** `SMTP_USER`  
      **Value:** (your Gmail address, e.g. `you@gmail.com`)

    - **Key:** `SMTP_PASS`  
      **Value:** (the 16-character Gmail App Password, no spaces)

    If you use SendGrid instead of Gmail, **do not** add SMTP_USER and SMTP_PASS. Add **SENDGRID_API_KEY** and **SENDGRID_FROM_EMAIL** with the values from Part C, items 9 and 10.

19. When all variables are added, scroll to the bottom of the page.

20. Click the blue **Create Web Service** button.

---

## Part E — Wait for deploy and get your API URL

21. Render will start building. You will see a **Logs** view with output (installing packages, prisma generate, etc.).
22. Wait until the log says the service is **live** or **running** (and there is no red error).
23. At the **top of the page**, you will see a URL like **https://kobotrack-api.onrender.com**. Click it or copy it. **This is your production API URL.** Save it somewhere — you need it for Step 3 (Vercel).
24. Optional check: In the browser, open `https://your-api-url.onrender.com/health` (use your real URL). You should see a short JSON response; that means the API is up.

---

## Part F — (Optional) Create the first admin user

25. On your **own computer**, open a terminal. Go to the project folder and into the API app:
    - `cd c:\Users\User\Desktop\DTTRASM\apps\api`
26. Set the three variables and run the script.  
    **PowerShell:**
    - `$env:ADMIN_NAME="Your Name"`
    - `$env:ADMIN_EMAIL="admin@example.com"`
    - `$env:ADMIN_INITIAL_PASSWORD="YourStrongPassword"`
    - `node scripts/create-admin.js`  
    Use a strong password and the email you will use to log in to the admin app. This user is created in the same Supabase database the Render API uses.

---

You are done with Step 2. Next: **Step 3 — Deploy the Web app and Admin app on Vercel** (same doc or deployment checklist). When you have the two Vercel URLs, come back to **Render → your service → Environment** and replace `FRONTEND_URL` and `ADMIN_FRONTEND_URL` with those real URLs, then save so the API accepts requests from your frontends.

---

# Step 3 — Deploy the Web app and Admin app on Vercel (click by click)

**If you finished Step 2:** Your **production API URL** is the URL Render shows for your service (e.g. `https://kobotrack.onrender.com`). You do **not** set this on Render as an env var — Render gives you the URL. In Step 3 you will use this **exact URL** (no trailing slash) as the value of **VITE_API_URL** for both the web and admin Vercel projects.

---

## Part A — Deploy the main Web app

1. Open **https://vercel.com** in your browser.
2. Log in (e.g. **Continue with GitHub**).
3. On the dashboard, click **Add New…** → **Project**.
4. You will see **Import Git Repository**. Find **School-Project** (or your repo). Click **Import** next to it.
5. You will see **Configure Project**.
6. **Project Name:** type e.g. `kobotrack` (or leave default).
7. **Root Directory:** next to it there is **Edit**. Click **Edit** → in the box type `apps/web` → click **Continue**.
8. **Framework Preset:** should show **Vite**. If not, open the dropdown and choose **Vite**.
9. **Build Command:** leave `npm run build`. **Output Directory:** leave `dist`.
10. Open **Environment Variables** (expand the section).
11. Under **Key**, type: `VITE_API_URL`  
    Under **Value**, paste your **production API URL** from Step 2 (e.g. `https://kobotrack.onrender.com` or `https://kobotrack-api.onrender.com`) — **no trailing slash**.  
    Select **Production** (and **Preview** if you want). Click **Add** or the next field.
12. Click **Deploy**.
13. Wait for the build to finish. When it’s done, you will see a URL like **https://kobotrack.vercel.app**. Copy it — this is your **main app URL**. You will use it in Part C to set `FRONTEND_URL` on Render.

---

## Part B — Deploy the Admin app

14. On Vercel, click **Add New…** → **Project** again.
15. Click **Import** next to **School-Project** again.
16. On **Configure Project**:  
    **Project Name:** type e.g. `kobotrack-admin`.  
    **Root Directory:** click **Edit** → type `apps/admin` → **Continue**.  
    **Framework Preset:** **Vite**. **Build** and **Output** leave as is.
17. **Environment Variables:** add **Key** `VITE_API_URL`, **Value** = same API URL as before (no trailing slash). **Production** (and Preview if you want). Add it.
18. Click **Deploy**.
19. When it’s done, copy the URL (e.g. **https://kobotrack-admin.vercel.app**). This is your **admin app URL**.

---

## Part C — Update Render with the real frontend URLs

20. Open **Render** in your browser. Go to your **Dashboard**.
21. Click your API service (e.g. **kobotrack-api**).
22. In the left sidebar, click **Environment**.
23. Find **FRONTEND_URL**. Click **Edit** (or the pencil) and change the value to your **main app** URL from Part A (e.g. `https://kobotrack.vercel.app`). Save.
24. Find **ADMIN_FRONTEND_URL**. Edit and set it to your **admin app** URL from Part B (e.g. `https://kobotrack-admin.vercel.app`). Save.
25. Render will redeploy. When it’s done, the API will accept requests from both Vercel apps. Test: open the main app URL → log in or register; open the admin URL → log in with the admin user you created in Step 2 Part F.

---

For more checks, see **Deployment checklist** (`docs/deployment-checklist.md`).
