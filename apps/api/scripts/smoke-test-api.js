/**
 * Smoke test for API endpoints. Run with the API running (npm run dev in apps/api).
 * Usage: node scripts/smoke-test-api.js
 * Uses API_URL env or default http://localhost:3005 (match PORT in apps/api/.env).
 */

const BASE = process.env.API_URL || 'http://localhost:3005';

async function fetchJson(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  return { status: res.status, body };
}

function ok(name, condition, detail = '') {
  const pass = condition ? 'PASS' : 'FAIL';
  console.log(`  [${pass}] ${name}${detail ? ` — ${detail}` : ''}`);
  return condition;
}

async function main() {
  console.log(`Smoke testing API at ${BASE}\n`);

  let passed = 0;
  let failed = 0;

  // 1. Health (includes koboaiConfigured)
  try {
    const { status, body } = await fetchJson('/health');
    const healthOk = status === 200 && body?.status === 'ok';
    if (ok('GET /health', healthOk)) passed++; else failed++;
    if (healthOk && typeof body.koboaiConfigured === 'boolean') {
      console.log(`    → koboaiConfigured: ${body.koboaiConfigured}`);
    }
  } catch (err) {
    console.log(`  [FAIL] GET /health — ${err.message}`);
    failed++;
  }

  // 2. Register (so we have a user)
  const registerBody = {
    businessName: 'Smoke Test Biz',
    businessEmail: 'smoke@example.com',
    businessPhone: '+1234567890',
    primaryLocation: 'Test City',
    ownerEmail: `smoke-${Date.now()}@example.com`,
    password: 'password123',
    firstName: 'Smoke',
    lastName: 'User',
  };
  let token = null;
  try {
    const { status, body } = await fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerBody),
    });
    if (ok('POST /auth/register', status === 201 && body?.token && body?.user)) {
      passed++;
    } else {
      failed++;
      if (body?.message) console.log(`    → ${body.message}`);
    }
  } catch (err) {
    console.log(`  [FAIL] POST /auth/register — ${err.message}`);
    failed++;
  }

  // 3. Login (wrong password)
  try {
    const { status } = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: registerBody.ownerEmail, password: 'wrong' }),
    });
    if (ok('POST /auth/login (wrong password)', status === 401)) passed++; else failed++;
  } catch (err) {
    console.log(`  [FAIL] POST /auth/login (wrong) — ${err.message}`);
    failed++;
  }

  // 4. Login (correct) — get token for protected routes
  try {
    const { status, body } = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: registerBody.ownerEmail, password: registerBody.password }),
    });
    if (ok('POST /auth/login', status === 200 && body?.token)) {
      passed++;
      token = body.token;
    } else {
      failed++;
      if (body?.message) console.log(`    → ${body.message}`);
    }
  } catch (err) {
    console.log(`  [FAIL] POST /auth/login — ${err.message}`);
    failed++;
  }

  // 5. Protected: dashboard
  if (token) {
    try {
      const { status, body } = await fetchJson('/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const valid = status === 200 && body && (body.allTime || body.today) && typeof body.currency === 'string';
      if (ok('GET /dashboard', valid)) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /dashboard — ${err.message}`);
      failed++;
    }
  }

  // 6. Protected: inventory locations (all roles)
  if (token) {
    try {
      const { status, body } = await fetchJson('/inventory/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok('GET /inventory/locations', status === 200 && Array.isArray(body?.locations))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /inventory/locations — ${err.message}`);
      failed++;
    }
  }

  // 6b. Protected: inventory units (all roles)
  if (token) {
    try {
      const { status, body } = await fetchJson('/inventory/units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok('GET /inventory/units', status === 200 && Array.isArray(body?.units))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /inventory/units — ${err.message}`);
      failed++;
    }
  }

  // 6c. Protected: inventory products (all roles)
  if (token) {
    try {
      const { status, body } = await fetchJson('/inventory/products?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok('GET /inventory/products', status === 200 && Array.isArray(body?.products) && typeof body?.total === 'number')) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /inventory/products — ${err.message}`);
      failed++;
    }
  }

  // 6d. Protected: inventory create unit (Owner/Manager) + verify
  if (token) {
    try {
      const unitName = `Smoke Unit ${Date.now()}`;
      const createRes = await fetchJson('/inventory/units', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: unitName, symbol: 'su' }),
      });
      const created = createRes.status === 201 && createRes.body?.id;
      if (!created && createRes.body?.message) console.log(`    → ${createRes.body.message}`);
      if (ok('POST /inventory/units (create)', created)) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] POST /inventory/units — ${err.message}`);
      failed++;
    }
  }

  // 6e. Protected: inventory alerts (all roles)
  if (token) {
    try {
      const { status, body } = await fetchJson('/inventory/alerts/low-stock', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok('GET /inventory/alerts/low-stock', status === 200 && Array.isArray(body?.alerts))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /inventory/alerts/low-stock — ${err.message}`);
      failed++;
    }
  }

  // 6f. Protected: expenses list (Owner/Manager)
  if (token) {
    try {
      const { status, body } = await fetchJson('/expenses?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok('GET /expenses', status === 200 && Array.isArray(body?.expenses))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /expenses — ${err.message}`);
      failed++;
    }
  }

  // 7. Protected: transactions list
  if (token) {
    try {
      const { status, body } = await fetchJson('/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok('GET /transactions', status === 200 && Array.isArray(body?.transactions))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] GET /transactions — ${err.message}`);
      failed++;
    }
  }

  // 8. Unauthenticated protected route → 401
  try {
    const { status } = await fetchJson('/transactions');
    if (ok('GET /transactions (no token)', status === 401)) passed++; else failed++;
  } catch (err) {
    console.log(`  [FAIL] GET /transactions (no token) — ${err.message}`);
    failed++;
  }

  // 9. GET /analysis (Owner/Manager)
  if (token) {
    try {
      const dateTo = new Date().toISOString().slice(0, 10);
      const dateFrom = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { status, body } = await fetchJson(`/analysis?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const valid = status === 200 && body && typeof body.currency === 'string' && Array.isArray(body.timeSeries);
      if (ok('GET /analysis', valid)) passed++; else failed++;
      if (!valid && body?.message) console.log(`    → ${body.message}`);
    } catch (err) {
      console.log(`  [FAIL] GET /analysis — ${err.message}`);
      failed++;
    }
  }

  // 10. POST /ai/suggest-expense-category (Owner only; 503 if no key is ok)
  if (token) {
    try {
      const { status, body } = await fetchJson('/ai/suggest-expense-category', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: 'Electricity bill January' }),
      });
      const success = status === 200 && body?.category;
      const unavailable = status === 503 && body?.message;
      if (ok('POST /ai/suggest-expense-category', success || unavailable, success ? body.category : status === 503 ? 'unavailable' : body?.message || String(status))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] POST /ai/suggest-expense-category — ${err.message}`);
      failed++;
    }
  }

  // 11. POST /ai/insights/strategic (Owner only; 503 if no key is ok)
  if (token) {
    try {
      const { status, body } = await fetchJson('/ai/insights/strategic', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const success = status === 200 && (body?.insights || body?.frameworks);
      const unavailable = status === 503 && body?.message;
      if (ok('POST /ai/insights/strategic', success || unavailable, success ? 'ok' : status === 503 ? 'unavailable' : body?.message || String(status))) passed++; else failed++;
    } catch (err) {
      console.log(`  [FAIL] POST /ai/insights/strategic — ${err.message}`);
      failed++;
    }
  }

  // 12. Manager/Cashier cannot call AI → 403 (optional: create another user with role MANAGER and try)
  // Skip for brevity; smoke test uses Owner token.

  console.log('\n---');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
