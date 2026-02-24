/**
 * App — routes, AuthProvider, and public landing page.
 * Protected routes are lazy-loaded for smaller initial bundle and faster first paint.
 */

import { lazy, Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { t } from './i18n';

import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
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
const UserActivityPage = lazy(() => import('./pages/UserActivityPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const InventoryProductsPage = lazy(() => import('./pages/inventory/InventoryProductsPage'));
const InventoryStockPage = lazy(() => import('./pages/inventory/InventoryStockPage'));
const InventoryLocationsPage = lazy(() => import('./pages/inventory/InventoryLocationsPage'));
const InventoryUnitsPage = lazy(() => import('./pages/inventory/InventoryUnitsPage'));
const InventorySuppliersPage = lazy(() => import('./pages/inventory/InventorySuppliersPage'));
const InventoryReceivePage = lazy(() => import('./pages/inventory/InventoryReceivePage'));
const InventoryReturnsPage = lazy(() => import('./pages/inventory/InventoryReturnsPage'));
const InventoryAdjustmentsPage = lazy(() => import('./pages/inventory/InventoryAdjustmentsPage'));
const InventoryReportsPage = lazy(() => import('./pages/inventory/InventoryReportsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="loading-page" aria-live="polite">
      <p>Loading…</p>
    </div>
  );
}

const HOME_EXIT_DURATION_MS = 450;

function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);
  const [featuresInView, setFeaturesInView] = useState(false);
  const [testimonialsInView, setTestimonialsInView] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitTarget, setExitTarget] = useState('');

  const handleExitTo = useCallback((path) => (e) => {
    e.preventDefault();
    setExiting(true);
    setExitTarget(path);
  }, []);

  useEffect(() => {
    if (!exiting || !exitTarget) return;
    const t = setTimeout(() => navigate(exitTarget, { replace: true }), HOME_EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [exiting, exitTarget, navigate]);

  useEffect(() => {
    const opts = { rootMargin: '0px 0px -80px 0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === featuresRef.current) setFeaturesInView(entry.isIntersecting);
        if (entry.target === testimonialsRef.current) setTestimonialsInView(entry.isIntersecting);
      });
    }, opts);
    if (featuresRef.current) observer.observe(featuresRef.current);
    if (testimonialsRef.current) observer.observe(testimonialsRef.current);
    return () => observer.disconnect();
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className={`home-page${exiting ? ' home-page-exit' : ''}`}>
      <header className="home-header" role="banner">
        <Link to="/" className="home-logo">
          <img src="/logo.svg" alt="" width="28" height="28" />
          <span>{t('app.name')}</span>
        </Link>
        <div className="home-header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <Link to="/login" className="btn btn-ghost" onClick={handleExitTo('/login')}>{t('auth.signIn')}</Link>
          <Link to="/register" className="btn btn-primary" style={{ width: 'auto', padding: 'var(--space-2) var(--space-5)' }} onClick={handleExitTo('/register')}>
            {t('auth.signUp')}
          </Link>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading">{t('app.heroTitle')}</h1>
        <p>{t('app.heroSubtitle')}</p>
        <div className="home-cta">
          <Link to="/register" className="btn btn-primary" onClick={handleExitTo('/register')}>{t('auth.signUp')}</Link>
          <Link to="/login" className="btn btn-secondary" onClick={handleExitTo('/login')}>{t('auth.signIn')}</Link>
        </div>
      </section>

      <section className="home-features" aria-labelledby="features-heading">
        <div ref={featuresRef} className={`home-features-inner${featuresInView ? ' in-view' : ''}`}>
          <h2 id="features-heading" className="features-heading-animate">{t('app.featuresTitle')}</h2>
          <div className="features-grid">
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              <h3>{t('common.transactions')}</h3>
              <p>{t('app.featureTransactions')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </span>
              <h3>{t('app.featureReceiptsTitle')}</h3>
              <p>{t('app.featureReceipts')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <h3>{t('app.featureTeamTitle')}</h3>
              <p>{t('app.featureTeam')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              </span>
              <h3>{t('app.featureMultiCurrencyTitle')}</h3>
              <p>{t('app.featureMultiCurrency')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </span>
              <h3>{t('common.export')}</h3>
              <p>{t('app.featureExport')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <h3>{t('app.featureSecureTitle')}</h3>
              <p>{t('app.featureSecure')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </span>
              <h3>{t('app.featureInventoryTitle')}</h3>
              <p>{t('app.featureInventory')}</p>
            </article>
            <article className="feature-item">
              <span className="feature-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
              </span>
              <h3>{t('app.featureKoboaiTitle')}</h3>
              <p>{t('app.featureKoboai')}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-testimonials" aria-labelledby="testimonials-heading">
        <div ref={testimonialsRef} className={`home-testimonials-inner${testimonialsInView ? ' in-view' : ''}`}>
          <h2 id="testimonials-heading">{t('app.testimonialsTitle')}</h2>
          <div className="testimonials-grid">
            <article className="testimonial-card">
              <span className="testimonial-quote-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2z"/></svg>
              </span>
              <blockquote>{t('app.testimonial1Quote')}</blockquote>
              <div className="testimonial-author">
                <span className="testimonial-avatar" aria-hidden="true">M</span>
                <div>
                  <cite>{t('app.testimonial1Author')}</cite>
                  <span className="testimonial-role">{t('app.testimonial1Role')}</span>
                </div>
              </div>
            </article>
            <article className="testimonial-card">
              <span className="testimonial-quote-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2z"/></svg>
              </span>
              <blockquote>{t('app.testimonial2Quote')}</blockquote>
              <div className="testimonial-author">
                <span className="testimonial-avatar" aria-hidden="true">A</span>
                <div>
                  <cite>{t('app.testimonial2Author')}</cite>
                  <span className="testimonial-role">{t('app.testimonial2Role')}</span>
                </div>
              </div>
            </article>
            <article className="testimonial-card">
              <span className="testimonial-quote-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2z"/></svg>
              </span>
              <blockquote>{t('app.testimonial3Quote')}</blockquote>
              <div className="testimonial-author">
                <span className="testimonial-avatar" aria-hidden="true">F</span>
                <div>
                  <cite>{t('app.testimonial3Author')}</cite>
                  <span className="testimonial-role">{t('app.testimonial3Role')}</span>
                </div>
              </div>
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
      <ThemeProvider>
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
            <Route path="/profile" element={<ErrorBoundary fallbackTitle={t('common.profile')}><ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute></ErrorBoundary>} />
            <Route path="/invite" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER']}><Layout><InvitePage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="/team/:id" element={<ProtectedRoute><RoleRoute allowedRoles={['OWNER']}><Layout><UserActivityPage /></Layout></RoleRoute></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Layout><InventoryPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/products" element={<ProtectedRoute><Layout><InventoryProductsPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/stock" element={<ProtectedRoute><Layout><InventoryStockPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/locations" element={<ProtectedRoute><Layout><InventoryLocationsPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/units" element={<ProtectedRoute><Layout><InventoryUnitsPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/suppliers" element={<ProtectedRoute><Layout><InventorySuppliersPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/receive" element={<ProtectedRoute><Layout><InventoryReceivePage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/returns" element={<ProtectedRoute><Layout><InventoryReturnsPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/adjustments" element={<ProtectedRoute><Layout><InventoryAdjustmentsPage /></Layout></ProtectedRoute>} />
            <Route path="/inventory/reports" element={<ProtectedRoute><Layout><InventoryReportsPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
