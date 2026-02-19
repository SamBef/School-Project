import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token?.trim()) setError('Missing reset token. Use the link from your email.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (String(newPassword).length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/auth/reset-password', { token: token?.trim(), newPassword });
      setMessage('Password updated. You can sign in with your new password.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  if (!token?.trim()) {
    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          <h2>Reset password</h2>
          <p className="form-error">{error}</p>
          <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <h2>Set new password</h2>
        <p>Enter your new password (at least 8 characters).</p>
        <form onSubmit={handleSubmit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
          <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
