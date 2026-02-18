import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const DEFAULT_UNIT_SYMBOL = 'pc';

function loadUnits(setUnits, setError, setLoading) {
  setLoading(true);
  setError(null);
  api.inventory.getUnits()
    .then((data) => setUnits(Array.isArray(data) ? data : []))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function InventoryUnitsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const canCreateUnit = role === 'OWNER' || role === 'MANAGER';
  const hasCreatedDefault = useRef(false);

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formName, setFormName] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUnits(setUnits, setError, setLoading);
  }, []);

  useEffect(() => {
    if (!canCreateUnit || hasCreatedDefault.current || loading || error || units.length > 0) return;
    hasCreatedDefault.current = true;
    const name = t('inventory.primaryUnitName');
    const symbol = t('inventory.primaryUnitSymbol');
    api.inventory.createUnit({ name, symbol: symbol || DEFAULT_UNIT_SYMBOL })
      .then(() => loadUnits(setUnits, setError, setLoading))
      .catch(() => {});
  }, [canCreateUnit, loading, error, units.length]);

  async function handleAddUnit(e) {
    e.preventDefault();
    setSubmitError('');
    const name = formName.trim();
    if (!name) {
      setSubmitError('Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.inventory.createUnit({ name, symbol: formSymbol.trim() || undefined });
      setFormName('');
      setFormSymbol('');
      loadUnits(setUnits, setError, setLoading);
    } catch (err) {
      setSubmitError(err.message || t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.units')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.units')}</h1>
      <p className="page-subtitle">{t('inventory.unitsIntro')}</p>

      <div className="card animate-card-in" aria-labelledby="add-unit-heading">
        <div className="card-header">
          <h2 id="add-unit-heading">{t('inventory.addUnit')}</h2>
        </div>
        <form onSubmit={handleAddUnit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="unit-name">{t('common.name')}</label>
              <input
                id="unit-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                autoComplete="off"
                placeholder="e.g. Kilogram, Litre"
              />
            </div>
            <div className="form-group">
              <label htmlFor="unit-symbol">{t('inventory.symbol')}</label>
              <input
                id="unit-symbol"
                type="text"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                autoComplete="off"
                placeholder="e.g. kg, L"
              />
            </div>
          </div>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && units.length === 0 && <p className="inventory-no-alerts">{t('common.noDataYet')}</p>}
      {!loading && !error && units.length > 0 && (
        <div className="card animate-card-in-delay">
          <div className="card-header">
            <h2>{t('inventory.units')}</h2>
            <span className="card-header-count">{units.length} {t('common.total')}</span>
          </div>
          <div className="table-scroll">
          <table className="data-table" role="grid">
            <thead>
              <tr>
                <th scope="col">{t('common.name')}</th>
                <th scope="col">{t('inventory.symbol')}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.symbol || '—'}</td>
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
