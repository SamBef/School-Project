/**
 * One-off script to create or update a platform admin.
 * Run from apps/api:
 *   ADMIN_NAME=koboadmin ADMIN_EMAIL=you@example.com ADMIN_INITIAL_PASSWORD=yourSecret node scripts/create-admin.js
 * If an admin with that email already exists, their name is updated to ADMIN_NAME when provided.
 * Uses the same database as the API (apps/api/.env: DATABASE_URL).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(apiRoot, '.env') });

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim()?.toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD. Optionally set ADMIN_NAME (e.g. koboadmin).');
    process.exit(1);
  }

  const displayName = name || email.split('@')[0] || 'admin';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    const updates = {};
    if (name && name !== existing.name) updates.name = name;
    if (Object.keys(updates).length > 0) {
      await prisma.admin.update({ where: { id: existing.id }, data: updates });
      console.log('Admin updated: name set to', updates.name || existing.name);
    } else {
      console.log('Admin already exists for', email, '(name:', existing.name + ')');
    }
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.admin.create({
    data: { name: displayName, email, passwordHash },
  });
  console.log('Admin created:', displayName, '(' + email + ')');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
