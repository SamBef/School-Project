# Phase 3 — Run & Test Guide

Step-by-step instructions to run and test all Phase 3 features locally.

---

## Prerequisites

- Phase 2 completed and working (auth, user management)
- Backend running at `http://localhost:3000`
- Frontend running at `http://localhost:5173`
- A registered business owner account
- Database connected (Neon PostgreSQL)

---

## Start the app

```bash
# Terminal 1: Start backend
npm run dev:api

# Terminal 2: Start frontend
npm run dev:web
```

---

## Test 1: Dashboard (real stats)

1. Sign in as the business owner
2. You should see the dashboard with 8 stat cards:
   - **Top row:** Today's transactions (0), Today's revenue ($0.00), Today's expenses ($0.00), Today's net ($0.00)
   - **Bottom row:** All-time transactions (0), Total revenue ($0.00), Total expenses ($0.00), Team members
3. The currency shown should match your business's base currency (default: USD)

---

## Test 2: Create a transaction

1. Click "Transactions" in the navigation (or "New transaction" quick action)
2. In the "New transaction" form:
   - Enter an item name (e.g., "Rice bag")
   - Set quantity to 2 and unit price to 15.00
   - The subtotal should show "30.00"
3. Click "+ Add item" to add a second line:
   - Name: "Cooking oil", Quantity: 1, Price: 8.50
4. The total should show "$38.50" (or your currency)
5. Select a payment method (e.g., Cash)
6. Click "Record transaction"
7. A success message should show "Transaction recorded. Receipt #1"
8. The transaction should appear in the history table below

**Verify receipt number increments:**
- Create another transaction
- It should get Receipt #2

---

## Test 3: View transaction detail

1. In the transaction history table, click the receipt number link (e.g., "#1")
2. You should see:
   - Transaction details card (date, payment method, recorded by, total)
   - Line items table with each item, quantity, unit price, and subtotal
   - The grand total in the footer

---

## Test 4: Download a receipt

1. On the transaction detail page, click "Download receipt"
2. A PDF should download with a narrow thermal-receipt format:
   - Business name and contact info at the top
   - Receipt number and date
   - Itemized list
   - Total
   - "Thank you for your business!" footer

---

## Test 5: Delete a transaction

1. On the transaction detail page (as Owner or Manager), click "Delete"
2. A confirmation message appears: "Are you sure you want to delete this transaction?"
3. Click "Yes, delete"
4. You should be redirected to the transactions list
5. The transaction should no longer appear

**Verify Cashier cannot delete:**
- If you have a Cashier account, sign in and view a transaction — the Delete button should not appear

---

## Test 6: Create an expense

1. Click "Expenses" in the navigation
2. In the "Add expense" form:
   - Description: "Monthly office rent"
   - Category: Rent
   - Amount: 500.00
   - Date: Today
3. Click "Add expense"
4. Success message: "Expense added successfully."
5. The expense should appear in the history table with a yellow "RENT" badge

**Test different categories:**
- Add expenses with categories: Stock/Inventory, Utilities, Transport, Miscellaneous
- Each should show a different colored badge

---

## Test 7: Edit an expense

1. In the expense history, click "Edit" on an expense
2. The form above should populate with the expense's values
3. Change the amount to 550.00
4. Click "Save"
5. Success message: "Expense updated successfully."
6. The table should reflect the new amount

---

## Test 8: Delete an expense

1. In the expense history, click "Delete" on an expense
2. The row should disappear immediately
3. The total count should decrease

---

## Test 9: Filter expenses by category

1. Use the category dropdown above the expense table
2. Select "Rent" — only rent expenses should show
3. Select "All categories" — all expenses return
4. The count should update accordingly

---

## Test 10: Dashboard updates

1. Go back to the Dashboard
2. The stat cards should now reflect your data:
   - Today's transactions count and revenue should match what you created
   - Today's expenses should match
   - Net profit = revenue - expenses
   - All-time values should also be populated

---

## Test 11: Export PDF

1. Click "Export" in the navigation
2. Leave date filters empty (includes all data)
3. Click "Download PDF"
4. A PDF should download with:
   - Business header
   - Summary section (total transactions, revenue, expenses, net profit)
   - Transactions table
   - Expenses table
   - Footer

**Test with date filter:**
- Set "From" to today and "To" to today
- Download again — should only include today's records

---

## Test 12: Export CSV

1. On the Export page, click "Download CSV"
2. A CSV file should download
3. Open it in a spreadsheet app (Excel, Google Sheets)
4. Verify it contains:
   - Type column (Transaction or Expense)
   - Receipt # for transactions
   - Date, Description, Category, Payment Method, Amount, Recorded by

---

## Test 13: Navigation

1. Verify "Transactions" appears in the navigation for all roles
2. Verify "Expenses" and "Export" appear only for Owner and Manager
3. On mobile, verify the hamburger menu includes all the correct links
4. Verify the slide-in panel includes "Transactions"

---

## Test 14: Multi-language

1. Switch language to French
2. Verify all new pages are translated:
   - Transactions page: "Nouvelle transaction", "Historique des transactions"
   - Expenses page: "Ajouter une dépense", "Historique des dépenses"
   - Export page: "Générer un rapport", "Télécharger PDF"
3. Switch to Spanish and verify similarly

---

## Test 15: Responsive design

1. Resize the browser to mobile width (~375px)
2. Verify:
   - Transaction form line items stack properly
   - Transaction footer stacks (payment select, total, button)
   - Data tables are horizontally scrollable
   - Export page filters and buttons stack vertically
   - Dashboard shows stats in a single column
   - Detail page grid becomes single column

---

## Expected behavior summary

| Action | Expected result |
|---|---|
| Create transaction | Success, receipt # shown, appears in list |
| View transaction detail | All info displayed, receipt PDF downloadable |
| Delete transaction | Removed from list, redirected |
| Create expense | Success, appears in list with category badge |
| Edit expense | Form populates, save updates the record |
| Delete expense | Row removed |
| Filter expenses | Table updates to show only matching category |
| Dashboard | Real stats from API, updates on refresh |
| Export PDF | Formatted PDF downloads |
| Export CSV | CSV file downloads, opens in spreadsheet |
| Receipt PDF | Narrow format receipt downloads |
