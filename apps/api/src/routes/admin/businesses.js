/**
 * Admin businesses — list, create, update, deactivate companies; list/manage users; activity log.
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { logActivity } from '../../services/activityLog.js';
import { sendInviteEmail } from '../../services/email.js';
import { config } from '../../config.js';

const router = Router();
const SALT_ROUNDS = 10;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /admin/businesses
 * Returns list of businesses with: id, name, primaryLocation, createdAt, baseCurrencyCode,
 * userCount, transactionCount, expenseCount, lastActivityAt.
 * No business contact details or user/transaction/expense detail.
 */
router.get(
  '/',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const businesses = await prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          primaryLocation: true,
          createdAt: true,
          baseCurrencyCode: true,
          baseLocale: true,
          deactivatedAt: true,
          _count: {
            select: { users: true, transactions: true, expenses: true },
          },
        },
      });

      const lastTx = await prisma.transaction.groupBy({
        by: ['businessId'],
        _max: { createdAt: true },
      });
      const lastEx = await prisma.expense.groupBy({
        by: ['businessId'],
        _max: { createdAt: true },
      });
      const lastTxMap = Object.fromEntries(lastTx.map((x) => [x.businessId, x._max.createdAt]));
      const lastExMap = Object.fromEntries(lastEx.map((x) => [x.businessId, x._max.createdAt]));

      const list = businesses.map((b) => {
        const lastT = lastTxMap[b.id] ?? null;
        const lastE = lastExMap[b.id] ?? null;
        const lastActivityAt = [lastT, lastE].filter(Boolean).length
          ? new Date(Math.max((lastT && lastT.getTime()) || 0, (lastE && lastE.getTime()) || 0)).toISOString()
          : null;
        return {
          id: b.id,
          name: b.name,
          primaryLocation: b.primaryLocation,
          createdAt: b.createdAt.toISOString(),
          baseCurrencyCode: b.baseCurrencyCode,
          baseLocale: b.baseLocale ?? 'en',
          deactivatedAt: b.deactivatedAt?.toISOString() ?? null,
          userCount: b._count.users,
          transactionCount: b._count.transactions,
          expenseCount: b._count.expenses,
          lastActivityAt,
        };
      });

      res.json({ businesses: list });
    } catch (err) {
      console.error('admin businesses error', err);
      res.status(500).json({ message: 'Failed to load businesses.' });
    }
  }
);

/**
 * POST /admin/businesses
 * Create a new company and its first user (owner). Admin-only.
 * Body: businessName, businessEmail, businessPhone, primaryLocation, [baseCurrencyCode], [address],
 *       ownerEmail, ownerFirstName, ownerLastName, ownerPassword.
 */
router.post(
  '/',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const {
        businessName,
        businessEmail,
        businessPhone,
        primaryLocation,
        baseCurrencyCode,
        address,
        ownerEmail,
        ownerFirstName,
        ownerLastName,
        ownerPassword,
      } = req.body;
      if (!businessName?.trim() || !businessEmail?.trim() || !businessPhone?.trim() || !primaryLocation?.trim()) {
        res.status(400).json({ message: 'Business name, email, phone, and primary location are required.' });
        return;
      }
      if (!ownerEmail?.trim() || !ownerFirstName?.trim() || !ownerLastName?.trim() || !ownerPassword) {
        res.status(400).json({ message: 'Owner email, first name, last name, and password are required.' });
        return;
      }
      const emailLower = ownerEmail.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: emailLower } });
      if (existing) {
        res.status(400).json({ message: 'A user with this email already exists on the platform.' });
        return;
      }
      const passwordHash = await bcrypt.hash(ownerPassword, SALT_ROUNDS);
      const { baseLocale } = req.body;
      const business = await prisma.business.create({
        data: {
          name: businessName.trim(),
          email: businessEmail.trim().toLowerCase(),
          phone: businessPhone.trim(),
          primaryLocation: primaryLocation.trim(),
          address: address?.trim() || null,
          baseCurrencyCode: (baseCurrencyCode?.trim() || 'USD').toUpperCase().slice(0, 3),
          baseLocale: (baseLocale?.trim() || 'en').toLowerCase().slice(0, 5),
        },
      });
      await prisma.user.create({
        data: {
          email: emailLower,
          firstName: ownerFirstName.trim(),
          lastName: ownerLastName.trim(),
          passwordHash,
          role: 'OWNER',
          businessId: business.id,
        },
      });
      await logActivity({
        businessId: business.id,
        action: 'business.created',
        entityType: 'Business',
        entityId: business.id,
      });
      res.status(201).json({
        message: 'Company and owner created.',
        business: {
          id: business.id,
          name: business.name,
          email: business.email,
          phone: business.phone,
          primaryLocation: business.primaryLocation,
        },
      });
    } catch (err) {
      console.error('admin businesses create error', err);
      res.status(500).json({ message: 'Failed to create company.' });
    }
  }
);

