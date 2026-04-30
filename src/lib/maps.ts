import { Loader } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<typeof google> | null = null;

// Pinata is server-side only. Google Maps key is exposed (browser-safe like Firebase config keys).
// We expose it via an edge-fetch on first use to avoid hardcoding.
let cachedKey: string | null = null;

export async function loadGoogleMaps(apiKey: string) {
  if (loaderPromise) return loaderPromise;
  const loader = new Loader({
    apiKey,
    version: "weekly",
    libraries: ["places", "geometry"],
  });
  loaderPromise = loader.load();
  return loaderPromise;
}

export function setMapsKey(k: string) {
  cachedKey = k;
}
export function getMapsKey() {
  return cachedKey;
}
