/**
 * API client — base URL from VITE_API_URL.
 * All requests to backend go through this module.
 * Detects 401 responses and triggers session expiry handling.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'kobotrack_token';

// Listeners for session expiry (AuthContext subscribes)
const sessionExpiryListeners = new Set();

export function onSessionExpiry(callback) {
  sessionExpiryListeners.add(callback);
  return () => sessionExpiryListeners.delete(callback);
}

function notifySessionExpiry() {
  sessionExpiryListeners.forEach((cb) => cb());
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = getAuthHeaders();
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    // If 401 and we had a token, the session has expired
    if (res.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      // Don't trigger on login/register attempts (no prior token expected)
      if (!path.includes('/auth/login') && !path.includes('/auth/register')) {
        notifySessionExpiry();
      }
    }

    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * Download a file (PDF, CSV) as a blob and trigger a browser download.
 * Returns the blob for further handling if needed.
 */
async function downloadFile(path, filename) {
  const url = `${BASE_URL}${path}`;
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && token) {
      notifySessionExpiry();
    }
    throw new Error(body.message ?? `Download failed: ${res.status}`);
  }

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return blob;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  download: downloadFile,
};

export { BASE_URL };
