import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'kobotrack_admin_token';

const AdminAuthContext = createContext(null);

function parsePayload(t) {
  if (!t) return { name: null, email: null };
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return { name: payload.name ?? null, email: payload.email ?? null };
  } catch {
    return { name: null, email: null };
  }
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [name, setName] = useState(null);
  const [email, setEmail] = useState(null);

  const login = useCallback((newToken) => {
    setToken(newToken);
    localStorage.setItem(STORAGE_KEY, newToken);
    const { name: n, email: e } = parsePayload(newToken);
    setName(n);
    setEmail(e);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setName(null);
    setEmail(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (token) {
      const { name: n, email: e } = parsePayload(token);
      setName(n);
      setEmail(e);
    } else {
      setName(null);
      setEmail(null);
    }
  }, [token]);

  const value = { token, name, email, isAuthenticated: !!token, login, logout };
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
