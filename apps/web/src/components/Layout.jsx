/**
 * Layout — sticky header with logo, role-based nav, user info, language switcher.
 * Mobile: hamburger toggles a slide-in panel from the right with transparent backdrop.
 */

import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { t, getLocale, setLocale, loadLocale, SUPPORTED_LOCALES } from '../i18n';

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
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close nav panel on route change
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  function handleLogout() {
    setNavOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  async function handleLocaleChange(e) {
    const locale = e.target.value;
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    await loadLocale(locale);
    setLocale(locale);
    localStorage.setItem('kobotrack_locale', locale);
    window.location.reload();
  }

  const role = user?.role ?? '';
  const canInvite = role === 'OWNER';
  const canExpenses = role === 'OWNER' || role === 'MANAGER';
  const canExport = role === 'OWNER' || role === 'MANAGER';

  return (
    <div className="app-layout">
      <header className="layout-header" role="banner">
        <Link to="/dashboard" className="logo-link" aria-label="KoboTrack home">
          <img src="/logo.svg" alt="" width="28" height="28" />
          <span>{t('app.name')}</span>
        </Link>

        {/* Desktop nav (hidden on mobile via CSS) */}
        <nav className="layout-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" end>{t('auth.dashboardNav')}</NavLink>
          <NavLink to="/transactions">{t('common.transactions')}</NavLink>
          {canExpenses && <NavLink to="/expenses">{t('common.expenses')}</NavLink>}
          {canExport && <NavLink to="/export">{t('common.export')}</NavLink>}
          {canInvite && <NavLink to="/invite">{t('common.inviteWorker')}</NavLink>}
        </nav>

        <div className="header-right">
          <label htmlFor="locale-select" className="visually-hidden">{t('common.language')}</label>
          <select
            id="locale-select"
            className="locale-select"
            value={getLocale()}
            onChange={handleLocaleChange}
            aria-label={t('common.language')}
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="es">ES</option>
          </select>

          <Link to="/profile" className="header-user" aria-label="View profile">
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
              <span className="header-user-email">{getUserDisplayName(user)}</span>
              <span className={getRoleBadgeClass(role)}>{getRoleLabel(role)}</span>
            </div>
          </Link>

          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            {t('auth.signOut')}
          </button>

          {/* Hamburger toggle — visible on mobile only */}
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
          <NavLink to="/dashboard" end>{t('auth.dashboardNav')}</NavLink>
          <NavLink to="/transactions">{t('common.transactions')}</NavLink>
          {canExpenses && <NavLink to="/expenses">{t('common.expenses')}</NavLink>}
          {canExport && <NavLink to="/export">{t('common.export')}</NavLink>}
          {canInvite && <NavLink to="/invite">{t('common.inviteWorker')}</NavLink>}
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
    </div>
  );
}
