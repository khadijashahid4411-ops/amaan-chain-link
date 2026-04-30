import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveMap, MapMarkerSpec } from "@/components/LiveMap";
import { EvidenceUpload } from "@/components/EvidenceUpload";
import { EvidenceList } from "@/components/EvidenceList";
import { toast } from "sonner";
import { Siren, MapPin, Loader2, Clock, CheckCircle2, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];

const alertSchema = z.object({
  description: z.string().trim().min(5, "Describe your emergency").max(500),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning",
  accepted: "bg-accent/20 text-accent border-accent",
  in_progress: "bg-primary/20 text-primary border-primary",
  solved: "bg-success/20 text-success border-success",
  rejected: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const UserDashboard = () => {
  const { user } = useAuth();
  const { coords, error: geoErr } = useGeolocation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [responders, setResponders] = useState<Record<string, Responder>>({});
  const [submitting, setSubmitting] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("high");
  const [description, setDescription] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load alerts + realtime
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAlerts(data ?? []);
      // load assigned responders
      const ids = (data ?? []).map((a) => a.assigned_responder_id).filter(Boolean) as string[];
      if (ids.length) {
        const { data: rs } = await supabase.from("responders").select("*").in("id", ids);
        const map: Record<string, Responder> = {};
        (rs ?? []).forEach((r) => (map[r.id] = r));
        setResponders(map);
      }
    };
    load();
    const ch = supabase
      .channel("user-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` },
        load
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "responders" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const submit = async () => {
    if (!coords) {
      toast.error("Location required to send alert");
      return;
    }
    const parsed = alertSchema.safeParse({ description, priority });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("alerts").insert({
      user_id: user!.id,
      description: parsed.data.description,
      priority: parsed.data.priority,
      lat: coords.lat,
      lng: coords.lng,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Emergency alert dispatched");
      setDescription("");
    }
  };

  const markSolved = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ user_marked_solved: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      // if responder also marked → set status solved
      const a = alerts.find((x) => x.id === id);
      if (a?.responder_marked_solved) {
        await supabase.from("alerts").update({ status: "solved", solved_at: new Date().toISOString() }).eq("id", id);
      }
      toast.success("Marked as solved on your side");
    }
  };

  const ratingFor = async (id: string, stars: number) => {
    await supabase.from("alerts").update({ rating: stars }).eq("id", id);
    toast.success("Thanks for the rating");
  };

  const activeAlert = alerts.find((a) => ["pending", "accepted", "in_progress"].includes(a.status));
  const center = activeAlert
    ? { lat: activeAlert.lat, lng: activeAlert.lng }
    : coords ?? { lat: 24.8607, lng: 67.0011 }; // fallback Karachi

  const markers: MapMarkerSpec[] = [];
  if (coords) markers.push({ id: "you", lat: coords.lat, lng: coords.lng, color: "accent", title: "You" });
  if (activeAlert) {
    markers.push({
      id: "alert",
      lat: activeAlert.lat,
      lng: activeAlert.lng,
      color: "primary",
      title: "Emergency",
    });
    if (activeAlert.assigned_responder_id) {
      const r = responders[activeAlert.assigned_responder_id];
      if (r?.current_lat && r?.current_lng) {
        markers.push({
          id: "responder",
          lat: r.current_lat,
          lng: r.current_lng,
          color: "success",
          title: "Responder",
        });
      }
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Emergency Console</h1>
        <p className="text-muted-foreground">Send alerts and track responders in real time.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alert form / active alert */}
        <Card className={activeAlert ? "border-primary shadow-emergency" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Siren className={activeAlert ? "h-5 w-5 text-primary pulse-emergency rounded-full" : "h-5 w-5"} />
              {activeAlert ? "Active emergency" : "Send an emergency alert"}
            </CardTitle>
            <CardDescription>
              {activeAlert
                ? `Status: ${activeAlert.status.replace("_", " ")}`
                : "Help is dispatched to nearby approved responders."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeAlert ? (
              <>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Describe what's happening</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="E.g. car accident, two injured, blocking lane…"
                    maxLength={500}
                    rows={4}
                  />
                </div>
                {geoErr && <p className="text-sm text-destructive">Location error: {geoErr}</p>}
                {coords && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Locked at {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
                <Button onClick={submit} disabled={submitting || !coords} size="lg" className="w-full bg-gradient-emergency shadow-emergency">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Siren className="h-4 w-4 mr-2" />}
                  Dispatch alert
                </Button>
                <p className="text-xs text-muted-foreground text-center">1-hour cooldown enforced between alerts.</p>
              </>
            ) : (
              <div className="space-y-3">
                <Badge className={STATUS_COLORS[activeAlert.status]}>
                  {activeAlert.status.replace("_", " ").toUpperCase()}
                </Badge>
                <p className="text-sm">{activeAlert.description}</p>
                {activeAlert.assigned_responder_id && responders[activeAlert.assigned_responder_id] && (
                  <div className="text-sm text-muted-foreground">
                    Responder en route • Rating {responders[activeAlert.assigned_responder_id].rating}★
                  </div>
                )}
                {!activeAlert.user_marked_solved && activeAlert.status === "in_progress" && (
                  <Button onClick={() => markSolved(activeAlert.id)} variant="outline" className="w-full">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as solved
                  </Button>
                )}
                {activeAlert.user_marked_solved && (
                  <p className="text-sm text-success">Waiting for responder to confirm…</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Live map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 rounded-lg overflow-hidden">
              <LiveMap center={center} markers={markers} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts yet.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[a.status]}>{a.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className="capitalize">{a.priority}</Badge>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mt-1.5 break-words">{a.description}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                  {expandedId === a.id ? "Hide" : "Details"}
                </Button>
              </div>
              {a.status === "solved" && !a.rating && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm">Rate responder:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => ratingFor(a.id, s)} className="text-warning hover:scale-110 transition-smooth">
                      <Star className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              )}
              {expandedId === a.id && (
                <div className="pt-2 space-y-3">
                  <EvidenceList alertId={a.id} />
                  {["pending", "accepted", "in_progress", "solved"].includes(a.status) && (
                    <EvidenceUpload alertId={a.id} />
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
