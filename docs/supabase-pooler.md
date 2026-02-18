# Get Supabase Session pooler URL (when direct connection fails with P1001)

If you get **"Can't reach database server at db....supabase.co:5432"**, try the **Session pooler** URL instead. It uses a different host and port (6543) that may work when the direct one is blocked.

---

## Step-by-step: copy the pooler URI

1. Open **https://supabase.com/dashboard** and sign in.
2. Click your **project** (the one you use for this app).
3. In the **left sidebar**, click the **gear icon** (⚙️) at the bottom → **Project Settings**.
4. In Project Settings, click **Database** in the left menu.
5. Scroll to **Connection string**.
6. You’ll see a few tabs or options:
   - **URI**
   - **Session** (or **Session pooler**) ← choose this  
   If you see **Transaction** and **Session**, pick **Session**.
7. Copy the full URI. It will look like:
   ```text
   postgresql://postgres.knecixaeldwfpcnzxhmc:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   The host will be **`aws-0-XXXX.pooler.supabase.com`** and the port **6543** (not 5432).
8. Replace **`[YOUR-PASSWORD]`** with your real database password.
   - If the password contains **@**, **$**, **=**, **#**, URL-encode them:
     - `@` → `%40`
     - `$` → `%24`
     - `=` → `%3D`
     - `#` → `%23`
   - Example: password `Samuel@2004$$=` → `Samuel%402004%24%24%3D`
9. Add **`?sslmode=require`** at the end of the URI (before any existing `?`).
   - Example: `.../postgres?sslmode=require`
10. Open **`apps/api/.env`** and set **both** lines to this **same** URI:
    ```env
    DATABASE_URL="postgresql://postgres.knecixaeldwfpcnzxhmc:YOUR_ENCODED_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require"
    DIRECT_URL="postgresql://postgres.knecixaeldwfpcnzxhmc:YOUR_ENCODED_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require"
    ```
11. Save `.env`, then run:
    ```powershell
    cd c:\Users\User\Desktop\DTTRASM\apps\api
    npx prisma db push
    ```

---

## If you don’t see “Session” or “Connection string”

- Look for **Connection pooling** or **Pooler**.
- Or under **Database** → **Connection string**, switch from **Direct** to **Session** (or **Transaction**).
- The important part is that the host is **`*.pooler.supabase.com`** and the port is **6543**.

---

## Test if your network can reach the DB at all

From `apps/api` run:

```powershell
node scripts/test-db-connection.js
```

Interpretation:

- If **both** show “NOT reachable”, the problem is network/firewall (e.g. ISP or school/work blocking those ports).
- **Timeout/refused** = port blocked; use Session pooler URL (port 6543) above. **reachable** = connection OK.
