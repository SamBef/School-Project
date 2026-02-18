/**
 * Quick test: can we reach the database host on port 5432 or 6543?
 * Run from apps/api: node scripts/test-db-connection.js
 * No Prisma/DB auth — just TCP reachability.
 */

import net from 'net';

const host = 'db.knecixaeldwfpcnzxhmc.supabase.co';
const ports = [5432, 6543];

function tryPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 8000;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ port, ok: true });
    });
    socket.on('error', (err) => {
      resolve({ port, ok: false, error: err.message });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, ok: false, error: 'Timeout' });
    });
    socket.connect(port, host);
  });
}

async function main() {
  console.log(`Testing reachability of ${host}...\n`);
  for (const port of ports) {
    const result = await tryPort(port);
    if (result.ok) {
      console.log(`  Port ${port}: reachable`);
    } else {
      console.log(`  Port ${port}: NOT reachable (${result.error})`);
    }
  }
  console.log('\nIf both show NOT reachable, your network or firewall is blocking the connection.');
  console.log('If 5432 fails but 6543 works, use the Session pooler URL in .env (see docs/supabase-pooler.md).');
}

main().catch(console.error);
