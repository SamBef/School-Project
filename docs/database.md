# Database schema

PostgreSQL schema managed by Prisma. Overview of main tables.

---

## Tables

### businesses

Stores each SME’s profile (used on receipts and for base currency).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| name | string | Required |
| email | string | Required |
| phone | string | Required |
| primaryLocation | string | City/town |
| address | string? | Optional full address |
| logoUrl | string? | Optional logo URL |
| baseCurrencyCode | string | e.g. USD, EUR, GHS |
| createdAt, updatedAt | datetime | |

---

### users

Each person (owner, manager, cashier) linked to one business.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| email | string | Unique |
| passwordHash | string? | bcrypt; null until set (invited users) |
| role | enum | OWNER, MANAGER, CASHIER |
| businessId | UUID | FK → businesses |
| invitedAt | datetime? | Set when invited |
| acceptedAt | datetime? | Set when they set password |
| inviteToken | string? | Token in invite email link |
| inviteTokenExpiry | datetime? | |
| resetToken | string? | Password reset token |
| resetTokenExpiry | datetime? | |
| createdAt, updatedAt | datetime | |

---

### transactions

Every sale: multiple line items stored as JSON.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| businessId | UUID | FK → businesses |
| userId | UUID | FK → users (who logged it) |
| items | JSON | Array of { name, quantity, unitPrice } |
| total | Decimal | In business base currency |
| paymentMethod | enum | Cash, Card, Mobile Money, Bank Transfer, Other |
| createdAt | datetime | |

---

### receipts

One receipt per transaction; receipt number sequential per business.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| transactionId | UUID | FK → transactions |
| receiptNumber | int | Sequential per business |
| format | string | e.g. standard, thermal (see receipt formats doc) |
| generatedAt | datetime | |

---

### expenses

Expense records with category.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| businessId | UUID | FK → businesses |
| userId | UUID | FK → users |
| description | string | |
| category | enum | Rent, Stock/Inventory, Utilities, Transport, Miscellaneous |
| amount | Decimal | In business base currency |
| date | date | |
| createdAt, updatedAt | datetime | |

---

## Enums

- **PaymentMethod:** Cash, Card, Mobile Money, Bank Transfer, Other
- **ExpenseCategory:** Rent, Stock_Inventory, Utilities, Transport, Miscellaneous
- **Role:** OWNER, MANAGER, CASHIER

---

Full definition: `apps/api/prisma/schema.prisma`.
