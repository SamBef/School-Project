# KoboTrack — Documentation

This folder contains detailed documentation for the SME Transaction & Receipt Manager project.

---

## Contents

| Document | Description |
|----------|-------------|
| [Phase 2 walkthrough](phase-2-walkthrough.md) | **Authentication & RBAC** — step-by-step explanation of every file and decision |
| [Phase 2 run and test](phase-2-run-and-test.md) | **How to run and test Phase 2** — prerequisites, env, DB, servers, and test flows |
| [Phase 3 walkthrough](phase-3-walkthrough.md) | **Core business features** — transactions, receipts, expenses, dashboard, export |
| [Phase 3 run and test](phase-3-run-and-test.md) | **How to run and test Phase 3** — step-by-step feature tests |
| [Phase 6 plan](phase-6-plan.md) | **Testing & deployment** — task breakdown, order, and references |
| [Phase 6 test cases](phase-6-test-cases.md) | **Manual test cases by role** — Owner, Manager, Cashier checklists |
| [Phase 6 run and test](phase-6-run-and-test.md) | **How to run Phase 6 tests** — automated tests, start app, manual checklist |
| [Database: one option](database-option.md) | **Free PostgreSQL (Neon)** — get a URL, put it in `.env`, run `db:push` |
| [Neon signup choices](neon-signup-choices.md) | **Postgres version, cloud provider, Neon auth** — what to pick on Neon |
| [db:generate fix](db-generate-fix.md) | **If db:generate fails with EPERM** — stop the API, then run it again |
| [Setup & installation](setup.md) | Environment setup, dependencies, step-by-step screenshots and signup instructions |
| [Architecture](architecture.md) | Monorepo structure, frontend/backend overview, data flow |
| [API reference](api.md) | Endpoints, request/response shapes, auth |
| [Database schema](database.md) | Tables, relationships, Prisma schema |
| [Deployment](deployment.md) | Netlify (web), Railway (api + PostgreSQL), env vars |
| [Testing](testing.md) | Manual and automated test approach |
| [Report](report.md) | University-style report (same content as root REPORT.md and report PDF) |

---

## Step-by-step screenshots

Signup and setup instructions with screenshots live in [Setup & installation](setup.md). Screenshots will be added as the app is built and flows are finalized.

---

## Consistency

All documentation (this folder, root README, and REPORT.md / report PDF) is kept in sync. The report content is the same across REPORT.md, docs/report.md, and the generated report PDF.
