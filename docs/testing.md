# Testing

Manual and automated testing for KoboTrack.

---

## Manual testing

- Follow the roadmap phases and user stories.
- For each role (Owner, Manager, Cashier), verify:
  - Login and redirect.
  - Allowed and disallowed actions (RBAC).
  - Transaction entry, receipt generation, print/download.
  - Expense entry and list (Owner/Manager only).
  - Dashboard and export (Owner/Manager only).
- Test invite flow: owner invites by email → worker receives email → sets password → can log in.
- Test password reset: request → email → reset link → new password works.
- Test on multiple browsers (Chrome, Firefox, Safari) and screen sizes.
- Test i18n (EN/FR/ES) and language switcher.
- Test date/time and timezone (user location).

---

## Automated tests

- **Backend:** Unit/integration tests for API routes (auth, transactions, expenses, RBAC). Use a test framework (e.g. Jest) and a test database or mocks.
- **Frontend:** Component and integration tests (e.g. React Testing Library) for critical flows (login, transaction form, receipt display).
- **E2E (optional):** Playwright or Cypress for signup → login → create transaction → view receipt.

Test commands live in `apps/web` and `apps/api` package.json (e.g. `npm run test`).

---

## API smoke test (run before major changes)

Before large feature work (e.g. AI integration), run the full API smoke test to confirm all critical endpoints work:

1. **Free port 3003** (if needed): stop any process using it (e.g. previous API instance).
2. **Start the API:** from repo root run `npm run dev:api`. Wait until you see: `KoboTrack API listening on port 3003`.
3. **Run the smoke test:** in another terminal, from repo root:
   ```bash
   cd apps/api && npm run test:smoke
   ```
   Or set `API_URL` if the API runs elsewhere: `API_URL=http://localhost:3003 node scripts/smoke-test-api.js`.
4. **Expect:** all checks to pass (health, register, login, dashboard, inventory locations/units/products/create unit/alerts, expenses, transactions, and unauthenticated 401).

**Requirements:** The API must have a valid `DATABASE_URL` and `JWT_SECRET` in `apps/api/.env`. The API loads `.env` from `apps/api` even when started from the repo root. If you see a TLS error on Windows (e.g. "No credentials are available in the security package"), ensure your database is reachable; for cloud Postgres you may need to adjust SSL params in `DATABASE_URL` (see your provider’s docs).

If any check fails, fix the failing endpoint or environment (e.g. database, env vars) before proceeding.

---

## RBAC and data accuracy

- Explicit tests that Cashier cannot access expenses or export.
- Explicit tests that Manager cannot edit business or manage workers.
- Tests that transaction totals and receipt numbers are correct and sequential per business.
