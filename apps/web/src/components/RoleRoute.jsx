/**
 * RoleRoute — restricts access to users with specific roles.
 * Wraps ProtectedRoute (so it also checks authentication).
 * If the user is authenticated but lacks the required role, redirects to dashboard.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  // While loading, let ProtectedRoute handle the spinner
  if (loading || !user) return children;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
