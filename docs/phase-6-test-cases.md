# Phase 6 — Manual Test Cases by Role

Walk through these test cases **as each role** (Owner, Manager, Cashier) to satisfy Phase 6. Check off each item; note any failures for bug fixing.

**Prerequisites:** Backend and frontend running locally (or use deployed URLs). At least one Owner account; create Manager and Cashier via Owner invite for role tests.

---

## As Owner

### Auth and profile

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O1 | Register a new business (name, email, password). | Success; redirected to dashboard. | |
| O2 | Logout, then login with same email/password. | Success; dashboard. | |
| O3 | Open Profile (avatar in header). | Business name and your user details shown. | |
| O4 | Request "Forgot password"; use email link (or dev link) and set new password. | Can log in with new password. | |

### Invite and RBAC (Owner-only)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O5 | Go to Invite; enter email and role **Manager**; submit. | Success; invite email sent or link shown. | |
| O6 | Use invite link (or dev link); set password. | Redirect to app; logged in as Manager. | |
| O7 | Log back in as Owner. Invite a **Cashier**; complete set-password as that user. | Cashier can log in. | |

### Navigation (Owner sees everything)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O8 | Check nav (desktop and mobile menu). | Dashboard, Transactions, Expenses, Export, Invite visible. | |
| O9 | Open each: Dashboard, Transactions, Expenses, Export, Invite. | All pages load; no 403. | |

### Transactions and receipts

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O10 | Create transaction: 2 line items, payment method. | "Transaction recorded. Receipt #N"; appears in list. | |
| O11 | Click receipt # in list; open detail page. | Detail shows items, total, payment method. | |
| O12 | Click "Download receipt". | PDF downloads; contains business name, items, total. | |
| O13 | Click "Delete" on same transaction; confirm. | Redirect to list; transaction gone. | |

### Expenses

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O14 | Add expense (description, category, amount, date). | Success; appears in list with category badge. | |
| O15 | Edit that expense (change amount); save. | Table updates. | |
| O16 | Filter by category. | Only matching expenses shown. | |
| O17 | Delete an expense. | Row removed. | |

### Dashboard and export

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O18 | Open Dashboard. | Today and all-time stats match your data (transactions, revenue, expenses, net). | |
| O19 | Export → Download PDF (with and without date range). | PDF downloads; contains summary and tables. | |
| O20 | Export → Download CSV. | CSV downloads; opens in spreadsheet with expected columns. | |

### i18n and responsive

| # | Step | Expected | ✓ |
|---|------|----------|---|
| O21 | Switch language to French; open Dashboard, Transactions, Expenses. | Labels in French. | |
| O22 | Switch to Spanish; same. | Labels in Spanish. | |
| O23 | Resize to ~375px; use Transactions and Expenses. | Forms and tables usable; no horizontal overflow that blocks use. | |

---

## As Manager

### Auth (no invite, no business profile edit)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| M1 | Login as Manager. | Dashboard. | |
| M2 | Check nav. | No "Invite" (or equivalent). | |
| M3 | Profile page. | Can view; no "Edit business" or worker management. | |
| M4 | Try to open invite URL directly (if known). | 403 or redirect; cannot invite. | |

### Transactions and receipts (same as Owner)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| M5 | Create transaction with line items. | Receipt #N; in list. | |
| M6 | Open detail; download receipt. | PDF downloads. | |
| M7 | Delete transaction; confirm. | Deleted; redirect to list. | |

### Expenses and export (Manager allowed)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| M8 | Add expense; edit; filter; delete. | All work. | |
| M9 | Open Export; download PDF and CSV. | Both download. | |

### Dashboard

| # | Step | Expected | ✓ |
|---|------|----------|---|
| M10 | Dashboard. | Same stats as Owner for that business. | |

---

## As Cashier

### RBAC (Cashier restrictions)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| C1 | Login as Cashier. | Dashboard. | |
| C2 | Check nav. | No "Expenses", no "Export", no "Invite". | |
| C3 | Try to open `/expenses` directly. | 403 or redirect to dashboard. | |
| C4 | Try to open `/export` directly. | 403 or redirect. | |
| C5 | Open a transaction detail. | No "Delete" button. | |

### Transactions and receipts only

| # | Step | Expected | ✓ |
|---|------|----------|---|
| C6 | Create transaction. | Receipt #N; in list. | |
| C7 | Open detail; download receipt. | PDF downloads. | |
| C8 | Dashboard. | Can view; today’s summary visible. | |

---

## Data accuracy (any role with access)

| # | Step | Expected | ✓ |
|---|------|----------|---|
| D1 | Create transaction with known line items; note expected total. | Receipt and list show same total. | |
| D2 | Create several transactions. | Receipt numbers sequential (1, 2, 3…) per business. | |
| D3 | Add expenses; check dashboard. | Today’s expenses and net profit match. | |
| D4 | Export PDF with date range; compare to list. | Same transactions and expenses in export. | |

---

## Session and errors

| # | Step | Expected | ✓ |
|---|------|----------|---|
| S1 | Logout. | Redirect to login; protected routes redirect to login. | |
| S2 | Login; wait for JWT to expire (or force 401). | Session expiry message on next request; redirect to login. | |
| S3 | Submit login with wrong password. | Clear error; form not cleared. | |
| S4 | Submit transaction with invalid data (e.g. empty item). | Validation message; no crash. | |

---

## Summary

- **Owner:** All boxes O1–O23 (and D1–D4, S1–S4 as needed).
- **Manager:** M1–M10, plus D1–D4, S1–S4.
- **Cashier:** C1–C8, plus D1–D2, S1–S4.

Record any failure with: role, test #, steps, and actual vs expected. Use that list for Phase 6 bug fixes.
