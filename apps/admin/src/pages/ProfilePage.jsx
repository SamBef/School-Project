import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import { IconBack, IconSignOut } from '../components/AdminIcons';

export default function ProfilePage() {
  const { name: contextName, email: contextEmail, logout } = useAdminAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/admin/auth/me')
      .then((data) => {
        setProfile(data.admin);
        setForm((f) => ({ ...f, name: data.admin?.name ?? '', email: data.admin?.email ?? '' }));
      })
      .catch((err) => setError(err.message || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (form.newPassword && form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const body = { name: form.name.trim(), email: form.email.trim() };
      if (form.newPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }
      await api.patch('/admin/auth/me', body);
      setMessage('Profile updated.');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Loading…</p>;
  if (error && !profile) {
    return (
      <div className="admin-layout">
        <header className="admin-header" role="banner">
          <div className="admin-header-left">
            <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to dashboard" title="Dashboard">
              <IconBack />
            </Link>
            <h1 className="admin-header-title">Profile</h1>
          </div>
        </header>
        <main className="admin-main" role="main">
          <p className="form-error" role="alert">{error}</p>
          <p style={{ marginTop: 'var(--space-4)' }}><Link to="/">Back to dashboard</Link></p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div className="admin-header-left">
          <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to dashboard" title="Dashboard">
            <IconBack />
          </Link>
          <h1 className="admin-header-title">Profile</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-header-email">{contextName || contextEmail}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={logout} aria-label="Sign out" title="Sign out">
            <IconSignOut />
          </button>
        </div>
      </header>

      <main className="admin-main" role="main">
        <div className="card card-form">
          <h2>Update your login credentials</h2>
          <p style={{ margin: '0 0 var(--space-4)', color: 'var(--color-neutral-600)' }}>
            Change your admin name or email (used for sign-in and forgot-password). To change your password, enter your current password and a new one.
          </p>
          <form onSubmit={handleSubmit}>
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="form-success" role="status">{message}</p>}
            <div className="form-group">
              <label htmlFor="profile-name">Name (used to sign in)</label>
              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-email">Email (for forgot-password link)</label>
              <input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled={saving}
              />
            </div>
            <h3 className="form-section-title">Change password (optional)</h3>
            <div className="form-group">
              <label htmlFor="profile-current-password">Current password</label>
              <input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                disabled={saving}
                placeholder="Only if changing password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-new-password">New password</label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                disabled={saving}
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-confirm-password">Confirm new password</label>
              <input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                value={form.confirmNewPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
                disabled={saving}
                minLength={8}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <Link to="/" className="btn btn-ghost">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
