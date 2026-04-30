import { Loader } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";

let loaderPromise: Promise<typeof globalThis.google> | null = null;
let cachedKey: string | null = null;

async function fetchKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.functions.invoke("get-maps-key");
  if (error || !data?.key) throw new Error("Could not fetch Google Maps key");
  cachedKey = data.key as string;
  return cachedKey;
}

export async function loadGoogleMaps() {
  if (loaderPromise) return loaderPromise;
  const apiKey = await fetchKey();
  const loader = new Loader({
    apiKey,
    version: "weekly",
    libraries: ["places", "geometry"],
  });
  loaderPromise = loader.importLibrary("maps").then(() => globalThis.google);
  return loaderPromise;
}
