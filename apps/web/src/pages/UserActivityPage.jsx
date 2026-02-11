/**
 * User Activity page — Owner views a team member's profile and activity.
 * Shows summary stats, recent transactions, and recent expenses.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

function getRoleLabel(role) {
  if (role === 'OWNER') return t('common.owner');
  if (role === 'MANAGER') return t('common.manager');
  return t('common.cashier');
}

function getRoleBadgeClass(role) {
  if (role === 'OWNER') return 'role-badge role-badge-owner';
  if (role === 'MANAGER') return 'role-badge role-badge-manager';
  return 'role-badge role-badge-cashier';
}

function displayName(user) {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
  if (user?.firstName) return user.firstName;
  return user?.email ?? '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const CATEGORY_KEYS = {
  RENT: 'categoryRent',
  STOCK_INVENTORY: 'categoryStockInventory',
  UTILITIES: 'categoryUtilities',
  TRANSPORT: 'categoryTransport',
  MISCELLANEOUS: 'categoryMiscellaneous',
};

function formatCategory(cat) {
  const key = CATEGORY_KEYS[cat];
  return key ? t(`expenses.${key}`) : cat;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserActivityPage() {
  const { id } = useParams();
  const { business } = useAuth();
  const currency = business?.baseCurrencyCode ?? 'USD';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchActivity() {
      try {
        const result = await api.get(`/users/${id}/activity`);
        setData(result);
      } catch (err) {
        setError(err.message || t('common.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-page">
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        <Link to="/invite" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
          &larr; {t('common.back')}
        </Link>
        <div className="card">
          <p className="form-error" role="alert">{error}</p>
        </div>
      </div>
    );
  }

  const member = data.user;
  const summary = data.summary;
  const transactions = data.transactions ?? [];
  const expenses = data.expenses ?? [];
  const name = displayName(member);
  const initial = name.charAt(0).toUpperCase();

  function formatAmount(value) {
    if (value == null) return '—';
    return `${currency} ${Number(value).toFixed(2)}`;
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
      <Link to="/invite" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        {t('common.back')}
      </Link>

      {/* User profile header */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="profile-header">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt="" className="profile-avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="profile-avatar" aria-hidden="true">{initial}</div>
          )}
          <div className="profile-identity">
            <h1 className="profile-name">{name}</h1>
            <p className="profile-email">{member.email}</p>
            <span className={getRoleBadgeClass(member.role)}>{getRoleLabel(member.role)}</span>
          </div>
        </div>
        <ul className="business-info-list" style={{ marginTop: 'var(--space-4)' }}>
          <li>
            <span className="info-label">{t('common.status')}</span>
            <span className="info-value">
              {member.status === 'active' ? t('common.active') : t('common.pending')}
            </span>
          </li>
          {member.acceptedAt && (
            <li>
              <span className="info-label">{t('common.joinedOn')}</span>
              <span className="info-value">{formatDate(member.acceptedAt)}</span>
            </li>
          )}
          {member.invitedAt && (
            <li>
              <span className="info-label">{t('common.invitedOn')}</span>
              <span className="info-value">{formatDate(member.invitedAt)}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <p className="stat-card-label">{t('common.transactions')}</p>
          <p className="stat-card-value">{summary.transactionCount}</p>
          <p className="stat-card-note">{t('common.totalRecorded')}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">{t('dashboard.totalRevenue')}</p>
          <p className="stat-card-value">{formatAmount(summary.transactionTotal)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">{t('common.expenses')}</p>
          <p className="stat-card-value">{summary.expenseCount}</p>
          <p className="stat-card-note">{t('common.totalRecorded')}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">{t('dashboard.totalExpenses')}</p>
          <p className="stat-card-value">{formatAmount(summary.expenseTotal)}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2>{t('common.recentTransactions')}</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="text-muted text-sm">{t('common.noActivity')}</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table" role="table">
              <thead>
                <tr>
                  <th>{t('transactions.receipt')}</th>
                  <th>{t('transactions.date')}</th>
                  <th>{t('transactions.total')}</th>
                  <th>{t('transactions.paymentMethod')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <Link to={`/transactions/${tx.id}`}>
                        #{tx.receiptNumber ?? '—'}
                      </Link>
                    </td>
                    <td>{formatDateTime(tx.createdAt)}</td>
                    <td>{formatAmount(tx.total)}</td>
                    <td>{t(`paymentMethods.${tx.paymentMethod}`) || tx.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="card-header">
          <h2>{t('common.recentExpenses')}</h2>
        </div>
        {expenses.length === 0 ? (
          <p className="text-muted text-sm">{t('common.noActivity')}</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table" role="table">
              <thead>
                <tr>
                  <th>{t('expenses.description')}</th>
                  <th>{t('expenses.date')}</th>
                  <th>{t('expenses.amount')}</th>
                  <th>{t('expenses.category')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.description}</td>
                    <td>{formatDate(exp.date)}</td>
                    <td>{formatAmount(exp.amount)}</td>
                    <td>{formatCategory(exp.category)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
