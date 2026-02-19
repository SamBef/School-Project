# After creating a new Supabase project — run these in PowerShell or IDE terminal

Do these from **Windows PowerShell** or your **IDE terminal** (e.g. Cursor).

---

## Step 1. Apply the schema to the new database

From the **API** folder:

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
npx prisma db push
```

If you see EPERM or "schema engine" errors, run the same commands from a **new PowerShell window outside Cursor** (see docs/fix-api-start.md).

---

## Step 2. Create an admin user (one-time)

Still in `apps\api`, run (admin logs in with **name** and password, not email):

```powershell
$env:ADMIN_NAME="koboadmin"; $env:ADMIN_EMAIL="koboadmin@gmail.com"; $env:ADMIN_INITIAL_PASSWORD="koboadmin-KA"; node scripts/create-admin.js
```

You should see **"Admin created: koboadmin"** or **"Admin already exists for ..."**. Log in to the admin app (http://localhost:5174) with **Name:** koboadmin and **Password:** (the one you set). If you already had an admin by email, the script updates their name to koboadmin.

---

## Step 3. Start the API and apps

- **Terminal 1** — API for main app:
  ```powershell
  cd c:\Users\User\Desktop\DTTRASM\apps\api
  npm run dev
  ```

- **Terminal 2** (if using admin on port 3005) — API for admin:
  ```powershell
  cd c:\Users\User\Desktop\DTTRASM\apps\api
  npm run dev:admin
  ```

- **Terminal 3** — Main web app:
  ```powershell
  cd c:\Users\User\Desktop\DTTRASM\apps\web
  npm run dev
  ```

- **Terminal 4** — Admin app:
  ```powershell
  cd c:\Users\User\Desktop\DTTRASM
  npm run dev:admin
  ```
  (Or from repo root: `npm run dev:admin` for the admin UI.)

---

Main app: http://localhost:5173 — register or sign in.  
Admin app: http://localhost:5174 — sign in with the admin email and password from Step 2.
