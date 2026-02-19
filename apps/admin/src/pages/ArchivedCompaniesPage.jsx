import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export default function ArchivedCompaniesPage() {
  const navigate = useNavigate();
  const { name, email, logout } = useAdminAuth();
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadArchives = () => {
    setLoading(true);
    setError('');
    api
      .get('/admin/archived-businesses')
      .then((data) => setArchives(data.archives ?? []))
      .catch((err) => setError(err.message || 'Failed to load archives.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadArchives();
  }, []);

  async function handleRestore(archiveId) {
    if (!window.confirm('Restore this company? It will be recreated with new IDs and appear in the companies list.')) return;
    setActionError('');
    setRestoringId(archiveId);
    try {
      const data = await api.post(`/admin/archived-businesses/${archiveId}/restore`);
      loadArchives();
      if (data.businessId) navigate(`/companies/${data.businessId}`);
      else navigate('/');
    } catch (err) {
      setActionError(err.message || 'Restore failed.');
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>← Companies</Link>
          <h1 style={{ margin: 0 }}>Archived companies</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/profile" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Profile</Link>
          <span className="admin-header-email">{name || email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="admin-main" role="main">
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Companies that were permanently deleted are archived here. You can restore any of them; they will be recreated and appear in the companies list again.
        </p>

        <aside
          className="archived-restore-note"
          role="note"
          aria-label="What restore includes"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--color-accent-muted)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            What gets restored
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-normal)' }}>
            Restore recreates <strong>company profile</strong>, <strong>users</strong>, <strong>transactions</strong> (with receipts), <strong>expenses</strong>, and <strong>activity logs</strong>. Units, locations, products, suppliers, return reasons, and other inventory-related data in the snapshot are not restored.
          </p>
        </aside>

        {actionError && <p className="form-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>{actionError}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading && <p className="loading">Loading archives…</p>}

        {!loading && !error && archives.length === 0 && (
          <div className="archived-empty" style={{
            textAlign: 'center',
            padding: 'var(--space-8)',
            background: 'var(--glass-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
          }}>
            <p style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-secondary)' }}>No archived companies</p>
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Deleted companies will appear here for restoration.</p>
            <Link to="/" className="btn btn-ghost" style={{ marginTop: 'var(--space-4)', textDecoration: 'none' }}>Back to companies</Link>
          </div>
        )}

        {!loading && !error && archives.length > 0 && (
          <div className="archived-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {archives.map((a) => (
              <article
                key={a.id}
                className="archived-card"
                style={{
                  background: 'var(--glass-bg)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--glass-border)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {a.businessName}
                  </h3>
                  <dl style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    <dt style={{ margin: 0, fontWeight: 500, color: 'var(--text-muted)' }}>Archived / deleted</dt>
                    <dd style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>{formatDateTime(a.deletedAt)}</dd>
                    <dt style={{ margin: 0, fontWeight: 500, color: 'var(--text-muted)' }}>Team size</dt>
                    <dd style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>{a.userCount}</dd>
                    <dt style={{ margin: 0, fontWeight: 500, color: 'var(--text-muted)' }}>Transactions</dt>
                    <dd style={{ margin: 'var(--space-1) 0 0' }}>{a.transactionCount}</dd>
                  </dl>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleRestore(a.id)}
                    disabled={restoringId !== null}
                  >
                    {restoringId === a.id ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
