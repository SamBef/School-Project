/**
 * Smoke test for API endpoints. Run with the API running (npm run dev in apps/api).
 * Usage: node scripts/smoke-test-api.js
 * Uses API_URL env or default http://localhost:3003
 */

const BASE = process.env.API_URL || 'http://localhost:3003';

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

  // 1. Health
  try {
    const { status, body } = await fetchJson('/health');
    if (ok('GET /health', status === 200 && body?.status === 'ok')) passed++; else failed++;
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
      const createRes = await fetchJson('/inventory/units', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: `Smoke Unit ${Date.now()}`, symbol: 'su' }),
      });
      const created = createRes.status === 201 && createRes.body?.id && createRes.body?.name;
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

  console.log('\n---');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
