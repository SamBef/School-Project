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
import * as stockService from '../services/stock.js';
import { logActivity } from '../services/activityLog.js';

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
 * Body: { items: [{ name, quantity, unitPrice }] | [{ productId, name, quantity, unitId?, unitPrice }], paymentMethod, currencyCode?, status?, locationId? }
 * - Legacy: no productId in items → CONFIRMED, no locationId, receipt created.
 * - New (inventory): items have productId → require locationId; status DRAFT (reserve) or CONFIRMED (deduct + receipt).
 */
router.post(
  '/',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const { items, paymentMethod, currencyCode, status, locationId } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'At least one line item is required.' });
      }

      const validMethods = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'];
      if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: `Payment method must be one of: ${validMethods.join(', ')}.` });
      }

      const hasProductItems = items.some((i) => i.productId);
      const requestedStatus = status === 'DRAFT' ? 'DRAFT' : 'CONFIRMED';

      if (hasProductItems && !locationId) {
        return res.status(400).json({ message: 'Location is required when selling products (inventory).' });
      }
      if (hasProductItems) {
        const lines = await stockService.getLinesInPrimaryUnit(req.user.businessId, items, prisma);
        if (lines.length === 0) {
          return res.status(400).json({ message: 'At least one valid product line is required.' });
        }
        const location = await prisma.location.findFirst({
          where: { id: locationId, businessId: req.user.businessId },
        });
        if (!location) {
          return res.status(404).json({ message: 'Location not found.' });
        }
        for (const line of lines) {
          const avail = await stockService.getAvailableQuantity(line.productId, locationId, prisma);
          if (avail < line.quantity) {
            const product = await prisma.product.findFirst({
              where: { id: line.productId, businessId: req.user.businessId },
              select: { name: true },
            });
            return res.status(400).json({
              message: `Insufficient stock for ${product?.name ?? 'product'}. Available: ${avail}, requested: ${line.quantity}.`,
            });
          }
        }
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

      const rawTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
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
        const rate = await getExchangeRate(paymentCurrency, baseCurrency);
        if (!rate) {
          return res.status(400).json({
            message: `Could not fetch exchange rate for ${paymentCurrency} → ${baseCurrency}. Check the currency code or try again.`,
          });
        }
        originalTotal = rawTotal;
        exchangeRate = rate;
        total = Math.round(rawTotal * rate * 100) / 100;
        recordedCurrency = paymentCurrency;
      }

      const lastReceipt = await prisma.receipt.findFirst({
        where: { transaction: { businessId: req.user.businessId } },
        orderBy: { receiptNumber: 'desc' },
      });
      const nextReceiptNumber = (lastReceipt?.receiptNumber ?? 0) + 1;

      const result = await prisma.$transaction(async (tx) => {
        const isLegacy = !hasProductItems;
        const effectiveStatus = isLegacy ? 'CONFIRMED' : requestedStatus;
        const transaction = await tx.transaction.create({
          data: {
            businessId: req.user.businessId,
            userId: req.user.id,
            status: effectiveStatus,
            locationId: hasProductItems ? locationId : null,
            items,
            total,
            paymentMethod,
            currencyCode: recordedCurrency,
            originalTotal,
            exchangeRate,
            confirmedAt: effectiveStatus === 'CONFIRMED' ? new Date() : null,
          },
        });

        if (hasProductItems) {
          const lines = await stockService.getLinesInPrimaryUnit(req.user.businessId, items, tx);
          if (effectiveStatus === 'DRAFT') {
            const reserveResult = await stockService.reserveStock(
              req.user.businessId,
              locationId,
              lines,
              transaction.id,
              tx
            );
            if (!reserveResult.ok) throw new Error(reserveResult.message);
          } else {
            await stockService.confirmAndDeduct(
              req.user.businessId,
              locationId,
              lines,
              transaction.id,
              req.user.id,
              tx
            );
          }
        }

        let receipt = null;
        if (effectiveStatus === 'CONFIRMED') {
          receipt = await tx.receipt.create({
            data: {
              transactionId: transaction.id,
              receiptNumber: nextReceiptNumber,
              format: 'standard',
            },
          });
        }

        return { transaction, receipt };
      });

      logActivity({
        businessId: req.user.businessId,
        userId: req.user.id,
        action: 'transaction.created',
        entityType: 'Transaction',
        entityId: result.transaction.id,
      }).catch(() => {});

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
      res.status(500).json({ message: err.message || 'Failed to create transaction. Please try again.' });
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
            location: { select: { id: true, name: true } },
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
 * POST /transactions/:id/confirm
 * Confirm a DRAFT transaction: deduct stock, create receipt. Owner, Manager, or creating user.
 */
