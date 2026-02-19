/**
 * Admin auth — login by name + password, forgot-password, reset-password, profile (GET/PATCH me).
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config.js';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { sendPasswordResetEmail } from '../../services/email.js';

const router = Router();
const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * POST /admin/auth/login
 * Body: { name, password } — login by admin name (not email).
 */
router.post('/login', wrap(async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name?.trim() || !password) {
      res.status(400).json({ message: 'Name and password are required.' });
      return;
    }
    if (!config.jwtSecret || !config.jwtSecret.trim()) {
      console.error('Admin login: JWT_SECRET is not set in .env');
      res.status(503).json({ message: 'Server configuration error. Administrator must set JWT_SECRET.' });
      return;
    }
    const nameTrim = name.trim();
    const admin = await prisma.admin.findUnique({
      where: { name: nameTrim },
    });
    if (!admin) {
      res.status(401).json({ message: 'Invalid name or password.' });
      return;
    }
    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      res.status(401).json({ message: 'Invalid name or password.' });
      return;
    }
    const token = jwt.sign(
      { adminId: admin.id, name: admin.name, email: admin.email, admin: true },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Admin login error:', err.message || err);
    if (err.code === 'P2021' || err.message?.includes('does not exist') || err.message?.includes('relation')) {
      res.status(503).json({
        message: 'Database schema is out of date. Run: npx prisma db push (from apps/api) then restart the API.',
      });
      return;
    }
    if (err.message?.includes('TLS') || err.message?.includes('credentials') || err.message?.includes('connect')) {
      res.status(503).json({ message: 'Cannot reach the database. Check DATABASE_URL and network.' });
      return;
    }
    throw err;
  }
}));

/**
 * POST /admin/auth/forgot-password
 * Body: { nameOrEmail } — find admin by name or email, send reset link to their email.
 */
router.post('/forgot-password', wrap(async (req, res) => {
  const { nameOrEmail } = req.body;
  if (!nameOrEmail?.trim()) {
    res.status(400).json({ message: 'Enter your admin name or email.' });
    return;
  }
  const input = nameOrEmail.trim();
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { name: input },
        { email: input.toLowerCase() },
      ],
    },
  });
  if (admin) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { resetToken, resetTokenExpiry },
    });
    const resetLink = `${config.adminFrontendUrl || 'http://localhost:5174'}/reset-password?token=${resetToken}`;
    try {
      await sendPasswordResetEmail(admin.email, resetLink);
    } catch (e) {
      console.warn('Admin forgot-password email failed:', e?.message);
    }
  }
  res.json({ message: 'If an account exists with that name or email, you will receive a link to reset your password.' });
}));

/**
 * POST /admin/auth/reset-password
 * Body: { token, newPassword }
 */
router.post('/reset-password', wrap(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token?.trim() || !newPassword) {
    res.status(400).json({ message: 'Token and new password are required.' });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters.' });
    return;
  }
  const admin = await prisma.admin.findFirst({
    where: { resetToken: token.trim(), resetTokenExpiry: { gt: new Date() } },
  });
  if (!admin) {
    res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });
  res.json({ message: 'Password updated. You can sign in with your new password.' });
}));

/**
 * GET /admin/auth/me — current admin profile (requires auth).
 */
router.get('/me', requireAdmin, wrap(async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!admin) {
      res.status(401).json({ message: 'Admin not found.' });
      return;
    }
    res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, createdAt: admin.createdAt.toISOString() } });
  } catch (err) {
    if (err.code === 'P2021' || err.message?.includes('does not exist') || err.message?.includes('Unknown arg') || err.message?.includes('column')) {
      res.status(503).json({ message: 'Database schema is out of date. Run: npx prisma db push (from apps/api, in PowerShell outside Cursor) then restart the API.' });
      return;
    }
    throw err;
  }
}));

/**
 * PATCH /admin/auth/me — update name and/or password (requires current password for password change).
 * Body: { name?, email?, currentPassword?, newPassword? }
 */
router.patch('/me', requireAdmin, wrap(async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  if (!admin) {
    res.status(401).json({ message: 'Admin not found.' });
    return;
  }
  const updates = {};
  if (name !== undefined && name?.trim()) {
    const nameTrim = name.trim();
    const existing = await prisma.admin.findUnique({ where: { name: nameTrim } });
    if (existing && existing.id !== admin.id) {
      res.status(400).json({ message: 'That name is already in use.' });
      return;
    }
    updates.name = nameTrim;
  }
  if (email !== undefined && email?.trim()) {
    const emailLower = email.trim().toLowerCase();
    const existing = await prisma.admin.findUnique({ where: { email: emailLower } });
    if (existing && existing.id !== admin.id) {
      res.status(400).json({ message: 'That email is already in use.' });
      return;
    }
    updates.email = emailLower;
  }
  if (newPassword !== undefined && String(newPassword).length > 0) {
    if (!currentPassword) {
      res.status(400).json({ message: 'Current password is required to set a new password.' });
      return;
    }
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      res.status(401).json({ message: 'Current password is incorrect.' });
      return;
    }
    if (String(newPassword).length < 8) {
      res.status(400).json({ message: 'New password must be at least 8 characters.' });
      return;
    }
    updates.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  }
  if (Object.keys(updates).length === 0) {
    res.json({ message: 'No changes.', admin: { id: admin.id, name: admin.name, email: admin.email } });
    return;
  }
  try {
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: updates,
      select: { id: true, name: true, email: true },
    });
    res.json({ message: 'Profile updated.', admin: { id: updated.id, name: updated.name, email: updated.email } });
  } catch (err) {
    if (err.code === 'P2021' || err.message?.includes('does not exist') || err.message?.includes('Unknown arg') || err.message?.includes('column')) {
      res.status(503).json({ message: 'Database schema is out of date. Run: npx prisma db push (from apps/api, in PowerShell outside Cursor) then restart the API.' });
      return;
    }
    throw err;
  }
}));

export default router;
