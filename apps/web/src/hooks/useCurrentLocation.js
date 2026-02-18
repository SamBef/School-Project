/**
 * useCurrentLocation — get device position and reverse-geocode to a display address.
 * Used to pre-fill location/address fields; user can always edit.
 */

import { useState, useCallback } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

async function reverseGeocode(lat, lon) {
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
      const message = e?.message || 'Could not get location.';
      setError(message);
      if (e?.code === 1) setError('Location permission denied.');
      if (e?.code === 2) setError('Location unavailable.');
      if (e?.code === 3) setError('Location request timed out.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getCurrentLocation, loading, error };
}
