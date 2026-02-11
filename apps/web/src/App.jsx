/**
 * App — routes, AuthProvider, and public landing page.
 * Protected routes are lazy-loaded for smaller initial bundle and faster first paint.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { t } from './i18n';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SetPasswordPage from './pages/SetPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const TransactionDetailPage = lazy(() => import('./pages/TransactionDetailPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const ExportPage = lazy(() => import('./pages/ExportPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UserActivityPage = lazy(() => import('./pages/UserActivityPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="loading-page" aria-live="polite">
      <p>Loading…</p>
    </div>
  );
}

function HomePage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="home-page">
      <header className="home-header" role="banner">
        <Link to="/" className="home-logo">
          <img src="/logo.svg" alt="" width="28" height="28" />
          <span>{t('app.name')}</span>
        </Link>
        <div className="home-header-actions">
          <Link to="/login" className="btn btn-ghost">{t('auth.signIn')}</Link>
          <Link to="/register" className="btn btn-primary" style={{ width: 'auto', padding: 'var(--space-2) var(--space-5)' }}>
            {t('auth.signUp')}
          </Link>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading">{t('app.heroTitle')}</h1>
        <p>{t('app.heroSubtitle')}</p>
        <div className="home-cta">
          <Link to="/register" className="btn btn-primary">{t('auth.signUp')}</Link>
          <Link to="/login" className="btn btn-secondary">{t('auth.signIn')}</Link>
        </div>
      </section>

      <section className="home-features" aria-labelledby="features-heading">
        <div className="home-features-inner">
          <h2 id="features-heading">{t('app.featuresTitle')}</h2>
          <div className="features-grid">
            <article className="feature-item">
              <h3>{t('common.transactions')}</h3>
              <p>{t('app.featureTransactions')}</p>
            </article>
            <article className="feature-item">
              <h3>Receipts</h3>
              <p>{t('app.featureReceipts')}</p>
            </article>
            <article className="feature-item">
              <h3>Team roles</h3>
              <p>{t('app.featureTeam')}</p>
            </article>
            <article className="feature-item">
              <h3>Multi-currency</h3>
              <p>{t('app.featureMultiCurrency')}</p>
            </article>
            <article className="feature-item">
              <h3>{t('common.export')}</h3>
              <p>{t('app.featureExport')}</p>
            </article>
            <article className="feature-item">
              <h3>Secure</h3>
              <p>{t('app.featureSecure')}</p>
            </article>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>{t('app.footerText')}</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Layout><TransactionsPage /></Layout></ProtectedRoute>} />
            <Route path="/transactions/:id" element={<ProtectedRoute><Layout><TransactionDetailPage /></Layout></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER', 'MANAGER']}><Layout><ExpensesPage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="/export" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER', 'MANAGER']}><Layout><ExportPage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER', 'MANAGER']}><Layout><AnalysisPage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/invite" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER']}><Layout><InvitePage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="/team/:id" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER']}><Layout><UserActivityPage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
