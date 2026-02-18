import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';

function loadSuppliers(setSuppliers, setError, setLoading) {
  setLoading(true);
  setError(null);
  api.inventory.getSuppliers()
    .then((data) => setSuppliers(Array.isArray(data) ? data : []))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function InventorySuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers(setSuppliers, setError, setLoading);
  }, []);

  async function handleAddSupplier(e) {
    e.preventDefault();
    setSubmitError('');
    const name = formName.trim();
    if (!name) {
      setSubmitError('Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.inventory.createSupplier({
        name,
        contactPhone: formPhone.trim() || undefined,
        contactEmail: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
      });
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      loadSuppliers(setSuppliers, setError, setLoading);
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
        <span>{t('inventory.suppliers')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.suppliers')}</h1>

      <div className="card animate-card-in" aria-labelledby="add-supplier-heading">
        <div className="card-header">
          <h2 id="add-supplier-heading">{t('inventory.addSupplier')}</h2>
        </div>
        <form onSubmit={handleAddSupplier} noValidate>
          <div className="form-group">
            <label htmlFor="supplier-name">{t('common.name')}</label>
            <input
              id="supplier-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoComplete="off"
              placeholder="Supplier or company name"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="supplier-phone">{t('common.phone')}</label>
              <input
                id="supplier-phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                autoComplete="off"
                placeholder="Optional"
              />
            </div>
            <div className="form-group">
              <label htmlFor="supplier-email">{t('common.email')}</label>
              <input
                id="supplier-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                autoComplete="off"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="supplier-address">{t('inventory.address')}</label>
            <input
              id="supplier-address"
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              autoComplete="off"
              placeholder="Optional"
            />
          </div>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && suppliers.length === 0 && <p className="inventory-no-alerts">{t('common.noDataYet')}</p>}
      {!loading && !error && suppliers.length > 0 && (
        <div className="card animate-card-in-delay">
          <div className="card-header">
            <h2>{t('inventory.suppliers')}</h2>
            <span className="card-header-count">{suppliers.length} {t('common.total')}</span>
          </div>
          <div className="table-scroll">
          <table className="data-table" role="grid">
            <thead>
              <tr>
                <th scope="col">{t('common.name')}</th>
                <th scope="col">{t('common.phone')}</th>
                <th scope="col">{t('common.email')}</th>
                <th scope="col">{t('inventory.address')}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.contactPhone || '—'}</td>
                  <td>{s.contactEmail || '—'}</td>
                  <td>{s.address || '—'}</td>
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
