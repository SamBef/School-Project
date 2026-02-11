/**
 * Reset password — uses token from email link.
 * Password rules shown upfront, visibility toggle included.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { t } from '../i18n';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('common.passwordsNoMatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('common.passwordRules'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || t('common.error'));
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-page" role="main">
        <div className="auth-container">
          <Link to="/" className="auth-logo" aria-label="KoboTrack home">
            <img src="/logo.svg" alt="" width="32" height="32" />
            <span>{t('app.name')}</span>
          </Link>
          <div className="auth-card">
            <h1 className="page-title">{t('auth.resetPassword')}</h1>
            <p className="form-error" role="alert">{error}</p>
            <p className="auth-links">
              <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="auth-page" role="main">
        <div className="auth-container">
          <Link to="/" className="auth-logo" aria-label="KoboTrack home">
            <img src="/logo.svg" alt="" width="32" height="32" />
            <span>{t('app.name')}</span>
          </Link>
          <div className="auth-card">
            <h1 className="page-title">{t('auth.resetPassword')}</h1>
            <p className="form-success" role="status">{t('common.passwordUpdated')}</p>
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
          <h1 className="page-title">{t('auth.resetPassword')}</h1>
          <p className="page-subtitle">{t('auth.resetPasswordSubtitle')}</p>

          <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'reset-pwd-error' : undefined}>
            <PasswordInput
              id="reset-password"
              label={t('auth.newPassword')}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              disabled={loading}
              showRules
            />

            <PasswordInput
              id="reset-confirm"
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              disabled={loading}
            />

            {error && (
              <p id="reset-pwd-error" className="form-error" role="alert">{error}</p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('common.loading') : t('auth.resetPassword')}
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
