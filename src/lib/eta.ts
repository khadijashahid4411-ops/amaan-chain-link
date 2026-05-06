// Simple haversine + estimated drive ETA (avg 35 km/h urban)
export const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const estimateEtaMinutes = (km: number, avgKmh = 35) => {
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.max(1, Math.round((km / avgKmh) * 60));
};
