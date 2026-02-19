import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

const ROLES = ['OWNER', 'MANAGER', 'CASHIER'];

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { name, email, logout } = useAdminAuth();
  const [business, setBusiness] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({});
  const [addUserForm, setAddUserForm] = useState({ email: '', firstName: '', lastName: '', role: 'CASHIER', sendInvite: true, password: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadBusiness = useCallback(() => {
    return api.get(`/admin/businesses/${id}`).then((data) => {
      setBusiness(data);
      setEditForm({
        name: data.name,
        email: data.email,
        phone: data.phone,
        primaryLocation: data.primaryLocation,
        address: data.address || '',
        baseCurrencyCode: data.baseCurrencyCode,
      });
    });
  }, [id]);

  const loadUsers = useCallback(() => api.get(`/admin/businesses/${id}/users`).then((data) => setUsers(data.users || [])), [id]);
  const loadActivity = useCallback(() => api.get(`/admin/businesses/${id}/activity`).then((data) => setActivity(data.activity || [])), [id]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([loadBusiness(), loadUsers(), loadActivity()])
      .catch((err) => setError(err.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [id, loadBusiness, loadUsers, loadActivity]);

  async function handleUpdateCompany(e) {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await api.patch(`/admin/businesses/${id}`, editForm);
      await loadBusiness();
      setEditOpen(false);
    } catch (err) {
      setActionError(err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivateCompany(deactivate) {
    setActionError('');
    setActionLoading(true);
    try {
      await api.patch(`/admin/businesses/${id}`, { deactivated: !!deactivate });
      await loadBusiness();
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCompany() {
    setActionError('');
    setActionLoading(true);
    try {
      await api.delete(`/admin/businesses/${id}`);
      setDeleteConfirmOpen(false);
      navigate('/');
    } catch (err) {
      setActionError(err.message || 'Delete failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      const body = {
        email: addUserForm.email.trim(),
        firstName: addUserForm.firstName.trim(),
        lastName: addUserForm.lastName.trim(),
        role: addUserForm.role,
        sendInvite: addUserForm.sendInvite,
      };
      if (!addUserForm.sendInvite) body.password = addUserForm.password;
      await api.post(`/admin/businesses/${id}/users`, body);
      await loadUsers();
      setAddUserOpen(false);
      setAddUserForm({ email: '', firstName: '', lastName: '', role: 'CASHIER', sendInvite: true, password: '' });
    } catch (err) {
      setActionError(err.message || 'Failed to add user.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateUser(userId, payload) {
    setActionError('');
    setActionLoading(true);
    try {
      await api.patch(`/admin/businesses/${id}/users/${userId}`, payload);
      await loadUsers();
      setEditUserOpen(null);
    } catch (err) {
      setActionError(err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Delete this user? This is only allowed if they have no transactions or expenses.')) return;
    setActionError('');
    setActionLoading(true);
    try {
      await api.delete(`/admin/businesses/${id}/users/${userId}`);
      await loadUsers();
      setEditUserOpen(null);
    } catch (err) {
      setActionError(err.message || 'Delete failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setActionError('Passwords do not match.');
      return;
    }
    if (resetPasswordForm.newPassword.length < 8) {
      setActionError('Password must be at least 8 characters.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      await api.patch(`/admin/businesses/${id}/users/${resetPasswordUser.id}/password`, { newPassword: resetPasswordForm.newPassword });
      setResetPasswordUser(null);
      setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setActionError(err.message || 'Failed to update password.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="loading">Loading…</p>;
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!business) return null;

  const isDeactivated = !!business.deactivatedAt;

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>← Companies</Link>
          <h1 style={{ margin: 0 }}>{business.name}</h1>
          {isDeactivated && <span className="badge badge-inactive">Deactivated</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/profile" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Profile</Link>
          <span className="admin-header-email">{name || email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="admin-main" role="main">
        {actionError && <p className="form-error" role="alert">{actionError}</p>}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <h2>Summary</h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {!editOpen && (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)} disabled={actionLoading}>Edit company</button>
                  {isDeactivated ? (
                    <button type="button" className="btn btn-ghost" onClick={() => handleDeactivateCompany(false)} disabled={actionLoading}>Reactivate company</button>
                  ) : (
                    <button type="button" className="btn btn-danger-ghost" onClick={() => handleDeactivateCompany(true)} disabled={actionLoading}>Deactivate company</button>
                  )}
                  <button type="button" className="btn btn-danger-ghost" onClick={() => setDeleteConfirmOpen(true)} disabled={actionLoading} title="Permanently remove company; data is archived for potential restoration">Delete company</button>
                </>
              )}
            </div>
          </div>

          {editOpen ? (
            <form onSubmit={handleUpdateCompany} className="admin-edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-name">Name</label>
                  <input id="edit-name" value={editForm.name || ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-email">Email</label>
                  <input id="edit-email" type="email" value={editForm.email || ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} disabled={actionLoading} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-phone">Phone</label>
                  <input id="edit-phone" value={editForm.phone || ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-location">Primary location</label>
                  <input id="edit-location" value={editForm.primaryLocation || ''} onChange={(e) => setEditForm((f) => ({ ...f, primaryLocation: e.target.value }))} disabled={actionLoading} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-address">Address</label>
                  <input id="edit-address" value={editForm.address || ''} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-currency">Base currency</label>
                  <input id="edit-currency" value={editForm.baseCurrencyCode || ''} onChange={(e) => setEditForm((f) => ({ ...f, baseCurrencyCode: e.target.value }))} disabled={actionLoading} />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditOpen(false); setEditForm({ name: business.name, email: business.email, phone: business.phone, primaryLocation: business.primaryLocation, address: business.address || '', baseCurrencyCode: business.baseCurrencyCode }); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <dl className="admin-dl">
              <dt>Email</dt>
              <dd>{business.email}</dd>
              <dt>Phone</dt>
              <dd>{business.phone}</dd>
              <dt>Location</dt>
              <dd>{business.primaryLocation}</dd>
              <dt>Address</dt>
              <dd>{business.address || '—'}</dd>
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
          )}
        </div>

        <div className="card">
          <h2>Activity (last 7 days)</h2>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>Daily counts. No transaction or expense details.</p>
          {(business.activityLast7Days && business.activityLast7Days.length > 0) ? (
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Transactions</th><th>Expenses</th></tr>
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

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <h2>Users</h2>
            <button type="button" className="btn btn-primary" onClick={() => { setAddUserOpen(true); setActionError(''); }} disabled={actionLoading || isDeactivated}>Add user</button>
          </div>
          {users.length === 0 ? (
            <p className="empty-state">No users yet. Add an owner when creating the company, or add users here.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        {u.deactivatedAt ? <span className="badge badge-inactive">Deactivated</span> : u.hasPassword ? <span className="badge badge-active">Active</span> : <span className="badge badge-pending">Pending invite</span>}
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>
                        {editUserOpen === u.id ? (
                          <UserEditInline
                            user={u}
                            onSave={(role, deactivated) => handleUpdateUser(u.id, { role, deactivated })}
                            onDelete={() => handleDeleteUser(u.id)}
                            onCancel={() => setEditUserOpen(null)}
                            loading={actionLoading}
                          />
                        ) : (
                          <span style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditUserOpen(u.id)}>Edit</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setResetPasswordUser(u); setResetPasswordForm({ newPassword: '', confirmPassword: '' }); setActionError(''); }} disabled={actionLoading}>Reset password</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {deleteConfirmOpen && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-company-title" aria-describedby="delete-company-desc">
            <div className="admin-modal" style={{ maxWidth: '420px' }}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h2 id="delete-company-title" style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Delete company?
                </h2>
                <p id="delete-company-desc" style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-normal)' }}>
                  All data will be archived for potential restoration but removed from the system. This cannot be undone.
                </p>
              </div>
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-error-muted)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(248, 81, 73, 0.25)', marginBottom: 'var(--space-5)' }}>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  You can restore this company later from <strong>Archived companies</strong>.
                </p>
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmOpen(false)} disabled={actionLoading}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger-ghost" onClick={handleDeleteCompany} disabled={actionLoading}>
                  {actionLoading ? 'Deleting…' : 'Delete company'}
                </button>
              </div>
            </div>
          </div>
        )}

        {resetPasswordUser && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
            <div className="admin-modal">
              <h2 id="reset-password-title">Set new password for {resetPasswordUser.email}</h2>
              <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>Current passwords cannot be viewed (stored securely). Enter a new password for this member.</p>
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="rp-new">New password *</label>
                  <input id="rp-new" type="password" minLength={8} required value={resetPasswordForm.newPassword} onChange={(e) => setResetPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="rp-confirm">Confirm new password *</label>
                  <input id="rp-confirm" type="password" minLength={8} required value={resetPasswordForm.confirmPassword} onChange={(e) => setResetPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} disabled={actionLoading} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading ? 'Updating…' : 'Update password'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setResetPasswordUser(null); setResetPasswordForm({ newPassword: '', confirmPassword: '' }); setActionError(''); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {addUserOpen && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-user-title">
            <div className="admin-modal">
              <h2 id="add-user-title">Add user</h2>
              <form onSubmit={handleAddUser}>
                <div className="form-group">
                  <label htmlFor="au-email">Email *</label>
                  <input id="au-email" type="email" required value={addUserForm.email} onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))} disabled={actionLoading} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="au-firstName">First name *</label>
                    <input id="au-firstName" required value={addUserForm.firstName} onChange={(e) => setAddUserForm((f) => ({ ...f, firstName: e.target.value }))} disabled={actionLoading} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="au-lastName">Last name *</label>
                    <input id="au-lastName" required value={addUserForm.lastName} onChange={(e) => setAddUserForm((f) => ({ ...f, lastName: e.target.value }))} disabled={actionLoading} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="au-role">Role</label>
                  <select id="au-role" value={addUserForm.role} onChange={(e) => setAddUserForm((f) => ({ ...f, role: e.target.value }))} disabled={actionLoading}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input type="checkbox" checked={addUserForm.sendInvite} onChange={(e) => setAddUserForm((f) => ({ ...f, sendInvite: e.target.checked }))} disabled={actionLoading} />
                    Send invite email (user sets password via link)
                  </label>
                </div>
                {!addUserForm.sendInvite && (
                  <div className="form-group">
                    <label htmlFor="au-password">Password *</label>
                    <input id="au-password" type="password" minLength={8} value={addUserForm.password} onChange={(e) => setAddUserForm((f) => ({ ...f, password: e.target.value }))} disabled={actionLoading} />
                  </div>
                )}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading ? 'Adding…' : 'Add user'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setAddUserOpen(false); setActionError(''); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="card">
          <h2>Activity log</h2>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>Recent actions (logins, transactions, user changes).</p>
          {activity.length === 0 ? (
            <p className="empty-state">No activity recorded yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((l) => (
                    <tr key={l.id}>
                      <td>{formatDateTime(l.createdAt)}</td>
                      <td><code className="activity-action">{l.action}</code></td>
                      <td>{l.user ? [l.user.firstName, l.user.lastName].filter(Boolean).join(' ') || l.user.email : '—'}</td>
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

function UserEditInline({ user, onSave, onDelete, onCancel, loading }) {
  const [role, setRole] = useState(user.role);
  const [deactivated, setDeactivated] = useState(!!user.deactivatedAt);
  return (
    <div className="user-edit-inline">
      <select value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} className="admin-select-sm">
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>
        <input type="checkbox" checked={deactivated} onChange={(e) => setDeactivated(e.target.checked)} disabled={loading} />
        Deactivated
      </label>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(role, deactivated)} disabled={loading}>Save</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete()} disabled={loading}>Delete</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}
