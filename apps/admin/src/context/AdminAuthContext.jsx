import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'kobotrack_admin_token';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [email, setEmail] = useState(null);

  const login = useCallback((newToken) => {
    setToken(newToken);
    localStorage.setItem(STORAGE_KEY, newToken);
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setEmail(payload.email ?? null);
    } catch {
      setEmail(null);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setEmail(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setEmail(payload.email ?? null);
      } catch {
        setEmail(null);
      }
    } else {
      setEmail(null);
    }
  }, [token]);

  const value = { token, email, isAuthenticated: !!token, login, logout };
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
