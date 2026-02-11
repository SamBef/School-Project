/**
 * Admin stats — platform-wide totals (no PII).
 */

import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /admin/stats
 * Returns: businessCount, userCount, transactionCount, expenseCount.
 */
router.get(
  '/',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const [businessCount, userCount, transactionCount, expenseCount] = await Promise.all([
        prisma.business.count(),
        prisma.user.count(),
        prisma.transaction.count(),
        prisma.expense.count(),
      ]);
      res.json({
        businessCount,
        userCount,
        transactionCount,
        expenseCount,
      });
    } catch (err) {
      console.error('admin stats error', err);
      res.status(500).json({ message: 'Failed to load stats.' });
    }
  }
);

export default router;
