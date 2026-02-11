/**
 * Auth middleware — verify JWT and attach user to request.
 * Use requireAuth for protected routes; use optionalAuth for public routes
 * that may still show different UI when logged in (e.g. login page).
 */

import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

/**
 * Require a valid JWT. Sets req.user = { id, email, role, businessId }.
 * Returns 401 with a clear message if token missing or invalid.
 */
export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Authentication required. Please sign in.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, businessId: true },
  });
  if (!user) {
    res.status(401).json({ message: 'User not found. Please sign in again.' });
    return;
  }
  req.user = user;
  next();
}

/**
 * Optional auth: if a valid token is present, set req.user; otherwise continue without user.
 * Use on login/register so we can still redirect logged-in users.
 */
export async function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    next();
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next();
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, businessId: true },
  });
  if (user) req.user = user;
  next();
}

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.trim().split(/\s+/);
  return scheme === 'Bearer' ? token : null;
}

function verifyToken(token) {
  if (!config.jwtSecret) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}
