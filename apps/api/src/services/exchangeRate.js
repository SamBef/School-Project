/**
 * Exchange rate service — fetches live rates from Open Exchange Rates API (free).
 * Caches rates for 30 minutes to avoid excessive API calls.
 * Returns rates relative to a given base currency.
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map(); // key: baseCurrency, value: { rates, fetchedAt }

/**
 * Fetch exchange rates for a base currency.
 * Uses open.er-api.com (free, no API key required).
 * Returns { base, rates: { USD: 1.0, EUR: 0.92, ... } }
 */
export async function getExchangeRates(baseCurrency = 'USD') {
  const base = baseCurrency.toUpperCase();
  const cached = cache.get(base);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { base, rates: cached.rates, cached: true };
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) {
      throw new Error(`Exchange rate API returned ${res.status}`);
    }
    const data = await res.json();

    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid exchange rate response');
    }

    cache.set(base, { rates: data.rates, fetchedAt: Date.now() });

    return { base, rates: data.rates, cached: false };
  } catch (err) {
    // If we have stale cache, use it as fallback
    if (cached) {
      return { base, rates: cached.rates, cached: true, stale: true };
    }
    throw err;
  }
}

/**
 * Convert an amount from one currency to another using live rates.
 * Returns the converted amount as a number.
 */
export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;

  const { rates } = await getExchangeRates(fromCurrency);
  const rate = rates[toCurrency.toUpperCase()];

  if (!rate) {
    throw new Error(`No exchange rate found for ${fromCurrency} → ${toCurrency}`);
  }

  return amount * rate;
}
