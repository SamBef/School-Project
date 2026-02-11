/**
 * Invite worker page — Owner only.
 * Adds a worker, displays team members, and allows role changes and removal.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { t } from '../i18n';
import { isValidEmail } from '../lib/validate';
import Spinner from '../components/Spinner';

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span
      className={isActive ? 'role-badge role-badge-owner' : 'role-badge role-badge-cashier'}
      style={!isActive ? { backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' } : undefined}
    >
      {isActive ? t('common.active') : t('common.pending')}
    </span>
  );
}

function RoleBadge({ role }) {
  const cls =
    role === 'OWNER' ? 'role-badge role-badge-owner'
      : role === 'MANAGER' ? 'role-badge role-badge-manager'
        : 'role-badge role-badge-cashier';
  const label =
    role === 'OWNER' ? t('common.owner')
      : role === 'MANAGER' ? t('common.manager')
        : t('common.cashier');
  return <span className={cls}>{label}</span>;
}

function displayName(member) {
  if (member.firstName && member.lastName) return `${member.firstName} ${member.lastName}`;
  if (member.firstName) return member.firstName;
  return member.email;
}

export default function InvitePage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  // Team action states
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [teamActionError, setTeamActionError] = useState('');
  const [teamActionSuccess, setTeamActionSuccess] = useState('');

  const fetchTeam = useCallback(async () => {
    try {
      const data = await api.get('/users');
      setTeam(data.users ?? []);
    } catch {
      // Silently fail — team list is supplementary
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'OWNER') fetchTeam();
  }, [user, fetchTeam]);

  if (user?.role !== 'OWNER') {
    return (
      <div className="card" style={{ maxWidth: '32rem', margin: '0 auto' }}>
        <p className="form-error" role="alert">
          {t('auth.noPermissionInvite')}
        </p>
      </div>
    );
  }

  function resetMessages() {
    setError('');
    setSuccess('');
    setInviteLink('');
    setCopied(false);
  }

  function clearTeamMessages() {
    setTeamActionError('');
    setTeamActionSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/users/invite', {
        email: email.trim(),
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setSuccess(data.message);
      if (data.inviteLink) {
        setInviteLink(data.inviteLink);
      }
      setEmail('');
      setFirstName('');
      setLastName('');
      fetchTeam();
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  async function handleChangeRole(memberId, newRole) {
    clearTeamMessages();
    setChangingRoleId(memberId);
    try {
      await api.patch(`/users/${memberId}/role`, { role: newRole });
      setTeamActionSuccess(t('common.roleUpdated'));
      fetchTeam();
    } catch (err) {
      setTeamActionError(err.message || t('common.saveFailed'));
    } finally {
      setChangingRoleId(null);
    }
  }

  async function handleRemoveMember(memberId) {
    clearTeamMessages();
    setRemovingId(memberId);
    try {
      await api.delete(`/users/${memberId}`);
      setConfirmRemoveId(null);
      setTeamActionSuccess(t('common.memberRemoved'));
      fetchTeam();
    } catch (err) {
      setTeamActionError(err.message || t('common.deleteFailed'));
    } finally {
      setRemovingId(null);
    }
  }

  function renderActions(member) {
    const isOwnerRow = member.role === 'OWNER';
    const isChanging = changingRoleId === member.id;
    const isRemoving = removingId === member.id;
    const isConfirmingRemove = confirmRemoveId === member.id;
    const oppositeRole = member.role === 'MANAGER' ? 'CASHIER' : 'MANAGER';
    const oppositeLabel = member.role === 'MANAGER' ? t('common.cashier') : t('common.manager');

    if (isOwnerRow) return <span className="text-muted">—</span>;

    if (isConfirmingRemove) {
      return (
        <div className="team-actions-confirm">
          <span className="team-confirm-label">{t('common.confirmRemoveMember')}</span>
          <div className="team-actions-row">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => handleRemoveMember(member.id)}
              disabled={isRemoving}
            >
              {isRemoving ? '…' : t('common.confirm')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmRemoveId(null)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="team-actions-row">
        <button
          type="button"
          className="team-action-btn team-action-role"
          onClick={() => { clearTeamMessages(); handleChangeRole(member.id, oppositeRole); }}
          disabled={isChanging}
          title={`${t('common.changeRole')}: ${oppositeLabel}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
          <span className="action-label">{isChanging ? '…' : oppositeLabel}</span>
        </button>
        <Link to={`/team/${member.id}`} className="team-action-btn team-action-view" title={t('common.viewActivity')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="action-label">{t('common.viewActivity')}</span>
        </Link>
        <button
          type="button"
          className="team-action-btn team-action-remove"
          onClick={() => { clearTeamMessages(); setConfirmRemoveId(member.id); }}
          title={t('common.remove')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          <span className="action-label">{t('common.remove')}</span>
        </button>
      </div>
    );
  }

  function renderMemberRow(member) {
    const isOwnerRow = member.role === 'OWNER';
    const name = displayName(member);
    return (
      <tr key={member.id}>
        <td>
          {name}
          {isOwnerRow && (
            <span className="text-muted text-sm" style={{ marginLeft: 'var(--space-2)' }}>{t('common.you')}</span>
          )}
          <div className="text-muted text-sm">{member.email}</div>
        </td>
        <td><RoleBadge role={member.role} /></td>
        <td>{isOwnerRow ? '—' : <StatusBadge status={member.status} />}</td>
        <td>{renderActions(member)}</td>
      </tr>
    );
  }

  function renderMemberCard(member) {
    const isOwnerRow = member.role === 'OWNER';
    const name = displayName(member);
    const initial = name.charAt(0).toUpperCase();
    return (
      <div className="team-member-card" key={member.id}>
        <div className="team-member-card-top">
          <div className="team-member-avatar">{initial}</div>
          <div className="team-member-info">
            <div className="team-member-name">
              {name}
              {isOwnerRow && (
                <span className="text-muted text-sm" style={{ marginLeft: 'var(--space-1)' }}>{t('common.you')}</span>
              )}
            </div>
            <div className="team-member-email text-muted text-sm">{member.email}</div>
            <div className="team-member-meta">
              <RoleBadge role={member.role} />
              {!isOwnerRow && <StatusBadge status={member.status} />}
            </div>
          </div>
        </div>
        {!isOwnerRow && (
          <div className="team-member-card-actions">
            {renderActions(member)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '44rem', margin: '0 auto' }}>
      {/* Invite form */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2>{t('auth.inviteWorkerTitle')}</h2>
          <p>{t('auth.inviteWorkerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'invite-error' : undefined}>
          <div className="form-row" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="invite-first-name">{t('auth.firstName')}</label>
              <input
                id="invite-first-name"
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); resetMessages(); }}
                required
                disabled={loading}
                placeholder={t('auth.firstNamePlaceholder')}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="invite-last-name">{t('auth.lastName')}</label>
              <input
                id="invite-last-name"
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); resetMessages(); }}
                required
                disabled={loading}
                placeholder={t('auth.lastNamePlaceholder')}
              />
            </div>
          </div>

          <div className="invite-row">
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="invite-email" className="visually-hidden">{t('auth.email')}</label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); resetMessages(); }}
                required
                disabled={loading}
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div className="form-group" style={{ width: '8rem', marginBottom: 0, flexShrink: 0 }}>
              <label htmlFor="invite-role" className="visually-hidden">{t('common.role')}</label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="MANAGER">{t('common.manager')}</option>
                <option value="CASHIER">{t('common.cashier')}</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: 'auto', flexShrink: 0 }} disabled={loading}>
              {loading ? t('common.loading') : t('common.sendInvite')}
            </button>
          </div>

          <p className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
            {role === 'MANAGER'
              ? t('auth.managerDescription')
              : t('auth.cashierDescription')}
          </p>

          {error && <p id="invite-error" className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
        </form>

        {inviteLink && (
          <div className="invite-link-box">
            <p className="form-hint" style={{ marginBottom: 'var(--space-2)' }}>
              {t('auth.shareInviteLink')}
            </p>
            <div className="invite-link-row">
              <code className="invite-link-url">{inviteLink}</code>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Team list */}
      <div className="card">
        <div className="card-header">
          <h2>{t('common.teamMembers')}</h2>
          <p>{team.length} {team.length === 1 ? t('common.member') : t('common.members')}</p>
        </div>

        {teamActionSuccess && <p className="form-success" role="status">{teamActionSuccess}</p>}
        {teamActionError && <p className="form-error" role="alert">{teamActionError}</p>}

        {teamLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <Spinner size={24} />
          </div>
        ) : team.length === 0 ? (
          <p className="text-muted text-sm">{t('common.noTeamMembersYet')}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-scroll team-table-desktop">
              <table className="team-table" role="table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('common.role')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => renderMemberRow(member))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="team-member-cards">
              {team.map((member) => renderMemberCard(member))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
