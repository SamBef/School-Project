# Architecture

High-level architecture of KoboTrack (monorepo, web, API, database).

---

## Monorepo layout

```
DTTRASM/
├── apps/
│   ├── web/              # React frontend
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── i18n/
│   │   │   └── lib/
│   │   ├── index.html
│   │   └── vite.config.js
│   └── api/              # Express backend
│       ├── prisma/
│       ├── src/
│       │   ├── config/
│       │   ├── middleware/
│       │   └── routes/
│       └── package.json
├── docs/
├── REPORT.md
└── package.json          # Workspace root
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, HTML (semantic), vanilla CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT, bcrypt; SendGrid for invite and password-reset emails |
| Hosting | Netlify (web), Railway (api + PostgreSQL) |

---

## Data flow (summary)

- **Web** talks to **API** via REST; all auth uses JWT in headers.
- **API** uses **Prisma** to read/write **PostgreSQL**.
- **API** calls **SendGrid** for invite and password-reset emails.
- **Web** uses i18n (EN/FR/ES) and a language switcher; dates/times are based on user location.

---

## Roles and permissions

- **Owner:** Full control (business profile, workers, dashboard, expenses, export).
- **Manager:** Transactions, receipts, expenses, export; no business settings or worker management.
- **Cashier:** Transactions and receipts only; no expenses or export.

Detailed matrix is in the roadmap document and in `docs/report.md`.
