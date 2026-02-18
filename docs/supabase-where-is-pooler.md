# Where to find the pooler in the Supabase interface

Follow these steps **in order** to open the Connect panel and get the Session pooler URI.

---

## Step 1: Open your project

1. Go to **https://supabase.com/dashboard**
2. Sign in if needed.
3. Click your project (e.g. **KoboTrack**).  
   You should see the project home (overview, tables, etc.).

---

## Step 2: Open the Connect panel

1. Look at the **top** of the page (same row as the project name).
2. Find the **"Connect"** button and click it.  
   It’s often next to “New table” or near the project dropdown.
3. A **Connect** panel or modal should open.  
   It may show connection options for your database.

**If you don’t see "Connect":**

- Try **Project Settings** (gear icon, usually bottom-left) → **Database**.  
  On that page there is often a **“Connection string”** or **“Connect”** section that opens the same thing.
- Or use this link (replace `YOUR_PROJECT_REF` with your project ref, e.g. `knecixaeldwfpcnzxhmc`):  
  **https://supabase.com/dashboard/project/knecixaeldwfpcnzxhmc?showConnect=true&method=session**

---

## Step 3: Choose Session (pooler)

In the Connect panel you may see:

- **Direct connection** — host like `db.xxxxx.supabase.co`, port 5432  
- **Session** (or **Session pooler** / **Supavisor session**)  
- **Transaction** (or **Transaction pooler**)

1. Select **Session** (or the option that says “Session” or “Session pooler”).
2. The connection string shown should:
   - Use host: **`aws-0-eu-west-1.pooler.supabase.com`** (or `aws-0-<your-region>.pooler.supabase.com`)
   - Use port: **5432**
   - Use user: **`postgres.knecixaeldwfpcnzxhmc`** (or `postgres.<your-project-ref>`)

---

## Step 4: Copy the URI

1. In the same panel, choose **URI** (not “JDBC” or “.NET” etc.).
2. Copy the **full** string. It will look like:
   ```text
   postgresql://postgres.knecixaeldwfpcnzxhmc:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
   ```
3. Replace **`[YOUR-PASSWORD]`** with your real database password.  
   If the password has **@**, **$**, **=**, **#**, encode them:
   - `@` → `%40`
   - `$` → `%24`
   - `=` → `%3D`
   - `#` → `%23`
4. Add **`?sslmode=require`** at the end:
   ```text
   .../postgres?sslmode=require
   ```
5. Put this **exact** string into **`apps/api/.env`** for both **`DATABASE_URL`** and **`DIRECT_URL`**, then save.

---

## Quick link (Session pooler for your project)

If the Connect button is hard to find, open this URL in your browser (already set for Session and your project ref):

**https://supabase.com/dashboard/project/knecixaeldwfpcnzxhmc?showConnect=true&method=session**

That should open the dashboard with the Connect panel focused on the **Session** pooler. Copy the URI from there, replace the password, add `?sslmode=require`, and paste into `.env` as above.
