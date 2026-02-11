/**
 * Auth context — holds token, user, business; provides login, register, logout, refreshUser.
 * Token is stored in localStorage so it survives refresh. On load, if token exists we call /auth/me.
 * Listens for 401 session expiry from the API client and shows a clear message.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, onSessionExpiry } from '../lib/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'kobotrack_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const setToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setTokenState(newToken);
      setSessionExpired(false);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
      setUser(null);
      setBusiness(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setBusiness(data.business ?? null);
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token, setToken]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen for session expiry from API client (401 with existing token)
  useEffect(() => {
    const unsubscribe = onSessionExpiry(() => {
      setSessionExpired(true);
      setToken(null);
    });
    return unsubscribe;
  }, [setToken]);

  const login = useCallback(
    async (email, password) => {
      const data = await api.post('/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      setBusiness(data.business ?? null);
      return data;
    },
    [setToken]
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.post('/auth/register', payload);
      setToken(data.token);
      setUser(data.user);
      setBusiness(data.business ?? null);
      return data;
    },
    [setToken]
  );

  const logout = useCallback(() => {
    setSessionExpired(false);
    setToken(null);
  }, [setToken]);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = {
    user,
    business,
    token,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!token,
    sessionExpired,
    clearSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
