/**
 * Profile page — displays user account details and business information.
 * Any user can edit their name and avatar. Owner can edit business info and currency.
 * All users can change their password.
 */

import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { t } from '../i18n';
import PasswordInput from '../components/PasswordInput';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'XOF', label: 'XOF — West African CFA' },
  { code: 'XAF', label: 'XAF — Central African CFA' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
];

function getRoleLabel(role) {
  if (role === 'OWNER') return t('common.owner');
  if (role === 'MANAGER') return t('common.manager');
  return t('common.cashier');
}

function getRoleBadgeClass(role) {
  if (role === 'OWNER') return 'role-badge role-badge-owner';
  if (role === 'MANAGER') return 'role-badge role-badge-manager';
  return 'role-badge role-badge-cashier';
}

export default function ProfilePage() {
  const { user, business, refreshUser } = useAuth();
  const role = user?.role ?? '';
  const isOwner = role === 'OWNER';
  const fullName = (user?.firstName && user?.lastName)
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.email || '';
  const initial = user?.firstName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';

  // Avatar state
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Name editing state
  const [editingName, setEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user?.firstName ?? '');
  const [editLastName, setEditLastName] = useState(user?.lastName ?? '');
  const [savingName, setSavingName] = useState(false);

  // Currency state
  const [currency, setCurrency] = useState(business?.baseCurrencyCode ?? 'USD');
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Business info editing state (Owner only)
  const [editingInfo, setEditingInfo] = useState(false);
  const [bizName, setBizName] = useState(business?.name ?? '');
  const [bizEmail, setBizEmail] = useState(business?.email ?? '');
  const [bizPhone, setBizPhone] = useState(business?.phone ?? '');
  const [bizLocation, setBizLocation] = useState(business?.primaryLocation ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Shared feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const hasCurrencyChanged = currency !== (business?.baseCurrencyCode ?? 'USD');

  function clearMessages() {
    setSuccessMsg('');
    setErrorMsg('');
  }

  // --- Avatar upload ---
  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please select an image file (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Validate file size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image is too large. Please use an image under 2 MB.');
      return;
    }

    setUploadingAvatar(true);
    clearMessages();

    try {
      // Convert to base64 data URL
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });

      await api.patch('/auth/avatar', { avatarUrl: dataUrl });
      await refreshUser();
      setSuccessMsg(t('profile.avatarUpdated'));
    } catch (err) {
      setErrorMsg(err.message || t('common.saveFailed'));
    } finally {
      setUploadingAvatar(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleAvatarRemove() {
    setUploadingAvatar(true);
    clearMessages();
    try {
      await api.patch('/auth/avatar', { avatarUrl: null });
      await refreshUser();
      setSuccessMsg(t('profile.avatarRemoved'));
    } catch (err) {
      setErrorMsg(err.message || t('common.saveFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  // --- Name editing ---
  function startEditName() {
    setEditFirstName(user?.firstName ?? '');
    setEditLastName(user?.lastName ?? '');
    setEditingName(true);
    clearMessages();
  }

  function cancelEditName() {
    setEditingName(false);
    clearMessages();
  }

  async function handleNameSave(e) {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim()) {
      setErrorMsg('First name and last name are required.');
      return;
    }
    setSavingName(true);
    clearMessages();
    try {
      await api.patch('/auth/profile', {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      });
      await refreshUser();
      setEditingName(false);
      setSuccessMsg(t('profile.nameUpdated'));
    } catch (err) {
      setErrorMsg(err.message || t('common.saveFailed'));
    } finally {
      setSavingName(false);
    }
  }

  // --- Currency ---
  async function handleCurrencySave() {
    setSavingCurrency(true);
    clearMessages();
    try {
      await api.patch('/business', { baseCurrencyCode: currency });
      await refreshUser();
      setSuccessMsg(t('profile.currencyUpdated'));
    } catch (err) {
      setErrorMsg(err.message || t('common.saveFailed'));
    } finally {
      setSavingCurrency(false);
    }
  }

  // --- Business info ---
  function startEditInfo() {
    setBizName(business?.name ?? '');
    setBizEmail(business?.email ?? '');
    setBizPhone(business?.phone ?? '');
    setBizLocation(business?.primaryLocation ?? '');
    setEditingInfo(true);
    clearMessages();
  }

  function cancelEditInfo() {
    setEditingInfo(false);
    clearMessages();
  }

  async function handleInfoSave(e) {
    e.preventDefault();
    setSavingInfo(true);
    clearMessages();
    try {
      await api.patch('/business', {
        name: bizName,
        email: bizEmail,
        phone: bizPhone,
        primaryLocation: bizLocation,
      });
      await refreshUser();
      setEditingInfo(false);
      setSuccessMsg(t('profile.businessUpdated'));
    } catch (err) {
      setErrorMsg(err.message || t('common.saveFailed'));
    } finally {
      setSavingInfo(false);
    }
  }

  // --- Password change ---
  function startChangePassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setChangingPassword(true);
    clearMessages();
  }

  function cancelChangePassword() {
    setChangingPassword(false);
    clearMessages();
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg(t('common.passwordRules'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg(t('common.passwordsNoMatch'));
      return;
    }
    setSavingPassword(true);
    clearMessages();
    try {
      const data = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setChangingPassword(false);
      setSuccessMsg(data.message || t('profile.passwordChanged'));
    } catch (err) {
      setErrorMsg(err.message || t('common.saveFailed'));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
      {/* Profile header */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              aria-label={t('profile.changeAvatar')}
              title={t('profile.changeAvatar')}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={fullName}
                  className="profile-avatar-img"
                />
              ) : (
                <span className="profile-avatar-initial" aria-hidden="true">{initial}</span>
              )}
              <span className="profile-avatar-overlay" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="visually-hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
            {user?.avatarUrl && (
              <button
                type="button"
                className="profile-avatar-remove"
                onClick={handleAvatarRemove}
                disabled={uploadingAvatar}
                aria-label={t('profile.removeAvatar')}
                title={t('profile.removeAvatar')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">{fullName}</h1>
            <p className="profile-email">{user?.email}</p>
            <span className="profile-role-label">{getRoleLabel(role)}</span>
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {successMsg && <p className="form-success" role="status" style={{ marginBottom: 'var(--space-4)' }}>{successMsg}</p>}
      {errorMsg && <p className="form-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>{errorMsg}</p>}

      {/* Account details */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2>{t('common.account')}</h2>
          {!editingName && (
            <button type="button" className="btn-edit-business" onClick={startEditName}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {t('profile.editName')}
            </button>
          )}
        </div>

        {editingName ? (
          <form onSubmit={handleNameSave}>
            <div className="form-row" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="edit-first-name">{t('auth.firstName')}</label>
                <input
                  id="edit-first-name"
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                  disabled={savingName}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="edit-last-name">{t('auth.lastName')}</label>
                <input
                  id="edit-last-name"
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  required
                  disabled={savingName}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingName}>
                {savingName ? t('common.loading') : t('common.save')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEditName} disabled={savingName}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <ul className="business-info-list">
            <li>
              <span className="info-label">{t('auth.firstName')}</span>
              <span className="info-value">{user?.firstName || '—'}</span>
            </li>
            <li>
              <span className="info-label">{t('auth.lastName')}</span>
              <span className="info-value">{user?.lastName || '—'}</span>
            </li>
            <li>
              <span className="info-label">{t('common.email')}</span>
              <span className="info-value">{user?.email}</span>
            </li>
            <li>
              <span className="info-label">{t('common.role')}</span>
              <span className="info-value">{getRoleLabel(role)}</span>
            </li>
          </ul>
        )}
      </div>

      {/* Security — Password change */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2>{t('profile.security')}</h2>
          {!changingPassword && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={startChangePassword}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '4px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {t('profile.changePassword')}
            </button>
          )}
        </div>

        {changingPassword ? (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <PasswordInput
                id="current-password"
                label={t('profile.currentPassword')}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                disabled={savingPassword}
              />
            </div>
            <div className="form-group">
              <PasswordInput
                id="new-password"
                label={t('profile.newPassword')}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                disabled={savingPassword}
                showRules
              />
            </div>
            <div className="form-group">
              <PasswordInput
                id="confirm-new-password"
                label={t('profile.confirmNewPassword')}
                value={confirmNewPassword}
                onChange={setConfirmNewPassword}
                autoComplete="new-password"
                disabled={savingPassword}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingPassword}>
                {savingPassword ? t('common.loading') : t('profile.changePassword')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelChangePassword} disabled={savingPassword}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-muted text-sm" style={{ padding: 'var(--space-2) 0' }}>
            {t('common.passwordRules')}
          </p>
        )}
      </div>

      {/* Business details */}
      {business && (
        <div className="card">
          <div className="card-header">
            <h2>{t('common.businessInfo')}</h2>
            {isOwner && !editingInfo && (
              <button type="button" className="btn-edit-business" onClick={startEditInfo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                {t('profile.editBusiness')}
              </button>
            )}
            {isOwner && editingInfo && (
              <button type="button" className="btn-cancel-edit" onClick={cancelEditInfo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {t('profile.cancelEdit')}
              </button>
            )}
          </div>

          {isOwner && editingInfo ? (
            <form onSubmit={handleInfoSave}>
              <div className="profile-edit-form">
                <div className="form-group">
                  <label htmlFor="biz-name">{t('common.name')}</label>
                  <input
                    id="biz-name"
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    required
                    disabled={savingInfo}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="biz-email">{t('common.email')}</label>
                  <input
                    id="biz-email"
                    type="email"
                    value={bizEmail}
                    onChange={(e) => setBizEmail(e.target.value)}
                    required
                    disabled={savingInfo}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="biz-phone">{t('common.phone')}</label>
                  <input
                    id="biz-phone"
                    type="tel"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    required
                    disabled={savingInfo}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="biz-location">{t('common.location')}</label>
                  <input
                    id="biz-location"
                    type="text"
                    value={bizLocation}
                    onChange={(e) => setBizLocation(e.target.value)}
                    required
                    disabled={savingInfo}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingInfo}>
                  {savingInfo ? t('common.loading') : t('common.save')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEditInfo} disabled={savingInfo}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <ul className="business-info-list">
              <li>
                <span className="info-label">{t('common.name')}</span>
                <span className="info-value">{business.name}</span>
              </li>
              <li>
                <span className="info-label">{t('common.email')}</span>
                <span className="info-value">{business.email}</span>
              </li>
              <li>
                <span className="info-label">{t('common.phone')}</span>
                <span className="info-value">{business.phone}</span>
              </li>
              <li>
                <span className="info-label">{t('common.location')}</span>
                <span className="info-value">{business.primaryLocation}</span>
              </li>
              <li>
                <span className="info-label">{t('common.currency')}</span>
                {isOwner ? (
                  <div className="currency-selector">
                    <select
                      value={currency}
                      onChange={(e) => { setCurrency(e.target.value); clearMessages(); }}
                      disabled={savingCurrency}
                      aria-label={t('common.currency')}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    {hasCurrencyChanged && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleCurrencySave}
                        disabled={savingCurrency}
                      >
                        {savingCurrency ? t('common.loading') : t('common.save')}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="info-value">{business.baseCurrencyCode ?? 'USD'}</span>
                )}
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
