/**
 * User routes — invite worker (Owner only).
 * See docs/phase-2-walkthrough.md.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { sendInviteEmail } from '../services/email.js';
import { config } from '../config.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * POST /users/invite
 * Body: { email, role } — role: MANAGER | CASHIER
 * Owner only. Creates user with invite token, sends email.
 */
router.post('/invite', wrap(requireAuth), requireRole(['OWNER']), async (req, res) => {
  try {
    const { email, role, firstName, lastName } = req.body;
    if (!email?.trim()) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }
    if (!['MANAGER', 'CASHIER'].includes(role)) {
      res.status(400).json({ message: 'Role must be MANAGER or CASHIER.' });
      return;
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      res.status(400).json({ message: 'First name and last name are required.' });
      return;
    }
    const emailLower = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });

    // If the user already activated their account, reject
    if (existing && existing.passwordHash) {
      res.status(400).json({ message: 'This user has already activated their account.' });
      return;
    }

    // If the user belongs to a different business, reject
    if (existing && existing.businessId !== req.user.businessId) {
      res.status(400).json({ message: 'This email is already registered with another business.' });
      return;
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // If user exists but hasn't activated, regenerate their invite token (resend)
    let user;
    if (existing && !existing.passwordHash) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          inviteToken,
          inviteTokenExpiry,
          invitedAt: new Date(),
        },
        include: { business: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: emailLower,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          businessId: req.user.businessId,
          invitedAt: new Date(),
          inviteToken,
          inviteTokenExpiry,
        },
        include: { business: true },
      });
    }
    const setPasswordLink = `${config.frontendUrl}/set-password?token=${inviteToken}`;
    let emailSent = false;
    try {
      emailSent = await sendInviteEmail(user.email, user.business.name, setPasswordLink);
    } catch (emailErr) {
      console.warn('Invite email failed:', emailErr.message);
    }
    const isResend = !!existing;
    const baseMessage = isResend ? 'Invite resent' : 'Worker added';
    res.status(isResend ? 200 : 201).json({
      message: emailSent
        ? `${baseMessage}. The worker will receive an email to set their password.`
        : `${baseMessage}. Share this link with them to set their password.`,
      user: { id: user.id, email: user.email, role: user.role },
      ...(!emailSent && { inviteLink: setPasswordLink }),
    });
  } catch (err) {
    console.error('users invite error', err);
    res.status(500).json({ message: 'Failed to send invite. Please try again.' });
  }
});

/**
 * GET /users
 * Owner only. Returns all users for the owner's business.
 */
router.get('/', wrap(requireAuth), requireRole(['OWNER']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { businessId: req.user.businessId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        passwordHash: true,
        invitedAt: true,
        acceptedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Active = has a password (registered or accepted invite). Pending = invited but hasn't set password yet.
    const result = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: u.passwordHash ? 'active' : 'pending',
      invitedAt: u.invitedAt,
      acceptedAt: u.acceptedAt,
    }));

    res.json({ users: result });
  } catch (err) {
    console.error('users list error', err);
    res.status(500).json({ message: 'Failed to load team members.' });
  }
});

/**
 * PATCH /users/:id/role
 * Body: { role } — MANAGER | CASHIER
 * Owner only. Changes a team member's role.
 */
router.patch('/:id/role', wrap(requireAuth), requireRole(['OWNER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['MANAGER', 'CASHIER'].includes(role)) {
      return res.status(400).json({ message: 'Role must be MANAGER or CASHIER.' });
    }

    // Find the target user and ensure they belong to the same business
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Team member not found.' });
    }

    // Owner cannot change their own role
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    // Cannot change another owner's role
    if (targetUser.role === 'OWNER') {
      return res.status(400).json({ message: 'Cannot change the role of a business owner.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    res.json({ user: updated, message: `Role updated to ${role}.` });
  } catch (err) {
    console.error('update role error', err);
    res.status(500).json({ message: 'Failed to update role.' });
  }
});

/**
 * DELETE /users/:id
 * Owner only. Removes a team member from the business.
 */
router.delete('/:id', wrap(requireAuth), requireRole(['OWNER']), async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Team member not found.' });
    }

    // Owner cannot remove themselves
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot remove yourself from the business.' });
    }

    // Cannot remove another owner
    if (targetUser.role === 'OWNER') {
      return res.status(400).json({ message: 'Cannot remove a business owner.' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Team member removed.' });
  } catch (err) {
    console.error('delete user error', err);
    res.status(500).json({ message: 'Failed to remove team member.' });
  }
});

/**
 * GET /users/:id/activity
 * Owner only. Returns a team member's profile and recent activity (transactions, expenses).
 */
router.get('/:id/activity', wrap(requireAuth), requireRole(['OWNER']), async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        passwordHash: true,
        businessId: true,
        createdAt: true,
        invitedAt: true,
        acceptedAt: true,
      },
    });

    if (!targetUser || targetUser.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Team member not found.' });
    }

    // Recent transactions by this user (last 50)
    const transactions = await prisma.transaction.findMany({
      where: { userId: id, businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        receipt: { select: { receiptNumber: true } },
      },
    });

    // Recent expenses by this user (last 50)
    const expenses = await prisma.expense.findMany({
      where: { userId: id, businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Aggregates
    const transactionCount = await prisma.transaction.count({
      where: { userId: id, businessId: req.user.businessId },
    });

    const transactionSum = await prisma.transaction.aggregate({
      where: { userId: id, businessId: req.user.businessId },
      _sum: { total: true },
    });

    const expenseCount = await prisma.expense.count({
      where: { userId: id, businessId: req.user.businessId },
    });

    const expenseSum = await prisma.expense.aggregate({
      where: { userId: id, businessId: req.user.businessId },
      _sum: { amount: true },
    });

    res.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
        status: targetUser.passwordHash ? 'active' : 'pending',
        createdAt: targetUser.createdAt,
        invitedAt: targetUser.invitedAt,
        acceptedAt: targetUser.acceptedAt,
      },
      summary: {
        transactionCount,
        transactionTotal: transactionSum._sum.total ?? 0,
        expenseCount,
        expenseTotal: expenseSum._sum.amount ?? 0,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        total: tx.total,
        paymentMethod: tx.paymentMethod,
        currencyCode: tx.currencyCode,
        originalTotal: tx.originalTotal,
        createdAt: tx.createdAt,
        receiptNumber: tx.receipt?.receiptNumber ?? null,
        items: tx.items,
      })),
      expenses: expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
        category: exp.category,
        amount: exp.amount,
        date: exp.date,
        createdAt: exp.createdAt,
      })),
    });
  } catch (err) {
    console.error('user activity error', err);
    res.status(500).json({ message: 'Failed to load user activity.' });
  }
});

/**
 * GET /users/count
 * Any authenticated user. Returns team count for their business.
 */
router.get('/count', wrap(requireAuth), async (req, res) => {
  try {
    const total = await prisma.user.count({
      where: { businessId: req.user.businessId },
    });
    const active = await prisma.user.count({
      where: { businessId: req.user.businessId, passwordHash: { not: null } },
    });
    const pending = total - active;
    res.json({ total, active, pending });
  } catch (err) {
    console.error('users count error', err);
    res.status(500).json({ message: 'Failed to load team count.' });
  }
});

export default router;
