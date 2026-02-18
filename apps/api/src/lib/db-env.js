/**
 * Normalize database env before Prisma is loaded. Must be imported immediately
 * after dotenv in the entry point (index.js). No Prisma imports here.
 *
 * - Ensures DIRECT_URL is set (defaults to DATABASE_URL) for Prisma schema.
 * - In development only: when DATABASE_INSECURE_SSL=1, appends sslmode=no-verify
 *   to DATABASE_URL and DIRECT_URL so Windows TLS handshake can succeed when
 *   the OS fails to provide credentials. Never used in production.
 */

function withSslModeNoVerify(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('sslmode=no-verify')) return url;
  if (url.includes('sslmode=')) {
    return url.replace(/sslmode=[^&]+/, 'sslmode=no-verify');
  }
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + 'sslmode=no-verify';
}

(function normalizeDatabaseEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = databaseUrl;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const insecureSsl = process.env.DATABASE_INSECURE_SSL === '1' || process.env.DATABASE_INSECURE_SSL === 'true';
  if (isDev && insecureSsl) {
    process.env.DATABASE_URL = withSslModeNoVerify(process.env.DATABASE_URL);
    process.env.DIRECT_URL = withSslModeNoVerify(process.env.DIRECT_URL);
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }
})();
