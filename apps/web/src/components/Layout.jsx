/**
 * Layout — sticky header with logo, role-based nav, user info, language switcher.
 * Mobile: hamburger toggles a slide-in panel from the right with transparent backdrop.
 */

import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { t, getLocale, setLocale, loadLocale, SUPPORTED_LOCALES } from '../i18n';
import OnboardingModal, { hasCompletedOnboarding } from './OnboardingModal';

function getRoleBadgeClass(role) {
  if (role === 'OWNER') return 'role-badge role-badge-owner';
  if (role === 'MANAGER') return 'role-badge role-badge-manager';
  return 'role-badge role-badge-cashier';
}

function getRoleLabel(role) {
  if (role === 'OWNER') return t('common.owner');
  if (role === 'MANAGER') return t('common.manager');
  return t('common.cashier');
}

function getUserDisplayName(user) {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
  if (user?.firstName) return user.firstName;
  return user?.email ?? '';
}

function getInitials(user) {
  if (user?.firstName) return user.firstName.charAt(0).toUpperCase();
  if (user?.email) return user.email.charAt(0).toUpperCase();
  return '?';
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());

  // Close nav panel and dropdowns on route change
  useEffect(() => {
    setNavOpen(false);
    setMoreOpen(false);
    setUserMenuOpen(false);
    setLocaleOpen(false);
  }, [location.pathname]);

  // Re-open onboarding when navigating with ?onboarding=1 (e.g. from Profile "Show tour again")
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('onboarding') === '1' && user) {
      setShowOnboarding(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, user, navigate]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  // Close dropdowns on Escape
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        setUserMenuOpen(false);
        setLocaleOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    if (!moreOpen && !userMenuOpen && !localeOpen) return;
    function onPointerDown(e) {
      const target = e.target;
      if (!target.closest('.nav-dropdown') && !target.closest('.user-menu') && !target.closest('.header-locale')) {
        setMoreOpen(false);
        setUserMenuOpen(false);
        setLocaleOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [moreOpen, userMenuOpen, localeOpen]);

  function handleLogout() {
    setNavOpen(false);
    setUserMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  async function handleLocaleChange(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    setLocaleOpen(false);
    await loadLocale(locale);
    setLocale(locale);
    sessionStorage.setItem('kobotrack_locale', locale);
    window.location.reload();
  }

  const role = user?.role ?? '';
  const canInvite = role === 'OWNER';
  const canExpenses = role === 'OWNER' || role === 'MANAGER';
  const canExport = role === 'OWNER' || role === 'MANAGER';
  const canAnalysis = role === 'OWNER' || role === 'MANAGER';
  const hasMoreItems = canExpenses || canExport || canAnalysis || canInvite;
  const isMoreActive = ['/expenses', '/export', '/analysis', '/invite'].some((p) => location.pathname.startsWith(p));

  return (
    <div className="app-layout">
      <header className="layout-header" role="banner">
        <Link to="/dashboard" className="logo-link" aria-label="KoboTrack home">
          <img src="/logo.svg" alt="" width="28" height="28" />
          <span>{t('app.name')}</span>
        </Link>

        {/* Desktop nav: primary links + More dropdown (hidden on mobile via CSS) */}
        <nav className="layout-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" end>{t('auth.dashboardNav')}</NavLink>
          <NavLink to="/transactions">{t('common.transactions')}</NavLink>
          <NavLink to="/inventory" end={false}>{t('inventory.title')}</NavLink>
          {hasMoreItems && (
            <div className="nav-dropdown">
              <button
                type="button"
                className={`nav-dropdown-trigger${isMoreActive ? ' active' : ''}`}
                onClick={() => { setMoreOpen((o) => !o); setUserMenuOpen(false); }}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                aria-controls="nav-more-menu"
                id="nav-more-button"
              >
                {t('nav.reportsAndTeam')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <ul
                id="nav-more-menu"
                className={`nav-dropdown-menu${moreOpen ? ' nav-dropdown-menu-open' : ''}`}
                role="menu"
                aria-labelledby="nav-more-button"
              >
                {canExpenses && <li role="none"><NavLink to="/expenses" role="menuitem">{t('common.expenses')}</NavLink></li>}
                {canExport && <li role="none"><NavLink to="/export" role="menuitem">{t('common.export')}</NavLink></li>}
                {canAnalysis && <li role="none"><NavLink to="/analysis" role="menuitem">{t('analysis.title')}</NavLink></li>}
                {canInvite && <li role="none"><NavLink to="/invite" role="menuitem">{t('common.inviteWorker')}</NavLink></li>}
              </ul>
            </div>
          )}
        </nav>

        <div className="header-right">
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
          <div className="header-locale">
            <button
              type="button"
              className="locale-dropdown-trigger"
              onClick={() => { setLocaleOpen((o) => !o); setMoreOpen(false); setUserMenuOpen(false); }}
              aria-expanded={localeOpen}
              aria-haspopup="listbox"
              aria-label={t('common.language')}
              id="locale-dropdown-button"
            >
              <svg className="header-locale-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="locale-dropdown-value">{getLocale().toUpperCase()}</span>
              <svg className="locale-dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div
              id="locale-dropdown-list"
              className={`locale-dropdown-menu${localeOpen ? ' locale-dropdown-menu-open' : ''}`}
              role="listbox"
              aria-labelledby="locale-dropdown-button"
              aria-activedescendant={localeOpen ? `locale-option-${getLocale()}` : undefined}
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  role="option"
                  id={`locale-option-${loc}`}
                  aria-selected={getLocale() === loc}
                  className={`locale-dropdown-item${getLocale() === loc ? ' locale-dropdown-item-selected' : ''}`}
                  onClick={() => handleLocaleChange(loc)}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <span className="header-right-divider" aria-hidden="true" />

          <div className="user-menu">
            <button
              type="button"
              className="header-user-trigger"
              onClick={() => { setUserMenuOpen((o) => !o); setMoreOpen(false); }}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              aria-controls="user-menu-panel"
              aria-label="Account menu"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="header-user-avatar header-user-avatar-img"
                  aria-hidden="true"
                />
              ) : (
                <div className="header-user-avatar" aria-hidden="true">
                  {getInitials(user)}
                </div>
              )}
              <div className="header-user-info">
                <span className="header-user-name">{getUserDisplayName(user)}</span>
                <span className={getRoleBadgeClass(role)} aria-label={t('common.role') + ': ' + getRoleLabel(role)}>
                  {getRoleLabel(role)}
                </span>
              </div>
              <svg className="user-menu-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div
              id="user-menu-panel"
              className={`user-menu-panel${userMenuOpen ? ' user-menu-panel-open' : ''}`}
              role="menu"
              aria-label="Account actions"
            >
              <Link to="/profile" role="menuitem" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                {t('common.profile')}
              </Link>
              <button type="button" role="menuitem" className="user-menu-item user-menu-item-signout" onClick={handleLogout}>
                {t('auth.signOut')}
              </button>
            </div>
          </div>

          {/* Hamburger — visible on mobile only */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile slide-in nav panel + backdrop */}
      <div
        className={`nav-overlay${navOpen ? ' nav-overlay-visible' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`mobile-nav-panel${navOpen ? ' nav-panel-open' : ''}`}
        aria-label="Mobile navigation"
      >
        <div className="mobile-nav-header">
          <span>{t('common.menu')}</span>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="mobile-nav-links" aria-label="Mobile navigation">
          <span className="mobile-nav-group-label" aria-hidden="true">{t('nav.main')}</span>
          <NavLink to="/dashboard" end>{t('auth.dashboardNav')}</NavLink>
          <NavLink to="/transactions">{t('common.transactions')}</NavLink>
          <NavLink to="/inventory" end={false}>{t('inventory.title')}</NavLink>
          {(canExpenses || canExport || canAnalysis) && (
            <>
              <span className="mobile-nav-group-label" aria-hidden="true">{t('nav.reportsAndTeam')}</span>
              {canExpenses && <NavLink to="/expenses">{t('common.expenses')}</NavLink>}
              {canExport && <NavLink to="/export">{t('common.export')}</NavLink>}
              {canAnalysis && <NavLink to="/analysis">{t('analysis.title')}</NavLink>}
            </>
          )}
          {canInvite && <NavLink to="/invite">{t('common.inviteWorker')}</NavLink>}
          <span className="mobile-nav-group-label" aria-hidden="true">{t('nav.account')}</span>
          <NavLink to="/profile">{t('common.profile')}</NavLink>
        </nav>

        <div className="mobile-nav-footer">
          <Link to="/profile" className="mobile-nav-user" onClick={() => setNavOpen(false)}>
            <div className="mobile-nav-user-info">
              <span className="mobile-nav-user-email">{getUserDisplayName(user)}</span>
              <span className={getRoleBadgeClass(role)}>{getRoleLabel(role)}</span>
            </div>
          </Link>
          <button type="button" className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%' }}>
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      <main className="layout-main" role="main">
        {children}
      </main>

      {user && (
        <OnboardingModal
          open={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
