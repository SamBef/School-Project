/**
 * TransactionsPage — create new transactions and view transaction history.
 * Supports multi-currency: user can select a payment currency different from
 * the business base currency. Conversion is shown live and recorded.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

const PAYMENT_METHOD_KEYS = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'];

const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF',
  'INR', 'CNY', 'JPY', 'CAD', 'AUD', 'BRL', 'MXN',
];

const emptyItem = () => ({ name: '', quantity: 1, unitPrice: 0 });

export default function TransactionsPage() {
  const { business } = useAuth();
  const baseCurrency = business?.baseCurrencyCode ?? 'USD';

  // Form state
  const [items, setItems] = useState([emptyItem()]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentCurrency, setPaymentCurrency] = useState(baseCurrency);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Exchange rates
  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // List state
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [page, filterMethod, filterDateFrom, filterDateTo]);

  // Fetch exchange rates when component mounts
  useEffect(() => {
    setRatesLoading(true);
    api.get('/transactions/rates')
      .then((data) => setRates(data.rates ?? null))
      .catch(() => setRates(null))
      .finally(() => setRatesLoading(false));
  }, []);

  // Reset payment currency when base changes
  useEffect(() => {
    setPaymentCurrency(baseCurrency);
  }, [baseCurrency]);

  async function loadTransactions() {
    setLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', pageSize);
      params.set('offset', page * pageSize);
      if (filterMethod) params.set('paymentMethod', filterMethod);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const data = await api.get(`/transactions?${params.toString()}`);
      setTransactions(data.transactions ?? []);
      setTotalCount(data.total ?? 0);
    } catch (err) {
      console.error(err);
      setListError(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(0);
    loadTransactions();
  }

  function clearFilters() {
    setSearchTerm('');
    setFilterMethod('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(0);
  }

  function updateItem(index, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function getRawTotal() {
    return items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  }

  function getConvertedTotal() {
    const rawTotal = getRawTotal();
    if (paymentCurrency === baseCurrency || !rates) return null;

    const rateFromBase = rates[paymentCurrency];
    if (!rateFromBase) return null;

    const rate = 1 / rateFromBase;
    return { convertedTotal: Math.round(rawTotal * rate * 100) / 100, rate };
  }

  const isDifferentCurrency = paymentCurrency !== baseCurrency;
  const conversion = isDifferentCurrency ? getConvertedTotal() : null;

  // Build the currency options — base currency first, then popular currencies
  const currencyOptions = [baseCurrency, ...POPULAR_CURRENCIES.filter((c) => c !== baseCurrency)];
  if (rates) {
    for (const code of Object.keys(rates)) {
      if (!currencyOptions.includes(code)) {
        currencyOptions.push(code);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    for (let i = 0; i < items.length; i++) {
      if (!items[i].name.trim()) {
        setFormError(t('transactions.itemNameRequired').replace('{{number}}', String(i + 1)));
        return;
      }
      if (!items[i].quantity || items[i].quantity <= 0) {
        setFormError(t('transactions.itemQuantityRequired').replace('{{number}}', String(i + 1)));
        return;
      }
      if (items[i].unitPrice < 0) {
        setFormError(t('transactions.itemPriceNegative').replace('{{number}}', String(i + 1)));
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        items: items.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        paymentMethod,
        currencyCode: isDifferentCurrency ? paymentCurrency : undefined,
      };
      const result = await api.post('/transactions', payload);
      const receiptNum = result.receipt?.receiptNumber ?? '—';
      let msg = `${t('transactions.recorded')} #${receiptNum}`;
      if (result.transaction?.currencyCode) {
        msg += ` (${result.transaction.currencyCode} ${result.transaction.originalTotal?.toFixed(2)} → ${baseCurrency} ${result.transaction.total?.toFixed(2)})`;
      }
      setSuccessMessage(msg);
      setItems([emptyItem()]);
      setPaymentMethod('CASH');
      setPaymentCurrency(baseCurrency);
      setPage(0);
      loadTransactions();
    } catch (err) {
      setFormError(err.message || t('transactions.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="page-content">
      <h1 className="page-title">{t('common.transactions')}</h1>

      {/* New transaction form */}
      <div className="card animate-card-in">
        <div className="card-header">
          <h2>{t('transactions.newTransaction')}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          {successMessage && <p className="form-success" role="status">{successMessage}</p>}

          <div className="line-items">
            <div className="line-items-header">
              <span className="line-item-col-name">{t('transactions.itemName')}</span>
              <span className="line-item-col-qty">{t('transactions.quantity')}</span>
              <span className="line-item-col-price">{t('transactions.unitPrice')}</span>
              <span className="line-item-col-total">{t('transactions.lineTotal')}</span>
              <span className="line-item-col-action"></span>
            </div>
            {items.map((item, index) => (
              <div className="line-item-row" key={index}>
                <input
                  className="line-item-col-name"
                  type="text"
                  placeholder={t('transactions.itemNamePlaceholder')}
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  required
                  disabled={submitting}
                />
                <input
                  className="line-item-col-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                  required
                  disabled={submitting}
                />
                <input
                  className="line-item-col-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  required
                  disabled={submitting}
                />
                <span className="line-item-col-total line-item-total-value">
                  {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                </span>
                <button
                  type="button"
                  className="btn-icon line-item-col-action"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1 || submitting}
                  aria-label={`Remove item ${index + 1}`}
                  title="Remove item"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-ghost" onClick={addItem} disabled={submitting} style={{ marginTop: 'var(--space-2)' }}>
            + {t('transactions.addItem')}
          </button>

          <div className="transaction-footer">
            <div className="form-group transaction-payment-select">
              <label htmlFor="paymentMethod">{t('transactions.paymentMethod')}</label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={submitting}
              >
                {PAYMENT_METHOD_KEYS.map((key) => (
                  <option key={key} value={key}>{t(`paymentMethods.${key}`)}</option>
                ))}
              </select>
            </div>

            <div className="form-group transaction-payment-select">
              <label htmlFor="paymentCurrency">{t('transactions.paymentCurrency')}</label>
              <select
                id="paymentCurrency"
                value={paymentCurrency}
                onChange={(e) => setPaymentCurrency(e.target.value)}
                disabled={submitting || ratesLoading}
              >
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}{code === baseCurrency ? ` (${t('transactions.base')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="transaction-total">
              <span className="transaction-total-label">
                {t('transactions.total')} ({paymentCurrency})
              </span>
              <span className="transaction-total-value">
                {paymentCurrency} {getRawTotal().toFixed(2)}
              </span>
              {conversion && (
                <span className="transaction-conversion">
                  ≈ {baseCurrency} {conversion.convertedTotal.toFixed(2)}
                  <span className="conversion-rate">
                    (1 {paymentCurrency} = {conversion.rate.toFixed(4)} {baseCurrency})
                  </span>
                </span>
              )}
              {isDifferentCurrency && !conversion && !ratesLoading && (
                <span className="transaction-conversion conversion-unavailable">
                  {t('transactions.rateUnavailable')}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('common.loading') : t('transactions.recordTransaction')}
            </button>
          </div>
        </form>
      </div>

      {/* Transaction history */}
      <div className="card animate-card-in-delay">
        <div className="card-header">
          <h2>{t('transactions.history')}</h2>
          <span className="card-header-count">{totalCount} {t('transactions.total')}</span>
        </div>

        {/* Filter bar */}
        <form className="transaction-filters" onSubmit={handleSearch}>
          <div className="filter-row">
            <input
              type="text"
              className="filter-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('transactions.searchPlaceholder')}
            />
            <select
              className="filter-select"
              value={filterMethod}
              onChange={(e) => { setFilterMethod(e.target.value); setPage(0); }}
            >
              <option value="">{t('transactions.allMethods')}</option>
              {PAYMENT_METHOD_KEYS.map((key) => (
                <option key={key} value={key}>{t(`paymentMethods.${key}`)}</option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <div className="filter-date-group">
              <label htmlFor="filter-from" className="visually-hidden">{t('transactions.dateFrom')}</label>
              <input
                id="filter-from"
                type="date"
                className="filter-date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }}
                title={t('transactions.dateFrom')}
              />
              <span className="filter-date-sep">—</span>
              <label htmlFor="filter-to" className="visually-hidden">{t('transactions.dateTo')}</label>
              <input
                id="filter-to"
                type="date"
                className="filter-date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }}
                title={t('transactions.dateTo')}
              />
            </div>
            {(searchTerm || filterMethod || filterDateFrom || filterDateTo) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="loading-page"><Spinner size={32} /></div>
        ) : listError ? (
          <p className="form-error" role="alert">{listError}</p>
        ) : transactions.length === 0 ? (
          <p className="empty-state">{t('common.noDataYet')}</p>
        ) : (
          <>
            <div className="history-table-wrap table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('transactions.receipt')}</th>
                    <th>{t('transactions.date')}</th>
                    <th>{t('transactions.items')}</th>
                    <th>{t('transactions.paymentMethod')}</th>
                    <th>{t('transactions.amount')} ({baseCurrency})</th>
                    <th>{t('transactions.paid')}</th>
                    <th>{t('transactions.recordedBy')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const itemsList = Array.isArray(tx.items) ? tx.items : [];
                    const itemSummary = itemsList.map((i) => i.name).join(', ');
                    const hasForeignCurrency = !!tx.currencyCode;
                    return (
                      <tr key={tx.id}>
                        <td>
                          <Link to={`/transactions/${tx.id}`} className="table-link">
                            #{tx.receipt?.receiptNumber ?? '—'}
                          </Link>
                        </td>
                        <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td className="truncate-cell" title={itemSummary}>{itemSummary || '—'}</td>
                        <td>{t(`paymentMethods.${tx.paymentMethod}`)}</td>
                        <td className="amount-cell">{baseCurrency} {tx.total.toFixed(2)}</td>
                        <td className="amount-cell">
                          {hasForeignCurrency ? (
                            <span className="foreign-currency-tag" title={`Rate: 1 ${tx.currencyCode} = ${tx.exchangeRate?.toFixed(4)} ${baseCurrency}`}>
                              {tx.currencyCode} {tx.originalTotal?.toFixed(2)}
                            </span>
                          ) : (
                            <span className="base-currency-tag">{baseCurrency}</span>
                          )}
                        </td>
                        <td>{tx.user?.firstName ? `${tx.user.firstName} ${tx.user.lastName ?? ''}`.trim() : (tx.user?.email ?? '—')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="history-cards" aria-label={t('transactions.history')}>
              {transactions.map((tx) => {
                const itemsList = Array.isArray(tx.items) ? tx.items : [];
                const itemSummary = itemsList.map((i) => i.name).join(', ');
                const hasForeignCurrency = !!tx.currencyCode;
                return (
                  <Link key={tx.id} to={`/transactions/${tx.id}`} className="transaction-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="transaction-card-link">
                      #{tx.receipt?.receiptNumber ?? '—'}
                    </span>
                    <div className="transaction-card-row">
                      <span className="transaction-card-label">{t('transactions.date')}</span>
                      <span className="transaction-card-value">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="transaction-card-row">
                      <span className="transaction-card-label">{t('transactions.items')}</span>
                      <span className="transaction-card-value truncate" title={itemSummary}>{itemSummary || '—'}</span>
                    </div>
                    <div className="transaction-card-row">
                      <span className="transaction-card-label">{t('transactions.paymentMethod')}</span>
                      <span className="transaction-card-value">{t(`paymentMethods.${tx.paymentMethod}`)}</span>
                    </div>
                    <div className="transaction-card-row">
                      <span className="transaction-card-label">{t('transactions.amount')} ({baseCurrency})</span>
                      <span className="transaction-card-value">{baseCurrency} {tx.total.toFixed(2)}</span>
                    </div>
                    <div className="transaction-card-row">
                      <span className="transaction-card-label">{t('transactions.paid')}</span>
                      <span className="transaction-card-value">
                        {hasForeignCurrency ? (
                          <span className="foreign-currency-tag">{tx.currencyCode} {tx.originalTotal?.toFixed(2)}</span>
                        ) : (
                          <span className="base-currency-tag">{baseCurrency}</span>
                        )}
                      </span>
                    </div>
                    <div className="transaction-card-row">
                      <span className="transaction-card-label">{t('transactions.recordedBy')}</span>
                      <span className="transaction-card-value">
                        {tx.user?.firstName ? `${tx.user.firstName} ${tx.user.lastName ?? ''}`.trim() : (tx.user?.email ?? '—')}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  {t('common.previous')}
                </button>
                <span className="pagination-info">{page + 1} / {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
