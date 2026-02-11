/**
 * 404 page — shown for unknown routes. Clear, calm, with a way back.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="auth-page" role="main">
      <div className="auth-container">
        <Link to="/" className="auth-logo" aria-label="KoboTrack home">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>{t('app.name')}</span>
        </Link>

        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, margin: '0 0 var(--space-2)', color: 'var(--color-neutral-300)' }}>
            404
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '0 0 var(--space-2)' }}>
            Page not found
          </p>
          <p className="page-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="btn btn-primary"
          >
            {isAuthenticated ? t('auth.dashboard') : 'Go home'}
          </Link>
        </div>
      </div>
    </main>
  );
}
