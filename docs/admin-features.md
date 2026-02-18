# Admin app — features and usage

The admin app (e.g. http://localhost:5174) lets platform admins manage companies and their users. It uses a **distinct** UI (separate from the main app’s design rules).

---

## After schema update (deactivated + activity log)

If you added the new fields (`User.deactivatedAt`, `Business.deactivatedAt`, `ActivityLog`), run once from **PowerShell outside Cursor** (to avoid EPERM):

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
npx prisma migrate dev --name add-deactivated-activity-log
```

Or with Supabase you can use `npx prisma db push` instead of migrate. Then restart the API.

---

## What you can do in the admin app

### Dashboard (/)

- See platform stats (companies, users, transactions, expenses).
- List all companies with search and sort (name, last activity, created, team size).
- See status: **Active** or **Deactivated** per company.
- **Create company** — opens the create-company flow (company + first owner user).
- Export companies list as CSV.
- Click a company name to open its detail page.

### Create company (/companies/new)

- Create a new **company** (business) and its **first user (owner)** in one step.
- You provide: company name, email, phone, primary location, currency, optional address; owner email, first name, last name, password.
- The owner can then sign in to the **main app** (company login) and invite more users from there, or you can add users from the company detail page.

### Company detail (/companies/:id)

- **Summary** — company details, counts, last activity. **Edit company** to change name, email, phone, location, address, currency. **Deactivate company** / **Reactivate company** (soft: users cannot log in while deactivated).
- **Activity (last 7 days)** — daily transaction and expense counts (no PII).
- **Users** — list of users (name, email, role, status: Active / Pending invite / Deactivated). **Add user** to invite (email link) or create with a password; choose role (OWNER, MANAGER, CASHIER). Per user: **Edit** to change role or **Deactivate** (distinct from delete: user cannot log in, data kept). **Delete** is only allowed when the user has no transactions/expenses etc.; otherwise you must deactivate.
- **Activity log** — recent actions (e.g. user.login, transaction.created, expense.created, user.invited, user.deactivated, business.deactivated).

---

## Deactivate vs delete

- **Deactivate (user or company):** Reversible. User/company cannot log in; data is preserved. Use **Reactivate** to turn back on.
- **Delete (user only):** Permanent. Only allowed when the user has no transactions, expenses, stock movements, etc. The only active owner cannot be deleted; assign another owner or deactivate instead.

---

## Main app vs admin app

- **Main app** (e.g. localhost:5173): Company users sign in with the account they got by **registering** or by **accepting an invite**. They manage their business (transactions, expenses, team invites).
- **Admin app** (e.g. localhost:5174): Platform admins sign in with the account created by `create-admin.js`. They manage **companies** and **users** across the platform. No “Create account” on the login page — admin accounts are created via the script; **companies** are created via **Create company** inside the admin app.
