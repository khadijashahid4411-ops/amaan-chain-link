import { useEffect, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap, MapMarkerSpec } from "@/components/LiveMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Hospital, Shield, Pill, Flame } from "lucide-react";
import { haversineKm } from "@/lib/eta";

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
}

const CATEGORIES = [
  { key: "hospital", label: "Hospitals", icon: Hospital, color: "primary" as const },
  { key: "police", label: "Police", icon: Shield, color: "accent" as const },
  { key: "fire_station", label: "Fire", icon: Flame, color: "warning" as const },
  { key: "pharmacy", label: "Pharmacies", icon: Pill, color: "success" as const },
];

const SafeZones = () => {
  const { coords } = useGeolocation();
  const [active, setActive] = useState<string>("hospital");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlaces = async (type: string) => {
    if (!coords) return;
    setLoading(true);
    setActive(type);
    const { data, error } = await supabase.functions.invoke("nearby-places", {
      body: { lat: coords.lat, lng: coords.lng, type },
    });
    setLoading(false);
    if (error) return;
    setPlaces(data?.places ?? []);
  };

  useEffect(() => {
    if (coords) fetchPlaces("hospital");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng]);

  const center = coords ?? { lat: 24.8607, lng: 67.0011 };
  const activeCat = CATEGORIES.find((c) => c.key === active)!;
  const markers: MapMarkerSpec[] = [];
  if (coords) markers.push({ id: "you", lat: coords.lat, lng: coords.lng, color: "accent", title: "You" });
  places.forEach((p) => {
    if (!p.location) return;
    markers.push({
      id: p.id,
      lat: p.location.latitude,
      lng: p.location.longitude,
      color: activeCat.color,
      title: p.displayName?.text,
    });
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Safe Zone Map</h1>
        <p className="text-muted-foreground">Nearby hospitals, police, fire stations and pharmacies.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Button
            key={c.key}
            size="sm"
            variant={active === c.key ? "default" : "outline"}
            onClick={() => fetchPlaces(c.key)}
          >
            <c.icon className="h-4 w-4 mr-2" />{c.label}
          </Button>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle>Map</CardTitle></CardHeader>
          <CardContent>
            <div className="h-96 rounded-lg overflow-hidden">
              <LiveMap center={center} markers={markers} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>{activeCat.label} nearby</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {loading && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>}
            {!loading && places.length === 0 && <p className="text-sm text-muted-foreground">No places found nearby.</p>}
            {places.map((p) => {
              const km = p.location && coords ? haversineKm(coords, { lat: p.location.latitude, lng: p.location.longitude }) : null;
              return (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="font-medium text-sm">{p.displayName?.text}</div>
                  <div className="text-xs text-muted-foreground">{p.formattedAddress}</div>
                  {km != null && <div className="text-xs mt-1">{km.toFixed(1)} km away</div>}
                  {p.location && (
                    <Button asChild size="sm" variant="link" className="px-0 h-auto mt-1">
                      <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.location.latitude},${p.location.longitude}`}>
                        Directions
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SafeZones;
