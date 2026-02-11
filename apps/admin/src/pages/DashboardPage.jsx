import { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';

export default function DashboardPage() {
  const { email, logout } = useAdminAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/businesses')
      .then((data) => setBusinesses(data.businesses ?? []))
      .catch((err) => setError(err.message || 'Failed to load companies.'))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  }

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <h1>KoboTrack Admin</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>{email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-main" role="main">
        <div className="card">
          <h2>Companies</h2>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
            Summary only. No transaction or expense details; confidentiality is maintained.
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}
          {loading && <p className="loading">Loading…</p>}
          {!loading && !error && businesses.length === 0 && (
            <p className="empty-state">No companies on the platform yet.</p>
          )}
          {!loading && !error && businesses.length > 0 && (
            <div style={{ overflowX: 'auto', minWidth: 0 }}>
              <table className="data-table" role="grid">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Currency</th>
                    <th>Team size</th>
                    <th>Transactions</th>
                    <th>Expenses</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.primaryLocation}</td>
                      <td>{b.baseCurrencyCode}</td>
                      <td>{b.userCount}</td>
                      <td>{b.transactionCount}</td>
                      <td>{b.expenseCount}</td>
                      <td>{formatDate(b.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
