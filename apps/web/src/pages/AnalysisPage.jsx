/**
 * AnalysisPage — charts and KPIs for revenue, expenses, and transactions.
 * Owner and Manager only (enforced by route + API).
 */

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import Spinner from '../components/Spinner';

const RANGE_PRESETS = [
  { value: 7, labelKey: 'analysis.last7Days' },
  { value: 30, labelKey: 'analysis.last30Days' },
  { value: 90, labelKey: 'analysis.last90Days' },
];

const CATEGORY_I18N = {
  RENT: 'expenses.categoryRent',
  STOCK_INVENTORY: 'expenses.categoryStockInventory',
  UTILITIES: 'expenses.categoryUtilities',
  TRANSPORT: 'expenses.categoryTransport',
  MISCELLANEOUS: 'expenses.categoryMiscellaneous',
};

function getCategoryLabel(category) {
  return t(CATEGORY_I18N[category] || category);
}

const CHART_COLORS = {
  revenue: '#0d9488',
  expenses: '#b91c1c',
  net: '#15803d',
  categories: ['#0d9488', '#1e40af', '#3730a3', '#9d174d', '#525252'],
};

export default function AnalysisPage() {
  const { business } = useAuth();
  const currency = business?.baseCurrencyCode ?? 'USD';

  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (rangeDays - 1));
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    setLoading(true);
    setError('');
    api
      .get(
        `/analysis?dateFrom=${dateFrom.toISOString().slice(0, 10)}&dateTo=${dateTo.toISOString().slice(0, 10)}`
      )
      .then(setData)
      .catch((err) => setError(err.message || t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, [rangeDays]);

  if (loading && !data) {
    return (
      <div className="page-content">
        <h1 className="page-title">{t('analysis.title')}</h1>
        <div className="loading-page">
          <Spinner size={32} />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="analysis-header">
        <h1 className="page-title">{t('analysis.title')}</h1>
        <p className="analysis-subtitle">{t('analysis.subtitle')}</p>
        <div className="analysis-range">
          <label htmlFor="analysis-range" className="visually-hidden">
            {t('analysis.period')}
          </label>
          <select
            id="analysis-range"
            className="filter-select analysis-range-select"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            aria-label={t('analysis.period')}
          >
            {RANGE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {t(p.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {data && (
        <>
          {/* Summary KPIs */}
          <div className="analysis-kpis stats-grid">
            <div className="stat-card animate-fade-in">
              <p className="stat-card-label">{t('analysis.revenue')}</p>
              <p className="stat-card-value">
                {currency} {data.summary.revenue.toFixed(2)}
              </p>
              <p className="stat-card-note">{t('analysis.periodSummary')}</p>
            </div>
            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
              <p className="stat-card-label">{t('analysis.expenses')}</p>
              <p className="stat-card-value">
                {currency} {data.summary.expenses.toFixed(2)}
              </p>
              <p className="stat-card-note">{t('analysis.periodSummary')}</p>
            </div>
            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <p className="stat-card-label">{t('analysis.netProfit')}</p>
              <p className="stat-card-value">
                {currency} {data.summary.netProfit.toFixed(2)}
              </p>
              <p className="stat-card-note">{t('analysis.periodSummary')}</p>
            </div>
            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
              <p className="stat-card-label">{t('analysis.transactionCount')}</p>
              <p className="stat-card-value">{data.summary.transactionCount}</p>
              <p className="stat-card-note">{t('analysis.periodSummary')}</p>
            </div>
          </div>

          {/* Revenue & expenses over time */}
          <div className="card animate-card-in">
            <div className="card-header">
              <h2>{t('analysis.revenueExpensesOverTime')}</h2>
            </div>
            <div className="analysis-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={data.timeSeries}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  aria-label={t('analysis.revenueExpensesOverTime')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--color-neutral-600)' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-neutral-600)' }}
                    tickFormatter={(v) => `${currency} ${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--color-neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                    }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    formatter={(value, name) => [`${currency} ${Number(value).toFixed(2)}`, name]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={t('analysis.revenue')}
                    stroke={CHART_COLORS.revenue}
                    fill={CHART_COLORS.revenue}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name={t('analysis.expenses')}
                    stroke={CHART_COLORS.expenses}
                    fill={CHART_COLORS.expenses}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-column: transactions over time + expenses by category */}
          <div className="analysis-charts-row">
            <div className="card animate-card-in-delay">
              <div className="card-header">
                <h2>{t('analysis.transactionsOverTime')}</h2>
              </div>
              <div className="analysis-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={data.timeSeries}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    aria-label={t('analysis.transactionsOverTime')}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--color-neutral-600)' }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-neutral-600)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid var(--color-neutral-200)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                      }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <Bar
                      dataKey="transactionCount"
                      name={t('analysis.transactionCount')}
                      fill={CHART_COLORS.revenue}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card animate-card-in-delay">
              <div className="card-header">
                <h2>{t('analysis.expensesByCategory')}</h2>
              </div>
              <div className="analysis-chart-wrap">
                {data.expensesByCategory.length === 0 ? (
                  <p className="empty-state">{t('analysis.noExpensesInPeriod')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart aria-label={t('analysis.expensesByCategory')}>
                      <Pie
                        data={data.expensesByCategory.map((c) => ({
                          name: getCategoryLabel(c.category),
                          value: c.amount,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.expensesByCategory.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS.categories[i % CHART_COLORS.categories.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid var(--color-neutral-200)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-sm)',
                        }}
                        formatter={(value) => [`${currency} ${Number(value).toFixed(2)}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