/**
 * GET /admin/businesses/:id/users
 * List users for a business (id, email, firstName, lastName, role, invitedAt, acceptedAt, deactivatedAt, createdAt).
 */
router.get(
  '/:id/users',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id: businessId } = req.params;
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }
      const users = await prisma.user.findMany({
        where: { businessId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          locale: true,
          invitedAt: true,
          acceptedAt: true,
          deactivatedAt: true,
          createdAt: true,
          passwordHash: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      res.json({
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          locale: u.locale ?? null,
          invitedAt: u.invitedAt?.toISOString() ?? null,
          acceptedAt: u.acceptedAt?.toISOString() ?? null,
          deactivatedAt: u.deactivatedAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
          hasPassword: !!u.passwordHash,
        })),
      });
    } catch (err) {
      console.error('admin businesses users list error', err);
      res.status(500).json({ message: 'Failed to load users.' });
    }
  }
);

/**
 * POST /admin/businesses/:id/users
 * Add a user: invite (send email) or create with password.
 * Body: email, firstName, lastName, role (OWNER|MANAGER|CASHIER), sendInvite (boolean), [password if !sendInvite].
 */
router.post(
  '/:id/users',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id: businessId } = req.params;
      const { email, firstName, lastName, role, sendInvite, password } = req.body;
      if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
        res.status(400).json({ message: 'Email, first name, and last name are required.' });
        return;
      }
      const validRoles = ['OWNER', 'MANAGER', 'CASHIER'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ message: 'Role must be OWNER, MANAGER, or CASHIER.' });
        return;
      }
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }
      const emailLower = email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: emailLower } });
      if (existing) {
        if (existing.businessId !== businessId) {
          res.status(400).json({ message: 'This email is already registered with another business.' });
          return;
        }
        if (existing.passwordHash) {
          res.status(400).json({ message: 'This user has already activated their account.' });
          return;
        }
      }
      if (sendInvite) {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpiry = new Date(Date.now() + INVITE_EXPIRY_MS);
        let user;
        if (existing) {
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
              businessId,
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
        } catch (e) {
          console.warn('Invite email failed:', e?.message);
        }
        await logActivity({
          businessId,
          userId: user.id,
          action: 'user.invited',
          entityType: 'User',
          entityId: user.id,
        });
        res.status(201).json({
          message: emailSent ? 'Invite sent. User will receive an email to set their password.' : 'User created. Invite email could not be sent.',
          user: { id: user.id, email: user.email, role: user.role },
          ...(!emailSent && { inviteLink: setPasswordLink }),
        });
        return;
      }
      if (!password || String(password).length < 8) {
        res.status(400).json({ message: 'Password is required (min 8 characters) when not sending an invite.' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { firstName: firstName.trim(), lastName: lastName.trim(), role, passwordHash, inviteToken: null, inviteTokenExpiry: null, acceptedAt: new Date() },
          })
        : await prisma.user.create({
            data: {
              email: emailLower,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role,
              businessId,
              passwordHash,
              acceptedAt: new Date(),
            },
          });
      await logActivity({
        businessId,
        userId: user.id,
        action: 'user.created',
        entityType: 'User',
        entityId: user.id,
      });
      res.status(201).json({
        message: 'User created with password.',
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('admin businesses users create error', err);
      res.status(500).json({ message: 'Failed to add user.' });
    }
  }
);

/**
 * PATCH /admin/businesses/:id/users/:userId
 * Update user: role and/or deactivated (true = deactivate, false = reactivate).
 */
