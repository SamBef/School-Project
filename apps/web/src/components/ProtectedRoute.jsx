/**
 * Protected route — redirects unauthenticated users to /login.
 * Shows spinner while auth state is loading.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="loading-page" role="status" aria-busy="true" style={{ flex: 1, color: 'var(--text-primary)' }}>
          <Spinner size={32} />
          <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
