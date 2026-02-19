# KoboTrack

**SME Transaction & Receipt Manager** — Digitalizing transaction tracking and receipt automation for microenterprises.

---

## Overview

KoboTrack gives small and medium enterprises a single platform to:

- Record daily sales (multiple line items per transaction)
- Auto-generate professional receipts (multiple formats)
- Track business expenses by category
- View a real-time dashboard (sales, revenue, expenses, net profit)
- Export data as PDF or CSV
- Invite workers and assign roles (Owner / Manager / Cashier)

Target users: SME owners, managers, and daily workers.

---

## Repository structure

```
kobotrack/
├── apps/
│   ├── web/          # React frontend (HTML, vanilla CSS) — company-facing app
│   ├── admin/        # React admin app — platform admin (companies list, summary only)
│   └── api/          # Node.js + Express backend
├── docs/             # Detailed documentation (incl. admin.md)
├── REPORT.md         # University-style report (source)
└── README.md         # This file
```

---

## Tech stack

| Layer     | Technology |
|----------|------------|
| Frontend | React, Vite, HTML, vanilla CSS |
| Backend  | Node.js, Express |
| Database | PostgreSQL (Prisma ORM) |
| Auth     | JWT, bcrypt; SendGrid for invite & password-reset emails |
| Hosting  | Vercel (web), Render or Railway (api + PostgreSQL) |

---

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL (local or Railway)
- SendGrid account (for invite and password-reset emails)

---

## Quick start

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd DTTRASM
   npm install
   ```

2. **Configure environment** — See [Quick start: Step 2 and 3](docs/quick-start-2-and-3.md) for detailed, chronological steps.

   - Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`, `JWT_SECRET`, `SENDGRID_API_KEY`, etc.
   - Copy `apps/web/.env.example` to `apps/web/.env` and set `VITE_API_URL` to your API base URL.

3. **Database** — From repo root (see [docs/quick-start-2-and-3.md](docs/quick-start-2-and-3.md)):

   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Run locally**

   ```bash
   npm run dev:api    # Terminal 1: API (must be running first)
   npm run dev:web    # Terminal 2: Web
   ```

   If you see "Cannot reach the API", start the API in a separate terminal and ensure `VITE_API_URL` in `apps/web/.env` matches the API URL (e.g. `http://localhost:3000`).

---

## Documentation

- **Full documentation:** [docs/](docs/) — setup, architecture, API, deployment, step-by-step screenshots and signup instructions.
- **Deployment checklist:** [docs/deployment-checklist.md](docs/deployment-checklist.md) — env vars, builds, CORS, and pre-deploy checks for main app, admin app, and API.
- **Report:** [REPORT.md](REPORT.md) — university-style report (source for PDF); same content also in `docs/` and generated as PDF.

---

## Deliverables

- Repo link
- Deployed URL (Vercel + Render or Railway)
- Demo video (5–10 minutes)
- Full documentation (docs/ + README + REPORT.md and report PDF)

---

## License

Private / university project.
