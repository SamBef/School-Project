# Neon signup: what to choose

When Neon asks for **Postgres version**, **cloud provider**, and **Neon auth**, use these choices.

---

## 1. Postgres version

- Choose **PostgreSQL 15** or **16** (either is fine).
- Prisma works with 14, 15, 16. **15** or **16** is recommended.

---

## 2. Cloud provider / region

- Pick any **cloud provider** (e.g. **AWS**).
- Pick any **region** (e.g. **US East (N. Virginia)** or the one nearest you).
- This only affects where the database runs; your app will connect from anywhere.

---

## 3. Neon auth

- **Neon auth** usually means how you log into the Neon dashboard (e.g. GitHub, email).
- For the **database connection**, Neon gives you a **connection string** with a password in it. You don’t need to choose a separate “auth” for the DB.
- If they ask “Authentication” for the database:
  - Use the default (often **password** or **SCRAM**).
  - Copy the connection string they show; it already includes the password.

---

## 4. After the project is created

1. Open your project in the Neon dashboard.
2. Find **Connection string** or **Connection details**.
3. Copy the string that looks like:
   ```text
   postgresql://myuser:mypassword@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Paste it into **`apps/api/.env`** as:
   ```env
   DATABASE_URL="postgresql://myuser:mypassword@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
5. Save the file, then from the project root run:
   ```bash
   npm run db:push
   ```

---

**Summary:** Postgres **15** or **16**, any **cloud/region**, use the default **Neon auth** and the **connection string** they give you for `DATABASE_URL`.
