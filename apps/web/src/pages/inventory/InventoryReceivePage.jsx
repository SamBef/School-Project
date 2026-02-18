import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import CustomSelect from '../../components/CustomSelect';

function loadHistory(setData, setError, setLoading) {
  setLoading(true);
  setError(null);
  api.inventory.getReceiveHistory({ limit: 100 })
    .then((res) => setData({ receiveHistory: res.receiveHistory || [], total: res.total || 0 }))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function InventoryReceivePage() {
  const [data, setData] = useState({ receiveHistory: [], total: 0 });
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formLocationId, setFormLocationId] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLines, setFormLines] = useState([{ productId: '', quantity: '' }]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadHistory(setData, setError, setLoading);
  }, []);

  useEffect(() => {
    api.inventory.getLocations().then((list) => setLocations(Array.isArray(list) ? list : [])).catch(() => setLocations([]));
    api.inventory.getSuppliers().then((list) => setSuppliers(Array.isArray(list) ? list : [])).catch(() => setSuppliers([]));
    api.inventory.getProducts({ limit: 500 }).then((res) => setProducts(res.products || [])).catch(() => setProducts([]));
  }, []);

  function addLine() {
    setFormLines((prev) => [...prev, { productId: '', quantity: '' }]);
  }

  function updateLine(index, field, value) {
    setFormLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeLine(index) {
    setFormLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ productId: '', quantity: '' }]));
  }

  async function handleReceive(e) {
    e.preventDefault();
    setSubmitError('');
    if (!formLocationId || !formSupplierId) {
      setSubmitError('Location and supplier are required.');
      return;
    }
    const lines = formLines
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }))
      .filter((l) => l.productId && l.quantity > 0);
    if (lines.length === 0) {
      setSubmitError('Add at least one product with a quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await api.inventory.receiveStock({
        locationId: formLocationId,
        supplierId: formSupplierId,
        notes: formNotes.trim() || undefined,
        lines,
      });
      setFormLocationId('');
      setFormSupplierId('');
      setFormNotes('');
      setFormLines([{ productId: '', quantity: '' }]);
      loadHistory(setData, setError, setLoading);
    } catch (err) {
      setSubmitError(err.message || t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const list = data.receiveHistory;
  const canSubmit = locations.length > 0 && suppliers.length > 0 && products.length > 0;

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.receiveStock')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.receiveStock')}</h1>

      <div className="card animate-card-in" aria-labelledby="record-receive-heading">
        <div className="card-header">
          <h2 id="record-receive-heading">{t('inventory.recordReceive')}</h2>
        </div>
        <form onSubmit={handleReceive} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="receive-location">{t('inventory.locations')}</label>
              <CustomSelect
                id="receive-location"
                value={formLocationId}
                onChange={setFormLocationId}
                placeholder="— Select —"
                required
                options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              />
              {locations.length === 0 && <p className="form-hint">Add locations under Inventory → Locations.</p>}
            </div>
            <div className="form-group">
              <label htmlFor="receive-supplier">{t('inventory.suppliers')}</label>
              <CustomSelect
                id="receive-supplier"
                value={formSupplierId}
                onChange={setFormSupplierId}
                placeholder="— Select —"
                required
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
              {suppliers.length === 0 && <p className="form-hint">Add suppliers under Inventory → Suppliers.</p>}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="receive-notes">{t('inventory.notes')}</label>
            <textarea
              id="receive-notes"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
          <fieldset className="inventory-lines-fieldset">
            <legend className="inventory-lines-legend">{t('inventory.items')}</legend>
            {formLines.map((line, index) => (
              <div key={index} className="form-row inventory-line-row">
                <div className="form-group">
                  <label htmlFor={`line-product-${index}`}>{t('inventory.products')}</label>
                  <CustomSelect
                    id={`line-product-${index}`}
                    value={line.productId}
                    onChange={(v) => updateLine(index, 'productId', v)}
                    placeholder="— Select —"
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`line-qty-${index}`}>{t('inventory.quantity')}</label>
                  <input
                    id={`line-qty-${index}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group inventory-line-remove">
                  <label aria-hidden="true">&nbsp;</label>
                  <button type="button" className="btn btn-secondary" onClick={() => removeLine(index)} aria-label={t('common.remove')}>
                    {t('common.remove')}
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addLine}>
              {t('inventory.addLine')}
            </button>
          </fieldset>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting || !canSubmit}>
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && list.length === 0 && <p className="inventory-no-alerts">{t('common.noDataYet')}</p>}
      {!loading && !error && list.length > 0 && (
        <div className="card animate-card-in-delay">
          <div className="card-header">
            <h2>{t('inventory.receiveStock')}</h2>
            <span className="card-header-count">{list.length} {t('common.total')}</span>
          </div>
          <div className="table-scroll">
          <table className="data-table" role="grid">
            <thead>
              <tr>
                <th scope="col">{t('inventory.reportDate')}</th>
                <th scope="col">{t('inventory.locations')}</th>
                <th scope="col">{t('inventory.suppliers')}</th>
                <th scope="col">{t('inventory.items')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.receivedAt ? new Date(r.receivedAt).toLocaleDateString() : '—'}</td>
                  <td>{r.location ? r.location.name : r.locationId}</td>
                  <td>{r.supplier ? r.supplier.name : r.supplierId}</td>
                  <td>{r.lines ? r.lines.length : 0}</td>
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
