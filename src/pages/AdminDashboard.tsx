import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveMap, MapMarkerSpec } from "@/components/LiveMap";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Users, Siren, FileCheck2, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning",
  accepted: "bg-accent/20 text-accent border-accent",
  in_progress: "bg-primary/20 text-primary border-primary",
  solved: "bg-success/20 text-success border-success",
  rejected: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const AdminDashboard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [evidence, setEvidence] = useState<Evidence[]>([]);

  const load = async () => {
    const [a, r, p, e] = await Promise.all([
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("responders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("evidence").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAlerts(a.data ?? []);
    setResponders(r.data ?? []);
    setEvidence(e.data ?? []);
    const map: Record<string, Profile> = {};
    (p.data ?? []).forEach((x) => (map[x.user_id] = x));
    setProfiles(map);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "responders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const setResponderStatus = async (
    id: string,
    userId: string,
    status: "approved" | "rejected" | "suspended"
  ) => {
    let rejection_reason: string | null = null;
    if (status === "rejected") {
      const reason = window.prompt("Reason for rejection (shown to the user):", "");
      if (reason === null) return;
      rejection_reason = reason.trim() || "No reason provided";
    }
    const { error } = await supabase
      .from("responders")
      .update({
        status,
        rejection_reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "approved") {
      const { error: rErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "responder" });
      if (rErr && !rErr.message.includes("duplicate")) toast.error(rErr.message);
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "responder");
    }
    toast.success(`Responder ${status}`);
  };

  const stats = {
    total: alerts.length,
    pending: alerts.filter((a) => a.status === "pending").length,
    active: alerts.filter((a) => ["accepted", "in_progress"].includes(a.status)).length,
    solved: alerts.filter((a) => a.status === "solved").length,
    responders: responders.filter((r) => r.status === "approved").length,
    pendingResponders: responders.filter((r) => r.status === "pending").length,
  };

  // Last 7 days bar chart
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const chartData = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      alerts: alerts.filter((a) => {
        const t = new Date(a.created_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length,
    };
  });

  const allMarkers: MapMarkerSpec[] = alerts.slice(0, 50).map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    color: a.status === "solved" ? "success" : a.status === "pending" ? "primary" : "accent",
    title: a.description.slice(0, 40),
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Command Center</h1>
        <p className="text-muted-foreground">Monitor alerts, responders, and on-chain evidence</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Siren} label="Total alerts" value={stats.total} />
        <StatCard icon={Siren} label="Pending" value={stats.pending} accent="primary" />
        <StatCard icon={CheckCircle2} label="Solved" value={stats.solved} accent="success" />
        <StatCard icon={Users} label="Approved responders" value={stats.responders} accent="accent" />
      </div>

      <Tabs defaultValue={stats.pendingResponders > 0 ? "responders" : "alerts"}>
        <TabsList className="grid grid-cols-4 md:w-fit">
          <TabsTrigger value="alerts"><Siren className="h-4 w-4 mr-1" />Alerts</TabsTrigger>
          <TabsTrigger value="responders" className="relative">
            <Users className="h-4 w-4 mr-1" />Responders
            {stats.pendingResponders > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-warning-foreground">
                {stats.pendingResponders}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="evidence"><FileCheck2 className="h-4 w-4 mr-1" />Evidence</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Live alert map</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80 rounded-lg overflow-hidden">
                <LiveMap
                  center={alerts[0] ? { lat: alerts[0].lat, lng: alerts[0].lng } : { lat: 24.8607, lng: 67.0011 }}
                  markers={allMarkers}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent alerts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 25).map((a) => (
                <div key={a.id} className="border rounded-lg p-3 flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_COLORS[a.status]}>{a.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="capitalize">{a.priority}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {profiles[a.user_id]?.display_name ?? "User"} • {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1 break-words">{a.description}</p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responders" className="space-y-4">
          {stats.pendingResponders > 0 && (
            <Card className="border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="text-warning-foreground">
                  🔔 {stats.pendingResponders} pending responder request{stats.pendingResponders > 1 ? "s" : ""}
                </CardTitle>
                <CardDescription>Review the applicant's details and approve or reject with a reason.</CardDescription>
              </CardHeader>
            </Card>
          )}
          {[...responders]
            .sort((a, b) => (a.status === "pending" ? -1 : b.status === "pending" ? 1 : 0))
            .map((r) => {
              const p = profiles[r.user_id];
              return (
                <Card key={r.id} className={r.status === "pending" ? "border-warning" : ""}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 space-y-1">
                        <div className="font-medium">{p?.display_name ?? "Responder"}</div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {p?.phone && <div>📞 {p.phone}</div>}
                          {p?.cnic && <div>🪪 {p.cnic}</div>}
                          {p?.area && <div>📍 {p.area}{p.address ? ` — ${p.address}` : ""}</div>}
                          {p?.wallet_address && (
                            <div className="font-mono truncate max-w-xs">💼 {p.wallet_address}</div>
                          )}
                          <div>
                            {r.specialty ? `Specialty: ${r.specialty}` : "No specialty"} • Rating {r.rating}★ •{" "}
                            {r.total_responses} responses
                          </div>
                        </div>
                        <Badge className="capitalize">{r.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        {r.status !== "approved" && (
                          <Button size="sm" onClick={() => setResponderStatus(r.id, r.user_id, "approved")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                          </Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResponderStatus(r.id, r.user_id, "rejected")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                        )}
                        {r.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResponderStatus(r.id, r.user_id, "suspended")}
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                    {r.request_message && (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Applicant message</div>
                        "{r.request_message}"
                      </div>
                    )}
                    {r.status === "rejected" && r.rejection_reason && (
                      <div className="text-xs text-destructive">Rejection reason: {r.rejection_reason}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          {responders.length === 0 && (
            <p className="text-sm text-muted-foreground">No responder applications yet.</p>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-2">
          {evidence.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4 pb-4 text-sm space-y-1">
                <div className="font-medium truncate">{e.file_name}</div>
                <div className="font-mono text-xs text-muted-foreground truncate">{e.file_hash}</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <a href={e.ipfs_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">IPFS</a>
                  {e.tx_hash && (
                    <a href={`https://sepolia.etherscan.io/tx/${e.tx_hash}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      Sepolia tx
                    </a>
                  )}
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {evidence.length === 0 && <p className="text-sm text-muted-foreground">No evidence on record.</p>}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader><CardTitle>Alerts — last 7 days</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="alerts" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  accent = "muted",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: "muted" | "primary" | "success" | "accent";
}) => {
  const tint = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    accent: "bg-accent/15 text-accent",
  }[accent];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tint}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
