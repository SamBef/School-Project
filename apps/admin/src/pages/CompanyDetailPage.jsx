import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import { IconBack, IconProfile, IconSignOut, IconEdit, IconArchive, IconRefresh, IconSave, IconCancel, IconAdd, IconTrash } from '../components/AdminIcons';
import AdminSelectDropdown from '../components/AdminSelectDropdown';
import AdminBreadcrumbs from '../components/AdminBreadcrumbs';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

const ROLES = ['OWNER', 'MANAGER', 'CASHIER'];

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addUserForm, setAddUserForm] = useState({ email: '', firstName: '', lastName: '', role: 'CASHIER', sendInvite: true, password: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

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
        baseLocale: data.baseLocale || 'en',
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
      const res = await api.patch(`/admin/businesses/${id}`, editForm);
      if (res.business) {
        setBusiness((prev) => ({ ...prev, ...res.business }));
        setEditForm((prev) => ({ ...prev, ...res.business, baseLocale: res.business.baseLocale ?? 'en' }));
      } else {
        await loadBusiness();
      }
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
      const res = await api.patch(`/admin/businesses/${id}`, { deactivated: !!deactivate });
      if (res.business) setBusiness((prev) => ({ ...prev, ...res.business }));
      else await loadBusiness();
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
      const res = await api.patch(`/admin/businesses/${id}/users/${userId}`, payload);
      if (res.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.user, locale: res.user.locale ?? u.locale } : u)));
      } else {
        await loadUsers();
      }
      setEditUserOpen(null);
    } catch (err) {
      setActionError(err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser(userId) {
    const user = users.find((u) => u.id === userId);
    const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : 'this user';
    const confirmMessage = `Permanently remove ${userName} (${user?.email ?? 'this user'}) from the company? This is only allowed if they have no transactions or expenses. This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;
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

  if (loading) return <p className="loading"><span className="loading-spinner" aria-hidden />Loading…</p>;
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!business) return null;

  const isDeactivated = !!business.deactivatedAt;

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div className="admin-header-left">
          <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to companies" title="Companies">
            <IconBack />
          </Link>
          <h1 className="admin-header-title">{business.name}</h1>
          {isDeactivated && <span className="badge badge-inactive">Deactivated</span>}
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
        <AdminBreadcrumbs segments={[{ label: 'Dashboard', to: '/' }, { label: business.name }]} />
        {actionError && <p className="form-error" role="alert">{actionError}</p>}

        <div className="card card-summary">
          <div className="card-head-actions">
            <h2>Summary</h2>
            <div className="card-actions card-actions-labeled">
              {!editOpen && (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)} disabled={actionLoading} aria-label="Edit company" title="Edit company">
                    <IconEdit />
                    <span>Edit</span>
                  </button>
                  {isDeactivated ? (
                    <button type="button" className="btn btn-ghost" onClick={() => handleDeactivateCompany(false)} disabled={actionLoading} aria-label="Reactivate company" title="Reactivate company">
                      <IconRefresh />
                      <span>Reactivate</span>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost" onClick={() => handleDeactivateCompany(true)} disabled={actionLoading} aria-label="Deactivate company" title="Deactivate company">
                      <IconArchive />
                      <span>Deactivate</span>
                    </button>
                  )}
                  <button type="button" className="btn btn-danger-ghost" onClick={() => setDeleteConfirmOpen(true)} disabled={actionLoading} aria-label="Delete company permanently" title="Delete company (irreversible)">
                    <IconTrash />
                    <span>Delete company</span>
                  </button>
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
                <div className="form-group">
                  <span className="form-label" id="edit-baseLocale-label">Base locale</span>
                  <AdminSelectDropdown
                    id="edit-baseLocale"
                    ariaLabelledBy="edit-baseLocale-label"
                    ariaLabel="Base locale"
                    options={LOCALE_OPTIONS}
                    value={editForm.baseLocale || 'en'}
                    onChange={(v) => setEditForm((f) => ({ ...f, baseLocale: v }))}
                    disabled={actionLoading}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={actionLoading} aria-label="Save" title="Save">
                  <IconSave />
                  <span>{actionLoading ? 'Saving…' : 'Save'}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditOpen(false); setEditForm({ name: business.name, email: business.email, phone: business.phone, primaryLocation: business.primaryLocation, address: business.address || '', baseCurrencyCode: business.baseCurrencyCode, baseLocale: business.baseLocale || 'en' }); }} aria-label="Cancel" title="Cancel">
                  <IconCancel />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          ) : (
            <dl className="admin-dl admin-dl-summary">
              <div className="admin-dl-row"><dt>Email</dt><dd>{business.email}</dd></div>
              <div className="admin-dl-row"><dt>Phone</dt><dd>{business.phone}</dd></div>
              <div className="admin-dl-row"><dt>Location</dt><dd>{business.primaryLocation}</dd></div>
              <div className="admin-dl-row"><dt>Address</dt><dd>{business.address || '—'}</dd></div>
              <div className="admin-dl-row"><dt>Currency</dt><dd>{business.baseCurrencyCode}</dd></div>
              <div className="admin-dl-row"><dt>Base locale</dt><dd>{business.baseLocale === 'es' ? 'Español' : business.baseLocale === 'fr' ? 'Français' : 'English'}</dd></div>
              <div className="admin-dl-row"><dt>Created</dt><dd>{formatDate(business.createdAt)}</dd></div>
              <div className="admin-dl-row"><dt>Team size</dt><dd>{business.userCount}</dd></div>
              <div className="admin-dl-row"><dt>Total transactions</dt><dd>{business.transactionCount}</dd></div>
              <div className="admin-dl-row"><dt>Total expenses</dt><dd>{business.expenseCount}</dd></div>
              <div className="admin-dl-row"><dt>Last activity</dt><dd>{formatDate(business.lastActivityAt)}</dd></div>
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
          <div className="card-head-actions">
            <h2>Users</h2>
            <button type="button" className="btn btn-primary" onClick={() => { setAddUserOpen(true); setActionError(''); }} disabled={actionLoading || isDeactivated} aria-label="Add user" title="Add user">
              <IconAdd />
              <span>Add user</span>
            </button>
          </div>
          {users.length === 0 ? (
            <p className="empty-state">No users yet. Add an owner when creating the company, or add users here.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="admin-col-name">Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Locale</th>
                    <th>Status</th>
                    <th className="admin-col-created">Created</th>
                    <th className="admin-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="admin-col-name">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{(u.locale || business.baseLocale || 'en') === 'es' ? 'Español' : (u.locale || business.baseLocale || 'en') === 'fr' ? 'Français' : 'English'}</td>
                      <td>
                        {u.deactivatedAt ? <span className="badge badge-inactive">Deactivated</span> : u.hasPassword ? <span className="badge badge-active">Active</span> : <span className="badge badge-pending">Pending invite</span>}
                      </td>
                      <td className="admin-col-created">{formatDate(u.createdAt)}</td>
                      <td className="admin-col-actions">
                        {editUserOpen === u.id ? (
                          <UserEditInline
                            user={u}
                            onSave={(role, deactivated, locale) => handleUpdateUser(u.id, { role, deactivated, locale })}
                            onDelete={() => handleDeleteUser(u.id)}
                            onCancel={() => setEditUserOpen(null)}
                            loading={actionLoading}
                          />
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditUserOpen(u.id)} aria-label="Edit user" title="Edit">
                            <IconEdit />
                          </button>
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
          <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-company-title" onClick={(e) => e.target === e.currentTarget && setDeleteConfirmOpen(false)}>
            <div className="admin-modal admin-modal-confirm" onClick={(e) => e.stopPropagation()}>
              <h2 id="delete-company-title">Delete company?</h2>
              <p className="admin-modal-confirm-message">
                Permanently delete <strong>{business.name}</strong>? This removes the company and all its users, transactions, and expenses. This cannot be undone.
              </p>
              <div className="form-actions admin-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmOpen(false)} aria-label="Cancel">Cancel</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={actionLoading}
                  onClick={() => { setDeleteConfirmOpen(false); handleDeleteCompany(); }}
                  aria-label="Permanently delete company"
                >
                  {actionLoading ? 'Deleting…' : 'Delete company'}
                </button>
              </div>
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
                  <span className="form-label" id="au-role-label">Role</span>
                  <AdminSelectDropdown
                    id="au-role"
                    ariaLabelledBy="au-role-label"
                    ariaLabel="Role"
                    options={ROLE_OPTIONS}
                    value={addUserForm.role}
                    onChange={(v) => setAddUserForm((f) => ({ ...f, role: v }))}
                    disabled={actionLoading}
                  />
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
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => { setAddUserOpen(false); setActionError(''); }} aria-label="Cancel" title="Cancel">
                    <IconCancel />
                  </button>
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

const LOCALES_INLINE = [
  { value: '', label: 'Company default' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

function UserEditInline({ user, onSave, onDelete, onCancel, loading }) {
  const [role, setRole] = useState(user.role);
  const [deactivated, setDeactivated] = useState(!!user.deactivatedAt);
  const [locale, setLocale] = useState(user.locale ?? '');
  return (
    <div className="user-edit-inline">
      <AdminSelectDropdown
        id={`user-role-${user.id}`}
        ariaLabel="Role"
        options={ROLE_OPTIONS}
        value={role}
        onChange={setRole}
        disabled={loading}
        className="admin-select-dropdown-sm"
      />
      <AdminSelectDropdown
        id={`user-locale-${user.id}`}
        ariaLabel="Locale"
        options={LOCALES_INLINE}
        value={locale}
        onChange={(v) => setLocale(v)}
        disabled={loading}
        className="admin-select-dropdown-sm"
      />
      <label className="user-edit-inline-checkbox">
        <input type="checkbox" checked={deactivated} onChange={(e) => setDeactivated(e.target.checked)} disabled={loading} />
        <span>Deactivated</span>
      </label>
      <div className="user-edit-inline-buttons">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(role, deactivated, locale || null)} disabled={loading} aria-label="Save" title="Save">
          <IconSave />
          <span>Save</span>
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete()} disabled={loading} aria-label="Delete user" title="Delete">
          <IconTrash />
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Cancel" title="Cancel">
          <IconCancel />
        </button>
      </div>
    </div>
  );
}
