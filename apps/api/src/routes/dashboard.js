/**
 * Dashboard route — aggregated stats for the business.
 * Returns today's transaction count, revenue, expenses, and net profit.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /dashboard
 * Returns summary stats for the authenticated user's business.
 * Includes today's and all-time aggregates.
 */
router.get(
  '/',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const { businessId } = req.user;

      // Today's date boundaries (UTC)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // All-time transactions
      const allTransactions = await prisma.transaction.aggregate({
        where: { businessId },
        _sum: { total: true },
        _count: true,
      });

      // Today's transactions
      const todayTransactions = await prisma.transaction.aggregate({
        where: {
          businessId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { total: true },
        _count: true,
      });

      // All-time expenses
      const allExpenses = await prisma.expense.aggregate({
        where: { businessId },
        _sum: { amount: true },
        _count: true,
      });

      // Today's expenses
      const todayExpenses = await prisma.expense.aggregate({
        where: {
          businessId,
          date: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get business currency
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { baseCurrencyCode: true },
      });

      const totalRevenue = Number(allTransactions._sum.total ?? 0);
      const totalExpenses = Number(allExpenses._sum.amount ?? 0);
      const todayRevenue = Number(todayTransactions._sum.total ?? 0);
      const todayExpenseTotal = Number(todayExpenses._sum.amount ?? 0);

      res.json({
        currency: business?.baseCurrencyCode ?? 'USD',
        today: {
          transactionCount: todayTransactions._count,
          revenue: todayRevenue,
          expenses: todayExpenseTotal,
          netProfit: todayRevenue - todayExpenseTotal,
        },
        allTime: {
          transactionCount: allTransactions._count,
          revenue: totalRevenue,
          expenses: totalExpenses,
          netProfit: totalRevenue - totalExpenses,
        },
      });
    } catch (err) {
      console.error('dashboard error', err);
      res.status(500).json({ message: 'Failed to load dashboard data.' });
    }
  }
);

export default router;
