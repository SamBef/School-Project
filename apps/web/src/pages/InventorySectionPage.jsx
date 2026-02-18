import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { t } from '../i18n';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

const SECTION_CONFIG = {
  products: { labelKey: 'inventory.products', getData: () => api.inventory.getProducts({ limit: 100 }).then((r) => r.products || []) },
  stock: { labelKey: 'inventory.stockLevels', getData: () => api.inventory.getStockLevels().then((r) => r.stockLevels || []) },
  locations: { labelKey: 'inventory.locations', getData: () => api.inventory.getLocations().then((r) => r.locations || []) },
  units: { labelKey: 'inventory.units', getData: () => api.inventory.getUnits().then((r) => r || []) },
  suppliers: { labelKey: 'inventory.suppliers', getData: () => api.inventory.getSuppliers().then((r) => r || []) },
  receive: { labelKey: 'inventory.receiveStock', getData: () => api.get('/inventory/receive?limit=50').then((r) => r.receiveHistory || []) },
  returns: { labelKey: 'inventory.returns', getData: () => api.inventory.getReturns({ limit: 50 }).then((r) => r.returns || []) },
  reports: { labelKey: 'inventory.reports', getData: () => api.inventory.getMovementReport({ limit: 50 }).then((r) => r.movements || []) },
};

export default function InventorySectionPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const config = section ? SECTION_CONFIG[section] : null;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!config) {
      navigate('/inventory', { replace: true });
      return;
    }
    setLoading(true);
    setError(null);
    config.getData()
      .then((list) => setData(Array.isArray(list) ? list : []))
      .catch((err) => {
        setError(err.message);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [section, config, navigate]);

  if (!config) return null;

  return (
    <div className="page-content">
      <p style={{ marginBottom: 'var(--space-3)' }}>
        <Link to="/inventory" className="back-link">← {t('inventory.title')}</Link>
      </p>
      <h1 className="page-title">{t(config.labelKey)}</h1>
      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && data.length === 0 && (
        <p style={{ color: 'var(--color-neutral-500)' }}>{t('common.noDataYet')}</p>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="table-scroll">
          <table className="data-table" role="grid">
            <tbody>
              {section === 'products' && data.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku ?? '—'}</td>
                  <td>{p.primaryUnit?.name ?? '—'}</td>
                  <td>{p.minStock != null ? p.minStock : '—'}</td>
                </tr>
              ))}
              {section === 'stock' && data.map((s) => (
                <tr key={`${s.productId}-${s.locationId}`}>
                  <td>{s.product?.name ?? s.productId}</td>
                  <td>{s.location?.name ?? s.locationId}</td>
                  <td>{s.available ?? (Number(s.quantity) - Number(s.reservedQuantity))}</td>
                  <td>{s.quantity}</td>
                </tr>
              ))}
              {section === 'locations' && data.map((loc) => (
                <tr key={loc.id}><td>{loc.name}</td><td>{loc.address ?? '—'}</td></tr>
              ))}
              {section === 'units' && data.map((u) => (
                <tr key={u.id}><td>{u.name}</td><td>{u.symbol ?? '—'}</td></tr>
              ))}
              {section === 'suppliers' && data.map((s) => (
                <tr key={s.id}><td>{s.name}</td><td>{s.contactPhone ?? '—'}</td><td>{s.contactEmail ?? '—'}</td></tr>
              ))}
              {section === 'receive' && data.map((r) => (
                <tr key={r.id}><td>{r.location?.name}</td><td>{r.supplier?.name}</td><td>{r.lines?.length ?? 0} lines</td></tr>
              ))}
              {section === 'returns' && data.map((r) => (
                <tr key={r.id}><td>{r.id.slice(0, 8)}…</td><td>{r.lines?.length ?? 0} lines</td></tr>
              ))}
              {section === 'reports' && data.map((m) => (
                <tr key={m.id}><td>{m.product?.name}</td><td>{m.location?.name}</td><td>{m.quantityDelta}</td><td>{m.type}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
