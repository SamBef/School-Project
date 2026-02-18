import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import CustomSelect from '../../components/CustomSelect';

export default function InventoryReportsPage() {
  const [data, setData] = useState({ movements: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProductId, setFilterProductId] = useState('');
  const [filterLocationId, setFilterLocationId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    api.inventory.getProducts({ limit: 200 }).then((r) => setProducts(r.products || [])).catch(() => setProducts([]));
    api.inventory.getLocations().then((list) => setLocations(Array.isArray(list) ? list : [])).catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { limit: 100 };
    if (filterProductId) params.productId = filterProductId;
    if (filterLocationId) params.locationId = filterLocationId;
    if (filterType) params.type = filterType;
    api.inventory
      .getMovementReport(params)
      .then((res) => { if (!cancelled) setData({ movements: res.movements ?? [], total: res.total ?? 0 }); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filterProductId, filterLocationId, filterType]);

  const list = data.movements;

  function movementTypeLabel(type) {
    if (!type) return '—';
    const key = `inventory.movementType${type}`;
    const label = t(key);
    return label === key ? type : label;
  }

  const movementTypeFilterOptions = [
    { value: 'RECEIVE', labelKey: 'inventory.movementTypeRECEIVE' },
    { value: 'INITIAL_STOCK', labelKey: 'inventory.movementTypeINITIAL_STOCK' },
    { value: 'ADJUSTMENT', labelKey: 'inventory.movementTypeADJUSTMENT' },
    { value: 'RETURN_RESTOCK', labelKey: 'inventory.movementTypeRETURN_RESTOCK' },
    { value: 'RETURN_DISCARD', labelKey: 'inventory.movementTypeRETURN_DISCARD' },
    { value: 'SALE', labelKey: 'inventory.movementTypeSALE' },
    { value: 'RESERVATION_RELEASED', labelKey: 'inventory.movementTypeRESERVATION_RELEASED' },
  ];

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.reports')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.reports')}</h1>

      <div className="card animate-card-in" aria-label={t('common.filters')}>
        <div className="card-header">
          <h2>{t('common.filters')}</h2>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="report-product">{t('inventory.products')}</label>
            <CustomSelect
              id="report-product"
              value={filterProductId}
              onChange={setFilterProductId}
              placeholder={t('common.all')}
              options={[
                { value: '', label: t('common.all') },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-location">{t('inventory.locations')}</label>
            <CustomSelect
              id="report-location"
              value={filterLocationId}
              onChange={setFilterLocationId}
              placeholder={t('common.all')}
              options={[
                { value: '', label: t('common.all') },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-type">{t('inventory.reportType')}</label>
            <CustomSelect
              id="report-type"
              value={filterType}
              onChange={setFilterType}
              placeholder={t('common.all')}
              options={[
                { value: '', label: t('common.all') },
                ...movementTypeFilterOptions.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
              ]}
            />
          </div>
        </div>
      </div>

      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && (
        list.length === 0 ? (
          <p className="inventory-no-alerts">{t('common.noDataYet')}</p>
        ) : (
          <div className="card animate-card-in-delay">
            <div className="card-header">
              <h2>{t('inventory.reports')}</h2>
              <span className="card-header-count">{data.total} {t('common.total')}</span>
            </div>
            <div className="table-scroll">
            <table className="data-table" role="grid">
              <thead>
                <tr>
                  <th scope="col">{t('inventory.reportDate')}</th>
                  <th scope="col">{t('inventory.products')}</th>
                  <th scope="col">{t('inventory.locations')}</th>
                  <th scope="col">{t('inventory.reportType')}</th>
                  <th scope="col">{t('inventory.reportChange')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</td>
                    <td>{m.product?.name ?? m.productId}</td>
                    <td>{m.location?.name ?? m.locationId}</td>
                    <td>{movementTypeLabel(m.type)}</td>
                    <td>{m.quantityDelta != null ? m.quantityDelta : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
