/**
 * Dashboard — overview with today/all-time stats, recent activity, shortcuts, and business info.
 * Clear section headings and grouped quick actions for clarity.
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
  const [inventoryOverview, setInventoryOverview] = useState({ lowStockCount: 0, productsCount: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [strategicData, setStrategicData] = useState(null);

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

  useEffect(() => {
    Promise.all([
      api.inventory.getLowStockAlerts().then((alerts) => (Array.isArray(alerts) ? alerts.length : 0)).catch(() => 0),
      api.inventory.getProducts({ limit: 1 }).then((res) => res.total ?? 0).catch(() => 0),
    ]).then(([lowStockCount, productsCount]) => {
      setInventoryOverview({ lowStockCount, productsCount });
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      api.get('/transactions?limit=5')
        .then((res) => setRecentTransactions(res.transactions || []))
        .catch(() => setRecentTransactions([]));
    }
  }, [loading]);

  const currency = stats?.currency ?? business?.baseCurrencyCode ?? 'USD';

  async function handleGenerateStrategicInsights() {
    setInsightsError('');
    setStrategicData(null);
    setInsightsLoading(true);
    try {
      const data = await api.post('/ai/insights/strategic');
      setStrategicData(data);
    } catch (err) {
      const msg = err.message || '';
      setInsightsError(
        msg.includes('not available') ? t('dashboard.insightsUnavailable') : (msg || t('dashboard.insightsError'))
      );
    } finally {
      setInsightsLoading(false);
    }
  }

  function formatAmount(value) {
    if (value == null) return '—';
    return `${currency} ${Number(value).toFixed(2)}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }

  return (
    <div className="page-content dashboard-page">
      <header className="dashboard-header animate-fade-in" role="banner">
        <h1>{t('common.welcome')}, {user?.firstName ?? user?.email?.split('@')[0]}</h1>
        <p className="dashboard-header-subtitle">
          {business?.name ? `${business.name} — ${business.primaryLocation || ''}`.trim() || business.name : t('auth.dashboard')}
        </p>
        <p className="dashboard-currency-note" aria-live="polite">
          {t('dashboard.amountsIn').replace('{currency}', currency)}
        </p>
      </header>

      {loading ? (
        <div className="loading-page" aria-live="polite">
          <Spinner size={32} />
          <p className="loading-page-text">{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {loadError && <p className="form-error" role="alert">{loadError}</p>}

          <section className="dashboard-section" aria-labelledby="section-today-heading">
            <h2 id="section-today-heading" className="dashboard-section-heading">{t('dashboard.sectionToday')}</h2>
            <div className="stats-grid animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
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
          </section>

          <section className="dashboard-section" aria-labelledby="section-alltime-heading">
            <h2 id="section-alltime-heading" className="dashboard-section-heading">{t('dashboard.sectionAllTime')}</h2>
            <div className="stats-grid">
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
              <div className="stat-card">
                <p className="stat-card-label">{t('dashboard.inventoryOverview')}</p>
                <p className="stat-card-value">{inventoryOverview.productsCount}</p>
                <p className="stat-card-note">
                  {inventoryOverview.lowStockCount > 0
                    ? `${inventoryOverview.lowStockCount} ${t('inventory.lowStockAlerts').toLowerCase()}`
                    : t('inventory.noAlerts')}
                </p>
                <Link to="/inventory" className="stat-card-link">{t('dashboard.viewInventory')}</Link>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <div className="card dashboard-card-actions">
              <div className="card-header">
                <h2>{t('common.quickActions')}</h2>
                <p className="card-header-desc">{t('dashboard.quickActionsIntro')}</p>
              </div>
              <div className="quick-actions-grouped">
                <div className="quick-actions-block">
                  <span className="quick-actions-block-label" aria-hidden="true">{t('dashboard.sectionSales')}</span>
                  <div className="quick-actions">
                    <Link to="/transactions" className="quick-action-link">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      {t('dashboard.newTransaction')}
                    </Link>
                    <Link to="/transactions" className="quick-action-link">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                      {t('dashboard.viewTransactions')}
                    </Link>
                  </div>
                </div>
                {(canExpenses || canExport) && (
                  <div className="quick-actions-block">
                    <span className="quick-actions-block-label" aria-hidden="true">{t('dashboard.sectionFinance')}</span>
                    <div className="quick-actions">
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
                    </div>
                  </div>
                )}
                <div className="quick-actions-block">
                  <span className="quick-actions-block-label" aria-hidden="true">{t('dashboard.sectionInventory')}</span>
                  <div className="quick-actions">
                    <Link to="/inventory" className="quick-action-link">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                      {t('dashboard.viewInventory')}
                    </Link>
                  </div>
                </div>
                {canInvite && (
                  <div className="quick-actions-block">
                    <span className="quick-actions-block-label" aria-hidden="true">{t('dashboard.sectionTeam')}</span>
                    <div className="quick-actions">
                      <Link to="/invite" className="quick-action-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                        {t('common.inviteWorker')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {canExpenses && (
              <div className="card dashboard-card-business">
                <div className="card-header">
                  <h2>{t('dashboard.strategicInsights')}</h2>
                </div>
                <p className="card-header-desc">
                  Porter&apos;s Five Forces, SWOT, and market context for your location and products.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateStrategicInsights}
                  disabled={insightsLoading}
                  aria-busy={insightsLoading}
                >
                  {insightsLoading ? (
                    <>
                      <span className="spinner-wrapper" aria-hidden="true">
                        <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      </span>
                      {t('common.loading')}
                    </>
                  ) : (
                    t('dashboard.generateStrategicInsights')
                  )}
                </button>
                {insightsError && (
                  <p className="form-hint form-hint-error" role="alert" style={{ marginTop: 'var(--space-2)' }}>
                    {insightsError}
                  </p>
                )}
                {strategicData?.frameworks?.length > 0 && (
                  <div className="insights-content" style={{ marginTop: 'var(--space-4)', textAlign: 'left' }}>
                    {strategicData.frameworks.map((f, i) => (
                      <div key={i} className="insights-framework">
                        <h3 className="insights-framework-title">{f.name}</h3>
                        <div className="insights-framework-body" style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                          {f.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {business && (
              <div className="card dashboard-card-business">
                <div className="card-header">
                  <h2>{t('dashboard.sectionBusiness')}</h2>
                </div>
                <ul className="business-info-list">
                  <li>
                    <span className="info-label">{t('common.name')}</span>
                    <span className="info-value">{business.name}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.email')}</span>
                    <span className="info-value">{business.email || '—'}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.phone')}</span>
                    <span className="info-value">{business.phone || '—'}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.primaryLocation')}</span>
                    <span className="info-value">{business.primaryLocation || '—'}</span>
                  </li>
                  <li>
                    <span className="info-label">{t('common.currency')}</span>
                    <span className="info-value">{currency}</span>
                  </li>
                </ul>
              </div>
            )}

            <section className="card dashboard-card-recent dashboard-card-recent-full" aria-labelledby="recent-heading">
              <div className="card-header">
                <h2 id="recent-heading">{t('dashboard.recentTransactions')}</h2>
              </div>
              {recentTransactions.length === 0 ? (
                <p className="dashboard-recent-empty">{t('dashboard.noRecentTransactions')}</p>
              ) : (
                <ul className="dashboard-recent-list">
                  {recentTransactions.map((tx) => (
                    <li key={tx.id}>
                      <Link to={`/transactions/${tx.id}`} className="dashboard-recent-link">
                        <span className="dashboard-recent-date">{formatDate(tx.createdAt)}</span>
                        <span className="dashboard-recent-total">{formatAmount(tx.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/transactions" className="dashboard-recent-view-all">{t('dashboard.viewTransactions')}</Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
