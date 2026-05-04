import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LiveMap, MapMarkerSpec } from "@/components/LiveMap";
import { EvidenceUpload } from "@/components/EvidenceUpload";
import { EvidenceList } from "@/components/EvidenceList";
import { AlertFilters } from "@/components/AlertFilters";
import { AlertFilterState, emptyFilters, filterAlerts } from "@/lib/alertFilters";
import { toast } from "sonner";
import { Siren, CheckCircle2, XCircle, Loader2, MapPin, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];

// haversine km
const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const RADIUS_KM = 10;

const ResponderDashboard = () => {
  const { user } = useAuth();
  const { coords } = useGeolocation(true);
  const [responder, setResponder] = useState<Responder | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rejectedAlertIds, setRejectedAlertIds] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);
  const [specialty, setSpecialty] = useState("");

  // Load responder profile
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("responders").select("*").eq("user_id", user.id).maybeSingle();
      setResponder(data);
    };
    load();
    const ch = supabase
      .channel("me-responder")
      .on("postgres_changes", { event: "*", schema: "public", table: "responders", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  // Push location updates
  useEffect(() => {
    if (!coords || !responder?.id || !responder.is_active) return;
    supabase
      .from("responders")
      .update({
        current_lat: coords.lat,
        current_lng: coords.lng,
        location_updated_at: new Date().toISOString(),
      })
      .eq("id", responder.id)
      .then(() => {});
  }, [coords?.lat, coords?.lng, responder?.id, responder?.is_active]);

  // Load alerts (pending nearby + assigned to me)
  useEffect(() => {
    if (!responder || responder.status !== "approved") return;
    const load = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .in("status", ["pending", "accepted", "in_progress"])
        .order("created_at", { ascending: false });
      const { data: rejected } = await supabase
        .from("alert_rejections")
        .select("alert_id")
        .eq("responder_id", responder.id);
      setRejectedAlertIds(new Set((rejected ?? []).map((x) => x.alert_id)));
      setAlerts(data ?? []);
    };
    load();
    const ch = supabase
      .channel("responder-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [responder]);

  const register = async () => {
    if (!user) return;
    setRegistering(true);
    const { error } = await supabase.from("responders").insert({
      user_id: user.id,
      specialty: specialty.trim() || null,
    });
    setRegistering(false);
    if (error) toast.error(error.message);
    else toast.success("Application submitted — awaiting admin approval");
  };

  const toggleActive = async (active: boolean) => {
    if (!responder) return;
    await supabase.from("responders").update({ is_active: active }).eq("id", responder.id);
  };

  const accept = async (a: Alert) => {
    if (!responder) return;
    const { error } = await supabase
      .from("alerts")
      .update({
        status: "accepted",
        assigned_responder_id: responder.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", a.id)
      .eq("status", "pending"); // optimistic — first one wins
    if (error) toast.error(error.message);
    else toast.success("Alert accepted");
  };

  const reject = async (a: Alert) => {
    if (!responder || !user) return;
    const { error } = await supabase.from("alert_rejections").insert({
      alert_id: a.id,
      responder_id: responder.id,
      user_id: user.id,
    });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else {
      setRejectedAlertIds((prev) => new Set(prev).add(a.id));
      toast.success("Alert hidden from your queue");
    }
  };

  const startProgress = async (a: Alert) => {
    await supabase.from("alerts").update({ status: "in_progress" }).eq("id", a.id);
  };

  const markSolved = async (a: Alert) => {
    await supabase.from("alerts").update({ responder_marked_solved: true }).eq("id", a.id);
    if (a.user_marked_solved) {
      await supabase.from("alerts").update({ status: "solved", solved_at: new Date().toISOString() }).eq("id", a.id);
      // bump responder stats
      if (responder) {
        await supabase
          .from("responders")
          .update({ total_responses: (responder.total_responses ?? 0) + 1 })
          .eq("id", responder.id);
      }
    }
    toast.success("Marked as solved");
  };

  if (!user) return null;

  // Not registered yet
  if (!responder) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Become an AmaanChain responder</CardTitle>
            <CardDescription>Join the network of trained responders. Admin approval required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spec">Specialty (e.g. paramedic, fire, security)</Label>
              <Input id="spec" value={specialty} onChange={(e) => setSpecialty(e.target.value)} maxLength={60} />
            </div>
            <Button onClick={register} disabled={registering} className="w-full">
              {registering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (responder.status !== "approved") {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Application status: <Badge className="ml-2 capitalize">{responder.status}</Badge></CardTitle>
            <CardDescription>An admin will review your responder application shortly.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filter pending alerts within radius
  const pending = alerts.filter((a) => {
    if (a.status !== "pending") return false;
    if (rejectedAlertIds.has(a.id)) return false;
    if (!coords) return true;
    return distKm(coords, { lat: a.lat, lng: a.lng }) <= RADIUS_KM;
  });

  const myActive = alerts.filter((a) => a.assigned_responder_id === responder.id && a.status !== "solved");

  const center = myActive[0]
    ? { lat: myActive[0].lat, lng: myActive[0].lng }
    : coords ?? { lat: 24.8607, lng: 67.0011 };

  const markers: MapMarkerSpec[] = [];
  if (coords) markers.push({ id: "me", lat: coords.lat, lng: coords.lng, color: "success", title: "You" });
  pending.forEach((a) =>
    markers.push({ id: a.id, lat: a.lat, lng: a.lng, color: "primary", title: a.description.slice(0, 40) })
  );
  myActive.forEach((a) =>
    markers.push({ id: a.id, lat: a.lat, lng: a.lng, color: "accent", title: "Active" })
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 scroll-smooth">
      <header id="home" className="flex flex-wrap items-center justify-between gap-4 scroll-mt-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Siren className="h-7 w-7 text-primary" /> Responder Dashboard
          </h1>
          <p className="text-muted-foreground">Rating {responder.rating}★ • {responder.total_responses} responses</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shadow-card">
          <span className="text-sm font-medium">{responder.is_active ? "On duty" : "Off duty"}</span>
          <Switch checked={responder.is_active} onCheckedChange={toggleActive} />
        </div>
      </header>

      <Card id="map" className="scroll-mt-6">
        <CardHeader className="pb-2"><CardTitle>Map</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72 rounded-lg overflow-hidden">
            <LiveMap center={center} markers={markers} />
          </div>
        </CardContent>
      </Card>

      {/* My active */}
      {myActive.length > 0 && (
        <section id="active" className="space-y-3 scroll-mt-6">
          <h2 className="text-lg font-semibold">Your active responses</h2>
          {myActive.map((a) => (
            <Card key={a.id} className="border-accent">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <Badge className="bg-accent/20 text-accent border-accent capitalize">{a.status.replace("_", " ")}</Badge>
                    <p className="font-medium mt-2">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                      {coords && ` • ${distKm(coords, a).toFixed(1)} km away`}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`}>
                      <Navigation className="h-4 w-4 mr-1" /> Navigate
                    </a>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === "accepted" && (
                    <Button size="sm" onClick={() => startProgress(a)}>Start in-progress</Button>
                  )}
                  {a.status === "in_progress" && !a.responder_marked_solved && (
                    <Button size="sm" variant="outline" onClick={() => markSolved(a)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark solved
                    </Button>
                  )}
                </div>
                <EvidenceList alertId={a.id} />
                <EvidenceUpload alertId={a.id} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Pending */}
      <section id="pending" className="space-y-3 scroll-mt-6">
        <h2 id="evidence" className="text-lg font-semibold">Nearby pending alerts ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending alerts within {RADIUS_KM} km.</p>}
        {pending.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">{a.priority}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                    {coords && (
                      <span className="text-xs text-muted-foreground">• {distKm(coords, a).toFixed(1)} km</span>
                    )}
                  </div>
                  <p className="text-sm mt-1 break-words">{a.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => accept(a)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reject(a)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
};

export default ResponderDashboard;
