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

function connectionHint(url) {
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return 'Make sure the API is running (e.g. npm run dev in apps/api). Check apps/admin/.env has VITE_API_URL.';
  }
  return 'Check VITE_API_URL on Vercel (admin project). If the API sleeps on Render, wait 30–60 seconds and try again.';
}

function getToken() {
  return localStorage.getItem('kobotrack_admin_token');
}

export const api = {
  async get(path) {
    ensureBaseUrl();
    const token = getToken();
    const url = `${BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
    } catch (err) {
      throw new Error(`Cannot reach the API at ${url}. ${connectionHint(url)}`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed: ${res.status}`);
    }
    return res.json();
  },

  async post(path, body) {
    ensureBaseUrl();
    const token = getToken();
    const url = `${BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Cannot reach the API at ${url}. ${connectionHint(url)}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
  },

  async patch(path, body) {
    ensureBaseUrl();
    const token = getToken();
    const url = `${BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Cannot reach the API at ${url}. ${connectionHint(url)}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
  },

  async delete(path) {
    ensureBaseUrl();
    const token = getToken();
    const url = `${BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
    } catch (err) {
      throw new Error(`Cannot reach the API at ${url}. ${connectionHint(url)}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
  },
};
