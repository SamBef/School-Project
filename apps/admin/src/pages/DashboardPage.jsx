import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';

const SORT_OPTIONS = [
  { value: 'name', label: 'Company name' },
  { value: 'lastActivity', label: 'Last activity' },
  { value: 'created', label: 'Created date' },
  { value: 'teamSize', label: 'Team size' },
];

export default function DashboardPage() {
  const { email, logout } = useAdminAuth();
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lastActivity');

  useEffect(() => {
    Promise.all([
      api.get('/admin/businesses').then((data) => setBusinesses(data.businesses ?? [])),
      api.get('/admin/stats').then(setStats),
    ])
      .catch((err) => setError(err.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = businesses;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.primaryLocation && b.primaryLocation.toLowerCase().includes(q))
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'teamSize') return (b.userCount ?? 0) - (a.userCount ?? 0);
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime;
    });
    return sorted;
  }, [businesses, search, sortBy]);

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  }

  function exportCSV() {
    const headers = ['Company', 'Location', 'Currency', 'Team size', 'Transactions', 'Expenses', 'Last activity'];
    const rows = filteredAndSorted.map((b) => [
      b.name,
      b.primaryLocation,
      b.baseCurrencyCode,
      b.userCount,
      b.transactionCount,
      b.expenseCount,
      b.lastActivityAt ? formatDate(b.lastActivityAt) : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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
        {stats && (
          <div className="admin-stats">
            <div className="admin-stat">
              <p className="admin-stat-label">Companies</p>
              <p className="admin-stat-value">{stats.businessCount}</p>
            </div>
            <div className="admin-stat">
              <p className="admin-stat-label">Total users</p>
              <p className="admin-stat-value">{stats.userCount}</p>
            </div>
            <div className="admin-stat">
              <p className="admin-stat-label">Transactions</p>
              <p className="admin-stat-value">{stats.transactionCount}</p>
            </div>
            <div className="admin-stat">
              <p className="admin-stat-label">Expenses</p>
              <p className="admin-stat-value">{stats.expenseCount}</p>
            </div>
          </div>
        )}

        <div className="card">
          <h2>Companies</h2>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
            Summary only. No transaction or expense details; confidentiality is maintained.
          </p>

          <div className="admin-toolbar">
            <input
              type="search"
              className="admin-search"
              placeholder="Search by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search companies"
            />
            <label htmlFor="admin-sort" className="visually-hidden">Sort by</label>
            <select
              id="admin-sort"
              className="admin-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort companies"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost" onClick={exportCSV} disabled={filteredAndSorted.length === 0}>
              Export CSV
            </button>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {loading && <p className="loading">Loading…</p>}
          {!loading && !error && filteredAndSorted.length === 0 && (
            <p className="empty-state">
              {businesses.length === 0 ? 'No companies on the platform yet.' : 'No companies match your search.'}
            </p>
          )}
          {!loading && !error && filteredAndSorted.length > 0 && (
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
                  {filteredAndSorted.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link to={`/companies/${b.id}`} className="admin-table-link">
                          {b.name}
                        </Link>
                      </td>
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
