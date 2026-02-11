/**
 * Admin auth — login for platform admins only.
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();
const SALT_ROUNDS = 10;

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * POST /admin/auth/login
 * Body: { email, password }
 * Returns: { token } (JWT with adminId, email, admin: true)
 */
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }
  const emailLower = email.trim().toLowerCase();
  const admin = await prisma.admin.findUnique({
    where: { email: emailLower },
  });
  if (!admin) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }
  const token = jwt.sign(
    { adminId: admin.id, email: admin.email, admin: true },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.json({ token });
}));

export default router;
