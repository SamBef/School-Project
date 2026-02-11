# Phase 2: Run & Test Guide

Step-by-step instructions to run and test all Phase 2 features.

---

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon free tier — see `docs/database-option.md`)
- `apps/api/.env` configured with `DATABASE_URL` and `JWT_SECRET`

## 1. Install dependencies

```bash
npm install
```

## 2. Push database schema

```bash
npm run db:push --workspace=apps/api
```

## 3. Start servers

In two terminals:

```bash
npm run dev:api    # Backend → http://localhost:3000
npm run dev:web    # Frontend → http://localhost:5173
```

## 4. Test flows

### 4.1 Landing page

1. Open `http://localhost:5173/`.
2. You should see the KoboTrack landing page with hero section and feature grid.
3. Click **Create account** to go to the register page.

### 4.2 Register

1. Fill in all fields: business name, business email, phone, city, owner email, password.
2. Password rules ("At least 8 characters") appear below the password field.
3. Click the eye icon to toggle password visibility.
4. Submit. You should be redirected to the dashboard.

### 4.3 Dashboard

1. You should see a welcome message, stat cards (placeholder values), quick actions, and business info.
2. The header shows the KT logo, navigation links (Dashboard, Expenses, Export, Invite), language switcher, your avatar/email, role badge, and Sign out.

### 4.4 Profile

1. Click your avatar/email in the header.
2. You should see the Profile page with your email, role, and business details.

### 4.5 Logout and Login

1. Click **Sign out** in the header.
2. You land on the login page.
3. Enter your email and password. Toggle visibility to verify.
4. Submit. You should return to the dashboard.

### 4.6 Invite worker

1. Navigate to `/invite` (or click "Invite" in the nav).
2. Enter an email and select a role (Manager or Cashier).
3. Click **Send invite**.
4. Since SendGrid is not configured, you'll see a success message and an invite link.
5. Copy the link and open it in an incognito/private window.
6. Set a password on the set-password page.
7. You'll be auto-logged in as the invited worker.
8. The nav should show fewer options (no Invite link for non-owners).

### 4.7 Forgot / Reset password

1. On the login page, click **Forgot password?**
2. Enter an email and submit. You'll see a confirmation message.
3. Note: without SendGrid, no email is sent. To test the reset flow, you'd need to get the reset token from the database directly.

### 4.8 Language switcher

1. In the header, change the language dropdown from EN to FR or ES.
2. The page reloads. All labels should be in the selected language.
3. Switch back to EN to verify.

### 4.9 404 page

1. Navigate to any unknown URL, e.g. `http://localhost:5173/nonexistent`.
2. You should see the 404 page with a "Go to Dashboard" (or "Go home") button.

### 4.10 Session expiry

1. Sign in normally.
2. Open browser DevTools → Application → Local Storage → `localhost:5173`.
3. Edit the `kobotrack_token` value to something invalid (e.g., add "xxx" at the end).
4. Navigate to a new page or refresh.
5. You should be redirected to the login page with the message: "Your session has expired. Please sign in again."

### 4.11 Email validation

1. On the login page, enter an invalid email (e.g., "notanemail") and submit.
2. You should see "Please enter a valid email address." before any server request.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `db:push` fails with P1001 | Check `DATABASE_URL` in `apps/api/.env`. See `docs/database-option.md`. |
| `dev:web` shows Vite errors | Run `npm install` from the project root. |
| `dev:api` port in use | The API auto-tries ports 3000–3010. Update `VITE_API_URL` in `apps/web/.env` if it starts on a different port. |
| Invite email not sent | Expected without SendGrid. The invite link appears on screen. See `docs/sendgrid.md` to configure email. |
| `db:generate` EPERM error | Stop the API server first, then run `npm run db:generate`. See `docs/db-generate-fix.md`. |
