/**
 * AI routes — user-triggered AI features (suggest category, restocking insights, strategic insights).
 * Owner only. Returns 503 when KoboAI is not configured (no API key).
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as aiService from '../services/ai.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function toDateRange(req) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let dateFrom = req.query.dateFrom || req.body?.dateFrom ? new Date(req.query.dateFrom || req.body.dateFrom) : new Date(today);
  let dateTo = req.query.dateTo || req.body?.dateTo ? new Date(req.query.dateTo || req.body.dateTo) : new Date(today);
  if (!req.query?.dateFrom && !req.body?.dateFrom) {
    dateFrom.setDate(dateFrom.getDate() - 29);
    dateFrom.setHours(0, 0, 0, 0);
  } else {
    dateFrom.setHours(0, 0, 0, 0);
  }
  if (!req.query?.dateTo && !req.body?.dateTo) {
    dateTo.setHours(23, 59, 59, 999);
  }
  return { dateFrom, dateTo };
}

/**
 * POST /ai/suggest-expense-category
 * Body: { description: string }
 * Returns: { category: string } — one of RENT, STOCK_INVENTORY, UTILITIES, TRANSPORT, MISCELLANEOUS
 * 503 if OPENAI_API_KEY not set; 429 if rate limited; 502 if provider error
 */
router.post(
  '/suggest-expense-category',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    const description = req.body?.description?.trim();
    if (!description) {
      return res.status(400).json({ message: 'Description is required.' });
    }

    try {
      const { category } = await aiService.suggestExpenseCategory(description);
      return res.json({ category });
    } catch (err) {
      if (err.statusCode === 503) {
        return res.status(503).json({
          message: 'KoboAI is not set up on this server. Your administrator can enable it by configuring the API key.',
        });
      }
      if (err.statusCode === 429) {
        return res.status(429).json({
          message: 'Too many requests. Please wait a moment and try again.',
        });
      }
      console.error('ai suggest-expense-category error', err.message);
      return res.status(502).json({
        message: 'Could not suggest category. Please choose one manually.',
      });
    }
  }
);

/**
 * POST /ai/insights/restocking
 * Body: { dateFrom?: string, dateTo?: string } (YYYY-MM-DD; default last 30 days)
 * Returns: { insights: string, recommendations: Array<{ type, productName?, reasoning, confidence? }> }
 */
router.post(
  '/insights/restocking',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const { businessId } = req.user;
      const { dateFrom, dateTo } = toDateRange(req);
      if (dateFrom > dateTo) {
        return res.status(400).json({ message: 'dateFrom must be before or equal to dateTo.' });
      }
      const [business, transactions, salesMovements, productsWithStock] = await Promise.all([
        prisma.business.findUnique({
          where: { id: businessId },
          select: { primaryLocation: true, address: true, baseCurrencyCode: true, globalMinStock: true },
        }),
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
      if (!business) {
        return res.status(404).json({ message: 'Business not found.' });
      }
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
          revenueByProduct[item.productId] = (revenueByProduct[item.productId] || 0) + qty * price;
        }
      }
      const products = productsWithStock.map((p) => {
        const quantitySold = soldByProduct[p.id] ?? 0;
        const revenue = revenueByProduct[p.id] ?? 0;
        const currentStock = p.stockLevels.reduce(
          (sum, sl) => sum + Number(sl.quantity) - Number(sl.reservedQuantity),
          0
        );
        return {
          productName: p.name,
          quantitySold: Math.round(quantitySold * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          currentStock: Math.round(currentStock * 100) / 100,
          minStock: p.minStock != null ? Number(p.minStock) : undefined,
        };
      });
      const result = await aiService.getRestockingInsights({
        primaryLocation: business.primaryLocation,
        address: business.address ?? undefined,
        currency: business.baseCurrencyCode ?? 'USD',
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        globalMinStock: business.globalMinStock != null ? Number(business.globalMinStock) : undefined,
        products,
      });
      return res.json(result);
    } catch (err) {
      if (err.statusCode === 503) {
        return res.status(503).json({
          message: 'KoboAI is not set up on this server. Your administrator can enable it by configuring the API key.',
        });
      }
      if (err.statusCode === 429) {
        return res.status(429).json({
          message: 'Too many requests. Please wait a moment and try again.',
        });
      }
      console.error('ai insights/restocking error', err.message);
      return res.status(502).json({
        message: 'Could not generate restocking insights. Please try again later.',
      });
    }
  }
);

/**
 * POST /ai/insights/strategic
 * No body. Uses business location and product list from DB.
 * Returns: { insights: string, frameworks: Array<{ name: string, content: string }> }
 */
