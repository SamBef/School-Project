# Fix: `npm run db:generate` fails with EPERM

**Error you see:**
```text
EPERM: operation not permitted, rename '...\query_engine-windows.dll.node.tmp...' -> '...\query_engine-windows.dll.node'
```

**Cause:** A Node process (usually the **API server**) has the Prisma client loaded, so Windows locks the file and Prisma cannot replace it.

---

## Fix (do in this order)

### 1. Stop the API server

- Go to the terminal where you ran **`npm run dev:api`**.
- Press **Ctrl+C** to stop it.
- If you started the API in another way, close that terminal or stop the process (e.g. Task Manager → end the `node` process for this project).

### 2. Run `db:generate` again

From the **project root** (`DTTRASM`):

```bash
npm run db:generate
```

You should see: **"Generated Prisma Client"**.

### 3. Start the API again

```bash
npm run dev:api
```

---

## If it still fails

1. Close **all** terminals that might be running the API or the full app (`npm run dev`, `npm run dev:api`, etc.).
2. In Task Manager (Ctrl+Shift+Esc), end any **Node.js** process that might be for this project.
3. Run `npm run db:generate` again from the project root.
4. Then start the API again with `npm run dev:api`.

---

**Summary:** Stop anything using the API (and thus Prisma), run `npm run db:generate`, then start the API again.
