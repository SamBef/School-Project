/**
 * Expense routes — create, list, update, delete.
 * Owner and Manager can manage expenses.
 * Categories: RENT, STOCK_INVENTORY, UTILITIES, TRANSPORT, MISCELLANEOUS.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const VALID_CATEGORIES = ['RENT', 'STOCK_INVENTORY', 'UTILITIES', 'TRANSPORT', 'MISCELLANEOUS'];

/**
 * POST /expenses
 * Body: { description, category, amount, date }
 * Owner and Manager only.
 */
router.post(
  '/',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const { description, category, amount, date } = req.body;

      if (!description?.trim()) {
        return res.status(400).json({ message: 'Description is required.' });
      }
      if (!category || !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}.` });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number.' });
      }
      if (!date) {
        return res.status(400).json({ message: 'Date is required.' });
      }

      const expense = await prisma.expense.create({
        data: {
          description: description.trim(),
          category,
          amount,
          date: new Date(date),
          businessId: req.user.businessId,
          userId: req.user.id,
        },
      });

      res.status(201).json({
        ...expense,
        amount: Number(expense.amount),
      });
    } catch (err) {
      console.error('create expense error', err);
      res.status(500).json({ message: 'Failed to create expense. Please try again.' });
    }
  }
);

/**
 * GET /expenses
 * Query: dateFrom, dateTo, category, limit, offset
 * Owner and Manager only.
 */
router.get(
  '/',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const { dateFrom, dateTo, category, limit = '50', offset = '0' } = req.query;
      const take = Math.min(parseInt(limit, 10) || 50, 200);
      const skip = parseInt(offset, 10) || 0;

      const where = { businessId: req.user.businessId };

      if (category && VALID_CATEGORIES.includes(category)) {
        where.category = category;
      }

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.date.lte = end;
        }
      }

      const [expenses, count] = await Promise.all([
        prisma.expense.findMany({
          where,
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
          orderBy: { date: 'desc' },
          take,
          skip,
        }),
        prisma.expense.count({ where }),
      ]);

      res.json({
        expenses: expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
        })),
        total: count,
        limit: take,
        offset: skip,
      });
    } catch (err) {
      console.error('list expenses error', err);
      res.status(500).json({ message: 'Failed to load expenses.' });
    }
  }
);

/**
 * PATCH /expenses/:id
 * Body: { description?, category?, amount?, date? }
 * Owner and Manager only.
 */
router.patch(
  '/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const expense = await prisma.expense.findFirst({
        where: { id: req.params.id, businessId: req.user.businessId },
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found.' });
      }

      const updates = {};
      if (req.body.description !== undefined) {
        if (!req.body.description.trim()) {
          return res.status(400).json({ message: 'Description cannot be empty.' });
        }
        updates.description = req.body.description.trim();
      }
      if (req.body.category !== undefined) {
        if (!VALID_CATEGORIES.includes(req.body.category)) {
          return res.status(400).json({ message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}.` });
        }
        updates.category = req.body.category;
      }
      if (req.body.amount !== undefined) {
        if (typeof req.body.amount !== 'number' || req.body.amount <= 0) {
          return res.status(400).json({ message: 'Amount must be a positive number.' });
        }
        updates.amount = req.body.amount;
      }
      if (req.body.date !== undefined) {
        updates.date = new Date(req.body.date);
      }

      const updated = await prisma.expense.update({
        where: { id: expense.id },
        data: updates,
      });

      res.json({
        ...updated,
        amount: Number(updated.amount),
      });
    } catch (err) {
      console.error('update expense error', err);
      res.status(500).json({ message: 'Failed to update expense.' });
    }
  }
);

/**
 * DELETE /expenses/:id
 * Owner and Manager only.
 */
router.delete(
  '/:id',
  wrap(requireAuth),
  requireRole(['OWNER', 'MANAGER']),
  async (req, res) => {
    try {
      const expense = await prisma.expense.findFirst({
        where: { id: req.params.id, businessId: req.user.businessId },
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found.' });
      }

      await prisma.expense.delete({ where: { id: expense.id } });

      res.json({ message: 'Expense deleted.' });
    } catch (err) {
      console.error('delete expense error', err);
      res.status(500).json({ message: 'Failed to delete expense.' });
    }
  }
);

export default router;
