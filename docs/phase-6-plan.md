# Phase 6: Testing & Deployment — Plan

Phase 6 from the roadmap (Weeks 12–14): manual test cases per role, bug fixes, cross-browser/responsive checks, deploy to Netlify + Railway, env setup, and final E2E walkthrough.

---

## Roadmap objectives (from SME_Transaction_App_Roadmap.pdf)

1. Write manual test cases for every feature and walk through them as each role.
2. Fix any bugs — pay special attention to RBAC and data accuracy.
3. Test on different browsers (Chrome, Firefox, Safari) and screen sizes.
4. Choose a hosting platform and deploy the app (we use Netlify + Railway).
5. Set up environment variables for database and secrets on the hosting platform.
6. Do a final end-to-end walkthrough before sharing with real users.

---

## Task breakdown and order

### 0. Run automated tests (quick check)

From repo root:

```bash
cd apps/api && npm run test
cd apps/web && npm run test
```

Then proceed to manual testing.

---

### 1. Manual testing (do first)

| Task | Description | Doc |
|------|-------------|-----|
| 1.1 | Run through [Phase 6 test cases](phase-6-test-cases.md) as **Owner** | phase-6-test-cases.md |
| 1.2 | Run through test cases as **Manager** (no invite, no business profile) | phase-6-test-cases.md |
| 1.3 | Run through test cases as **Cashier** (no expenses, no export, no delete transaction) | phase-6-test-cases.md |
| 1.4 | Test invite flow: invite → set password → login as invited role | phase-2-run-and-test.md, phase-6-test-cases.md |
| 1.5 | Test forgot password → email/link → reset → login | phase-2-run-and-test.md |
| 1.6 | Test i18n (EN, FR, ES) on key pages | phase-6-test-cases.md |
| 1.7 | Test responsive layout (mobile width, tablet) and key flows | phase-6-test-cases.md |

**Output:** Checklist marked done; note any bugs in a list for 2.

---

### 2. Bug fixes

| Task | Description |
|------|-------------|
| 2.1 | Fix any RBAC issues (wrong role sees/does something they shouldn’t). |
| 2.2 | Fix data accuracy issues (totals, receipt numbers, dashboard stats). |
| 2.3 | Fix any UI/UX or validation bugs found in 1. |

**Output:** All known bugs from 1 addressed; re-run affected test cases.

---

### 3. Cross-browser and screen sizes

| Task | Description |
|------|-------------|
| 3.1 | Smoke test in Chrome: login, one transaction, one receipt download. |
| 3.2 | Smoke test in Firefox: same. |
| 3.3 | Smoke test in Safari (or Edge if no Mac). |
| 3.4 | Test at 375px (mobile), ~768px (tablet), desktop. |

**Output:** No blocking issues; note minor differences if any.

---

### 4. Deployment

| Task | Description | Doc |
|------|-------------|-----|
| 4.1 | Create Railway project; add PostgreSQL; note `DATABASE_URL`. | [deployment.md](deployment.md) |
| 4.2 | Add API service from repo (root `apps/api`); set env vars; use `npm start` (runs `node src/index.js`). | deployment.md |
| 4.3 | Run Prisma: `npx prisma generate` and `npx prisma db push` (or `migrate deploy`) against production DB. | deployment.md |
| 4.4 | Expose API; verify health/root endpoint. | — |
| 4.5 | Connect repo to Netlify; base dir `apps/web`, build `npm run build`, publish `apps/web/dist`. | deployment.md |
| 4.6 | Set Netlify env: `VITE_API_URL` = Railway API URL; deploy. | deployment.md |
| 4.7 | Set API env: `FRONTEND_URL` = Netlify URL (CORS + email links). | deployment.md |

**Output:** Live frontend and API; DB migrated; envs set.

---

### 5. Post-deploy verification

| Task | Description |
|------|-------------|
| 5.1 | Register a new business on the live site. |
| 5.2 | Login, create transaction, download receipt. |
| 5.3 | Add expense; check dashboard. |
| 5.4 | Invite user (check email or dev link); set password; login as invited user. |
| 5.5 | Verify password reset flow (if SendGrid configured). |
| 5.6 | Export PDF and CSV; spot-check content. |

**Output:** All critical flows work in production.

---

### 6. Documentation and handoff

| Task | Description |
|------|-------------|
| 6.1 | Document live URLs in README (and REPORT.md if required). |
| 6.2 | Update REPORT.md Phase 6 / deployment / testing sections if needed. |
| 6.3 | Optional: record 5–10 min demo video (per README deliverables). |

**Output:** README (and report) point to live app; demo video if done.

---

## Suggested order of work

1. **Manual testing (1)** — Run phase-6-test-cases as Owner, Manager, Cashier; fix anything that’s clearly broken.
2. **Bug fixes (2)** — Address RBAC and data accuracy; re-test.
3. **Cross-browser (3)** — Quick pass in 2–3 browsers and 2–3 widths.
4. **Deploy (4)** — Railway then Netlify; env vars; DB migrate.
5. **Post-deploy (5)** — Full E2E on live URLs.
6. **Docs (6)** — URLs, report, optional video.

---

## References

- [Phase 6 test cases (by role)](phase-6-test-cases.md) — Manual checklist.
- [Phase 3 run and test](phase-3-run-and-test.md) — Feature-level steps.
- [Phase 2 run and test](phase-2-run-and-test.md) — Auth and invite.
- [Testing](testing.md) — Strategy and RBAC focus.
- [Deployment](deployment.md) — Netlify and Railway steps.
