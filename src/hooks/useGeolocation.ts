import { useCallback, useEffect, useRef, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const useGeolocation = (watch = false) => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      setLoading(false);
      return;
    }

    if (!window.isSecureContext) {
      setError("Location requires a secure (HTTPS) connection.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const onSuccess = (pos: GeolocationPosition) => {
      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setLoading(false);
      setError(null);
    };

    const onError = (err: GeolocationPositionError) => {
      setLoading(false);
      let msg = err.message || "Unable to get location.";
      if (err.code === err.PERMISSION_DENIED) {
        msg = "Location permission denied. Enable it in your browser settings, then retry.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = "Your position is currently unavailable. Try moving to an open area and retry.";
      } else if (err.code === err.TIMEOUT) {
        msg = "Location request timed out. Please retry.";
      }
      setError(msg);
    };

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    };

    if (watch) {
      // Get an initial fast fix, then keep watching.
      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, opts);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    }
  }, [watch]);

  useEffect(() => {
    start();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [start]);

  return { coords, error, loading, retry: start };
};
