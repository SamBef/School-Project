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
  const token = sessionStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getConnectionHint(url) {
  const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
  if (isLocal) {
    return 'Make sure the API is running (e.g. run "npm run dev" in apps/api). Check apps/web/.env has VITE_API_URL=http://localhost:3004 (or the port your API uses).';
  }
  return 'Check that VITE_API_URL is set to your API URL (no trailing slash). In Vercel: Settings → Environment Variables. If the API sleeps on Render, wait 30–60 seconds and try again.';
}

async function request(path, options = {}) {
  if (!BASE_URL || !BASE_URL.startsWith('http')) {
    throw new Error(
      'API URL is not configured. Set VITE_API_URL in apps/web/.env for local dev (e.g. http://localhost:3004). For production, set it in your host (e.g. Vercel) to your API URL, then redeploy.'
    );
  }
  const url = `${BASE_URL}${path}`;
  const headers = getAuthHeaders();
  let res;
  try {
    res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  } catch (err) {
    const hint = getConnectionHint(url);
    throw new Error(`Cannot reach the API at ${url}. ${hint}`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    // If 401 and we had a token, the session has expired
    if (res.status === 401 && sessionStorage.getItem(TOKEN_KEY)) {
      // Don't trigger on login/register attempts (no prior token expected)
      if (!path.includes('/auth/login') && !path.includes('/auth/register')) {
        notifySessionExpiry();
      }
    }

    const err = new Error(body.message ?? `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json().catch(() => ({}));
}

/**
 * Download a file (PDF, CSV) as a blob and trigger a browser download.
 * Returns the blob for further handling if needed.
 */
async function downloadFile(path, filename) {
  const url = `${BASE_URL}${path}`;
  const token = sessionStorage.getItem(TOKEN_KEY);
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

  inventory: {
    getUnits: () => request('/inventory/units').then((r) => r.units),
    getLocations: () => request('/inventory/locations').then((r) => r.locations),
    getProducts: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/inventory/products${q ? `?${q}` : ''}`);
    },
    getStockLevels: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/inventory/stock-levels${q ? `?${q}` : ''}`);
    },
    getLowStockAlerts: () => request('/inventory/alerts/low-stock').then((r) => r.alerts),
    getReturnReasons: () => request('/inventory/return-reasons').then((r) => r.returnReasons),
    getSuppliers: () => request('/inventory/suppliers').then((r) => r.suppliers),
    getReceiveHistory: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/inventory/receive${q ? `?${q}` : ''}`);
    },
    getReturns: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/inventory/returns${q ? `?${q}` : ''}`);
    },
    getMovementReport: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/inventory/reports/movements${q ? `?${q}` : ''}`);
    },
    createUnit: (body) => api.post('/inventory/units', body),
    createLocation: (body) => api.post('/inventory/locations', body),
    getProduct: (id) => request(`/inventory/products/${id}`),
    createProduct: (body) => api.post('/inventory/products', body),
    setInitialStock: (productId, body) => api.post(`/inventory/products/${productId}/initial-stock`, body),
    updateProduct: (id, body) => api.patch(`/inventory/products/${id}`, body),
    deleteProduct: (id) => api.delete(`/inventory/products/${id}`),
    createSupplier: (body) => api.post('/inventory/suppliers', body),
    receiveStock: (body) => api.post('/inventory/receive', body),
    getAdjustments: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/inventory/adjustments${q ? `?${q}` : ''}`);
    },
    createAdjustment: (body) => api.post('/inventory/adjustments', body),
  },
};

export { BASE_URL };
