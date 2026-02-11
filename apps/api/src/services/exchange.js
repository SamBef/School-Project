/**
 * Exchange rate service — fetches live rates from a free API.
 * Uses Open Exchange Rates API (exchangerate-api.com free tier) as primary,
 * with a fallback to another free endpoint.
 *
 * Caches rates for 10 minutes to reduce API calls.
 */

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache = {
  base: null,
  rates: null,
  fetchedAt: 0,
};

/**
 * Fetch exchange rates with the given base currency.
 * Returns an object like { USD: 1, EUR: 0.92, NGN: 1550, ... }
 */
async function fetchRates(baseCurrency) {
  const now = Date.now();

  // Return cache if valid and same base
  if (cache.base === baseCurrency && cache.rates && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }

  // Try primary API (no key required)
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      cache = { base: baseCurrency, rates: data.rates, fetchedAt: now };
      return data.rates;
    }
  } catch (err) {
    console.warn('Primary exchange rate API failed:', err.message);
  }

  // Fallback API
  try {
    const url = `https://open.er-api.com/v6/latest/${baseCurrency}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      cache = { base: baseCurrency, rates: data.rates, fetchedAt: now };
      return data.rates;
    }
  } catch (err) {
    console.warn('Fallback exchange rate API failed:', err.message);
  }

  return null;
}

/**
 * Get the exchange rate to convert from `fromCurrency` to `toCurrency`.
 * Returns a number (1 fromCurrency = X toCurrency), or null if unavailable.
 */
export async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;

  const rates = await fetchRates(fromCurrency);
  if (!rates) return null;

  const rate = rates[toCurrency];
  return rate ?? null;
}

/**
 * Get all rates for a base currency.
 * Returns { rates: { USD: 1, EUR: 0.92, ... }, base: "USD" } or null.
 */
export async function getAllRates(baseCurrency) {
  const rates = await fetchRates(baseCurrency);
  if (!rates) return null;
  return { base: baseCurrency, rates };
}
