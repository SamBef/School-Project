/**
 * Set password — accept invite link. Sets password and signs in via AuthContext.
 * Password rules shown upfront, visibility toggle included.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { t } from '../i18n';
import PasswordInput from '../components/PasswordInput';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing invite link. Ask your owner to send a new invite.');
  }, [token]);

  // If a valid invite token is present and the user is already logged in,
  // sign out the current session so the invited user can set their password.
  // Without this, the page would redirect to the dashboard showing the
  // wrong account instead of letting the new user activate their account.
  useEffect(() => {
    if (token && isAuthenticated && !success) {
      logout();
    }
  }, [token, isAuthenticated, success, logout]);

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
      const data = await api.post('/auth/set-password', { token, newPassword: password });
      // Store token and reload to let AuthContext pick it up via /auth/me
      localStorage.setItem('kobotrack_token', data.token);
      setSuccess(true);
      // Short delay so the user sees the success message before redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
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
            <h1 className="page-title">{t('auth.setPassword')}</h1>
            <p className="form-error" role="alert">{error}</p>
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
          <h1 className="page-title">{t('auth.setPassword')}</h1>
          <p className="page-subtitle">{t('auth.setPasswordSubtitle')}</p>

          {success ? (
            <p className="form-success" role="status">{t('common.accountActivated')}</p>
          ) : (
            <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'set-pwd-error' : undefined}>
              <PasswordInput
                id="set-password"
                label={t('auth.newPassword')}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                disabled={loading}
                showRules
              />

              <PasswordInput
                id="set-confirm"
                label={t('auth.confirmPassword')}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                disabled={loading}
              />

              {error && (
                <p id="set-pwd-error" className="form-error" role="alert">{error}</p>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? t('common.loading') : t('auth.setPassword')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
