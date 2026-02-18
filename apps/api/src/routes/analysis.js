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

/**
 * GET /analysis/inventory-metrics
 * Query: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD). Defaults: last 30 days.
 * Returns per-product: productId, productName, quantitySold, revenue, currentStock, minStock (for restocking/insights).
 */
router.get(
  '/inventory-metrics',
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

      const [transactions, salesMovements, productsWithStock] = await Promise.all([
        prisma.transaction.findMany({
          where: {
            businessId,
            status: 'CONFIRMED',
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: { items: true },
        }),
        prisma.stockMovement.findMany({
          where: {
            businessId,
            type: 'SALE',
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: { productId: true, quantityDelta: true },
        }),
        prisma.product.findMany({
          where: { businessId },
          select: {
            id: true,
            name: true,
            minStock: true,
            stockLevels: { select: { quantity: true, reservedQuantity: true } },
          },
        }),
      ]);

      const soldByProduct = {};
      for (const m of salesMovements) {
        const qty = Number(m.quantityDelta);
        if (qty < 0) {
          soldByProduct[m.productId] = (soldByProduct[m.productId] || 0) + Math.abs(qty);
        }
      }

      const revenueByProduct = {};
      for (const tx of transactions) {
        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
          if (!item?.productId) continue;
          const qty = Number(item.quantity) || 0;
          const price = Number(item.unitPrice) || 0;
          const rev = qty * price;
          revenueByProduct[item.productId] = (revenueByProduct[item.productId] || 0) + rev;
        }
      }

      const productIds = new Set([
        ...Object.keys(soldByProduct),
        ...Object.keys(revenueByProduct),
        ...productsWithStock.map((p) => p.id),
      ]);
      const metrics = [];
      for (const product of productsWithStock) {
        const quantitySold = soldByProduct[product.id] ?? 0;
        const revenue = revenueByProduct[product.id] ?? 0;
        const currentStock = product.stockLevels.reduce(
          (sum, sl) => sum + Number(sl.quantity) - Number(sl.reservedQuantity),
          0
        );
        const minStock = product.minStock != null ? Number(product.minStock) : null;
        metrics.push({
          productId: product.id,
          productName: product.name,
          quantitySold: Math.round(quantitySold * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          currentStock: Math.round(currentStock * 100) / 100,
          minStock,
        });
      }
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { baseCurrencyCode: true, globalMinStock: true },
      });
      res.json({
        currency: business?.baseCurrencyCode ?? 'USD',
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        globalMinStock: business?.globalMinStock != null ? Number(business.globalMinStock) : null,
        products: metrics,
      });
    } catch (err) {
      console.error('inventory-metrics error', err);
      res.status(500).json({ message: 'Failed to load inventory metrics.' });
    }
  }
);

export default router;
