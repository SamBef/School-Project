import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';

export default function InventoryStockPage() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.inventory.getStockLevels()
      .then((res) => { if (!cancelled) setLevels(res.stockLevels || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.stockLevels')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.stockLevels')}</h1>
      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && levels.length === 0 && <p className="inventory-no-alerts">{t('common.noDataYet')}</p>}
      {!loading && !error && levels.length > 0 && (
        <div className="card animate-card-in">
          <div className="card-header">
            <h2>{t('inventory.stockLevels')}</h2>
            <span className="card-header-count">{levels.length} {t('common.total')}</span>
          </div>
          <div className="table-scroll">
          <table className="data-table" role="grid">
            <thead>
              <tr>
                <th scope="col">{t('inventory.products')}</th>
                <th scope="col">{t('inventory.locations')}</th>
                <th scope="col">{t('inventory.available')}</th>
                <th scope="col">{t('inventory.reserved')}</th>
                <th scope="col">{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.productId + '-' + l.locationId}>
                  <td>{l.product ? l.product.name : l.productId}</td>
                  <td>{l.location ? l.location.name : l.locationId}</td>
                  <td>{l.available != null ? l.available : Number(l.quantity) - Number(l.reservedQuantity)}</td>
                  <td>{l.reservedQuantity != null ? l.reservedQuantity : 0}</td>
                  <td>{l.quantity != null ? l.quantity : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
