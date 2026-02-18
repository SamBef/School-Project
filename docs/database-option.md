# Database: Supabase (PostgreSQL)

You need a PostgreSQL database. **Option below: Supabase** (free tier). After you have the connection string, everything else is already set up.

---

## Step 1: Get your Supabase connection string

1. Open **https://supabase.com** and sign in (or create an account).
2. Create a **project** (e.g. name: `kobotrack`), choose a region, set a database password, and wait for the project to be ready.
3. In the project dashboard, go to **Project Settings** (gear icon) → **Database**.
4. Under **Connection string**, select **URI**.
5. Copy the URI. It looks like:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Replace **`[YOUR-PASSWORD]`** with the database password you set when creating the project (or reset it under Database → Database password).

---

## Step 2: Put the URL in your project

1. Open **`apps/api/.env`** in your project.
2. Set **`DATABASE_URL`** and **`DIRECT_URL`** to the same connection string (in quotes). Replace `[YOUR-PASSWORD]` with your real password:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres"
   ```
3. Save the file.

---

## Step 3: Create tables

**Important:** If the API is running, **stop it first** (Ctrl+C in that terminal). Otherwise Prisma may fail with `EPERM: operation not permitted` when generating the client (see [db-generate-fix.md](db-generate-fix.md)).

In a terminal, from the **API folder** (`apps/api`):

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

You should see **"Generated Prisma Client"** then **"Your database is now in sync with your schema."**

---

## Step 4: Run and test

1. Start the API: from `apps/api` run `npm run dev` (or from repo root: `npm run dev:api` if you have that script).
2. Start the web app: from `apps/web` run `npm run dev` (or from repo root: `npm run dev:web`).
3. Open the URL shown (e.g. **http://localhost:5173**).
4. Click **Create account**, fill the form, and submit — you should land on the Dashboard.

---

## If you use another PostgreSQL provider

- **Local PostgreSQL:** Install PostgreSQL, create a database (e.g. `kobotrack`), set `DATABASE_URL` and `DIRECT_URL` to `postgresql://user:password@localhost:5432/kobotrack` in `apps/api/.env`, then run `npx prisma db push` from `apps/api`.
- **Other cloud (e.g. Neon, Railway):** Use that provider’s connection URI in `DATABASE_URL` and `DIRECT_URL`, then run `npx prisma db push`.

Only the database URL and `db push` depend on this; the rest of the app is unchanged.

---

## If Step 3 gives errors

- **`EPERM: operation not permitted, rename ... query_engine-windows.dll.node`**  
  Something (usually the API server) has the Prisma files locked. Stop the API (Ctrl+C), close any other terminal running the app, then run `npx prisma generate` and `npx prisma db push` again from `apps/api`. See [db-generate-fix.md](db-generate-fix.md).

- **`Please make sure your database server is running at ...`**  
  Prisma could not reach Supabase. Check: (1) Supabase project is not paused (open the Supabase dashboard and wake it if needed). (2) Internet is working. (3) Run `npx prisma db push` again; sometimes the first attempt fails and the second works.
