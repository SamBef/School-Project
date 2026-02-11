/**
 * Register page — business details + owner account in a wider card.
 * Password rules shown upfront (security doctrine rule 16).
 * Password visibility toggles (security doctrine rule 20).
 * Form preserved on errors (security doctrine rule 12–13).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { isValidEmail } from '../lib/validate';
import PasswordInput from '../components/PasswordInput';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    primaryLocation: '',
    firstName: '',
    lastName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!isValidEmail(form.businessEmail)) {
      setError('Please enter a valid business email address.');
      return;
    }
    if (!isValidEmail(form.ownerEmail)) {
      setError('Please enter a valid owner email address.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('common.passwordsNoMatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('common.passwordRules'));
      return;
    }
    setLoading(true);
    try {
      await register({
        businessName: form.businessName.trim(),
        businessEmail: form.businessEmail.trim(),
        businessPhone: form.businessPhone.trim(),
        primaryLocation: form.primaryLocation.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || t('common.error'));
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" role="main">
      <div className="auth-container auth-container-wide">
        <Link to="/" className="auth-logo" aria-label="KoboTrack home">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>{t('app.name')}</span>
        </Link>

        <div className="auth-card auth-card-wide">
        <h1 className="page-title">{t('auth.signUp')}</h1>
        <p className="page-subtitle">{t('auth.signUpSubtitle')}</p>

        <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'register-error' : undefined}>
          <fieldset>
            <legend>{t('auth.businessDetails')}</legend>
            <div className="form-group">
              <label htmlFor="reg-business-name">{t('auth.businessName')}</label>
              <input
                id="reg-business-name"
                type="text"
                value={form.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                required
                disabled={loading}
                placeholder="My Shop"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-business-email">{t('auth.businessEmail')}</label>
              <input
                id="reg-business-email"
                type="email"
                value={form.businessEmail}
                onChange={(e) => handleChange('businessEmail', e.target.value)}
                required
                disabled={loading}
                placeholder="contact@myshop.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-business-phone">{t('auth.businessPhone')}</label>
              <input
                id="reg-business-phone"
                type="tel"
                value={form.businessPhone}
                onChange={(e) => handleChange('businessPhone', e.target.value)}
                required
                disabled={loading}
                placeholder="+234 800 000 0000"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-primary-location">{t('auth.primaryLocation')}</label>
              <input
                id="reg-primary-location"
                type="text"
                value={form.primaryLocation}
                onChange={(e) => handleChange('primaryLocation', e.target.value)}
                required
                disabled={loading}
                placeholder="Lagos"
              />
            </div>
          </fieldset>

          <fieldset style={{ marginTop: 'var(--space-6)' }}>
            <legend>{t('auth.ownerAccount')}</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-first-name">{t('auth.firstName')}</label>
                <input
                  id="reg-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="John"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-last-name">{t('auth.lastName')}</label>
                <input
                  id="reg-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-owner-email">{t('auth.email')}</label>
              <input
                id="reg-owner-email"
                type="email"
                autoComplete="email"
                value={form.ownerEmail}
                onChange={(e) => handleChange('ownerEmail', e.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com"
              />
            </div>

            <PasswordInput
              id="reg-password"
              label={t('auth.password')}
              value={form.password}
              onChange={(val) => handleChange('password', val)}
              autoComplete="new-password"
              disabled={loading}
              showRules
            />

            <PasswordInput
              id="reg-confirm-password"
              label={t('auth.confirmPassword')}
              value={form.confirmPassword}
              onChange={(val) => handleChange('confirmPassword', val)}
              autoComplete="new-password"
              disabled={loading}
            />
          </fieldset>

          {error && (
            <p id="register-error" className="form-error" role="alert">{error}</p>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('common.loading') : t('auth.signUp')}
            </button>
          </div>
        </form>

        <p className="auth-links">
          {t('auth.hasAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </p>
        </div>
      </div>
    </main>
  );
}
