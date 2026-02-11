/**
 * ExpensesPage — create, view, edit, and delete business expenses.
 * Categories: Rent, Stock/Inventory, Utilities, Transport, Miscellaneous.
 * Owner and Manager access only (enforced by route + backend).
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

const CATEGORY_KEYS = [
  { value: 'RENT', i18nKey: 'expenses.categoryRent' },
  { value: 'STOCK_INVENTORY', i18nKey: 'expenses.categoryStockInventory' },
  { value: 'UTILITIES', i18nKey: 'expenses.categoryUtilities' },
  { value: 'TRANSPORT', i18nKey: 'expenses.categoryTransport' },
  { value: 'MISCELLANEOUS', i18nKey: 'expenses.categoryMiscellaneous' },
];

function getCategoryLabel(value) {
  const found = CATEGORY_KEYS.find((c) => c.value === value);
  return found ? t(found.i18nKey) : value.replace(/_/g, ' ');
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function ExpensesPage() {
  const { business } = useAuth();
  const currency = business?.baseCurrencyCode ?? 'USD';

  // Form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('MISCELLANEOUS');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit mode
  const [editingId, setEditingId] = useState(null);

  // List state
  const [expenses, setExpenses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [page, setPage] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const pageSize = 20;

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, [page, filterCategory]);

  async function loadExpenses() {
    setLoading(true);
    setListError('');
    try {
      let url = `/expenses?limit=${pageSize}&offset=${page * pageSize}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      const data = await api.get(url);
      setExpenses(data.expenses ?? []);
      setTotalCount(data.total ?? 0);
    } catch (err) {
      console.error(err);
      setListError(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setDescription('');
    setCategory('MISCELLANEOUS');
    setAmount('');
    setDate(todayISO());
    setEditingId(null);
    setFormError('');
    setSuccessMessage('');
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setDescription(expense.description);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setDate(new Date(expense.date).toISOString().split('T')[0]);
    setFormError('');
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!description.trim()) {
      setFormError(t('expenses.descriptionRequired'));
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setFormError(t('expenses.amountPositive'));
      return;
    }
    if (!date) {
      setFormError(t('expenses.dateRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description: description.trim(),
        category,
        amount: amountNum,
        date,
      };

      if (editingId) {
        await api.patch(`/expenses/${editingId}`, payload);
        setSuccessMessage(t('expenses.updated'));
      } else {
        await api.post('/expenses', payload);
        setSuccessMessage(t('expenses.created'));
      }

      resetForm();
      setPage(0);
      loadExpenses();
    } catch (err) {
      setFormError(err.message || t('expenses.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      setConfirmDeleteId(null);
      loadExpenses();
    } catch (err) {
      setFormError(err.message || t('expenses.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="page-content">
      <h1 className="page-title">{t('common.expenses')}</h1>

      {/* Create / edit form */}
      <div className="card animate-card-in">
        <div className="card-header">
          <h2>{editingId ? t('expenses.editExpense') : t('expenses.addExpense')}</h2>
          {editingId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
              {t('common.cancel')}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          {successMessage && <p className="form-success" role="status">{successMessage}</p>}

          <div className="expense-form-grid">
            <div className="form-group">
              <label htmlFor="exp-description">{t('expenses.description')}</label>
              <input
                id="exp-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('expenses.descriptionPlaceholder')}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="exp-category">{t('expenses.category')}</label>
              <select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                {CATEGORY_KEYS.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.i18nKey)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="exp-amount">{t('expenses.amount')} ({currency})</label>
              <input
                id="exp-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="exp-date">{t('expenses.date')}</label>
              <input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 'var(--space-3)' }}>
            {submitting ? t('common.loading') : editingId ? t('common.save') : t('expenses.addExpense')}
          </button>
        </form>
      </div>

      {/* Expense history */}
      <div className="card animate-card-in-delay">
        <div className="card-header">
          <h2>{t('expenses.history')}</h2>
          <div className="card-header-right">
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
              aria-label={t('expenses.filterByCategory')}
            >
              <option value="">{t('expenses.allCategories')}</option>
              {CATEGORY_KEYS.map((c) => (
                <option key={c.value} value={c.value}>{t(c.i18nKey)}</option>
              ))}
            </select>
            <span className="card-header-count">{totalCount} {t('expenses.total')}</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><Spinner size={32} /></div>
        ) : listError ? (
          <p className="form-error" role="alert">{listError}</p>
        ) : expenses.length === 0 ? (
          <p className="empty-state">{t('common.noDataYet')}</p>
        ) : (
          <>
            <div className="history-table-wrap table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('expenses.date')}</th>
                    <th>{t('expenses.description')}</th>
                    <th>{t('expenses.category')}</th>
                    <th>{t('expenses.amount')}</th>
                    <th>{t('expenses.recordedBy')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td>{exp.description}</td>
                      <td>
                        <span className={`category-badge category-${exp.category.toLowerCase()}`}>
                          {getCategoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="amount-cell">{currency} {exp.amount.toFixed(2)}</td>
                      <td>{exp.user?.firstName ? `${exp.user.firstName} ${exp.user.lastName ?? ''}`.trim() : (exp.user?.email ?? '—')}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => startEdit(exp)}
                          >
                            {t('common.edit')}
                          </button>
                          {confirmDeleteId === exp.id ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(exp.id)}
                                disabled={deletingId === exp.id}
                              >
                                {deletingId === exp.id ? '…' : t('common.confirm')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                {t('common.cancel')}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmDeleteId(exp.id)}
                            >
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="history-cards" aria-label={t('expenses.history')}>
              {expenses.map((exp) => (
                <div key={exp.id} className="expense-card">
                  <div className="expense-card-row">
                    <span className="expense-card-label">{t('expenses.date')}</span>
                    <span className="expense-card-value">{new Date(exp.date).toLocaleDateString()}</span>
                  </div>
                  <div className="expense-card-row">
                    <span className="expense-card-label">{t('expenses.description')}</span>
                    <span className="expense-card-value">{exp.description}</span>
                  </div>
                  <div className="expense-card-row">
                    <span className="expense-card-label">{t('expenses.category')}</span>
                    <span className="expense-card-value">
                      <span className={`category-badge category-${exp.category.toLowerCase()}`}>
                        {getCategoryLabel(exp.category)}
                      </span>
                    </span>
                  </div>
                  <div className="expense-card-row">
                    <span className="expense-card-label">{t('expenses.amount')}</span>
                    <span className="expense-card-value">{currency} {exp.amount.toFixed(2)}</span>
                  </div>
                  <div className="expense-card-row">
                    <span className="expense-card-label">{t('expenses.recordedBy')}</span>
                    <span className="expense-card-value">
                      {exp.user?.firstName ? `${exp.user.firstName} ${exp.user.lastName ?? ''}`.trim() : (exp.user?.email ?? '—')}
                    </span>
                  </div>
                  <div className="expense-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => startEdit(exp)}
                    >
                      {t('common.edit')}
                    </button>
                    {confirmDeleteId === exp.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(exp.id)}
                          disabled={deletingId === exp.id}
                        >
                          {deletingId === exp.id ? '…' : t('common.confirm')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          {t('common.cancel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmDeleteId(exp.id)}
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  {t('common.previous')}
                </button>
                <span className="pagination-info">
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
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