router.post(
  '/:id/confirm',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: req.params.id, businessId: req.user.businessId },
      });
      if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
      if (transaction.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Only draft transactions can be confirmed.' });
      }
      if (!transaction.locationId) {
        return res.status(400).json({ message: 'Transaction has no location. Cannot confirm.' });
      }
      const items = transaction.items;
      if (!Array.isArray(items) || !items.some((i) => i.productId)) {
        return res.status(400).json({ message: 'Transaction has no product lines. Cannot confirm.' });
      }
      const lines = await stockService.getLinesInPrimaryUnit(req.user.businessId, items, prisma);
      if (lines.length === 0) return res.status(400).json({ message: 'No valid product lines.' });

      const lastReceipt = await prisma.receipt.findFirst({
        where: { transaction: { businessId: req.user.businessId } },
        orderBy: { receiptNumber: 'desc' },
      });
      const nextReceiptNumber = (lastReceipt?.receiptNumber ?? 0) + 1;

      await prisma.$transaction(async (tx) => {
        await stockService.confirmAndDeduct(
          req.user.businessId,
          transaction.locationId,
          lines,
          transaction.id,
          req.user.id,
          tx
        );
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
        await tx.receipt.create({
          data: {
            transactionId: transaction.id,
            receiptNumber: nextReceiptNumber,
            format: 'standard',
          },
        });
      });

      const updated = await prisma.transaction.findFirst({
        where: { id: transaction.id, businessId: req.user.businessId },
        include: {
          receipt: true,
          user: { select: { email: true, firstName: true, lastName: true, role: true } },
          location: { select: { id: true, name: true } },
        },
      });
      res.json({
        ...updated,
        total: Number(updated.total),
        originalTotal: updated.originalTotal ? Number(updated.originalTotal) : null,
        exchangeRate: updated.exchangeRate ? Number(updated.exchangeRate) : null,
      });
    } catch (err) {
      console.error('confirm transaction error', err);
      res.status(500).json({ message: err.message || 'Failed to confirm transaction.' });
    }
  }
);

/**
 * POST /transactions/:id/cancel
 * Cancel a DRAFT transaction: release reserved stock, set status CANCELLED.
 */
router.post(
  '/:id/cancel',
  wrap(requireAuth),
  async (req, res) => {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: req.params.id, businessId: req.user.businessId },
      });
      if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
      if (transaction.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Only draft transactions can be cancelled.' });
      }
      if (!transaction.locationId) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'CANCELLED' },
        });
        return res.json({ message: 'Draft cancelled.' });
      }
      const items = transaction.items;
      const lines = Array.isArray(items)
        ? await stockService.getLinesInPrimaryUnit(req.user.businessId, items, prisma)
        : [];
      await prisma.$transaction(async (tx) => {
        if (lines.length > 0) {
          await stockService.releaseReservation(
            req.user.businessId,
            transaction.locationId,
            lines,
            tx
          );
        }
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'CANCELLED' },
        });
      });
      res.json({ message: 'Draft cancelled.' });
    } catch (err) {
      console.error('cancel transaction error', err);
      res.status(500).json({ message: err.message || 'Failed to cancel transaction.' });
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
          location: { select: { id: true, name: true } },
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
 * Owner and Manager only. For DRAFT, releases reserved stock then deletes.
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

      if (transaction.status === 'DRAFT' && transaction.locationId && Array.isArray(transaction.items)) {
        const lines = await stockService.getLinesInPrimaryUnit(req.user.businessId, transaction.items, prisma);
        if (lines.length > 0) {
          await prisma.$transaction(async (tx) => {
            await stockService.releaseReservation(
              req.user.businessId,
              transaction.locationId,
              lines,
              tx
            );
          });
        }
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
