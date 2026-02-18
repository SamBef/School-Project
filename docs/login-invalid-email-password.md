# "Invalid email or password" — what to check

The message **"Invalid email or password."** can appear on **two different** login screens. The fix depends on which one you use.

---

## 1. Main app (company login) — http://localhost:5173

This is the **normal** KoboTrack app (dashboard, transactions, expenses). You sign in with a **company user** account.

**That account is created when:**
- You **Register** (Create account) on the main app, or
- Someone **invites** you and you set your password via the invite link.

**If you see "Invalid email or password" here:**

| Cause | What to do |
|-------|------------|
| You **cleared the database** (e.g. `npm run db:clear`) | There are no users anymore. Go to the main app and click **Create account** to register again. |
| Wrong password | Use the password you set when you registered (or when you set your password from the invite). Check caps lock and typos. |
| Wrong email | Use the **exact** email you used to register (e.g. the one you got the invite on). Email is case-insensitive. |
| Account not activated (invited user) | You see a different message: "This account has not been activated yet...". Use the link in the invite email to set your password first. |

---

## 2. Admin app (platform admin login) — http://localhost:5174

This is the **admin** app for platform admins. You sign in with an **admin** account. This is **not** the same as your company user account.

**Admin accounts are created only by running a script** (they are not created by registering on the main app):

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
$env:ADMIN_EMAIL="your-admin@example.com"; $env:ADMIN_INITIAL_PASSWORD="YourPassword123"; node scripts/create-admin.js
```

**If you see "Invalid email or password" on the admin page:**

| Cause | What to do |
|-------|------------|
| You never created an admin user | Run the command above (replace email and password). Then sign in at http://localhost:5174 with that **exact** email and password. |
| You're using your **company** email/password | Company accounts (from the main app) do **not** work on the admin page. You must use an **admin** account created with `create-admin.js`. |
| Wrong password | Use the password you passed as `ADMIN_INITIAL_PASSWORD` when you ran the script. If you're not sure, run the script again with a **new** password (same email is fine — it will say "Admin already exists" and skip; you'd need to reset the password in the DB to change it, or use a new email). |
| Wrong email | Use the **exact** email you passed as `ADMIN_EMAIL` (case doesn't matter). |

---

## Summary

| Where you log in | Account type | How the account is created |
|------------------|-------------|----------------------------|
| **Main app** (localhost:5173) | Company user | Register on the main app, or accept an invite and set password. |
| **Admin app** (localhost:5174) | Platform admin | Run `create-admin.js` from `apps/api` with `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`. |

Use the **company** email/password only on the **main** app. Use the **admin** email/password only on the **admin** app.
