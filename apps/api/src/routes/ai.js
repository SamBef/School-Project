/**
 * AI routes — user-triggered AI features (suggest category, restocking insights, strategic insights).
 * All routes require auth; Owner/Manager only. Returns 503 when OPENAI_API_KEY is not set.
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
  requireRole(['OWNER', 'MANAGER']),
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
          message: 'Suggest category is not available. Configure OPENAI_API_KEY to enable it.',
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
  requireRole(['OWNER', 'MANAGER']),
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
          message: 'AI insights are not available. Configure OPENAI_API_KEY to enable them.',
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
  requireRole(['OWNER', 'MANAGER']),
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
          message: 'AI insights are not available. Configure OPENAI_API_KEY to enable them.',
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

export default router;
