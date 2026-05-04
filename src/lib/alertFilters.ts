import { Database } from "@/integrations/supabase/types";

export type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

export interface AlertFilterState {
  from?: string; // ISO date (yyyy-mm-dd)
  to?: string;
  status?: string;
  priority?: string;
  area?: string; // free-text against profile.area
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export const emptyFilters: AlertFilterState = {};

export const filterAlerts = (
  alerts: AlertRow[],
  f: AlertFilterState,
  areaLookup?: (userId: string) => string | null | undefined,
): AlertRow[] => {
  return alerts.filter((a) => {
    if (f.from) {
      const fromTs = new Date(f.from).getTime();
      if (new Date(a.created_at).getTime() < fromTs) return false;
    }
    if (f.to) {
      const toTs = new Date(f.to).getTime() + 24 * 3600 * 1000;
      if (new Date(a.created_at).getTime() > toTs) return false;
    }
    if (f.status && f.status !== "all" && a.status !== f.status) return false;
    if (f.priority && f.priority !== "all" && a.priority !== f.priority) return false;
    if (f.area && areaLookup) {
      const area = (areaLookup(a.user_id) ?? "").toLowerCase();
      if (!area.includes(f.area.toLowerCase())) return false;
    }
    if (typeof f.minLat === "number" && a.lat < f.minLat) return false;
    if (typeof f.maxLat === "number" && a.lat > f.maxLat) return false;
    if (typeof f.minLng === "number" && a.lng < f.minLng) return false;
    if (typeof f.maxLng === "number" && a.lng > f.maxLng) return false;
    return true;
  });
};