router.patch(
  '/:id/users/:userId',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id: businessId, userId } = req.params;
      const { role, deactivated, locale } = req.body;
      const user = await prisma.user.findFirst({
        where: { id: userId, businessId },
        select: { id: true, email: true, role: true, locale: true, deactivatedAt: true },
      });
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }
      const data = {};
      if (role && ['OWNER', 'MANAGER', 'CASHIER'].includes(role)) data.role = role;
      if (locale !== undefined) data.locale = locale === null || locale === '' ? null : String(locale).trim().toLowerCase().slice(0, 5);
      if (typeof deactivated === 'boolean') {
        data.deactivatedAt = deactivated ? new Date() : null;
        await logActivity({
          businessId,
          userId: user.id,
          action: deactivated ? 'user.deactivated' : 'user.reactivated',
          entityType: 'User',
          entityId: user.id,
        });
      }
      if (Object.keys(data).length === 0) {
        res.json({
          message: 'No changes.',
          user: { id: user.id, email: user.email, role: user.role, locale: user.locale ?? null, deactivatedAt: user.deactivatedAt?.toISOString() ?? null },
        });
        return;
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, email: true, role: true, locale: true, deactivatedAt: true },
      });
      res.json({
        message: 'User updated.',
        user: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
          locale: updated.locale ?? null,
          deactivatedAt: updated.deactivatedAt?.toISOString() ?? null,
        },
      });
    } catch (err) {
      console.error('admin businesses users patch error', err);
      res.status(500).json({ message: 'Failed to update user.' });
    }
  }
);

/**
 * DELETE /admin/businesses/:id/users/:userId
 * Hard delete user only if they have no transactions, expenses, etc. Otherwise ask to deactivate.
 */
router.delete(
  '/:id/users/:userId',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id: businessId, userId } = req.params;
      const user = await prisma.user.findFirst({
        where: { id: userId, businessId },
        include: {
          _count: {
            select: { transactions: true, expenses: true, receiveStock: true, stockAdjustments: true, returns: true },
          },
        },
      });
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }
      const total = (user._count?.transactions ?? 0) + (user._count?.expenses ?? 0) + (user._count?.receiveStock ?? 0) + (user._count?.stockAdjustments ?? 0) + (user._count?.returns ?? 0);
      if (total > 0) {
        res.status(400).json({
          message: 'Cannot delete a user who has existing activity (transactions, expenses, etc.). Deactivate the user instead.',
        });
        return;
      }
      const owners = await prisma.user.count({
        where: { businessId, role: 'OWNER', deactivatedAt: null },
      });
      if (user.role === 'OWNER' && owners <= 1) {
        res.status(400).json({ message: 'Cannot delete the only active owner. Assign another owner or deactivate instead.' });
        return;
      }
      await prisma.user.delete({ where: { id: userId } });
      await logActivity({
        businessId,
        action: 'user.deleted',
        entityType: 'User',
        entityId: userId,
        metadata: { email: user.email },
      });
      res.json({ message: 'User deleted.' });
    } catch (err) {
      console.error('admin businesses users delete error', err);
      res.status(500).json({ message: 'Failed to delete user.' });
    }
  }
);

/**
 * GET /admin/businesses/:id/activity
 * List activity log entries for the business (newest first).
 */
router.get(
  '/:id/activity',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id: businessId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }
      const logs = await prisma.activityLog.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      res.json({
        activity: logs.map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          metadata: l.metadata,
          createdAt: l.createdAt.toISOString(),
          user: l.user ? { id: l.user.id, email: l.user.email, firstName: l.user.firstName, lastName: l.user.lastName } : null,
        })),
      });
    } catch (err) {
      console.error('admin businesses activity error', err);
      res.status(500).json({ message: 'Failed to load activity.' });
    }
  }
);

/**
 * GET /admin/businesses/:id
 * Returns one business (full details for edit) + summary + activityLast7Days.
 */
