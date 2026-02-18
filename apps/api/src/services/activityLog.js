/**
 * Activity log — records actions for admin visibility (e.g. login, transaction created).
 * Call from routes after the action succeeds.
 */

import { prisma } from '../lib/prisma.js';

/**
 * Log an action for a business (and optionally a user).
 * @param {Object} opts
 * @param {string} opts.businessId
 * @param {string} [opts.userId]
 * @param {string} opts.action - e.g. "user.login", "transaction.created", "user.invited", "user.deactivated"
 * @param {string} [opts.entityType] - e.g. "Transaction", "User", "Expense"
 * @param {string} [opts.entityId]
 * @param {Object} [opts.metadata]
 */
export async function logActivity({ businessId, userId, action, entityType, entityId, metadata }) {
  if (!businessId || !action) return;
  try {
    await prisma.activityLog.create({
      data: {
        businessId,
        userId: userId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error('activityLog create error', err?.message);
  }
}
