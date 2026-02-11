# Phase 2: Authentication & RBAC — Walkthrough

This document explains **every step** of Phase 2 so you can learn and navigate the codebase. It matches the roadmap: *Weeks 3–4 — Authentication & RBAC*.

---

## What Phase 2 Delivers

### Backend

- Owner sign-up (register business + owner account).
- Login (email + password, JWT issued for 7 days).
- Forgot password → email with reset link (requires SendGrid).
- Reset password (with token from email).
- Invite worker by email (Owner only) → creates user, sends invite email or returns invite link.
- Accept invite (set password, then auto-login).
- Middleware: JWT auth (`requireAuth`) + RBAC (`requireRole`).

### Frontend

- **Auth pages** — Login, Register, Forgot Password, Reset Password, Set Password (invite accept). All centered in card layout with logo.
- **Password visibility toggle** on every password field (security doctrine rule 20).
- **Password rules** shown upfront before typing (security doctrine rule 16).
- **Client-side email validation** catches typos before server round-trip.
- **Session expiry handling** — if the JWT expires mid-use, the user sees "Your session has expired" on the login page instead of a silent logout.
- **Profile page** — accessible by clicking the avatar in the header. Shows user account details and business info.
- **404 page** — unknown URLs show a "Page not found" page with a way back.
- **Loading spinner** — shown while auth state loads, replacing the plain text "Loading…".
- Auth state (token + user) persisted in localStorage under `kobotrack_token`.
- Protected routes: redirect to `/login` when not authenticated.
- Shared layout (sticky header, role-based nav, user avatar with role badge, language switcher).
- Multi-language support (English, French, Spanish) with a switcher in the header.
- Responsive design for mobile and desktop.

### Documentation

- This walkthrough.
- `docs/phase-2-run-and-test.md` — step-by-step testing guide.
- `docs/database-option.md` — database setup with Neon.
- `docs/sendgrid.md` — email service setup.

---

## File Structure (Phase 2)

```
apps/
  api/
    .env                      — secrets (DATABASE_URL, JWT_SECRET, SENDGRID_*)
    prisma/schema.prisma      — User and Business models
    src/
      index.js                — Express app entry, mounts routes
      config.js               — reads env vars
      lib/prisma.js           — Prisma client singleton
      middleware/
        auth.js               — requireAuth, optionalAuth (JWT)
        rbac.js               — requireRole(['OWNER', ...])
      routes/
        auth.js               — /register, /login, /forgot-password, /reset-password, /set-password, /me
        users.js              — /invite (Owner only)
      services/
        email.js              — SendGrid: invite + password reset emails

  web/
    public/
      logo.svg                — KT monogram (favicon and header)
    src/
      App.jsx                 — Routes and AuthProvider
      index.css               — Design tokens, all component styles
      context/
        AuthContext.jsx        — Auth state, login, register, logout, session expiry
      lib/
        api.js                — Fetch wrapper with auth headers and 401 detection
        validate.js           — isValidEmail, isValidPassword
      components/
        Layout.jsx            — Sticky header, nav, user avatar, locale switcher
        ProtectedRoute.jsx    — Auth guard with spinner
        PasswordInput.jsx     — Password field with visibility toggle
        Spinner.jsx           — Accessible loading spinner
      pages/
        LoginPage.jsx         — Sign in with session expiry banner
        RegisterPage.jsx      — Business + owner registration
        ForgotPasswordPage.jsx
        ResetPasswordPage.jsx
        SetPasswordPage.jsx   — Invite accept
        DashboardPage.jsx     — Stats cards, quick actions, business info
        ProfilePage.jsx       — User profile and business details
        InvitePage.jsx        — Add worker (Owner only)
        NotFoundPage.jsx      — 404 page
      i18n/
        index.js              — Locale loader
        locales/en.json       — English strings
        locales/fr.json       — French strings
        locales/es.json       — Spanish strings
```

---

## Key Concepts

### Authentication Flow

1. **Register** — `POST /auth/register` creates a Business and an Owner User. Returns JWT.
2. **Login** — `POST /auth/login` verifies email/password, returns JWT.
3. **JWT** — signed with `JWT_SECRET`, contains `userId`, `email`, `role`, `businessId`. Expires in 7 days.
4. **Auth middleware** — `requireAuth` extracts and verifies the JWT from the `Authorization: Bearer <token>` header. Attaches `req.user`.
5. **RBAC middleware** — `requireRole(['OWNER'])` checks `req.user.role`.

### Session Expiry

- The API client (`api.js`) detects 401 responses when a token exists.
- It notifies `AuthContext` via a subscriber pattern.
- `AuthContext` clears the token and sets `sessionExpired = true`.
- `LoginPage` shows a "Your session has expired" banner.

### Invite Flow

1. Owner submits email + role on `/invite`.
2. Backend creates a User with `inviteToken` (no password yet).
3. If SendGrid is configured, an email is sent with a set-password link.
4. If SendGrid is NOT configured (dev mode), the API returns the link in the response, and the frontend shows it so the owner can share it manually.
5. The invited user opens the link, sets their password on `/set-password`, and is auto-logged in.

### Password Security (UI)

- **Visibility toggle** — every password field has an eye icon button to show/hide the password.
- **Rules shown upfront** — "At least 8 characters" appears below password fields on registration and reset pages.
- **Form preservation** — inputs are never cleared on errors.
- **No paste blocking** — users can paste into password fields.

### Design System

- **Vanilla CSS** with design tokens in `:root` (colors, spacing, typography, shadows).
- **Accent color**: teal `#0d9488`.
- **Neutral backgrounds** dominate; accent used sparingly.
- **Cards** for content grouping; no gratuitous shadows or effects.
- **Semantic HTML**: `<main>`, `<nav>`, `<header>`, `<form>`, `<fieldset>`, `<label>`.
- **Accessible**: focus-visible outlines, ARIA labels, screen reader announcements for errors, reduced-motion support.
- **Responsive**: breakpoints at 768px and 480px.

---

## How to Test

See `docs/phase-2-run-and-test.md` for the full step-by-step testing guide.

Quick summary:

1. `npm run dev:api` — start backend on port 3000.
2. `npm run dev:web` — start frontend on port 5173.
3. Open `http://localhost:5173/` — landing page.
4. Register a business, then test login, dashboard, profile, invite, language switcher.
5. For invite testing without SendGrid: the invite link is shown on screen after submission.
