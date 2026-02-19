# Open the admin page (quick steps)

For a full list of admin features (create company, manage users, deactivate, activity log), see [admin-features.md](admin-features.md).

---

## 1. Make sure the API is running

**Option A — Different port for admin (recommended: same DB, admin on 3005)**

- **Terminal 1** — API for main app (port from `apps/api/.env`, e.g. 3004):
  ```powershell
  cd c:\Users\User\Desktop\DTTRASM\apps\api
  npm run dev
  ```
- **Terminal 2** — API for admin app (port 3005, same DB):
  ```powershell
  cd c:\Users\User\Desktop\DTTRASM\apps\api
  npm run dev:admin
  ```
- Create **`apps/admin/.env`** with:
  ```env
  VITE_ADMIN_API_URL=http://localhost:3005
  ```
  Then the admin app will call the API on 3005. Same database as the main API.

**Option B — Same API for both (admin uses same port as main)**

- Run the API once (e.g. `npm run dev` in `apps/api`, port 3004). Do **not** set `VITE_ADMIN_API_URL` in `apps/admin/.env` (or leave it unset); the admin app will use the Vite proxy and talk to the same port.

---

## 2. Create an admin user (one-time)

You need at least one platform admin account (same DB no matter which port the API uses). From `apps/api` in a **new** terminal:

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
$env:ADMIN_EMAIL="your-admin@example.com"; $env:ADMIN_INITIAL_PASSWORD="YourSecurePassword123"; node scripts/create-admin.js
```

Replace the email and password with your own. You’ll use these to log in to the admin app.

If you see **"Admin created for ..."** or **"Admin already exists for ..."**, you’re done.

---

## 3. Start the admin app

From the repo root or from `apps/admin`:

**Option A — from repo root**

```powershell
cd c:\Users\User\Desktop\DTTRASM
npm run dev:admin
```

**Option B — from apps/admin**

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\admin
npm run dev
```

The admin app will run at **http://localhost:5174**.

---

## 4. Open the admin page

1. In your browser go to: **http://localhost:5174**
2. On the login page, enter the **admin email** and **password** you used in step 2.
3. Click **Log in**. You should see the admin dashboard (companies list and stats).

---

## If the API is on a different port

If your API runs on a port other than 3003, create **`apps/admin/.env`** with:

```env
VITE_API_URL=http://localhost:YOUR_PORT
```

Then start the admin app again.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Start API: `npm run dev` in `apps/api` |
| 2 | Create admin user: `ADMIN_EMAIL=... ADMIN_INITIAL_PASSWORD=... node scripts/create-admin.js` in `apps/api` |
| 3 | Start admin app: `npm run dev:admin` (from root) or `npm run dev` (from `apps/admin`) |
| 4 | Open **http://localhost:5174** and log in with the admin email and password |
