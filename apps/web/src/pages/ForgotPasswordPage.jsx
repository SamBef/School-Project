/**
 * Forgot password — request reset email.
 * Always returns success message to avoid revealing email existence (security).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { t } from '../i18n';
import { isValidEmail } from '../lib/validate';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="auth-page" role="main">
        <div className="auth-container">
          <Link to="/" className="auth-logo" aria-label="KoboTrack home">
            <img src="/logo.svg" alt="" width="32" height="32" />
            <span>{t('app.name')}</span>
          </Link>
          <div className="auth-card">
            <h1 className="page-title">{t('auth.resetPassword')}</h1>
            <p className="page-subtitle">{t('common.resetSent')}</p>
            <p className="auth-links">
              <Link to="/login">{t('auth.signIn')}</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page" role="main">
      <div className="auth-container">
        <Link to="/" className="auth-logo" aria-label="KoboTrack home">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>{t('app.name')}</span>
        </Link>

        <div className="auth-card">
          <h1 className="page-title">{t('auth.forgotPassword')}</h1>
          <p className="page-subtitle">{t('auth.forgotPasswordSubtitle')}</p>

          <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'forgot-error' : undefined}>
            <div className="form-group">
              <label htmlFor="forgot-email">{t('auth.email')}</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p id="forgot-error" className="form-error" role="alert">{error}</p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('common.loading') : t('common.sendResetLink')}
              </button>
            </div>
          </form>

          <p className="auth-links">
            <Link to="/login">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