router.post(
  '/insights/strategic',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const { businessId } = req.user;
      const [business, products] = await Promise.all([
        prisma.business.findUnique({
          where: { id: businessId },
          select: { name: true, primaryLocation: true, address: true },
        }),
        prisma.product.findMany({
          where: { businessId },
          select: { name: true },
        }),
      ]);
      if (!business) {
        return res.status(404).json({ message: 'Business not found.' });
      }
      const result = await aiService.getStrategicInsights({
        businessName: business.name,
        primaryLocation: business.primaryLocation,
        address: business.address ?? undefined,
        productNames: products.map((p) => p.name),
      });
      return res.json(result);
    } catch (err) {
      if (err.statusCode === 503) {
        return res.status(503).json({
          message: 'KoboAI is not set up on this server. Your administrator can enable it by configuring the API key.',
        });
      }
      if (err.statusCode === 429) {
        return res.status(429).json({
          message: 'Too many requests. Please wait a moment and try again.',
        });
      }
      console.error('ai insights/strategic error', err.message);
      return res.status(502).json({
        message: 'Could not generate strategic insights. Please try again later.',
      });
    }
  }
);

function handleAiError(err, res, context) {
  if (err.statusCode === 503) {
    return res.status(503).json({
      message: 'KoboAI is not set up on this server. Your administrator can enable it by configuring the API key.',
    });
  }
  if (err.statusCode === 429) {
    return res.status(429).json({
      message: 'Too many requests. Please wait a moment and try again.',
    });
  }
  console.error('ai', context, err.message);
  return res.status(502).json({ message: 'KoboAI request failed. Please try again.' });
}

/**
 * POST /ai/transaction-insights
 * Body: { itemText?: string, recentItemNames?: string[], recentTotals?: number[] }
 */
router.post(
  '/transaction-insights',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const itemText = req.body?.itemText?.trim() ?? '';
      const recentItemNames = Array.isArray(req.body?.recentItemNames) ? req.body.recentItemNames : [];
      const recentTotals = Array.isArray(req.body?.recentTotals) ? req.body.recentTotals : [];
      const result = await aiService.getTransactionInsights({ itemText, recentItemNames, recentTotals });
      return res.json(result);
    } catch (err) {
      return handleAiError(err, res, 'transaction-insights');
    }
  }
);

/**
 * GET /ai/cash-flow-summary?dateFrom=&dateTo=
 * Compares current period to previous period of same length.
 */
router.get(
  '/cash-flow-summary',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const { businessId } = req.user;
      const { dateFrom, dateTo } = toDateRange(req);
      if (dateFrom > dateTo) {
        return res.status(400).json({ message: 'dateFrom must be before or equal to dateTo.' });
      }
      const days = Math.round((dateTo - dateFrom) / (24 * 60 * 60 * 1000)) + 1;
      const prevEnd = new Date(dateFrom);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - days + 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setHours(23, 59, 59, 999);

      const [currTx, currEx, prevTx, prevEx] = await Promise.all([
        prisma.transaction.aggregate({
          where: { businessId, status: 'CONFIRMED', createdAt: { gte: dateFrom, lte: dateTo } },
          _sum: { total: true },
        }),
        prisma.expense.aggregate({
          where: { businessId, date: { gte: dateFrom, lte: dateTo } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { businessId, status: 'CONFIRMED', createdAt: { gte: prevStart, lte: prevEnd } },
          _sum: { total: true },
        }),
        prisma.expense.aggregate({
          where: { businessId, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
      ]);

      const revenue = Number(currTx._sum.total ?? 0);
      const expenses = Number(currEx._sum.amount ?? 0);
      const previousRevenue = Number(prevTx._sum.total ?? 0);
      const previousExpenses = Number(prevEx._sum.amount ?? 0);

      const result = await aiService.getCashFlowSummary({
        revenue,
        expenses,
        previousRevenue,
        previousExpenses,
        days,
      });
      return res.json(result);
    } catch (err) {
      return handleAiError(err, res, 'cash-flow-summary');
    }
  }
);

/**
 * POST /ai/expense-insights
 * Body: { description: string, category: string, recentDescriptions?: string[] }
 */
router.post(
  '/expense-insights',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const description = req.body?.description?.trim() ?? '';
      const category = req.body?.category?.trim() ?? 'MISCELLANEOUS';
      const recentDescriptions = Array.isArray(req.body?.recentDescriptions) ? req.body.recentDescriptions : [];
      const result = await aiService.getExpenseInsights({ description, category, recentDescriptions });
      return res.json(result);
    } catch (err) {
      return handleAiError(err, res, 'expense-insights');
    }
  }
);