router.get(
  '/:id',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id } = req.params;
      const business = await prisma.business.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          primaryLocation: true,
          address: true,
          baseCurrencyCode: true,
          baseLocale: true,
          deactivatedAt: true,
          createdAt: true,
          _count: { select: { users: true, transactions: true, expenses: true } },
        },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }

      const lastTx = await prisma.transaction.groupBy({
        by: ['businessId'],
        where: { businessId: id },
        _max: { createdAt: true },
      });
      const lastEx = await prisma.expense.groupBy({
        by: ['businessId'],
        where: { businessId: id },
        _max: { createdAt: true },
      });
      const lastT = lastTx[0]?._max?.createdAt ?? null;
      const lastE = lastEx[0]?._max?.createdAt ?? null;
      const lastActivityAt = [lastT, lastE].filter(Boolean).length
        ? new Date(Math.max((lastT && lastT.getTime()) || 0, (lastE && lastE.getTime()) || 0)).toISOString()
        : null;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [transactionsInRange, expensesInRange] = await Promise.all([
        prisma.transaction.findMany({
          where: { businessId: id, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
        prisma.expense.findMany({
          where: { businessId: id, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
      ]);

      const dayMap = {};
      for (let d = new Date(sevenDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { date: key, transactionCount: 0, expenseCount: 0 };
      }
      transactionsInRange.forEach((t) => {
        const key = t.createdAt.toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].transactionCount += 1;
      });
      expensesInRange.forEach((e) => {
        const key = e.createdAt.toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].expenseCount += 1;
      });
      const activityLast7Days = Object.keys(dayMap).sort().map((k) => dayMap[k]);

      res.json({
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
        primaryLocation: business.primaryLocation,
        address: business.address,
        baseCurrencyCode: business.baseCurrencyCode,
        baseLocale: business.baseLocale ?? 'en',
        deactivatedAt: business.deactivatedAt?.toISOString() ?? null,
        createdAt: business.createdAt.toISOString(),
        userCount: business._count.users,
        transactionCount: business._count.transactions,
        expenseCount: business._count.expenses,
        lastActivityAt,
        activityLast7Days,
      });
    } catch (err) {
      console.error('admin business detail error', err);
      res.status(500).json({ message: 'Failed to load business.' });
    }
  }
);

/**
 * PATCH /admin/businesses/:id
 * Update business details; optional deactivated (true/false) to deactivate or reactivate company.
 */
router.patch(
  '/:id',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, primaryLocation, address, baseCurrencyCode, baseLocale, deactivated } = req.body;
      const business = await prisma.business.findUnique({
        where: { id },
        select: { id: true, name: true, deactivatedAt: true },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }
      const data = {};
      if (name !== undefined && name?.trim()) data.name = name.trim();
      if (email !== undefined && email?.trim()) data.email = email.trim().toLowerCase();
      if (phone !== undefined) data.phone = String(phone).trim();
      if (primaryLocation !== undefined) data.primaryLocation = String(primaryLocation).trim();
      if (address !== undefined) data.address = address?.trim() || null;
      if (baseCurrencyCode !== undefined) data.baseCurrencyCode = (baseCurrencyCode?.trim() || 'USD').toUpperCase().slice(0, 3);
      if (baseLocale !== undefined) data.baseLocale = (baseLocale?.trim() || 'en').toLowerCase().slice(0, 5);
      if (typeof deactivated === 'boolean') {
        data.deactivatedAt = deactivated ? new Date() : null;
        await logActivity({
          businessId: id,
          action: deactivated ? 'business.deactivated' : 'business.reactivated',
          entityType: 'Business',
          entityId: id,
        });
      }
      if (Object.keys(data).length === 0) {
        res.json({ message: 'No changes.', business: { id: business.id, name: business.name, deactivatedAt: business.deactivatedAt?.toISOString() ?? null } });
        return;
      }
      const updated = await prisma.business.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, phone: true, primaryLocation: true, address: true, baseCurrencyCode: true, baseLocale: true, deactivatedAt: true },
      });
      res.json({
        message: 'Business updated.',
        business: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          primaryLocation: updated.primaryLocation,
          address: updated.address,
          baseCurrencyCode: updated.baseCurrencyCode,
          baseLocale: updated.baseLocale ?? 'en',
          deactivatedAt: updated.deactivatedAt?.toISOString() ?? null,
        },
      });
    } catch (err) {
      console.error('admin business patch error', err);
      res.status(500).json({ message: 'Failed to update business.' });
    }
  }
);

/**
 * DELETE /admin/businesses/:id
 * Hard delete company and all related data (users, transactions, expenses, etc.). Irreversible.
 */
router.delete(
  '/:id',
  wrap(requireAdmin),
  async (req, res) => {
    try {
      const { id } = req.params;
      const business = await prisma.business.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
      if (!business) {
        res.status(404).json({ message: 'Business not found.' });
        return;
      }
      await prisma.business.delete({
        where: { id },
      });
      res.json({ message: 'Company deleted.', deleted: { id: business.id, name: business.name } });
    } catch (err) {
      console.error('admin business delete error', err);
      res.status(500).json({ message: 'Failed to delete company.' });
    }
  }
);

export default router;
