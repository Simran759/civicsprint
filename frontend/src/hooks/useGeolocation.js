import { useState, useCallback } from 'react';

/**
 * Custom React hook to capture browser latitude and longitude GPS coordinates.
 */
export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location access denied by user. Please enable location permissions.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please try again.';
            break;
          default:
            msg = err.message;
        }
        setError(msg);
        setLoading(false);
      },
      options
    );
  }, []);

  return {
    loading,
    coordinates,
    error,
    getLocation,
    setCoordinates,
  };
}

export default useGeolocation;
