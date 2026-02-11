/**
 * Business routes — update business settings (e.g. base currency)
 * and exchange rate lookup.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getExchangeRates } from '../services/exchangeRate.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * PATCH /business
 * Body: { baseCurrencyCode?, name?, email?, phone?, primaryLocation? }
 * Owner only. Updates the business's settings and info.
 */
router.patch(
  '/',
  wrap(requireAuth),
  requireRole(['OWNER']),
  async (req, res) => {
    try {
      const { baseCurrencyCode, name, email, phone, primaryLocation } = req.body;
      const updateData = {};

      // Handle currency update
      if (baseCurrencyCode !== undefined) {
        if (!baseCurrencyCode?.trim()) {
          return res.status(400).json({ message: 'Currency code is required.' });
        }
        const code = baseCurrencyCode.trim().toUpperCase();
        if (code.length < 2 || code.length > 4) {
          return res.status(400).json({ message: 'Currency code must be 2–4 characters (e.g. USD, EUR, GHS).' });
        }
        updateData.baseCurrencyCode = code;
      }

      // Handle business info updates
      if (name !== undefined) {
        if (!name?.trim()) {
          return res.status(400).json({ message: 'Business name is required.' });
        }
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        if (!email?.trim()) {
          return res.status(400).json({ message: 'Business email is required.' });
        }
        updateData.email = email.trim().toLowerCase();
      }
      if (phone !== undefined) {
        if (!phone?.trim()) {
          return res.status(400).json({ message: 'Phone number is required.' });
        }
        updateData.phone = phone.trim();
      }
      if (primaryLocation !== undefined) {
        if (!primaryLocation?.trim()) {
          return res.status(400).json({ message: 'Primary location is required.' });
        }
        updateData.primaryLocation = primaryLocation.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update.' });
      }

      const business = await prisma.business.update({
        where: { id: req.user.businessId },
        data: updateData,
      });

      res.json({
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
        primaryLocation: business.primaryLocation,
        baseCurrencyCode: business.baseCurrencyCode,
      });
    } catch (err) {
      console.error('update business error', err);
      res.status(500).json({ message: 'Failed to update business settings.' });
    }
  }
);

export default router;
