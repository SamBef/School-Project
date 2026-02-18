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
import CustomSelect from '../components/CustomSelect';
import KoboAIUsageTip from '../components/KoboAIUsageTip';

const RANGE_PRESETS = [
  { value: 7, labelKey: 'analysis.last7Days' },
  { value: 30, labelKey: 'analysis.last30Days' },
  { value: 90, labelKey: 'analysis.last90Days' },
  { value: 365, labelKey: 'analysis.last1Year' },
  { value: 730, labelKey: 'analysis.last2Years' },
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
  const { user, business } = useAuth();
  const currency = business?.baseCurrencyCode ?? 'USD';
  const isOwner = user?.role === 'OWNER';

  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockError, setRestockError] = useState('');
  const [restockData, setRestockData] = useState(null);
  const [koboaiConfigured, setKoboaiConfigured] = useState(null);

  useEffect(() => {
    if (isOwner) {
      api.get('/health').then((h) => setKoboaiConfigured(h.koboaiConfigured === true)).catch(() => {});
    }
  }, [isOwner]);

  function getDateRange() {
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (rangeDays - 1));
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
    return {
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
    };
  }

  useEffect(() => {
    const { dateFrom, dateTo } = getDateRange();
    setLoading(true);
    setError('');
    api
      .get(`/analysis?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then(setData)
      .catch((err) => setError(err.message || t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, [rangeDays]);

  async function handleGenerateRestockingInsights() {
    const { dateFrom, dateTo } = getDateRange();
    setRestockError('');
    setRestockData(null);
    setRestockLoading(true);
    try {
      const result = await api.post('/ai/insights/restocking', { dateFrom, dateTo });
      setRestockData(result);
    } catch (err) {
      const msg = err.message || '';
      const is429 = err.status === 429 || msg.includes('Too many requests');
      const isUnavailable = msg.includes('not available') || msg.includes('not set up');
      setRestockError(
        isUnavailable ? t('analysis.insightsUnavailable')
          : is429 ? t('analysis.insightsTooManyRequests')
          : (msg || t('analysis.insightsError'))
      );
    } finally {
      setRestockLoading(false);
    }
  }

  function getRecommendationLabel(type) {
    if (type === 'RESTOCK_URGENT') return t('analysis.recommendationRestockUrgent');
    if (type === 'UNDERPERFORMER') return t('analysis.recommendationUnderperformer');
    if (type === 'REORDER_TIMING') return t('analysis.recommendationReorderTiming');
    if (type === 'HIGH_MARGIN_OPPORTUNITY') return t('analysis.recommendationHighMargin');
    return type;
  }

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
        <KoboAIUsageTip page="analysis" />
        <div className="analysis-range">
          <label htmlFor="analysis-range" className="visually-hidden">
            {t('analysis.period')}
          </label>
          <CustomSelect
            id="analysis-range"
            className="filter-select analysis-range-select"
            value={String(rangeDays)}
            onChange={(v) => setRangeDays(Number(v))}
            placeholder={t('analysis.period')}
            options={RANGE_PRESETS.map((p) => ({
              value: String(p.value),
              label: t(p.labelKey),
            }))}
          />
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {data && (
        <>
          {/* Sales section — revenue and transactions */}
          <section className="analysis-section" aria-labelledby="analysis-sales-heading">
            <h2 id="analysis-sales-heading" className="analysis-section-title">{t('analysis.sectionSales')}</h2>
            <div className="analysis-kpis stats-grid">
              <div className="stat-card animate-fade-in">
                <p className="stat-card-label">{t('analysis.revenue')}</p>
                <p className="stat-card-value">
                  {currency} {data.summary.revenue.toFixed(2)}
                </p>
                <p className="stat-card-note">{t('analysis.periodSummary')}</p>
              </div>
              <div className="stat-card animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
                <p className="stat-card-label">{t('analysis.transactionCount')}</p>
                <p className="stat-card-value">{data.summary.transactionCount}</p>
                <p className="stat-card-note">{t('analysis.periodSummary')}</p>
              </div>
            </div>

            <div className="card animate-card-in">
              <div className="card-header">
                <h3>{t('analysis.revenueExpensesOverTime')}</h3>
              </div>
              <div className="analysis-chart-wrap">
                {data.summary.revenue === 0 && data.summary.expenses === 0 ? (
                  <p className="empty-state">{t('analysis.noSalesInPeriod')}</p>
                ) : (
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
                )}
              </div>
            </div>

            <div className="card animate-card-in-delay">
              <div className="card-header">
                <h3>{t('analysis.transactionsOverTime')}</h3>
              </div>
              <div className="analysis-chart-wrap">
                {data.summary.transactionCount === 0 ? (
                  <p className="empty-state">{t('analysis.noTransactionsInPeriod')}</p>
                ) : (
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
                )}
              </div>
            </div>
          </section>

          {/* Expenses section */}
          <section className="analysis-section" aria-labelledby="analysis-expenses-heading">
            <h2 id="analysis-expenses-heading" className="analysis-section-title">{t('analysis.sectionExpenses')}</h2>
            <div className="analysis-kpis stats-grid">
              <div className="stat-card animate-fade-in">
                <p className="stat-card-label">{t('analysis.expenses')}</p>
                <p className="stat-card-value">
                  {currency} {data.summary.expenses.toFixed(2)}
                </p>
                <p className="stat-card-note">{t('analysis.periodSummary')}</p>
              </div>
              <div className="stat-card animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
                <p className="stat-card-label">{t('analysis.netProfit')}</p>
                <p className="stat-card-value">
                  {currency} {data.summary.netProfit.toFixed(2)}
                </p>
                <p className="stat-card-note">{t('analysis.periodSummary')}</p>
              </div>
            </div>

            <div className="card animate-card-in-delay">
              <div className="card-header">
                <h3>{t('analysis.expensesByCategory')}</h3>
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
          </section>

          {/* KoboAI insights — Owner only */}
          {isOwner && (
          <section className="analysis-section" aria-labelledby="analysis-koboai-heading">
            <h2 id="analysis-koboai-heading" className="analysis-section-title">{t('koboai.restockingInsights')}</h2>
          <div className="card animate-card-in">
            <div className="card-header">
              <h2>{t('koboai.restockingInsights')}</h2>
            </div>
            <p className="card-header-desc">
              {t('analysis.restockingInsightsDesc')}
            </p>
            {koboaiConfigured === false && (
              <p className="form-hint form-hint-error" role="status" style={{ marginBottom: 'var(--space-2)' }}>
                {t('analysis.insightsUnavailable')}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateRestockingInsights}
              disabled={restockLoading}
              aria-busy={restockLoading}
            >
              {restockLoading ? (
                <>
                  <span className="spinner-wrapper" aria-hidden="true">
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  </span>
                  {t('common.loading')}
                </>
              ) : (
                t('analysis.generateRestockingInsights')
              )}
            </button>
            {restockError && (
              <p className="form-hint form-hint-error" role="alert" style={{ marginTop: 'var(--space-2)' }}>
                {restockError}
              </p>
            )}
            {restockData && (
              <div className="insights-content" style={{ marginTop: 'var(--space-4)', textAlign: 'left' }}>
                {restockData.insights && (
                  <p className="insights-summary" style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                    {restockData.insights}
                  </p>
                )}
                {Array.isArray(restockData.recommendations) && restockData.recommendations.length > 0 && (
                  <ul className="insights-recommendations" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {restockData.recommendations.map((rec, i) => (
                      <li key={i} className="insights-recommendation" style={{ marginBottom: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--color-neutral-100)', borderRadius: 'var(--radius-md)' }}>
                        <span className="insights-recommendation-type" style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                          {getRecommendationLabel(rec.type)}
                          {rec.productName ? ` — ${rec.productName}` : ''}
                          {rec.confidence ? ` (${rec.confidence})` : ''}
                        </span>
                        <p className="insights-recommendation-reasoning" style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          {rec.reasoning}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          </section>
          )}
        </>
      )}
    </div>
  );
}
