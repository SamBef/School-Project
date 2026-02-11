/**
 * TransactionDetailPage — view a single transaction with its line items,
 * receipt info, and options to download receipt PDF or delete the transaction.
 * Uses a styled inline confirmation instead of window.confirm.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const role = user?.role ?? '';
  const canDelete = role === 'OWNER' || role === 'MANAGER';
  const currency = business?.baseCurrencyCode ?? 'USD';

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [id]);

  async function loadTransaction() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/transactions/${id}`);
      setTransaction(data);
    } catch (err) {
      setError(err.message || t('transactions.notFound'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/transactions/${id}`);
      navigate('/transactions', { replace: true });
    } catch (err) {
      setError(err.message || t('transactions.deleteFailed'));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleDownloadReceipt() {
    try {
      await api.download(
        `/export/receipt/${id}`,
        `receipt-${transaction?.receipt?.receiptNumber ?? id}.pdf`
      );
    } catch (err) {
      setError(err.message || t('transactions.downloadReceiptFailed'));
    }
  }

  if (loading) {
    return <div className="loading-page"><Spinner size={32} /></div>;
  }

  if (error && !transaction) {
    return (
      <div>
        <p className="form-error">{error}</p>
        <Link to="/transactions" className="btn btn-ghost">{t('common.back')}</Link>
      </div>
    );
  }

  const items = Array.isArray(transaction?.items) ? transaction.items : [];

  return (
    <div>
      <div className="detail-header">
        <Link to="/transactions" className="btn btn-ghost btn-sm">
          &larr; {t('common.back')}
        </Link>
        <h1 className="page-title">
          {t('transactions.receipt')} #{transaction?.receipt?.receiptNumber ?? '—'}
        </h1>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="detail-grid">
        {/* Transaction info card */}
        <div className="card">
          <div className="card-header">
            <h2>{t('transactions.details')}</h2>
          </div>
          <ul className="business-info-list">
            <li>
              <span className="info-label">{t('transactions.date')}</span>
              <span className="info-value">
                {new Date(transaction.createdAt).toLocaleString()}
              </span>
            </li>
            <li>
              <span className="info-label">{t('transactions.paymentMethod')}</span>
              <span className="info-value">{t(`paymentMethods.${transaction.paymentMethod}`)}</span>
            </li>
            <li>
              <span className="info-label">{t('transactions.recordedBy')}</span>
              <span className="info-value">{transaction.user?.firstName ? `${transaction.user.firstName} ${transaction.user.lastName ?? ''}`.trim() : (transaction.user?.email ?? '—')}</span>
            </li>
            <li>
              <span className="info-label">{t('transactions.total')} ({currency})</span>
              <span className="info-value detail-total">{currency} {transaction.total.toFixed(2)}</span>
            </li>
            {transaction.currencyCode && (
              <>
                <li>
                  <span className="info-label">{t('transactions.paidIn')}</span>
                  <span className="info-value">
                    <span className="foreign-currency-tag">
                      {transaction.currencyCode} {transaction.originalTotal?.toFixed(2)}
                    </span>
                  </span>
                </li>
                <li>
                  <span className="info-label">{t('transactions.exchangeRate')}</span>
                  <span className="info-value">
                    1 {transaction.currencyCode} = {transaction.exchangeRate?.toFixed(4)} {currency}
                  </span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Line items card */}
        <div className="card">
          <div className="card-header">
            <h2>{t('transactions.lineItems')}</h2>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('transactions.itemName')}</th>
                  <th>{t('transactions.quantity')}</th>
                  <th>{t('transactions.unitPrice')}</th>
                  <th>{t('transactions.lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{currency} {Number(item.unitPrice).toFixed(2)}</td>
                    <td className="amount-cell">
                      {currency} {(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {t('transactions.total')}
                  </td>
                  <td className="amount-cell" style={{ fontWeight: 700 }}>
                    {currency} {transaction.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-actions">
        <button type="button" className="btn btn-primary" onClick={handleDownloadReceipt}>
          {t('transactions.downloadReceipt')}
        </button>

        {canDelete && !showDeleteConfirm && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t('common.delete')}
          </button>
        )}

        {canDelete && showDeleteConfirm && (
          <div className="confirm-delete" role="alertdialog" aria-label={t('transactions.confirmDelete')}>
            <p>{t('transactions.confirmDelete')}</p>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t('common.loading') : t('transactions.yesDelete')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
