/**
 * Stock adjustments — record quantity changes (damage, loss, count correction) and view history.
 * Manager/Owner can create; all authenticated can view.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import CustomSelect from '../../components/CustomSelect';

const REASONS = [
  { value: 'DAMAGE', labelKey: 'inventory.reasonDAMAGE' },
  { value: 'LOSS', labelKey: 'inventory.reasonLOSS' },
  { value: 'COUNT_CORRECTION', labelKey: 'inventory.reasonCOUNT_CORRECTION' },
  { value: 'OTHER', labelKey: 'inventory.reasonOTHER' },
];

function loadAdjustments(setData, setError, setLoading) {
  setLoading(true);
  setError(null);
  api.inventory
    .getAdjustments({ limit: 100 })
    .then((res) => setData({ adjustments: res.adjustments ?? [], total: res.total ?? 0 }))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function InventoryAdjustmentsPage() {
  const [data, setData] = useState({ adjustments: [], total: 0 });
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formLocationId, setFormLocationId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formQuantityDelta, setFormQuantityDelta] = useState('');
  const [formReason, setFormReason] = useState('COUNT_CORRECTION');
  const [formNotes, setFormNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAdjustments(setData, setError, setLoading);
  }, []);

  useEffect(() => {
    api.inventory.getLocations().then((list) => setLocations(Array.isArray(list) ? list : [])).catch(() => setLocations([]));
    api.inventory.getProducts({ limit: 500 }).then((res) => setProducts(res.products || [])).catch(() => setProducts([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    const locationId = formLocationId?.trim();
    const productId = formProductId?.trim();
    if (!locationId || !productId) {
      setSubmitError(t('inventory.selectLocation') + ' / ' + t('inventory.products'));
      return;
    }
    const qty = formQuantityDelta === '' ? null : Number(formQuantityDelta);
    if (qty === null || qty === 0) {
      setSubmitError(t('inventory.quantityDelta') + ' is required and must not be zero.');
      return;
    }
    if (!['DAMAGE', 'LOSS', 'COUNT_CORRECTION', 'OTHER'].includes(formReason)) {
      setSubmitError(t('inventory.reason') + ' is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.inventory.createAdjustment({
        locationId,
        productId,
        quantityDelta: qty,
        reason: formReason,
        notes: formNotes.trim() || undefined,
      });
      setFormProductId('');
      setFormQuantityDelta('');
      setFormNotes('');
      loadAdjustments(setData, setError, setLoading);
    } catch (err) {
      setSubmitError(err.message || t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const list = data.adjustments;
  const canSubmit = locations.length > 0 && products.length > 0;

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.adjustments')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.adjustments')}</h1>

      <div className="card animate-card-in" aria-labelledby="record-adjustment-heading">
        <div className="card-header">
          <h2 id="record-adjustment-heading">{t('inventory.recordAdjustment')}</h2>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="adj-location">{t('inventory.locations')}</label>
              <CustomSelect
                id="adj-location"
                value={formLocationId}
                onChange={setFormLocationId}
                placeholder={t('inventory.selectLocation')}
                required
                options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              />
              {locations.length === 0 && <p className="form-hint">{t('inventory.locations')} — add under Inventory → Locations.</p>}
            </div>
            <div className="form-group">
              <label htmlFor="adj-product">{t('inventory.products')}</label>
              <CustomSelect
                id="adj-product"
                value={formProductId}
                onChange={setFormProductId}
                placeholder="— Select —"
                required
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
                }))}
              />
              {products.length === 0 && <p className="form-hint">Add products under Inventory → Products.</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="adj-delta">{t('inventory.quantityDelta')}</label>
              <input
                id="adj-delta"
                type="number"
                step="1"
                value={formQuantityDelta}
                onChange={(e) => setFormQuantityDelta(e.target.value)}
                placeholder="e.g. -5 or 10"
                autoComplete="off"
                aria-describedby="adj-delta-hint"
              />
              <p id="adj-delta-hint" className="form-hint">{t('inventory.quantityDeltaHint')}</p>
            </div>
            <div className="form-group">
              <label htmlFor="adj-reason">{t('inventory.reason')}</label>
              <CustomSelect
                id="adj-reason"
                value={formReason}
                onChange={setFormReason}
                placeholder={t('inventory.reason')}
                required
                options={REASONS.map((r) => ({ value: r.value, label: t(r.labelKey) }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="adj-notes">{t('inventory.notes')}</label>
            <input
              id="adj-notes"
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting || !canSubmit}>
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      <div className="card animate-card-in-delay" aria-labelledby="adjustment-history-heading">
        <div className="card-header">
          <h2 id="adjustment-history-heading">{t('inventory.adjustmentHistory')}</h2>
          {list.length > 0 && <span className="card-header-count">{list.length} {t('common.total')}</span>}
        </div>
        {loading && <div className="loading-page"><Spinner size={32} /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!loading && !error && list.length === 0 && <p className="inventory-no-alerts">{t('common.noDataYet')}</p>}
        {!loading && !error && list.length > 0 && (
          <div className="table-scroll">
            <table className="data-table" role="grid">
              <thead>
                <tr>
                  <th scope="col">{t('inventory.reportDate')}</th>
                  <th scope="col">{t('inventory.products')}</th>
                  <th scope="col">{t('inventory.locations')}</th>
                  <th scope="col">{t('inventory.reportChange')}</th>
                  <th scope="col">{t('inventory.reason')}</th>
                  <th scope="col">{t('inventory.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</td>
                    <td>{a.product?.name ?? a.productId}</td>
                    <td>{a.location?.name ?? a.locationId}</td>
                    <td>{a.quantityDelta != null ? a.quantityDelta : '—'}</td>
                    <td>{a.reason ? t(`inventory.reason${a.reason}`) : '—'}</td>
                    <td>{a.notes || '—'}</td>
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
