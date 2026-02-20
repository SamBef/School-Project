import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * Catches render errors in the admin app and shows a friendly message instead of a blank screen.
 */
export default class AdminErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Admin app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="admin-layout">
          <main className="admin-main" role="main" style={{ padding: 'var(--space-8) var(--space-6)' }}>
            <div className="card" style={{ maxWidth: '28rem' }}>
              <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
              <p className="admin-card-description">
                An unexpected error occurred. You can try going back to the dashboard or refreshing the page.
              </p>
              <div className="form-actions" style={{ marginBottom: 0 }}>
                <Link to="/" className="btn btn-primary">Back to dashboard</Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  Refresh page
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
