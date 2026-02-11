# Phase 6 — Run & Test

How to run automated tests and then execute the Phase 6 manual test cases.

---

## 1. Run automated tests

From the repo root:

```bash
cd apps/api
npm run test
```

Then:

```bash
cd ../web
npm run test
```

- **API:** Node test runner (e.g. `config.test.js`). Should see 2 tests pass.
- **Web:** Vitest (e.g. `validate.test.js`). Should see 5 tests pass.

---

## 2. Start the app for manual testing

From the repo root, in two terminals:

```bash
# Terminal 1 — API (port 3000)
npm run dev:api

# Terminal 2 — Web (port 5173)
npm run dev:web
```

Ensure `.env` is set in `apps/api` (e.g. `DATABASE_URL`, `JWT_SECRET`) and the database is up (e.g. `npm run db:push` already run).

---

## 3. Run manual test cases

1. Open **http://localhost:5173** in your browser.
2. Open **[Phase 6 test cases](phase-6-test-cases.md)** and follow the checklists:
   - **As Owner** — O1–O23 (register, invite Manager and Cashier, then full flows).
   - **As Manager** — M1–M10 (no Invite; can do transactions, expenses, export).
   - **As Cashier** — C1–C8 (no Expenses, Export, or Delete transaction).
3. Tick each step as you pass it; note any failure (role, test #, expected vs actual).
4. Use the failure list for Phase 6 bug fixes, then re-run the failed cases.

---

## 4. Cross-browser and responsive (after main checklist)

- Repeat a short smoke flow (login → one transaction → receipt download) in Chrome, Firefox, and Safari (or Edge).
- Resize to ~375px and ~768px; confirm key pages are usable.

---

## References

- [Phase 6 plan](phase-6-plan.md) — Full task breakdown.
- [Phase 6 test cases](phase-6-test-cases.md) — Role-based checklists.
- [Phase 2 run and test](phase-2-run-and-test.md) — Auth and invite flows.
- [Phase 3 run and test](phase-3-run-and-test.md) — Feature-level steps.
