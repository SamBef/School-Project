# Clear all database data

This guide resets **data only** (schema stays). Use after testing or to start fresh.

---

## Step 1: Open a terminal in the API project

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
```

---

## Step 2: Ensure `.env` is correct

1. Open `apps/api/.env`.
2. Confirm `DATABASE_URL` (and `DIRECT_URL` if present) point to your PostgreSQL (e.g. Neon).
3. **On Windows**, if you see a TLS/credentials error when connecting to Neon (or another cloud DB), add these lines to `.env` (dev only; do not use in production):

   ```env
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

   Save the file.

---

## Step 3: Run the clear command

You should still be in the same terminal, in the `apps\api` folder.

**Type this and press Enter:**

```powershell
npm run db:clear
```

That’s the only command you need. It runs the script that deletes all data from the database.

---

## Step 4: See what happened

Look at what the terminal printed:

- **If you see:** `All database data cleared.`  
  **Meaning:** It worked. All data in the database has been removed. You can close the terminal or do something else.

- **If you see:** something like `Failed to clear database:` followed by an error (e.g. TLS, credentials, connection)  
  **Meaning:** The script could not talk to the database. Go to the section below: “When Step 3 fails”.

---

## When Step 3 fails (TLS or connection error)

Try these in order.

### A. Run the script directly

In the same terminal (still in `apps\api`), run:

```powershell
node scripts/clear-database.js
```

If you still get an error, try B.

### B. Set the TLS option in the terminal, then clear

In the same terminal, run these **two lines, one after the other** (press Enter after each):

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run db:clear
```

The first line tells Node to allow the connection to your cloud database for this terminal session. The second runs the clear again.

### C. Check that the database is reachable

In the same terminal, run:

```powershell
npx prisma db execute --stdin
```

Then type exactly:

```text
SELECT 1;
```

and press Enter.  
If that also fails, the problem is your computer’s connection to the database (or the database URL in `.env`), not the clear script itself. In that case:

- If you use **Supabase**: open the Supabase dashboard, check that the project is running and that the connection string in `.env` matches Project Settings → Database (and that `[YOUR-PASSWORD]` is replaced with your real database password).
- Try turning off **VPN** or switching **Wi‑Fi** and run Step 3 again.

---

## After clearing (when it worked)

- The database has **no data** left (no users, no transactions, no businesses, etc.).
- The **structure** of the database (tables and columns) is unchanged.
- You can open the app, **register** again, and use it from a clean state.
