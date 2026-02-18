/**
 * Inventory overview — real-time stat cards, low-stock alerts, and links to Products, Stock, Locations, etc.
 * All authenticated roles can view; Manager/Owner have full access to manage.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';
import KoboAIUsageTip from '../components/KoboAIUsageTip';

const productStockSections = [
  { to: '/inventory/products', labelKey: 'inventory.products' },
  { to: '/inventory/stock', labelKey: 'inventory.stockLevels' },
];
const setupSections = [
  { to: '/inventory/locations', labelKey: 'inventory.locations' },
  { to: '/inventory/units', labelKey: 'inventory.units' },
  { to: '/inventory/suppliers', labelKey: 'inventory.suppliers' },
];
const activitySections = [
  { to: '/inventory/receive', labelKey: 'inventory.receiveStock' },
  { to: '/inventory/returns', labelKey: 'inventory.returns' },
  { to: '/inventory/adjustments', labelKey: 'inventory.adjustments' },
  { to: '/inventory/reports', labelKey: 'inventory.reports' },
];

export default function InventoryPage() {
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    productsCount: 0,
    locationsCount: 0,
    lowStockCount: 0,
    stockEntriesCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAlertsError(null);
    api.inventory
      .getLowStockAlerts()
      .then((data) => {
        if (!cancelled) setAlerts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setAlertsError(err.message);
          setAlerts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    Promise.all([
      api.inventory.getProducts({ limit: 1 }).then((r) => r.total ?? 0).catch(() => 0),
      api.inventory.getLocations().then((list) => (Array.isArray(list) ? list.length : 0)).catch(() => 0),
      api.inventory.getLowStockAlerts().then((data) => (Array.isArray(data) ? data.length : 0)).catch(() => 0),
      api.inventory.getStockLevels().then((r) => (r.stockLevels && Array.isArray(r.stockLevels) ? r.stockLevels.length : 0)).catch(() => 0),
    ]).then(([productsCount, locationsCount, lowStockCount, stockEntriesCount]) => {
      if (!cancelled) {
        setStats({ productsCount, locationsCount, lowStockCount, stockEntriesCount });
      }
    }).catch(() => {
      if (!cancelled) setStats({ productsCount: 0, locationsCount: 0, lowStockCount: 0, stockEntriesCount: 0 });
    }).finally(() => {
      if (!cancelled) setStatsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-content">
      <h1 className="page-title">{t('inventory.overview')}</h1>
      <p className="page-subtitle">{t('inventory.overviewIntro')}</p>
      <KoboAIUsageTip page="inventory" />

      <section className="dashboard-section" aria-labelledby="inventory-stats-heading">
        <h2 id="inventory-stats-heading" className="dashboard-section-heading">{t('inventory.statsOverview')}</h2>
        {statsLoading ? (
          <div className="inventory-stats-loading">
            <Spinner size={24} />
          </div>
        ) : (
          <div className="stats-grid">
            <Link to="/inventory/products" className="stat-card stat-card-link-card">
              <p className="stat-card-label">{t('inventory.statsProducts')}</p>
              <p className="stat-card-value">{stats.productsCount}</p>
            </Link>
            <Link to="/inventory/locations" className="stat-card stat-card-link-card">
              <p className="stat-card-label">{t('inventory.statsLocations')}</p>
              <p className="stat-card-value">{stats.locationsCount}</p>
            </Link>
            <div className="stat-card">
              <p className="stat-card-label">{t('inventory.statsLowStock')}</p>
              <p className="stat-card-value">{stats.lowStockCount}</p>
              <p className="stat-card-note">
                {stats.lowStockCount > 0 ? t('inventory.statsNeedAttention') : t('inventory.noAlerts')}
              </p>
            </div>
            <Link to="/inventory/stock" className="stat-card stat-card-link-card">
              <p className="stat-card-label">{t('inventory.statsStockEntries')}</p>
              <p className="stat-card-value">{stats.stockEntriesCount}</p>
              <p className="stat-card-note">{t('inventory.stockLevels')}</p>
            </Link>
          </div>
        )}
      </section>

      <section className="dashboard-section" aria-labelledby="alerts-heading">
        <div className="card">
          <div className="card-header">
            <h2 id="alerts-heading">{t('inventory.lowStockAlerts')}</h2>
          </div>
          {loading && <p>{t('common.loading')}</p>}
          {alertsError && (
            <p className="form-error" role="alert">
              {alertsError}
            </p>
          )}
          {!loading && !alertsError && alerts.length === 0 && (
            <p className="inventory-no-alerts">{t('inventory.noAlerts')}</p>
          )}
          {!loading && !alertsError && alerts.length > 0 && (
            <div className="table-scroll">
              <table className="data-table" role="grid">
                <thead>
                  <tr>
                    <th scope="col">{t('inventory.products')}</th>
                    <th scope="col">{t('inventory.sku')}</th>
                    <th scope="col">{t('inventory.locations')}</th>
                    <th scope="col">{t('inventory.available')}</th>
                    <th scope="col">{t('inventory.threshold')}</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={`${a.productId}-${a.locationId}`}>
                      <td>{a.productName}</td>
                      <td>{a.sku ?? '—'}</td>
                      <td>{a.locationName}</td>
                      <td>{a.available}</td>
                      <td>{a.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="sections-heading">
        <div className="card">
          <div className="card-header">
            <h2 id="sections-heading">{t('inventory.manageInventory')}</h2>
          </div>
          <div className="inventory-section-groups">
            <div className="inventory-section-group">
              <h3 className="inventory-section-group-title">{t('inventory.groupProductsStock')}</h3>
              <ul className="inventory-section-list">
                {productStockSections.map((s) => (
                  <li key={s.to}>
                    <Link to={s.to} className="inventory-section-link">
                      {t(s.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="inventory-section-group">
              <h3 className="inventory-section-group-title">{t('inventory.groupSetup')}</h3>
              <ul className="inventory-section-list">
                {setupSections.map((s) => (
                  <li key={s.to}>
                    <Link to={s.to} className="inventory-section-link">
                      {t(s.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="inventory-section-group">
              <h3 className="inventory-section-group-title">{t('inventory.groupActivity')}</h3>
              <ul className="inventory-section-list">
                {activitySections.map((s) => (
                  <li key={s.to}>
                    <Link to={s.to} className="inventory-section-link">
                      {t(s.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
