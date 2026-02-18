/**
 * useCurrentLocation — get device position and reverse-geocode to a display address.
 * Used to pre-fill location/address fields; user can always edit.
 */

import { useState, useCallback } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

export const LOCATION_ERROR_CODES = {
  NOT_SUPPORTED: 'notSupported',
  PERMISSION_DENIED: 'permissionDenied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
  NETWORK: 'network',
  UNKNOWN: 'unavailable',
};

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const err = new Error('Geolocation is not supported by this browser.');
      err.locationErrorCode = LOCATION_ERROR_CODES.NOT_SUPPORTED;
      reject(err);
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const e = new Error(err?.message || 'Location error');
      e.locationErrorCode =
        err?.code === 1 ? LOCATION_ERROR_CODES.PERMISSION_DENIED
          : err?.code === 2 ? LOCATION_ERROR_CODES.UNAVAILABLE
          : err?.code === 3 ? LOCATION_ERROR_CODES.TIMEOUT
          : LOCATION_ERROR_CODES.UNKNOWN;
      reject(e);
    }, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 300000,
    });
  });
}

async function reverseGeocode(lat, lon) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    const displayName = data?.display_name?.trim() || null;
    const city = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.county || '';
    const country = addr?.country || '';
    const shortName = [city, country].filter(Boolean).join(', ') || displayName || null;
    return { primaryLocation: shortName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`, address: displayName || `${lat.toFixed(4)}, ${lon.toFixed(4)}` };
  } catch {
    return null;
  }
}

export function useCurrentLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentLocation = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const result = await reverseGeocode(latitude, longitude);
      if (result) return result;
      return {
        primaryLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      };
    } catch (e) {
      setError(e?.locationErrorCode || LOCATION_ERROR_CODES.UNKNOWN);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getCurrentLocation, loading, error };
}
