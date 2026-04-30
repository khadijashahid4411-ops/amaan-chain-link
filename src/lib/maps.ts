import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";

let configured = false;
let cachedKey: string | null = null;

async function ensureConfigured() {
  if (configured) return;
  if (!cachedKey) {
    const { data, error } = await supabase.functions.invoke("get-maps-key");
    if (error || !data?.key) throw new Error("Could not fetch Google Maps key");
    cachedKey = data.key as string;
  }
  setOptions({ key: cachedKey, v: "weekly" });
  configured = true;
}

export async function loadMapsLibrary<T extends "maps" | "marker" | "places" | "geometry" | "routes">(
  name: T
) {
  await ensureConfigured();
  return importLibrary(name);
}
