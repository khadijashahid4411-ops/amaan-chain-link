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

  const setResponderStatus = async (id: string, userId: string, status: "approved" | "rejected" | "suspended") => {
    const { error } = await supabase.from("responders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "approved") {
      // grant responder role
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: userId, role: "responder" });
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

      <Tabs defaultValue="alerts">
        <TabsList className="grid grid-cols-4 md:w-fit">
          <TabsTrigger value="alerts"><Siren className="h-4 w-4 mr-1" />Alerts</TabsTrigger>
          <TabsTrigger value="responders"><Users className="h-4 w-4 mr-1" />Responders</TabsTrigger>
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
            <Card className="border-warning">
              <CardHeader>
                <CardTitle>Pending applications ({stats.pendingResponders})</CardTitle>
                <CardDescription>Approve to grant responder role.</CardDescription>
              </CardHeader>
            </Card>
          )}
          {responders.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-6 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="font-medium">{profiles[r.user_id]?.display_name ?? "Responder"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.specialty ?? "—"} • Rating {r.rating}★ • {r.total_responses} responses
                  </div>
                  <Badge className="mt-1 capitalize">{r.status}</Badge>
                </div>
                <div className="flex gap-2">
                  {r.status !== "approved" && (
                    <Button size="sm" onClick={() => setResponderStatus(r.id, r.user_id, "approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setResponderStatus(r.id, r.user_id, "rejected")}>
                      <XCircle className="h-4 w-4 mr-1" />Reject
                    </Button>
                  )}
                  {r.status === "approved" && (
                    <Button size="sm" variant="ghost" onClick={() => setResponderStatus(r.id, r.user_id, "suspended")}>
                      Suspend
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
