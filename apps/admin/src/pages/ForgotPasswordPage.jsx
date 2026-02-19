import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const [nameOrEmail, setNameOrEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/admin/auth/forgot-password', { nameOrEmail: nameOrEmail.trim() });
      setMessage('If an account exists with that name or email, you will receive a link to reset your password.');
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <h2>Forgot password</h2>
        <p>Enter your admin name or email. We will send a reset link to your email.</p>
        <form onSubmit={handleSubmit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <div className="form-group">
            <label htmlFor="admin-name-or-email">Name or email</label>
            <input
              id="admin-name-or-email"
              type="text"
              autoComplete="username"
              value={nameOrEmail}
              onChange={(e) => setNameOrEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
