/**
 * Login page — centered card with email + password.
 * Password visibility toggle (security doctrine rule 20).
 * Form preserved on errors (security doctrine rule 12–13).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { isValidEmail } from '../lib/validate';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, sessionExpired, clearSessionExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || t('common.error'));
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" role="main">
      <div className="auth-container">
        <Link to="/" className="auth-logo" aria-label="KoboTrack home">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>{t('app.name')}</span>
        </Link>

        <div className="auth-card">
          <h1 className="page-title">{t('auth.signIn')}</h1>
          <p className="page-subtitle">{t('auth.signInSubtitle')}</p>

          {sessionExpired && (
            <p className="form-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              Your session has expired. Please sign in again.
              <button
                type="button"
                onClick={clearSessionExpired}
                style={{ background: 'none', border: 'none', padding: 0, marginLeft: 'var(--space-2)', cursor: 'pointer', color: 'inherit', textDecoration: 'underline', fontSize: 'inherit' }}
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'login-error' : undefined}>
            <div className="form-group">
              <label htmlFor="login-email">{t('auth.email')}</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <PasswordInput
              id="login-password"
              label={t('auth.password')}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              disabled={loading}
            />

            {error && (
              <p id="login-error" className="form-error" role="alert">{error}</p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('common.loading') : t('auth.signIn')}
              </button>
            </div>
          </form>

          <p className="auth-links">
            <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
          </p>
          <p className="auth-links" style={{ marginTop: 'var(--space-3)' }}>
            {t('auth.noAccount')} <Link to="/register">{t('auth.signUp')}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
