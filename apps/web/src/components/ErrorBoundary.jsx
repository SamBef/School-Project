/**
 * Error boundary — catches render errors in children and shows a fallback.
 * Used so the profile page (or other routes) never show a blank screen on error.
 */

import { Component } from 'react';
import { cloneElement } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, retryKey: 0 };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const err = this.state.error;
      const errMessage = err?.message ?? (typeof err === 'string' ? err : null);
      return (
        <div
          className="page-content"
          style={{
            minHeight: 'min(50vh, 20rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6)',
            textAlign: 'center',
          }}
        >
          <h1 className="page-title" style={{ marginBottom: 'var(--space-2)' }}>
            {fallbackTitle ?? t('common.error')}
          </h1>
          <p className="form-hint" style={{ marginBottom: 'var(--space-4)', color: 'var(--text-muted)' }}>
            {fallbackMessage ?? t('common.error')}
          </p>
          {errMessage && (
            <p className="form-hint" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: '32rem', wordBreak: 'break-word' }} role="status">
              {errMessage}
            </p>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleRetry}
            >
              {t('profile.retry')}
            </button>
            <Link to="/dashboard" className="btn btn-ghost">
              {t('auth.dashboardNav')}
            </Link>
          </div>
        </div>
      );
    }
    return cloneElement(this.props.children, { key: this.state.retryKey });
  }
}
