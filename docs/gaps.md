# KoboTrack — Documented Gaps

This document records known gaps in the project: missing tests, incomplete documentation, code duplication, and areas not yet covered by automation. It is the single reference for “what is not done” before or alongside new work (e.g. AI integration).

**Last updated:** 2025-02-11

---

## 1. Testing gaps

### 1.1 API unit / integration tests

| Gap | Detail |
|-----|--------|
| **Scope** | Only one test suite exists: `apps/api/src/config.test.js` (port, frontendUrl, jwtSecret). |
| **Missing** | No unit or integration tests for: |
| | • Auth routes: register, login, forgot-password, reset-password, set-password, `/auth/me` |
| | • User/invite: `POST /users/invite`, list users, user count |
| | • Transactions: create, list, get detail, delete |
| | • Expenses: create, list, update, delete |
| | • Dashboard: `GET /dashboard` |
| | • Export: PDF, CSV, single receipt |
| | • Inventory: locations, units, products, movements, adjustments, alerts, receive, returns |
| | • Business: get/update business, exchange rates |
| **Impact** | Regressions in route logic, validation, or RBAC are not caught by automated tests. |
| **Reference** | [testing.md](testing.md) — “Backend: unit/integration tests for API routes (auth, transactions, expenses, RBAC)”. |

### 1.2 RBAC tests

| Gap | Detail |
|-----|--------|
| **Scope** | No automated tests assert role-based access. |
| **Missing** | • Cashier cannot access `GET /expenses`, `GET /export/*`, business or user management. |
| | • Manager cannot edit business or manage workers (invite, list users). |
| | • Owner can access all protected routes. |
| | • Unauthenticated requests return 401; wrong role returns 403. |
| **Impact** | Permission bugs (e.g. Cashier seeing expenses) are only caught by manual testing. |
| **Reference** | [testing.md](testing.md) — “RBAC and data accuracy” and “Explicit tests that Cashier cannot access expenses or export”. |

### 1.3 Data accuracy tests

| Gap | Detail |
|-----|--------|
| **Scope** | No tests verify business rules on data. |
| **Missing** | • Transaction totals and receipt numbers are correct and sequential per business. |
| | • Expense category and date validation. |
| | • Inventory movement math (on-hand, reserved, etc.). |
| **Impact** | Calculation or sequencing bugs are not automatically detected. |

### 1.4 API smoke test coverage

| Gap | Detail |
|-----|--------|
| **Scope** | Smoke test (`apps/api/scripts/smoke-test-api.js`) runs with one Owner token and only GET/list-style calls. |
| **Covered** | Health, register, login (wrong + correct), dashboard, inventory locations/units/products/low-stock, expenses list, transactions list, unauthenticated 401. |
| **Not covered** | • `GET /auth/me` |
| | • Forgot password, reset password, set password (invite) |
| | • Invite flow: `POST /users/invite`, set-password, then login as worker |
| | • Export: `GET /export/pdf`, `GET /export/csv`, `GET /export/receipt/:id` |
| | • RBAC: Cashier token → 403 on `/expenses`, `/export/*`; Manager → 403 on business/users |
| | • Write operations: create/update/delete transaction, expense; inventory receive/adjust/return |
| | • Invalid or expired JWT (401), validation errors (400) |
| **Impact** | Critical paths (export, invite, RBAC, writes) are not asserted in the smoke run. |

### 1.5 Frontend tests

| Gap | Detail |
|-----|--------|
| **Scope** | Only `apps/web/src/lib/validate.test.js` exists. |
| **Missing** | • Component tests (e.g. React Testing Library) for: login form, transaction form, receipt display, expense form, protected layout. |
| | • Integration tests for critical flows: login → dashboard, create transaction → view receipt. |
| | • Role-based UI: Cashier does not see expense/export nav or pages. |
| **Impact** | UI and flow regressions are not caught by automation. |
| **Reference** | [testing.md](testing.md) — “Frontend: component and integration tests for critical flows”. |

### 1.6 End-to-end (E2E) tests

| Gap | Detail |
|-----|--------|
| **Scope** | No Playwright, Cypress, or other E2E suite. |
| **Missing** | E2E scenarios such as: signup → login → create transaction → view receipt; invite → set password → login; password reset flow. |
| **Impact** | Full user journeys are only validated manually. |
| **Reference** | [testing.md](testing.md) — “E2E (optional): Playwright or Cypress”. |

---

## 2. Documentation and report gaps

### 2.1 REPORT.md (project report)

