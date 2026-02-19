/**
 * Theme context — light/dark mode per tab (sessionStorage) and prefers-color-scheme.
 * Sets data-theme on document.documentElement for CSS variable switching.
 */

import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'kobotrack_theme';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
});

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const t = getInitialTheme();
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', t);
    return t;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      sessionStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  function setTheme(next) {
    setThemeState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      return value === 'dark' ? 'dark' : 'light';
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
