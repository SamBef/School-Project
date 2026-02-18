# Fix: "EPERM" and "Port 3003 is in use" when starting the API

You see both:
- **EPERM: operation not permitted, rename ... query_engine-windows.dll.node**
- **Port 3003 is in use**

So **another API (or Node) process is already running**: it’s using port 3003 and has the Prisma files locked. You need to stop that process and then start the API **once**.

---

## Step 1: Stop whatever is using port 3003

**Option A — From the terminal**

1. Look at **every terminal** you have open (Cursor, PowerShell, etc.).
2. If any of them is running the API (`node src/index.js` or `npm run dev` in `apps/api`), switch to that terminal and press **Ctrl+C** to stop it.
3. Wait until the prompt comes back.

**Option B — From Task Manager**

1. Press **Ctrl+Shift+Esc** to open Task Manager.
2. Open the **Details** tab.
3. Find **Node.js** (or **node.exe**) in the list.
4. Right‑click each one that might be your project → **End task** (or end all Node processes if you’re not running other Node apps).
5. Close Task Manager.

**Option C — From PowerShell (find and stop by port)**

Run in PowerShell:

```powershell
$conn = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue
if ($conn) {
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped process using port 3003."
} else {
  Write-Host "Nothing is using port 3003."
}
```

---

## Step 2: (Optional) Close Cursor

If the API still won’t start, **close Cursor completely** and open a **new** PowerShell window (from the Start menu). Then go to Step 3. This avoids Cursor or its extensions holding the Prisma files.

---

## Step 3: Start the API once

In **one** terminal:

```powershell
cd c:\Users\User\Desktop\DTTRASM\apps\api
node src/index.js
```

You should see something like:

- `CORS allowed origins: http://localhost:5173, http://localhost:5174`
- `KoboTrack API listening on port 3003`

Leave this terminal open and use the app. Do **not** start the API again in another terminal.

---

## Summary

| Problem | Cause | Fix |
|--------|--------|-----|
| EPERM on Prisma file | Another process has the file open | Stop that process (API or Node in another terminal / Task Manager) |
| Port 3003 is in use | API (or another app) already listening on 3003 | Stop that process; then start the API only once |

After stopping the old process, start the API **once** from `apps/api` with `node src/index.js`.
