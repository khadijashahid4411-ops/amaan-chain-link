import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/eta";

export interface GeoZone {
  id: string;
  name: string;
  message: string;
  lat: number;
  lng: number;
  radius_km: number;
  is_active: boolean;
}

export function useGeofence(coords: { lat: number; lng: number } | null) {
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [inside, setInside] = useState<GeoZone[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("geo_zones")
        .select("*")
        .eq("is_active", true);
      setZones(data ?? []);
    };
    load();
    const ch = supabase
      .channel("geo-zones")
      .on("postgres_changes", { event: "*", schema: "public", table: "geo_zones" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (!coords) return setInside([]);
    setInside(
      zones.filter(
        (z) => haversineKm(coords, { lat: z.lat, lng: z.lng }) <= z.radius_km
      )
    );
  }, [coords?.lat, coords?.lng, zones]);

  return { zones, inside };
}
