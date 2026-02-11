/**
 * Dashboard — overview with real stat cards, quick actions, and business info.
 * Fetches live dashboard data from the API (today + all-time aggregates).
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

export default function DashboardPage() {
  const { user, business } = useAuth();
  const role = user?.role ?? '';
  const canInvite = role === 'OWNER';
  const canExpenses = role === 'OWNER' || role === 'MANAGER';
  const canExport = role === 'OWNER' || role === 'MANAGER';

  const [teamCount, setTeamCount] = useState({ total: 0, active: 0, pending: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/users/count').catch(() => ({ total: 0, active: 0, pending: 0 })),
      api.get('/dashboard').catch(() => null),
    ]).then(([team, dash]) => {
      setTeamCount(team);
      setStats(dash);
      if (!dash) setLoadError(t('common.loadFailed'));
      setLoading(false);
    });
  }, []);

  const currency = stats?.currency ?? business?.baseCurrencyCode ?? 'USD';

  function formatAmount(value) {
    if (value == null) return '—';
    return `${currency} ${Number(value).toFixed(2)}`;
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>{t('common.welcome')}, {user?.firstName ?? user?.email?.split('@')[0]}</h1>
        <p>{business?.name ? `${business.name} — ${business.primaryLocation}` : t('auth.dashboard')}</p>
      </div>

      {loading ? (
        <div className="loading-page"><Spinner size={32} /></div>
      ) : (
        <>
          {loadError && <p className="form-error" role="alert">{loadError}</p>}

          {/* Today's stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <p className="stat-card-label">{t('dashboard.todayTransactions')}</p>
              <p className="stat-card-value">{stats?.today?.transactionCount ?? 0}</p>
              <p className="stat-card-note">{t('dashboard.todayLabel')}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">{t('dashboard.todayRevenue')}</p>
              <p className="stat-card-value">{formatAmount(stats?.today?.revenue)}</p>
              <p className="stat-card-note">{t('dashboard.todayLabel')}</p>
            </div>
            {canExpenses && (
              <div className="stat-card">
                <p className="stat-card-label">{t('dashboard.todayExpenses')}</p>
                <p className="stat-card-value">{formatAmount(stats?.today?.expenses)}</p>
                <p className="stat-card-note">{t('dashboard.todayLabel')}</p>
              </div>
            )}
            {canExpenses && (
              <div className="stat-card">
                <p className="stat-card-label">{t('dashboard.todayNet')}</p>
                <p className="stat-card-value">{formatAmount(stats?.today?.netProfit)}</p>
                <p className="stat-card-note">{t('dashboard.todayLabel')}</p>
              </div>
            )}
          </div>

          {/* All-time stats */}
          <div className="stats-grid" style={{ marginTop: 'var(--space-4)' }}>
            <div className="stat-card">
              <p className="stat-card-label">{t('dashboard.allTimeTransactions')}</p>
              <p className="stat-card-value">{stats?.allTime?.transactionCount ?? 0}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">{t('dashboard.totalRevenue')}</p>
              <p className="stat-card-value">{formatAmount(stats?.allTime?.revenue)}</p>
            </div>
            {canExpenses && (
              <div className="stat-card">
                <p className="stat-card-label">{t('dashboard.totalExpenses')}</p>
                <p className="stat-card-value">{formatAmount(stats?.allTime?.expenses)}</p>
              </div>
            )}
            <div className="stat-card">
              <p className="stat-card-label">{t('dashboard.teamMembers')}</p>
              <p className="stat-card-value">{teamCount.total}</p>
              <p className="stat-card-note">
                {teamCount.active} {t('common.active').toLowerCase()}{teamCount.pending > 0 ? `, ${teamCount.pending} ${t('common.pending').toLowerCase()}` : ''}
              </p>
            </div>
          </div>

          {/* Two-column grid: quick actions + business info */}
          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h2>{t('common.quickActions')}</h2>
              </div>
              <div className="quick-actions">
                <Link to="/transactions" className="quick-action-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  {t('dashboard.newTransaction')}
                </Link>
                <Link to="/transactions" className="quick-action-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                  {t('dashboard.viewTransactions')}
                </Link>
                {canExpenses && (
                  <Link to="/expenses" className="quick-action-link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                    {t('dashboard.viewExpenses')}
                  </Link>
                )}
                {canExport && (
                  <Link to="/export" className="quick-action-link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    {t('dashboard.exportData')}
                  </Link>
                )}
                {canInvite && (
                  <Link to="/invite" className="quick-action-link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                    {t('common.inviteWorker')}
                  </Link>
                )}
              </div>
            </div>

            {business && (
              <div className="card">
                <div className="card-header">
                  <h2>{t('common.businessInfo')}</h2>
                </div>
                <ul className="business-info-list">
                  <li>
                    <span className="info-label">{t('common.name')}</span>
                    <span className="info-value">{business.name}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.email')}</span>
                    <span className="info-value">{business.email}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.phone')}</span>
                    <span className="info-value">{business.phone}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.location')}</span>
                    <span className="info-value">{business.primaryLocation}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.currency')}</span>
                    <span className="info-value">{currency}</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
