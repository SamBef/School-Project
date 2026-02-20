import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import AdminBreadcrumbs from '../components/AdminBreadcrumbs';
import { IconBack, IconProfile, IconSignOut, IconRefresh } from '../components/AdminIcons';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function ArchivePage() {
  const { name, email, logout } = useAdminAuth();
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/admin/businesses')
      .then((data) => {
        const list = data.businesses ?? [];
        setBusinesses(list.filter((b) => b.deactivatedAt));
      })
      .catch((err) => setError(err.message || 'Failed to load archived companies.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter(
      (b) =>
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.primaryLocation && b.primaryLocation.toLowerCase().includes(q))
    );
  }, [businesses, search]);

  async function handleRestore(id) {
    setRestoringId(id);
    setError('');
    try {
      await api.patch(`/admin/businesses/${id}`, { deactivated: false });
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.message || 'Restore failed.');
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div className="admin-header-left">
          <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to dashboard" title="Dashboard">
            <IconBack />
          </Link>
          <h1 className="admin-header-title">Archive</h1>
        </div>
        <div className="admin-header-actions">
          <Link to="/profile" className="btn btn-ghost btn-icon" aria-label="Profile" title="Profile">
            <IconProfile />
          </Link>
          <span className="admin-header-email">{name || email}</span>
          <button type="button" className="btn btn-ghost btn-icon admin-header-signout" onClick={logout} aria-label="Sign out" title="Sign out">
            <IconSignOut />
          </button>
        </div>
      </header>

      <main className="admin-main" role="main">
        <AdminBreadcrumbs segments={[{ label: 'Dashboard', to: '/' }, { label: 'Archive' }]} />
        <div className="card">
          <h2>Archived companies</h2>
          <p className="admin-card-description">
            Deactivated companies can be restored here. Restoring makes the company active again; users can sign in and use the app.
          </p>

          {businesses.length > 0 && (
            <div className="admin-toolbar" style={{ marginBottom: 'var(--space-4)' }}>
              <input
                type="search"
                className="admin-search"
                placeholder="Search by name or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search archived companies"
              />
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          {loading && <p className="loading"><span className="loading-spinner" aria-hidden />Loading…</p>}
          {!loading && !error && businesses.length === 0 && (
            <p className="empty-state">No archived companies. Companies you deactivate from the dashboard will appear here.</p>
          )}
          {!loading && !error && filtered.length === 0 && businesses.length > 0 && (
            <p className="empty-state">No archived companies match your search.</p>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="admin-table-wrap">
              <table className="data-table" role="grid">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Archived</th>
                    <th className="admin-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link to={`/companies/${b.id}`} className="admin-table-link">
                          {b.name}
                        </Link>
                      </td>
                      <td>{b.primaryLocation || '—'}</td>
                      <td>{formatDate(b.deactivatedAt)}</td>
                      <td className="admin-col-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleRestore(b.id)}
                          disabled={restoringId === b.id}
                          aria-label={`Restore ${b.name}`}
                          title="Restore company"
                        >
                          <IconRefresh />
                          <span>{restoringId === b.id ? 'Restoring…' : 'Restore'}</span>
                        </button>
                      </td>
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
