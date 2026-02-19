/**
 * API client for admin app — uses admin JWT.
 * Base URL: VITE_ADMIN_API_URL (admin-only) or VITE_API_URL, or in dev the /admin proxy when both are unset.
 */

const BASE = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || '')
  .replace(/\/$/, '');

function ensureBaseUrl() {
  if (!BASE && !import.meta.env.DEV) {
    throw new Error(
      'Admin API URL is not set. Set VITE_ADMIN_API_URL (or VITE_API_URL) when building the admin app for production (e.g. in your host environment variables).'
    );
  }
}

function getToken() {
  return localStorage.getItem('kobotrack_admin_token');
}

export const api = {
  async get(path) {
    ensureBaseUrl();
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed: ${res.status}`);
    }
    return res.json();
  },

  async post(path, body) {
    ensureBaseUrl();
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
  },

  async patch(path, body) {
    ensureBaseUrl();
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
  },

  async delete(path) {
    ensureBaseUrl();
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
  },
};
