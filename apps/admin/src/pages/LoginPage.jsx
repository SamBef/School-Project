import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';

export default function LoginPage() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.post('/admin/auth/login', { name: name.trim(), password });
      login(token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <h2>KoboTrack Admin</h2>
        <p>Sign in with your admin name and password.</p>
        <form onSubmit={handleSubmit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-group">
            <label htmlFor="admin-name">Name</label>
            <input
              id="admin-name"
              type="text"
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              placeholder="e.g. koboadmin"
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
