/**
 * Analysis route — aggregated data for charts (time series, expenses by category).
 * Owner and Manager only.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * GET /analysis
 * Query: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD). Defaults: last 30 days.
 * Returns: summary, timeSeries (daily revenue/expenses/count), expensesByCategory.
 */
router.get(
  '/',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const { businessId } = req.user;
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      let dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : new Date(today);
      let dateTo = req.query.dateTo ? new Date(req.query.dateTo) : new Date(today);

      if (!req.query.dateFrom) {
        dateFrom.setDate(dateFrom.getDate() - 29);
        dateFrom.setHours(0, 0, 0, 0);
      } else {
        dateFrom.setHours(0, 0, 0, 0);
      }
      if (!req.query.dateTo) {
        dateTo.setHours(23, 59, 59, 999);
      }

      if (dateFrom > dateTo) {
        return res.status(400).json({ message: 'dateFrom must be before or equal to dateTo.' });
      }

      const [transactions, expenses] = await Promise.all([
        prisma.transaction.findMany({
          where: {
            businessId,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: { total: true, createdAt: true },
        }),
        prisma.expense.findMany({
          where: {
            businessId,
            date: { gte: dateFrom, lte: dateTo },
          },
          select: { amount: true, date: true, category: true },
        }),
      ]);

      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { baseCurrencyCode: true },
      });
      const currency = business?.baseCurrencyCode ?? 'USD';

      const timeSeriesMap = {};
      for (let d = new Date(dateFrom); d <= dateTo; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        timeSeriesMap[key] = { date: key, revenue: 0, expenses: 0, transactionCount: 0 };
      }

      let totalRevenue = 0;
      let totalExpenses = 0;
      for (const tx of transactions) {
        const key = toDateKey(tx.createdAt);
        if (timeSeriesMap[key]) {
          timeSeriesMap[key].revenue += Number(tx.total);
          timeSeriesMap[key].transactionCount += 1;
        }
        totalRevenue += Number(tx.total);
      }

      const categoryTotals = {};
      for (const ex of expenses) {
        const key = toDateKey(ex.date);
        if (timeSeriesMap[key]) {
          timeSeriesMap[key].expenses += Number(ex.amount);
        }
        totalExpenses += Number(ex.amount);
        categoryTotals[ex.category] = (categoryTotals[ex.category] || 0) + Number(ex.amount);
      }

      const timeSeries = Object.keys(timeSeriesMap)
        .sort()
        .map((k) => timeSeriesMap[k]);

      const expensesByCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        count: expenses.filter((e) => e.category === category).length,
      }));

      res.json({
        currency,
        dateFrom: toDateKey(dateFrom),
        dateTo: toDateKey(dateTo),
        summary: {
          revenue: Math.round(totalRevenue * 100) / 100,
          expenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
          transactionCount: transactions.length,
        },
        timeSeries,
        expensesByCategory,
      });
    } catch (err) {
      console.error('analysis error', err);
      res.status(500).json({ message: 'Failed to load analysis data.' });
    }
  }
);

export default router;
