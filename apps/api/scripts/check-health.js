/**
 * Check API health and KoboAI configuration.
 * Run with the API running: npm run check:health (or node scripts/check-health.js from apps/api).
 * Uses API_URL env or default http://localhost:3005.
 */

const BASE = process.env.API_URL || 'http://localhost:3005';

async function main() {
  console.log(`Checking API at ${BASE}…\n`);
  try {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) {
      console.log('API health: FAIL');
      console.log(`  Status: ${res.status}`);
      console.log('  Start the API with: npm run dev:api (from repo root) or npm run dev (from apps/api)\n');
      process.exit(1);
    }
    console.log('API health: OK');
    console.log(`  Service: ${data.service ?? 'unknown'}`);
    const koboOk = data.koboaiConfigured === true;
    console.log(`  KoboAI configured: ${koboOk ? 'yes' : 'no'}`);
    if (!koboOk) {
      console.log('  To enable KoboAI: set OPENAI_API_KEY in apps/api/.env (see .env.example).\n');
    } else {
      console.log('');
    }
  } catch (err) {
    console.log('API health: unreachable');
    console.log(`  Error: ${err.message ?? err}`);
    console.log('  Make sure the API is running: npm run dev:api (from repo root).\n');
    process.exit(1);
  }
}

main();
