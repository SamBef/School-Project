# SendGrid — Email (invite and password reset)

KoboTrack uses **SendGrid** for transactional email: worker invites and password reset.

---

## Setup

1. Sign up at [SendGrid](https://sendgrid.com).
2. Create an API key with **Mail Send** permission: [API Keys](https://app.sendgrid.com/settings/api_keys).
3. (Recommended) Verify a sender identity (domain or single sender) so emails are not marked as spam: [Sender Authentication](https://app.sendgrid.com/settings/sender_auth).
4. Set in `apps/api/.env`:
   - `SENDGRID_API_KEY` — your API key
   - `SENDGRID_FROM_EMAIL` — verified sender email (e.g. `noreply@yourdomain.com`)

---

## Use in the app

- **Invite worker:** Owner enters worker email and role; API sends an invite email with a link to set password and join the business.
- **Password reset:** User requests reset; API sends an email with a time-limited link to set a new password.

All links in emails must point to the frontend URL (`FRONTEND_URL`) so the user completes the flow in the web app.

---

## Documentation

- [SendGrid API v3](https://docs.sendgrid.com/api-reference)
- [Node.js SDK](https://github.com/sendgrid/sendgrid-nodejs) — we use `@sendgrid/mail`.
