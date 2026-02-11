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

/**
 * GET /admin/businesses/:id
 * Returns one business summary + activityLast7Days (counts per day, no detail).
 */
router.get(
  '/:id',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id } = req.params;
      const business = await prisma.business.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          primaryLocation: true,
          createdAt: true,
          baseCurrencyCode: true,
          _count: { select: { users: true, transactions: true, expenses: true } },
        },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }

      const lastTx = await prisma.transaction.groupBy({
        by: ['businessId'],
        where: { businessId: id },
        _max: { createdAt: true },
      });
      const lastEx = await prisma.expense.groupBy({
        by: ['businessId'],
        where: { businessId: id },
        _max: { createdAt: true },
      });
      const lastT = lastTx[0]?._max?.createdAt ?? null;
      const lastE = lastEx[0]?._max?.createdAt ?? null;
      const lastActivityAt = [lastT, lastE].filter(Boolean).length
        ? new Date(Math.max((lastT && lastT.getTime()) || 0, (lastE && lastE.getTime()) || 0)).toISOString()
        : null;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [transactionsInRange, expensesInRange] = await Promise.all([
        prisma.transaction.findMany({
          where: { businessId: id, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
        prisma.expense.findMany({
          where: { businessId: id, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
      ]);

      const dayMap = {};
      for (let d = new Date(sevenDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { date: key, transactionCount: 0, expenseCount: 0 };
      }
      transactionsInRange.forEach((t) => {
        const key = t.createdAt.toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].transactionCount += 1;
      });
      expensesInRange.forEach((e) => {
        const key = e.createdAt.toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].expenseCount += 1;
      });
      const activityLast7Days = Object.keys(dayMap).sort().map((k) => dayMap[k]);

      res.json({
        id: business.id,
        name: business.name,
        primaryLocation: business.primaryLocation,
        createdAt: business.createdAt.toISOString(),
        baseCurrencyCode: business.baseCurrencyCode,
        userCount: business._count.users,
        transactionCount: business._count.transactions,
        expenseCount: business._count.expenses,
        lastActivityAt,
        activityLast7Days,
      });
    } catch (err) {
      console.error('admin business detail error', err);
      res.status(500).json({ message: 'Failed to load business.' });
    }
  }
);

export default router;
