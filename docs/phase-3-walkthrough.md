# Phase 3 Walkthrough — Core Business Features

Phase 3 implements the core business functionality: transactions with line items, automatic receipt generation, expense tracking, live dashboard analytics, and data export (PDF + CSV).

---

## What was built

### Backend (apps/api)

| File | Purpose |
|---|---|
| `src/routes/transactions.js` | CRUD for transactions — create (with auto-receipt), list, get detail, delete |
| `src/routes/expenses.js` | CRUD for expenses — create, list, update, delete (Owner/Manager only) |
| `src/routes/dashboard.js` | Aggregated stats — today's and all-time revenue, expenses, net profit |
| `src/routes/export.js` | Generate PDF and CSV reports with date filtering; single-receipt PDF download |

### Frontend (apps/web)

| File | Purpose |
|---|---|
| `src/pages/TransactionsPage.jsx` | Create transactions with dynamic line items + view transaction history |
| `src/pages/TransactionDetailPage.jsx` | View transaction details, line items, and download receipt PDF |
| `src/pages/ExpensesPage.jsx` | Add, edit, delete expenses with category filtering |
| `src/pages/ExportPage.jsx` | Download PDF/CSV reports with optional date range |
| `src/pages/DashboardPage.jsx` | Updated with real stats from API (today + all-time) |

### Updated files

- `apps/api/src/index.js` — Mounts four new route modules
- `apps/web/src/App.jsx` — Adds routes for `/transactions`, `/transactions/:id`, `/expenses`, `/export`
- `apps/web/src/components/Layout.jsx` — Adds "Transactions" to both desktop and mobile navigation
- `apps/web/src/lib/api.js` — Adds `api.download()` for file (blob) downloads
- `apps/web/src/index.css` — New styles for data tables, line items, pagination, category badges, export page
- `apps/web/src/i18n/locales/*.json` — All three locale files updated with Phase 3 keys

---

## API Endpoints

### Transactions

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/transactions` | Required | Any | Create transaction with line items; auto-generates receipt |
| GET | `/transactions` | Required | Any | List transactions (query: `dateFrom`, `dateTo`, `limit`, `offset`) |
| GET | `/transactions/:id` | Required | Any | Get single transaction with receipt and line items |
| DELETE | `/transactions/:id` | Required | Owner, Manager | Delete transaction (cascades receipt) |

**Create transaction body:**
```json
{
  "items": [
    { "name": "Rice bag", "quantity": 2, "unitPrice": 15.00 },
    { "name": "Cooking oil", "quantity": 1, "unitPrice": 8.50 }
  ],
  "paymentMethod": "CASH"
}
```

**Payment methods:** `CASH`, `CARD`, `MOBILE_MONEY`, `BANK_TRANSFER`, `OTHER`

### Receipts

Receipts are auto-generated when a transaction is created. Each receipt has a sequential number per business (starting at 1).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/export/receipt/:transactionId` | Required | Download receipt PDF for a transaction |

### Expenses

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/expenses` | Required | Owner, Manager | Create expense |
| GET | `/expenses` | Required | Owner, Manager | List expenses (query: `dateFrom`, `dateTo`, `category`, `limit`, `offset`) |
| PATCH | `/expenses/:id` | Required | Owner, Manager | Update expense |
| DELETE | `/expenses/:id` | Required | Owner, Manager | Delete expense |

**Create expense body:**
```json
{
  "description": "Monthly rent",
  "category": "RENT",
  "amount": 500.00,
  "date": "2026-02-10"
}
```

**Categories:** `RENT`, `STOCK_INVENTORY`, `UTILITIES`, `TRANSPORT`, `MISCELLANEOUS`

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Required | Get today's and all-time aggregates |

**Response:**
```json
{
  "currency": "USD",
  "today": {
    "transactionCount": 5,
    "revenue": 250.00,
    "expenses": 50.00,
    "netProfit": 200.00
  },
  "allTime": {
    "transactionCount": 100,
    "revenue": 5000.00,
    "expenses": 1200.00,
    "netProfit": 3800.00
  }
}
```

### Export

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/export/pdf` | Required | Owner, Manager | Download PDF report |
| GET | `/export/csv` | Required | Owner, Manager | Download CSV report |

Both accept `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` query parameters.

---

## How it works step by step

### 1. Recording a transaction

1. User navigates to `/transactions`
2. Fills in item name, quantity, and unit price for each line item
3. Clicks "+ Add item" to add more lines
4. Selects a payment method (Cash, Card, Mobile Money, Bank Transfer, Other)
5. The total is calculated live as items are added/modified
6. On submit, the backend:
   - Validates all fields
   - Calculates the total server-side
   - Creates the transaction record
   - Finds the last receipt number for the business and increments it
   - Creates both records atomically using a Prisma `$transaction`
7. Success message shows the receipt number

### 2. Viewing transaction details

1. In the transaction history table, click a receipt number (e.g., "#3")
2. The detail page shows:
   - Date, payment method, recorded-by, and total
   - A line items table with each item's name, quantity, price, and subtotal
3. "Download receipt" generates a narrow-format PDF (thermal receipt style) with:
   - Business header (name, location, phone, email)
   - Receipt number and date
   - Item list with quantities and prices
   - Total amount
   - Footer

### 3. Tracking expenses

1. Navigate to `/expenses` (Owner and Manager only)
2. Fill in description, select category, enter amount, and pick a date
3. Submit to create the expense
4. The history table shows all expenses with category badges
5. Use the category filter dropdown to narrow results
6. Click "Edit" to populate the form with existing values, then save changes
7. Click "Delete" to remove an expense

### 4. Dashboard analytics

The dashboard now shows 8 stat cards:
- **Today row:** Transactions count, revenue, expenses, net profit
- **All-time row:** Total transactions, total revenue, total expenses, team members

All values update in real-time from the API.

### 5. Exporting reports

1. Navigate to `/export`
2. Optionally set a "From" and "To" date to filter the report
3. Click "Download PDF" for a formatted report or "Download CSV" for a spreadsheet file
4. The "About export formats" section explains what each format includes

---

## RBAC summary for Phase 3

| Feature | Owner | Manager | Cashier |
|---|---|---|---|
| Create transaction | Yes | Yes | Yes |
| View transactions | Yes | Yes | Yes |
| Delete transaction | Yes | Yes | No |
| Manage expenses | Yes | Yes | No |
| View dashboard | Yes | Yes | Yes |
| Export reports | Yes | Yes | No |
| Invite workers | Yes | No | No |

---

## Dependencies added

- `pdfkit` — PDF generation for reports and receipts
- `csv-stringify` — CSV file generation for data export

---

## Design decisions

1. **Receipts are auto-generated:** Every transaction gets a receipt automatically. No separate "generate receipt" step is needed. This simplifies the user flow.

2. **Sequential receipt numbers:** Each business has its own sequence starting at 1. This is enforced by querying the last receipt number before creating a new one.

3. **Atomic creation:** Transaction + receipt are created in a single Prisma `$transaction` to prevent orphaned records.

4. **Category badges:** Expense categories use color-coded badges for quick visual scanning.

5. **Pagination:** Both transaction and expense lists support server-side pagination (20 items per page).

6. **Date filtering:** Export, transactions list, and expenses list all support optional date range filtering.

7. **Role enforcement:** Expenses are restricted to Owner and Manager. Transactions can be recorded by anyone but deleted only by Owner/Manager.
