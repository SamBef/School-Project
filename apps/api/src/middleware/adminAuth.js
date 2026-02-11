/**
 * Admin auth middleware — verify admin JWT (platform admin, not business user).
 * Admin tokens carry adminId and admin: true. Company user tokens are not accepted for admin routes.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.trim().split(/\s+/);
  return scheme === 'Bearer' ? token : null;
}

/**
 * Require a valid admin JWT. Sets req.admin = { id, email }.
 * Returns 401 if token missing or invalid, or if token is a company user token.
 */
export async function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Authentication required. Please sign in.' });
    return;
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    res.status(401).json({ message: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  if (!payload.adminId || !payload.admin) {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { id: true, email: true },
  });
  if (!admin) {
    res.status(401).json({ message: 'Admin not found. Please sign in again.' });
    return;
  }
  req.admin = admin;
  next();
}
