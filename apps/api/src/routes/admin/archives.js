/**
 * Admin archived businesses — list and restore deleted companies.
 * GET /admin/archived-businesses — list archives (id, originalBusinessId, deletedAt, deletedByAdminId, businessName).
 * POST /admin/archived-businesses/:id/restore — restore one archive (creates new Business + related data, then deletes archive row).
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function toDate(v) {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function toDecimal(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  return String(v);
}

/**
 * GET /admin/archived-businesses
 * List archived companies (newest first).
 */
router.get(
  '/',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const rows = await prisma.deletedBusinessArchive.findMany({
        orderBy: { deletedAt: 'desc' },
        select: { id: true, originalBusinessId: true, deletedAt: true, deletedByAdminId: true, snapshot: true },
      });
      const list = rows.map((r) => {
        const snap = r.snapshot && typeof r.snapshot === 'object' ? r.snapshot : {};
        const business = snap.business || {};
        return {
          id: r.id,
          originalBusinessId: r.originalBusinessId,
          deletedAt: r.deletedAt.toISOString(),
          deletedByAdminId: r.deletedByAdminId,
          businessName: business.name || 'Unknown',
          userCount: Array.isArray(snap.users) ? snap.users.length : 0,
          transactionCount: Array.isArray(snap.transactions) ? snap.transactions.length : 0,
        };
      });
      res.json({ archives: list });
    } catch (err) {
      console.error('admin archived-businesses list error', err);
      res.status(500).json({ message: 'Failed to load archives.' });
    }
  }
);

/**
 * POST /admin/archived-businesses/:id/restore
 * Restore one archive: create new Business + Users + Transactions + Receipts + Expenses + ActivityLogs with new IDs, then delete archive row.
 */
router.post(
  '/:id/restore',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id: archiveId } = req.params;
      const archive = await prisma.deletedBusinessArchive.findUnique({
        where: { id: archiveId },
      });
      if (!archive) {
        res.status(404).json({ message: 'Archive not found.' });
        return;
      }
      const snap = archive.snapshot && typeof archive.snapshot === 'object' ? archive.snapshot : {};
      const business = snap.business;
      const users = Array.isArray(snap.users) ? snap.users : [];
      const transactions = Array.isArray(snap.transactions) ? snap.transactions : [];
      const expenses = Array.isArray(snap.expenses) ? snap.expenses : [];
      const activityLogs = Array.isArray(snap.activityLogs) ? snap.activityLogs : [];

      const map = {}; // oldId -> newId

      const newBusinessId = randomUUID();
      map[business.id] = newBusinessId;

      await prisma.$transaction(async (tx) => {
        await tx.business.create({
          data: {
            id: newBusinessId,
            name: business.name,
            email: business.email,
            phone: business.phone,
            primaryLocation: business.primaryLocation,
            address: business.address ?? null,
            logoUrl: business.logoUrl ?? null,
            baseCurrencyCode: business.baseCurrencyCode || 'USD',
            defaultLocationId: null,
            globalMinStock: business.globalMinStock != null ? toDecimal(business.globalMinStock) : null,
            deactivatedAt: toDate(business.deactivatedAt),
          },
        });

        for (const u of users) {
          const newUserId = randomUUID();
          map[u.id] = newUserId;
          await tx.user.create({
            data: {
              id: newUserId,
              email: u.email,
              firstName: u.firstName ?? null,
              lastName: u.lastName ?? null,
              avatarUrl: u.avatarUrl ?? null,
              passwordHash: u.passwordHash ?? null,
              role: u.role,
              businessId: newBusinessId,
              invitedAt: toDate(u.invitedAt),
              acceptedAt: toDate(u.acceptedAt),
              inviteToken: u.inviteToken ?? null,
              inviteTokenExpiry: toDate(u.inviteTokenExpiry),
              resetToken: u.resetToken ?? null,
              resetTokenExpiry: toDate(u.resetTokenExpiry),
              deactivatedAt: toDate(u.deactivatedAt),
            },
          });
        }

        for (const t of transactions) {
          const newTransactionId = randomUUID();
          map[t.id] = newTransactionId;
          const userId = map[t.userId] ?? null;
          if (!userId) continue;
          await tx.transaction.create({
            data: {
              id: newTransactionId,
              businessId: newBusinessId,
              userId,
              status: t.status || 'CONFIRMED',
              locationId: null,
              items: t.items ?? [],
              total: toDecimal(t.total) ?? 0,
              paymentMethod: t.paymentMethod || 'CASH',
              currencyCode: t.currencyCode ?? null,
              originalTotal: t.originalTotal != null ? toDecimal(t.originalTotal) : null,
              exchangeRate: t.exchangeRate != null ? toDecimal(t.exchangeRate) : null,
              confirmedAt: toDate(t.confirmedAt),
            },
          });
          if (t.receipt && t.receipt.id) {
            await tx.receipt.create({
              data: {
                id: randomUUID(),
                transactionId: newTransactionId,
                receiptNumber: t.receipt.receiptNumber ?? 1,
                format: t.receipt.format || 'standard',
                generatedAt: toDate(t.receipt.generatedAt) || new Date(),
              },
            });
          }
        }

        for (const e of expenses) {
          const newUserId = map[e.userId];
          if (!newUserId) continue;
          await tx.expense.create({
            data: {
              id: randomUUID(),
              businessId: newBusinessId,
              userId: newUserId,
              description: e.description,
              category: e.category,
              amount: toDecimal(e.amount) ?? 0,
              date: toDate(e.date) || new Date(),
            },
          });
        }

        for (const a of activityLogs) {
          const userId = a.userId ? map[a.userId] : null;
          await tx.activityLog.create({
            data: {
              id: randomUUID(),
              businessId: newBusinessId,
              userId,
              action: a.action,
              entityType: a.entityType ?? null,
              entityId: a.entityId ?? null,
              metadata: a.metadata ?? null,
              createdAt: toDate(a.createdAt) || new Date(),
            },
          });
        }

        await tx.deletedBusinessArchive.delete({ where: { id: archiveId } });
      });

      res.json({ message: 'Company restored.', businessId: newBusinessId });
    } catch (err) {
      console.error('admin archived-businesses restore error', err);
      res.status(500).json({ message: err.message || 'Failed to restore.' });
    }
  }
);

export default router;
