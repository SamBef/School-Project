# Database: One Option (Free PostgreSQL — Neon)

You need a PostgreSQL database. **Option below: Neon** (free, no credit card). After you have the URL, everything else is already set up.

---

## Step 1: Get a free PostgreSQL URL (Neon)

1. Open **https://neon.tech** in your browser.
2. Click **Sign up** (GitHub or email).
3. Create a **project** (e.g. name: `kobotrack`).  
   If they ask for **Postgres version**, **cloud provider**, or **Neon auth**, see [Neon signup choices](neon-signup-choices.md).
4. In the project dashboard, open **Connection details** or **Connection string**.
5. Copy the **connection string**. It looks like:
   ```text
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Put the URL in your project

1. Open **`apps/api/.env`** in your project.
2. Set **`DATABASE_URL`** to the string you copied (in quotes):
   ```env
   DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
3. Save the file.

---

## Step 3: Create tables (from project root)

**Important:** If the API is running, **stop it first** (Ctrl+C in the terminal where you ran `npm run dev:api`). Otherwise `db:generate` can fail with _operation not permitted_ (see [db-generate-fix.md](db-generate-fix.md)).

In a terminal, from the **project root** (`DTTRASM`):

```bash
npm run db:generate
npm run db:push
```

You should see: **"Generated Prisma Client"** then **"Your database is now in sync with your schema."**

---

## Step 4: Run and test

1. Start the API (if not already running):  
   `npm run dev:api`
2. Start the web app:  
   `npm run dev:web`
3. Open the URL shown (e.g. **http://localhost:5173**).
4. Click **Create account**, fill the form, and submit — you should land on the Dashboard.

---

## If you prefer Railway or local PostgreSQL

- **Railway:** Create a PostgreSQL service at https://railway.app, copy its `DATABASE_URL` into `apps/api/.env`, then run `npm run db:push`.
- **Local PostgreSQL:** Install PostgreSQL, create a database (e.g. `kobotrack`), set `DATABASE_URL="postgresql://user:password@localhost:5432/kobotrack"` in `apps/api/.env`, then run `npm run db:push`.

The rest of the steps (env files, Prisma generate, run servers) are already done; only the database URL and `db:push` depend on this option.
