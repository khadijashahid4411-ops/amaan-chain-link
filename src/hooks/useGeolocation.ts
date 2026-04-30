import { useEffect, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const useGeolocation = (watch = false) => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      setLoading(false);
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setLoading(false);
      setError(null);
    };
    const onError = (err: GeolocationPositionError) => {
      setError(err.message);
      setLoading(false);
    };

    if (watch) {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
      });
      return () => navigator.geolocation.clearWatch(id);
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true });
  }, [watch]);

  return { coords, error, loading };
};
