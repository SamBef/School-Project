/**
 * ExportPage — download PDF or CSV reports with optional date range filtering.
 * Owner and Manager access only.
 */

import { useState } from 'react';
import { api } from '../lib/api';
import { t } from '../i18n';

export default function ExportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function buildQuery() {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function handleDownload(format) {
    setError('');
    setSuccess('');
    setDownloading(format);

    try {
      const query = buildQuery();
      const dateStr = new Date().toISOString().slice(0, 10);

      if (format === 'pdf') {
        await api.download(`/export/pdf${query}`, `kobotrack-report-${dateStr}.pdf`);
      } else {
        await api.download(`/export/csv${query}`, `kobotrack-report-${dateStr}.csv`);
      }

      setSuccess(t('export.downloadStarted'));
    } catch (err) {
      setError(err.message || t('export.downloadFailed'));
    } finally {
      setDownloading('');
    }
  }

  return (
    <div className="page-content">
      <h1 className="page-title">{t('common.export')}</h1>

      <div className="card animate-card-in" style={{ maxWidth: '36rem', margin: '0 auto' }}>
        <div className="card-header">
          <h2>{t('export.generateReport')}</h2>
        </div>

        <p className="export-description">{t('export.description')}</p>

        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success" role="status">{success}</p>}

        <div className="export-filters">
          <div className="form-group">
            <label htmlFor="export-from">{t('export.dateFrom')}</label>
            <input
              id="export-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="export-to">{t('export.dateTo')}</label>
            <input
              id="export-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <p className="export-hint">{t('export.dateHint')}</p>

        <div className="export-actions">
          <button
            type="button"
            className="btn btn-primary export-btn"
            onClick={() => handleDownload('pdf')}
            disabled={!!downloading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            {downloading === 'pdf' ? t('common.loading') : t('export.downloadPDF')}
          </button>
          <button
            type="button"
            className="btn btn-secondary export-btn"
            onClick={() => handleDownload('csv')}
            disabled={!!downloading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {downloading === 'csv' ? t('common.loading') : t('export.downloadCSV')}
          </button>
        </div>

        <div className="export-format-info">
          <details>
            <summary>{t('export.formatInfo')}</summary>
            <div className="export-format-details">
              <p><strong>PDF</strong> — {t('export.pdfDescription')}</p>
              <p><strong>CSV</strong> — {t('export.csvDescription')}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
