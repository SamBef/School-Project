/**
 * AI routes — user-triggered AI features (e.g. suggest expense category).
 * All routes require auth; some require Owner/Manager.
 * Returns 503 when OPENAI_API_KEY is not set.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as aiService from '../services/ai.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
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

export default router;
