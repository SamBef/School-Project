import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';

function loadLocations(setLocations, setError, setLoading) {
  setLoading(true);
  setError(null);
  api.inventory.getLocations()
    .then((data) => setLocations(Array.isArray(data) ? data : []))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function InventoryLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDefault, setFormDefault] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLocations(setLocations, setError, setLoading);
  }, []);

  async function handleAddLocation(e) {
    e.preventDefault();
    setSubmitError('');
    const name = formName.trim();
    if (!name) {
      setSubmitError('Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.inventory.createLocation({
        name,
        address: formAddress.trim() || undefined,
        isDefault: formDefault,
      });
      setFormName('');
      setFormAddress('');
      setFormDefault(false);
      loadLocations(setLocations, setError, setLoading);
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
        <span>{t('inventory.locations')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.locations')}</h1>

      <div className="card animate-card-in" aria-labelledby="add-location-heading">
        <div className="card-header">
          <h2 id="add-location-heading">{t('inventory.addLocation')}</h2>
        </div>
        <form onSubmit={handleAddLocation} noValidate>
          <div className="form-group">
            <label htmlFor="location-name">{t('common.name')}</label>
            <input
              id="location-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoComplete="off"
              placeholder="e.g. Main store"
            />
          </div>
          <div className="form-group">
            <label htmlFor="location-address">{t('inventory.address')}</label>
            <input
              id="location-address"
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              autoComplete="off"
              placeholder="Street, city"
            />
          </div>
          <div className="form-group form-group-checkbox">
            <input
              id="location-default"
              type="checkbox"
              checked={formDefault}
              onChange={(e) => setFormDefault(e.target.checked)}
              aria-describedby="location-default-desc"
            />
            <label htmlFor="location-default" id="location-default-desc">{t('inventory.defaultLocation')}</label>
          </div>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && (
        locations.length === 0 ? (
          <p className="inventory-no-alerts">{t('common.noDataYet')}</p>
        ) : (
          <div className="card animate-card-in-delay">
            <div className="card-header">
              <h2>{t('inventory.locations')}</h2>
              <span className="card-header-count">{locations.length} {t('common.total')}</span>
            </div>
            <div className="table-scroll">
            <table className="data-table" role="grid">
              <thead>
                <tr>
                  <th scope="col">{t('common.name')}</th>
                  <th scope="col">{t('inventory.address')}</th>
                  <th scope="col">{t('inventory.defaultLocation')}</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>{loc.name}</td>
                    <td>{loc.address ?? '—'}</td>
                    <td>{loc.isDefault ? t('common.active') : '—'}</td>
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
