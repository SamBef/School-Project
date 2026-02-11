/**
 * i18n — English, French, Spanish.
 * Language switcher in UI; locale stored in localStorage or user preference.
 */

const SUPPORTED_LOCALES = ['en', 'fr', 'es'];
const DEFAULT_LOCALE = 'en';

let currentLocale = DEFAULT_LOCALE;
let messages = {};

async function loadLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) locale = DEFAULT_LOCALE;
  const mod = await import(`./locales/${locale}.json`);
  messages[locale] = mod.default;
  currentLocale = locale;
  return messages[locale];
}

function getLocale() {
  return currentLocale;
}

function setLocale(locale) {
  if (SUPPORTED_LOCALES.includes(locale)) {
    currentLocale = locale;
  }
}

function t(key) {
  const keys = key.split('.');
  let value = messages[currentLocale];
  for (const k of keys) {
    value = value?.[k];
  }
  return value ?? key;
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, loadLocale, getLocale, setLocale, t };