/**
 * POST /ai/receipt-extract
 * Body: { text: string }
 */
router.post(
  '/receipt-extract',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const text = req.body?.text?.trim() ?? '';
      const result = await aiService.getReceiptExtract({ text });
      return res.json(result);
    } catch (err) {
      return handleAiError(err, res, 'receipt-extract');
    }
  }
);

/**
 * GET /ai/usage-tip?page=analysis
 */
router.get(
  '/usage-tip',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const page = req.query?.page ?? 'dashboard';
      const result = await aiService.getUsageTip({ page });
      return res.json(result);
    } catch (err) {
      return handleAiError(err, res, 'usage-tip');
    }
  }
);

/**
 * GET /ai/period-summary?dateFrom=&dateTo=
 */
router.get(
  '/period-summary',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const { businessId } = req.user;
      const { dateFrom, dateTo } = toDateRange(req);
      if (dateFrom > dateTo) {
        return res.status(400).json({ message: 'dateFrom must be before or equal to dateTo.' });
      }
      const days = Math.round((dateTo - dateFrom) / (24 * 60 * 60 * 1000)) + 1;
      const prevEnd = new Date(dateFrom);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - days + 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setHours(23, 59, 59, 999);

      const [currTx, currEx, prevTx, prevEx] = await Promise.all([
        prisma.transaction.aggregate({
          where: { businessId, status: 'CONFIRMED', createdAt: { gte: dateFrom, lte: dateTo } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.expense.aggregate({
          where: { businessId, date: { gte: dateFrom, lte: dateTo } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { businessId, status: 'CONFIRMED', createdAt: { gte: prevStart, lte: prevEnd } },
          _sum: { total: true },
        }),
        prisma.expense.aggregate({
          where: { businessId, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
      ]);

      const revenue = Number(currTx._sum.total ?? 0);
      const expenses = Number(currEx._sum.amount ?? 0);
      const transactionCount = currTx._count ?? 0;
      const previousRevenue = Number(prevTx._sum.total ?? 0);
      const previousExpenses = Number(prevEx._sum.amount ?? 0);

      const result = await aiService.getPeriodSummary({
        revenue,
        expenses,
        transactionCount,
        days,
        previousRevenue,
        previousExpenses,
      });
      return res.json(result);
    } catch (err) {
      return handleAiError(err, res, 'period-summary');
    }
  }
);

/**
 * GET /ai/alerts
 * Gathers low stock, draft transactions, currency mismatch; returns list and optional KoboAI summary.
 */
router.get(
  '/alerts',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const { businessId } = req.user;
      const alerts = [];

      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { baseCurrencyCode: true, globalMinStock: true },
      });
      const baseCurrency = business?.baseCurrencyCode ?? 'USD';
      const globalMin = business?.globalMinStock != null ? Number(business.globalMinStock) : null;

      const [draftCount, stockLevels, transactionsWithDifferentCurrency] = await Promise.all([
        prisma.transaction.count({
          where: { businessId, status: 'DRAFT' },
        }),
        prisma.stockLevel.findMany({
          where: { product: { businessId } },
          select: {
            quantity: true,
            product: { select: { name: true, minStock: true, businessId: true } },
          },
        }),
        prisma.transaction.findMany({
          where: {
            businessId,
            status: 'CONFIRMED',
            AND: [
              { currencyCode: { not: null } },
              { currencyCode: { not: baseCurrency } },
            ],
          },
          select: { id: true },
          take: 1,
        }),
      ]);
      if (draftCount > 5) {
        alerts.push({ type: 'drafts', message: `${draftCount} draft transactions need attention.` });
      }
      for (const sl of stockLevels ?? []) {
        if (sl.product?.businessId !== businessId) continue;
        const min = sl.product?.minStock != null ? Number(sl.product.minStock) : globalMin;
        if (min != null && min > 0 && Number(sl.quantity) < min) {
          alerts.push({
            type: 'low_stock',
            message: `${sl.product?.name ?? 'Product'} is below minimum (${sl.quantity} / ${min}).`,
          });
        }
      }
      if ((transactionsWithDifferentCurrency?.length ?? 0) > 0) {
        alerts.push({
          type: 'currency',
          message: `Some transactions use a payment currency different from base (${baseCurrency}). Check conversion.`,
        });
      }

      let summary = '';
      if (alerts.length > 0) {
        try {
          const { summary: s } = await aiService.getAlertsSummary({ alerts });
          summary = s;
        } catch {
          summary = `${alerts.length} item(s) need your attention.`;
        }
      }

      return res.json({ alerts, summary });
    } catch (err) {
      return handleAiError(err, res, 'alerts');
    }
  }
);

export default router;
