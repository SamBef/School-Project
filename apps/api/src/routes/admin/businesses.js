/**
 * Admin businesses — list companies with summary only (confidentiality-preserving).
 * No transaction/expense details or user PII; aggregate counts and last activity only.
 */

import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /admin/businesses
 * Returns list of businesses with: id, name, primaryLocation, createdAt, baseCurrencyCode,
 * userCount, transactionCount, expenseCount, lastActivityAt.
 * No business contact details or user/transaction/expense detail.
 */
router.get(
  '/',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const businesses = await prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          primaryLocation: true,
          createdAt: true,
          baseCurrencyCode: true,
          _count: {
            select: { users: true, transactions: true, expenses: true },
          },
        },
      });

      const lastTx = await prisma.transaction.groupBy({
        by: ['businessId'],
        _max: { createdAt: true },
      });
      const lastEx = await prisma.expense.groupBy({
        by: ['businessId'],
        _max: { createdAt: true },
      });
      const lastTxMap = Object.fromEntries(lastTx.map((x) => [x.businessId, x._max.createdAt]));
      const lastExMap = Object.fromEntries(lastEx.map((x) => [x.businessId, x._max.createdAt]));

      const list = businesses.map((b) => {
        const lastT = lastTxMap[b.id] ?? null;
        const lastE = lastExMap[b.id] ?? null;
        const lastActivityAt = [lastT, lastE].filter(Boolean).length
          ? new Date(Math.max((lastT && lastT.getTime()) || 0, (lastE && lastE.getTime()) || 0)).toISOString()
          : null;
        return {
          id: b.id,
          name: b.name,
          primaryLocation: b.primaryLocation,
          createdAt: b.createdAt.toISOString(),
          baseCurrencyCode: b.baseCurrencyCode,
          userCount: b._count.users,
          transactionCount: b._count.transactions,
          expenseCount: b._count.expenses,
          lastActivityAt,
        };
      });

      res.json({ businesses: list });
    } catch (err) {
      console.error('admin businesses error', err);
      res.status(500).json({ message: 'Failed to load businesses.' });
    }
  }
);

export default router;
