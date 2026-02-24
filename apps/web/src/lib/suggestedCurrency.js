/**
 * Suggested currency by location — uses a public geo API to infer country and map to currency.
 * Used to suggest base currency for new businesses or when owner has not set one (e.g. Ghana → GHS).
 * Owner can always change base currency in Profile.
 */

const COUNTRY_TO_CURRENCY = {
  GH: 'GHS',
  NG: 'NGN',
  KE: 'KES',
  ZA: 'ZAR',
  SN: 'XOF',
  CI: 'XOF',
  CM: 'XAF',
  TZ: 'TZS',
  UG: 'UGX',
  ET: 'ETB',
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR',
  IN: 'INR',
  CN: 'CNY',
  JP: 'JPY',
  CA: 'CAD',
  AU: 'AUD',
  BR: 'BRL',
  MX: 'MXN',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
};

const FALLBACK_CURRENCY = 'USD';

/**
 * Fetch suggested currency from user's location (IP-based country).
 * Returns { currency, countryCode } or { currency: FALLBACK_CURRENCY, countryCode: null } on error.
 */
export async function getSuggestedCurrency() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return { currency: FALLBACK_CURRENCY, countryCode: null };
    const data = await res.json();
    const countryCode = (data.country_code || '').toUpperCase();
    const currency = COUNTRY_TO_CURRENCY[countryCode] || FALLBACK_CURRENCY;
    return { currency, countryCode: countryCode || null };
  } catch {
    return { currency: FALLBACK_CURRENCY, countryCode: null };
  }
}
