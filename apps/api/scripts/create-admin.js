/**
 * One-off script to create a platform admin.
 * Run from apps/api: ADMIN_EMAIL=you@example.com ADMIN_INITIAL_PASSWORD=yourSecret node scripts/create-admin.js
 * Uses the same database as the API (apps/api/.env: DATABASE_URL = Supabase or other PostgreSQL).
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
  const email = process.env.ADMIN_EMAIL?.trim()?.toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD to create an admin.');
    process.exit(1);
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists for', email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.admin.create({
    data: { email, passwordHash },
  });
  console.log('Admin created for', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
