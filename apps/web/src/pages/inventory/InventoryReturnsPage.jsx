import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import CustomSelect from '../../components/CustomSelect';

export default function InventoryReturnsPage() {
  const [data, setData] = useState({ returns: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [returnReasons, setReturnReasons] = useState([]);
  const [products, setProducts] = useState([]);
  const [formTransactionId, setFormTransactionId] = useState('');
  const [formLines, setFormLines] = useState([{ productId: '', returnReasonId: '', quantity: '', condition: 'RESTOCK' }]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadReturns() {
    setLoading(true);
    setError(null);
    api.inventory.getReturns({ limit: 100 })
      .then((res) => setData({ returns: res.returns ?? [], total: res.total ?? 0 }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    api.get('/transactions?limit=100').then((r) => setTransactions(r.transactions ?? [])).catch(() => setTransactions([]));
    api.inventory.getReturnReasons().then((list) => setReturnReasons(Array.isArray(list) ? list : [])).catch(() => setReturnReasons([]));
    api.inventory.getProducts({ limit: 500 }).then((r) => setProducts(r.products ?? [])).catch(() => setProducts([]));
  }, []);

  function addLine() {
    setFormLines((prev) => [...prev, { productId: '', returnReasonId: '', quantity: '', condition: 'RESTOCK' }]);
  }

  function updateLine(index, field, value) {
    setFormLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeLine(index) {
    setFormLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ productId: '', returnReasonId: '', quantity: '', condition: 'RESTOCK' }]));
  }

  async function handleSubmitReturn(e) {
    e.preventDefault();
    setSubmitError('');
    if (!formTransactionId) {
      setSubmitError('Select a transaction.');
      return;
    }
    const lines = formLines
      .map((l) => ({
        productId: l.productId,
        returnReasonId: l.returnReasonId,
        quantity: Number(l.quantity),
        condition: l.condition === 'DISCARD' ? 'DISCARD' : 'RESTOCK',
      }))
      .filter((l) => l.productId && l.returnReasonId && l.quantity > 0);
    if (lines.length === 0) {
      setSubmitError('Add at least one line with product, reason, and quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/returns', { transactionId: formTransactionId, lines });
      setFormTransactionId('');
      setFormLines([{ productId: '', returnReasonId: '', quantity: '', condition: 'RESTOCK' }]);
      loadReturns();
    } catch (err) {
      setSubmitError(err.message || t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const list = data.returns;
  const canSubmit = transactions.length > 0 && returnReasons.length > 0 && products.length > 0;

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.returns')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.returns')}</h1>

      <div className="card animate-card-in" aria-labelledby="process-return-heading">
        <div className="card-header">
          <h2 id="process-return-heading">{t('inventory.processReturn')}</h2>
        </div>
        <form onSubmit={handleSubmitReturn} noValidate>
          <div className="form-group">
            <label htmlFor="return-transaction">{t('inventory.returnTransaction')}</label>
            <select
              id="return-transaction"
              value={formTransactionId}
              onChange={(e) => setFormTransactionId(e.target.value)}
              required
            >
              <option value="">— {t('inventory.selectLocation')} —</option>
              {transactions.map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {tx.receipt?.receiptNumber != null ? `#${tx.receipt.receiptNumber}` : tx.id.slice(0, 8)} — {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ''}
                </option>
              ))}
            </select>
            {transactions.length === 0 && <p className="form-hint">Record a sale first under Transactions.</p>}
          </div>
          <fieldset className="inventory-lines-fieldset">
            <legend className="inventory-lines-legend">{t('inventory.returnLines')}</legend>
            {formLines.map((line, index) => (
              <div key={index} className="form-row inventory-line-row">
                <div className="form-group">
                  <label htmlFor={`ret-product-${index}`}>{t('inventory.products')}</label>
                  <CustomSelect
                    id={`ret-product-${index}`}
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
                  <label htmlFor={`ret-reason-${index}`}>{t('inventory.returnReason')}</label>
                  <CustomSelect
                    id={`ret-reason-${index}`}
                    value={line.returnReasonId}
                    onChange={(v) => updateLine(index, 'returnReasonId', v)}
                    placeholder="— Select —"
                    options={returnReasons.map((rr) => ({ value: rr.id, label: rr.label }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`ret-qty-${index}`}>{t('inventory.quantity')}</label>
                  <input
                    id={`ret-qty-${index}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`ret-condition-${index}`}>{t('inventory.condition')}</label>
                  <select
                    id={`ret-condition-${index}`}
                    value={line.condition}
                    onChange={(e) => updateLine(index, 'condition', e.target.value)}
                  >
                    <option value="RESTOCK">{t('inventory.conditionRestock')}</option>
                    <option value="DISCARD">{t('inventory.conditionDiscard')}</option>
                  </select>
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
            {submitting ? t('common.loading') : t('inventory.submitReturn')}
</button>
        </form>
      </div>

      <div className="card animate-card-in-delay" aria-labelledby="returns-history-heading">
        <div className="card-header">
          <h2 id="returns-history-heading">{t('inventory.returnsHistory')}</h2>
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
                  <th scope="col">{t('inventory.returnTransaction')}</th>
                  <th scope="col">{t('inventory.items')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{r.processedAt ? new Date(r.processedAt).toLocaleDateString() : '—'}</td>
                    <td>{r.transactionId ?? '—'}</td>
                    <td>{r.lines?.length ?? 0}</td>
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
