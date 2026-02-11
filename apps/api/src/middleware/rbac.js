/**
 * RBAC middleware — require one of the allowed roles.
 * Use after requireAuth. Returns 403 with a clear message if role not allowed.
 */

/**
 * requireRole(['OWNER', 'MANAGER']) — only Owner and Manager can access.
 * requireRole(['OWNER']) — only Owner (e.g. invite worker, edit business).
 */
export function requireRole(allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('requireRole: allowedRoles must be a non-empty array');
  }
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: 'You do not have permission to perform this action.',
        requiredRole: allowedRoles.join(' or '),
      });
      return;
    }
    next();
  };
}
