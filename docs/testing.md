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

## RBAC and data accuracy

- Explicit tests that Cashier cannot access expenses or export.
- Explicit tests that Manager cannot edit business or manage workers.
- Tests that transaction totals and receipt numbers are correct and sequential per business.
