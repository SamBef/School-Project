# Deployment

KoboTrack deployment: **Netlify** (frontend), **Railway** (API + PostgreSQL).

---

## Frontend (Netlify)

1. Connect the repo to Netlify.
2. **Build settings:**
   - Base directory: `apps/web`
   - Build command: `npm run build`
   - Publish directory: `apps/web/dist`
3. **Environment variables:** Set `VITE_API_URL` to the deployed API URL (e.g. `https://your-app.railway.app`).
4. Deploy.

---

## Backend and database (Railway)

1. Create a new project on [Railway](https://railway.app).
2. **PostgreSQL:** Add a PostgreSQL service; note `DATABASE_URL`.
3. **API service:** Add a service from the repo; set root (or build context) to `apps/api`.
   - Build command: `npm install && npm run build` (or as needed).
   - Start command: `node dist/index.js` or `npm start` (adjust to your build output).
4. **Environment variables** for the API service:
   - `DATABASE_URL` (from PostgreSQL service)
   - `JWT_SECRET`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
   - `FRONTEND_URL` = Netlify URL (for CORS and email links)
5. Expose the API service (public URL).
6. Run migrations: `npx prisma migrate deploy` (or `db push`) in the API service or via CLI with `DATABASE_URL`.

---

## Post-deploy

- Set Netlify `VITE_API_URL` to the Railway API URL.
- Verify login, invite, and password-reset flows and email links (they must point to the Netlify URL).
- Document the live URLs in README and report.
