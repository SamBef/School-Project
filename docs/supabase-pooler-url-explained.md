# Session pooler URL — broken down

Your project: **KoboTrack** · Region: **eu-west-1** · Ref: **knecixaeldwfpcnzxhmc**

---

## What the URL looks like (one line)

```text
postgresql://postgres.knecixaeldwfpcnzxhmc:YOUR_PASSWORD_ENCODED@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## What each part means

| Part | In your URL | Meaning |
|------|------------------|--------|
| **`postgresql://`** | (same) | Protocol: “this is a PostgreSQL connection”. |
| **`postgres.knecixaeldwfpcnzxhmc`** | Username | Your **project ref** with a `postgres.` prefix. Supabase uses this for the pooler. |
| **`:`** | (separator) | Separates username from password. |
| **`YOUR_PASSWORD_ENCODED`** | Password | The database password you set in Supabase. In the URL it **must be URL-encoded** (see below). |
| **`@`** | (separator) | Separates “user:password” from “host”. |
| **`aws-0-eu-west-1.pooler.supabase.com`** | Host | Supabase’s **pooler server** in your region (**eu-west-1**). Different from the direct host `db....supabase.co`. |
| **`:5432`** | Port | Session pooler uses **5432** on the pooler host. (Transaction pooler uses 6543.) |
| **`/postgres`** | Database name | The default database name. Usually leave as `postgres`. |
| **`?sslmode=require`** | Options | “Use SSL”. Required for Supabase. |

---

## Password: plain vs URL-encoded

Your password contains special characters. In the URL you must **encode** them so they don’t break the string:

| Character | Replace with |
|-----------|------------------|
| `@` | `%40` |
| `$` | `%24` |
| `=` | `%3D` |
| `#` | `%23` |

Example: password **`Samuel@2004$$=`** becomes **`Samuel%402004%24%24%3D`** in the URL.

---

## Your full pooler URL (ready to paste)

Using your ref (**knecixaeldwfpcnzxhmc**), region (**eu-west-1**), and encoded password:

```text
postgresql://postgres.knecixaeldwfpcnzxhmc:Samuel%402004%24%24%3D@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## Where to put it

1. Open **`apps/api/.env`**.
2. Set **both** of these lines to the **exact same** URL (the one above, or your own if the password is different):

```env
DATABASE_URL="postgresql://postgres.knecixaeldwfpcnzxhmc:Samuel%402004%24%24%3D@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.knecixaeldwfpcnzxhmc:Samuel%402004%24%24%3D@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

3. Save the file.
4. Run:

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
npx prisma db push
```

---

## Direct vs pooler (quick comparison)

| | Direct (what you had) | Session pooler (this) |
|--|------------------------|------------------------|
| **Host** | `db.knecixaeldwfpcnzxhmc.supabase.co` | `aws-0-eu-west-1.pooler.supabase.com` |
| **Port** | 5432 | 5432 (Session) or 6543 (Transaction) |
| **Username** | `postgres` | `postgres.knecixaeldwfpcnzxhmc` |

If your network or DNS can’t reach the direct host, the pooler host and port might work instead.
