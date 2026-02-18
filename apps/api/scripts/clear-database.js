/**
 * Clear all data from the database. Keeps schema intact.
 * Run from apps/api: npm run db:clear  (or node scripts/clear-database.js)
 * Deletes in dependency order (children first) to satisfy foreign keys.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(apiRoot, '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const timeoutMs = 60_000; // 60 seconds (default is 5s; many deletes can be slow on a remote DB)
  await prisma.$transaction(async (tx) => {
    await tx.receipt.deleteMany();
    await tx.returnLine.deleteMany();
    await tx.return.deleteMany();
    await tx.receiveStockLine.deleteMany();
    await tx.receiveStock.deleteMany();
    await tx.stockAdjustment.deleteMany();
    await tx.stockMovement.deleteMany();
    await tx.stockLevel.deleteMany();
    await tx.supplierProduct.deleteMany();
    await tx.productUnit.deleteMany();
    await tx.transaction.deleteMany();
    await tx.expense.deleteMany();
    await tx.product.deleteMany();
    await tx.unit.deleteMany();
    await tx.location.deleteMany();
    await tx.supplier.deleteMany();
    await tx.returnReason.deleteMany();
    await tx.user.deleteMany();
    await tx.business.deleteMany();
    await tx.admin.deleteMany();
  }, { timeout: timeoutMs });
  console.log('All database data cleared.');
}

main()
  .catch((e) => {
    console.error('Failed to clear database:', e.message);
    if (e.message?.includes('TLS') || e.message?.includes('credentials') || e.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      console.error('\nTip: On Windows with cloud DB, ensure .env has NODE_TLS_REJECT_UNAUTHORIZED=0 (dev only). See docs/database-option.md or scripts/README-db-clear.md.');
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
