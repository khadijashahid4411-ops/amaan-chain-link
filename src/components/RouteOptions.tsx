import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation, Shield, Zap, Activity } from "lucide-react";

interface Props {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  alertDensity?: number; // 0-1, computed externally
}

export const RouteOptions = ({ origin, destination }: Props) => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("compute-routes", {
      body: { origin, destination },
    });
    setLoading(false);
    if (error || !data?.routes) return;
    setRoutes(data.routes);
  };

  const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;

  const labelFor = (i: number, total: number) => {
    if (i === 0) return { label: "Fastest", icon: Zap, color: "text-warning" };
    if (i === total - 1) return { label: "Safest (least incidents)", icon: Shield, color: "text-success" };
    return { label: "Alternate (less traffic)", icon: Activity, color: "text-accent" };
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Route options</CardTitle>
        <Button size="sm" onClick={fetchRoutes} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Navigation className="h-4 w-4 mr-2" />}
          Compute
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {routes.length === 0 && <p className="text-sm text-muted-foreground">Tap Compute to see Fastest / Safest / Alternate routes.</p>}
        {routes.map((r, i) => {
          const meta = labelFor(i, routes.length);
          const km = (r.distanceMeters / 1000).toFixed(1);
          const mins = Math.round(parseInt(r.duration) / 60);
          return (
            <div key={i} className="border rounded-lg p-3 flex items-center justify-between gap-2">
              <div>
                <div className={`font-medium flex items-center gap-2 ${meta.color}`}>
                  <meta.icon className="h-4 w-4" />{meta.label}
                </div>
                <div className="text-xs text-muted-foreground">{km} km • ~{mins} min</div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href={dirUrl} target="_blank" rel="noreferrer">Open</a>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
