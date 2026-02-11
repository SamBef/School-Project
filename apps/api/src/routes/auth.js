/**
 * Auth routes — register, login, forgot-password, reset-password, set-password, me.
 * See docs/phase-2-walkthrough.md for step-by-step explanation.
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function signToken(payload) {
  if (!config.jwtSecret) throw new Error('JWT_SECRET not set');
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role, businessId: payload.businessId },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    businessId: user.businessId,
  };
}

/**
 * POST /auth/register
 * Body: { businessName, businessEmail, businessPhone, primaryLocation, ownerEmail, password }
 * Creates business + owner user. Returns { token, user, business }.
 */
router.post('/register', wrap(optionalAuth), async (req, res) => {
  try {
    const { businessName, businessEmail, businessPhone, primaryLocation, ownerEmail, password, firstName, lastName } = req.body;
    if (!businessName?.trim() || !businessEmail?.trim() || !businessPhone?.trim() || !primaryLocation?.trim() || !ownerEmail?.trim() || !password) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      res.status(400).json({ message: 'First name and last name are required.' });
      return;
    }
    const emailLower = ownerEmail.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      res.status(400).json({ message: 'An account with this email already exists. Sign in or use a different email.' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const business = await prisma.business.create({
      data: {
        name: businessName.trim(),
        email: businessEmail.trim().toLowerCase(),
        phone: businessPhone.trim(),
        primaryLocation: primaryLocation.trim(),
      },
    });
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash,
        role: 'OWNER',
        businessId: business.id,
      },
    });
    const token = signToken({ userId: user.id, email: user.email, role: user.role, businessId: user.businessId });
    res.status(201).json({
      token,
      user: toSafeUser(user),
      business: { id: business.id, name: business.name, email: business.email, phone: business.phone, primaryLocation: business.primaryLocation, baseCurrencyCode: business.baseCurrencyCode },
    });
  } catch (err) {
    console.error('auth register error', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns { token, user, business } or 401.
 */
router.post('/login', wrap(optionalAuth), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }
    const emailLower = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      include: { business: true },
    });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ message: 'This account has not been activated yet. Check your email for the invite link to set your password.' });
      return;
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role, businessId: user.businessId });
    res.json({
      token,
      user: toSafeUser(user),
      business: user.business ? { id: user.business.id, name: user.business.name, email: user.business.email, phone: user.business.phone, primaryLocation: user.business.primaryLocation, baseCurrencyCode: user.business.baseCurrencyCode } : null,
    });
  } catch (err) {
    console.error('auth login error', err);
    res.status(500).json({ message: 'Sign in failed. Please try again.' });
  }
});

/**
 * POST /auth/forgot-password
 * Body: { email }
 * Sends reset email; always returns 200 to avoid revealing whether email exists.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }
    const emailLower = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailLower } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MS);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });
      const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }
    res.json({ message: 'If an account exists with this email, you will receive a link to reset your password.' });
  } catch (err) {
    console.error('auth forgot-password error', err);
    res.status(500).json({ message: 'Request failed. Please try again.' });
  }
});

/**
 * POST /auth/reset-password
 * Body: { token, newPassword }
 * Validates token, updates password, clears token.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token?.trim() || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required.' });
      return;
    }
    const user = await prisma.user.findFirst({
      where: { resetToken: token.trim(), resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) {
      res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    res.json({ message: 'Password updated. You can sign in with your new password.' });
  } catch (err) {
    console.error('auth reset-password error', err);
    res.status(500).json({ message: 'Failed to update password. Please try again.' });
  }
});

/**
 * POST /auth/set-password
 * Body: { token, newPassword }
 * Accept invite: set password, set acceptedAt, clear invite token.
 */
router.post('/set-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token?.trim() || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required.' });
      return;
    }
    const user = await prisma.user.findFirst({
      where: { inviteToken: token.trim(), inviteTokenExpiry: { gt: new Date() } },
      include: { business: true },
    });
    if (!user) {
      res.status(400).json({ message: 'This invite link is invalid or has expired. Ask your owner to send a new invite.' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, acceptedAt: new Date(), inviteToken: null, inviteTokenExpiry: null },
    });
    const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role, businessId: user.businessId });
    res.json({
      token: jwtToken,
      user: toSafeUser(user),
      business: user.business ? { id: user.business.id, name: user.business.name, email: user.business.email, phone: user.business.phone, primaryLocation: user.business.primaryLocation, baseCurrencyCode: user.business.baseCurrencyCode } : null,
      message: 'Account activated. You are signed in.',
    });
  } catch (err) {
    console.error('auth set-password error', err);
    res.status(500).json({ message: 'Failed to set password. Please try again.' });
  }
});

/**
 * GET /auth/me
 * Requires auth. Returns current user + business.
 */
router.get('/me', wrap(requireAuth), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { business: true },
    });
    if (!user) {
      res.status(401).json({ message: 'User not found.' });
      return;
    }
    res.json({
      user: toSafeUser(user),
      business: user.business ? { id: user.business.id, name: user.business.name, email: user.business.email, phone: user.business.phone, primaryLocation: user.business.primaryLocation, baseCurrencyCode: user.business.baseCurrencyCode } : null,
    });
  } catch (err) {
    console.error('auth me error', err);
    res.status(500).json({ message: 'Failed to load profile.' });
  }
});

/**
 * PATCH /auth/profile
 * Requires auth. Updates current user's firstName and lastName.
 */
router.patch('/profile', wrap(requireAuth), async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName: firstName.trim(), lastName: lastName.trim() },
    });
    res.json({ user: toSafeUser(updated), message: 'Profile updated.' });
  } catch (err) {
    console.error('auth profile update error', err);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

/**
 * PATCH /auth/avatar
 * Requires auth. Body: { avatarUrl } — a base64 data URL or null to remove.
 * Max payload ~2 MB for the image.
 */
router.patch('/avatar', wrap(requireAuth), async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    // Allow null/empty to remove avatar
    const value = avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0
      ? avatarUrl.trim()
      : null;

    // Basic size guard: reject if > 2 MB of base64 data
    if (value && value.length > 2 * 1024 * 1024) {
      return res.status(400).json({ message: 'Image is too large. Please use an image under 2 MB.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: value },
    });

    res.json({ user: toSafeUser(updated), message: value ? 'Avatar updated.' : 'Avatar removed.' });
  } catch (err) {
    console.error('auth avatar update error', err);
    res.status(500).json({ message: 'Failed to update avatar.' });
  }
});

/**
 * POST /auth/change-password
 * Requires auth. Body: { currentPassword, newPassword }
 * Validates current password before changing.
 */
router.post('/change-password', wrap(requireAuth), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: 'Account not found.' });
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('auth change-password error', err);
    res.status(500).json({ message: 'Failed to change password.' });
  }
});

export default router;