| Gap | Detail |
|-----|--------|
| **Scope** | Root `REPORT.md` (and aligned `docs/report.md`) are the project report. |
| **Status** | All sections are placeholders: “To be completed: …” |
| **Missing** | • §1 Introduction (objectives, target users, problem, solution). |
| | • §2 Literature / background. |
| | • §3 Requirements and specification. |
| | • §4 Design and architecture. |
| | • §5 Implementation (phases, key decisions). |
| | • §6 Testing. |
| | • §7 Deployment and operations. |
| | • §8 Documentation and deliverables. |
| | • §9 Conclusion and future work (summary, limitations, extensions). |
| | • References. |
| **Impact** | Report is not submission-ready until these are filled. |

### 2.2 Testing documentation vs reality

| Gap | Detail |
|-----|--------|
| **Scope** | [testing.md](testing.md) describes desired tests. |
| **Mismatch** | Doc mentions “Explicit tests that Cashier cannot access expenses or export” and “Tests that transaction totals and receipt numbers are correct” — these tests do not exist yet. |
| **Impact** | New contributors may assume RBAC and data-accuracy tests are implemented. |

---

## 3. Code and design gaps

### 3.1 Duplicate exchange-rate services

| Gap | Detail |
|-----|--------|
| **Scope** | Two modules provide exchange-rate functionality. |
| **Files** | • `apps/api/src/services/exchange.js` — used by `apps/api/src/routes/transactions.js` (e.g. `getExchangeRate`, `getAllRates`). |
| | • `apps/api/src/services/exchangeRate.js` — used by `apps/api/src/routes/business.js` (e.g. `getExchangeRates`). |
| **Issue** | Same responsibility (fetch rates for a base currency) is implemented and maintained in two places; API choice and naming differ. |
| **Impact** | Risk of inconsistent behaviour, duplicate API keys or config, and harder maintenance. |
| **Recommendation** | Unify on one module and one external API; have transactions and business routes import from that single service. |

### 3.2 Untracked / duplicate files (source of truth)

| Gap | Detail |
|-----|--------|
| **Scope** | Git status may show both `exchange.js` and `exchangeRate.js` (or similar). |
| **Action** | Decide which implementation is canonical, remove or deprecate the other, and ensure all callers use the chosen module. |

---

## 4. API behaviour and coverage gaps

### 4.1 Smoke test assumptions

| Gap | Detail |
|-----|--------|
| **Scope** | Smoke test uses a single Owner token and only GET/list endpoints. |
| **Not asserted** | • 403 for role-restricted routes (e.g. Cashier → `/expenses`). |
| | • 400 for invalid body or query (e.g. invalid expense category). |
| | • 401 for invalid or expired JWT. |
| | • Export endpoints return successful response or correct Content-Type. |
| | • Invite and password-reset flows end-to-end. |
| **Impact** | Smoke test confirms “core GET + auth” but not permissions, validation, or write/export paths. |

### 4.2 Export and auth flows not documented in one place

| Gap | Detail |
|-----|--------|
| **Scope** | Export (PDF/CSV/receipt) and auth (invite, reset, set-password) behaviour. |
| **Status** | [api.md](api.md) lists endpoints; behaviour under failure (e.g. invalid date range, missing token) and expected status codes are not fully documented in a single “contract” or test matrix. |
| **Impact** | Harder to add or extend smoke/contract tests without a single reference. |

---

## 5. Summary table

| Area | Gap | Severity (pre–AI) |
|------|-----|--------------------|
| API unit tests | Only config; no route or RBAC tests | Medium |
| RBAC tests | Documented but not implemented | Medium |
| Data accuracy tests | Not implemented | Low |
| Smoke test | No export, invite, reset, RBAC, or writes | Medium |
| Frontend tests | Only validate; no component/integration | Medium |
| E2E tests | None | Low (optional in docs) |
| REPORT.md | All sections placeholders | High (for submission) |
| testing.md | Describes tests that don’t exist | Low |
| Exchange services | Two modules (exchange.js vs exchangeRate.js) | Low |
| API behaviour docs | Export/auth behaviour not fully specified | Low |

---

## 6. Pre–AI readiness (already addressed)

The following are **not** current gaps; they were completed before AI work:

- API default port 3005, web 5174 (or 5173); API exits if port is in use.
- GET /expenses invalid `category` returns 400 with valid categories listed.
- Smoke test and testing docs updated (when to run, what to expect).
- Config test includes `jwtSecret` assertion.

---

## 7. How to use this document

- **Before major features (e.g. AI):** Run the smoke test; consider adding smoke checks for export and RBAC.
- **Before submission:** Fill REPORT.md (and docs/report.md) and align testing.md with implemented tests.
- **When touching exchange rates:** Unify exchange logic into one service and update callers.
- **When adding tests:** Use this doc to prioritise (e.g. RBAC and smoke coverage first, then route unit tests, then frontend).

Updates to gaps (new findings or closed items) should be reflected in this document and the summary table.
