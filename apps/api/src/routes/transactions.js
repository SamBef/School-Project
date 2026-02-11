/**
 * Transaction routes — create, list, get, delete.
 * Creating a transaction auto-generates a sequential receipt.
 * Supports multi-currency: if payment currency differs from business base currency,
 * the system records the original total, currency, and exchange rate used.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getExchangeRate, getAllRates } from '../services/exchange.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /transactions/rates
 * Returns current exchange rates for the business's base currency.
 * Used by the frontend to show live conversion.
 */
router.get(
  '/rates',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { baseCurrencyCode: true },
      });
      const baseCurrency = business?.baseCurrencyCode ?? 'USD';
      const data = await getAllRates(baseCurrency);

      if (!data) {
        return res.status(503).json({ message: 'Exchange rates temporarily unavailable. Try again later.' });
      }

      res.json(data);
    } catch (err) {
      console.error('get rates error', err);
      res.status(500).json({ message: 'Failed to fetch exchange rates.' });
    }
  }
);

/**
 * POST /transactions
 * Body: { items: [{ name, quantity, unitPrice }], paymentMethod, currencyCode? }
 * Any authenticated user can create a transaction.
 * If currencyCode differs from business base currency, conversion is applied.
 * Auto-generates a receipt with the next sequential number for the business.
 */
router.post(
  '/',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const { items, paymentMethod, currencyCode } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'At least one line item is required.' });
      }

      const validMethods = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'];
      if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: `Payment method must be one of: ${validMethods.join(', ')}.` });
      }

      // Validate each line item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.name?.trim()) {
          return res.status(400).json({ message: `Item ${i + 1}: name is required.` });
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          return res.status(400).json({ message: `Item ${i + 1}: quantity must be a positive number.` });
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          return res.status(400).json({ message: `Item ${i + 1}: unit price must be a non-negative number.` });
        }
      }

      // Calculate total in the payment currency
      const rawTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      // Determine business base currency
      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { baseCurrencyCode: true },
      });
      const baseCurrency = business?.baseCurrencyCode ?? 'USD';
      const paymentCurrency = currencyCode?.trim().toUpperCase() || baseCurrency;
      const isDifferentCurrency = paymentCurrency !== baseCurrency;

      let total = rawTotal;
      let originalTotal = null;
      let exchangeRate = null;
      let recordedCurrency = null;

      if (isDifferentCurrency) {
        // Get rate: 1 paymentCurrency = X baseCurrency
        const rate = await getExchangeRate(paymentCurrency, baseCurrency);

        if (!rate) {
          return res.status(400).json({
            message: `Could not fetch exchange rate for ${paymentCurrency} → ${baseCurrency}. Check the currency code or try again.`,
          });
        }

        originalTotal = rawTotal;
        exchangeRate = rate;
        total = Math.round(rawTotal * rate * 100) / 100; // Convert to base currency, round to 2 decimals
        recordedCurrency = paymentCurrency;
      }

      // Determine next receipt number for this business
      const lastReceipt = await prisma.receipt.findFirst({
        where: {
          transaction: { businessId: req.user.businessId },
        },
        orderBy: { receiptNumber: 'desc' },
      });
      const nextReceiptNumber = (lastReceipt?.receiptNumber ?? 0) + 1;

      // Create atomically
      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            businessId: req.user.businessId,
            userId: req.user.id,
            items,
            total,
            paymentMethod,
            currencyCode: recordedCurrency,
            originalTotal,
            exchangeRate,
          },
        });

        const receipt = await tx.receipt.create({
          data: {
            transactionId: transaction.id,
            receiptNumber: nextReceiptNumber,
            format: 'standard',
          },
        });

        return { transaction, receipt };
      });

      res.status(201).json({
        transaction: {
          ...result.transaction,
          total: Number(result.transaction.total),
          originalTotal: result.transaction.originalTotal ? Number(result.transaction.originalTotal) : null,
          exchangeRate: result.transaction.exchangeRate ? Number(result.transaction.exchangeRate) : null,
        },
        receipt: result.receipt,
      });
    } catch (err) {
      console.error('create transaction error', err);
      res.status(500).json({ message: 'Failed to create transaction. Please try again.' });
    }
  }
);

/**
 * GET /transactions
 * Query: dateFrom, dateTo, limit (default 50), offset (default 0)
 * Returns transactions for the user's business.
 */
router.get(
  '/',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const { dateFrom, dateTo, paymentMethod, search, limit = '50', offset = '0' } = req.query;
      const take = Math.min(parseInt(limit, 10) || 50, 200);
      const skip = parseInt(offset, 10) || 0;

      const where = { businessId: req.user.businessId };

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      if (paymentMethod && ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'].includes(paymentMethod)) {
        where.paymentMethod = paymentMethod;
      }

      // Search by receipt number or user email
      if (search?.trim()) {
        const term = search.trim();
        const receiptNum = parseInt(term.replace('#', ''), 10);
        if (!isNaN(receiptNum)) {
          where.receipt = { receiptNumber: receiptNum };
        } else {
          where.user = { email: { contains: term.toLowerCase(), mode: 'insensitive' } };
        }
      }

      const [transactions, count] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            receipt: { select: { id: true, receiptNumber: true, format: true } },
            user: { select: { email: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        prisma.transaction.count({ where }),
      ]);

      res.json({
        transactions: transactions.map((t) => ({
          ...t,
          total: Number(t.total),
          originalTotal: t.originalTotal ? Number(t.originalTotal) : null,
          exchangeRate: t.exchangeRate ? Number(t.exchangeRate) : null,
        })),
        total: count,
        limit: take,
        offset: skip,
      });
    } catch (err) {
      console.error('list transactions error', err);
      res.status(500).json({ message: 'Failed to load transactions.' });
    }
  }
);

/**
 * GET /transactions/:id
 * Returns a single transaction with receipt and line items.
 */
router.get(
  '/:id',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: req.params.id, businessId: req.user.businessId },
        include: {
          receipt: true,
          user: { select: { email: true, firstName: true, lastName: true, role: true } },
        },
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' });
      }

      res.json({
        ...transaction,
        total: Number(transaction.total),
        originalTotal: transaction.originalTotal ? Number(transaction.originalTotal) : null,
        exchangeRate: transaction.exchangeRate ? Number(transaction.exchangeRate) : null,
      });
    } catch (err) {
      console.error('get transaction error', err);
      res.status(500).json({ message: 'Failed to load transaction.' });
    }
  }
);

/**
 * DELETE /transactions/:id
 * Owner and Manager only.
 */
router.delete(
  '/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: req.params.id, businessId: req.user.businessId },
      });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' });
      }

      await prisma.transaction.delete({ where: { id: transaction.id } });

      res.json({ message: 'Transaction deleted.' });
    } catch (err) {
      console.error('delete transaction error', err);
      res.status(500).json({ message: 'Failed to delete transaction.' });
    }
  }
);

export default router;
