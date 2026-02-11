import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';

export default function CompanyDetailPage() {
  const { id } = useParams();
  const { email, logout } = useAdminAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/admin/businesses/${id}`)
      .then(setBusiness)
      .catch((err) => setError(err.message || 'Failed to load company.'))
      .finally(() => setLoading(false));
  }, [id]);

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  }

  if (loading) return <p className="loading">Loading…</p>;
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!business) return null;

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>← Companies</Link>
          <h1 style={{ margin: 0 }}>{business.name}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>{email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="admin-main" role="main">
        <div className="card">
          <h2>Summary</h2>
          <dl className="admin-dl">
            <dt>Location</dt>
            <dd>{business.primaryLocation}</dd>
            <dt>Currency</dt>
            <dd>{business.baseCurrencyCode}</dd>
            <dt>Created</dt>
            <dd>{formatDate(business.createdAt)}</dd>
            <dt>Team size</dt>
            <dd>{business.userCount}</dd>
            <dt>Total transactions</dt>
            <dd>{business.transactionCount}</dd>
            <dt>Total expenses</dt>
            <dd>{business.expenseCount}</dd>
            <dt>Last activity</dt>
            <dd>{formatDate(business.lastActivityAt)}</dd>
          </dl>
        </div>

        <div className="card">
          <h2>Activity (last 7 days)</h2>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
            Daily counts only. No transaction or expense details.
          </p>
          {(business.activityLast7Days && business.activityLast7Days.length > 0) ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transactions</th>
                    <th>Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {business.activityLast7Days.map((day) => (
                    <tr key={day.date}>
                      <td>{formatDate(day.date)}</td>
                      <td>{day.transactionCount}</td>
                      <td>{day.expenseCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No activity in the last 7 days.</p>
          )}
        </div>
      </main>
    </div>
  );
}
