import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { LiveMap, MapMarkerSpec } from "@/components/LiveMap";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Users,
  Siren,
  FileCheck2,
  BarChart3,
  ShieldCheck,
  UserCog,
  Activity,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Evidence = Database["public"]["Tables"]["evidence"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning",
  accepted: "bg-accent/20 text-accent border-accent",
  in_progress: "bg-primary/20 text-primary border-primary",
  solved: "bg-success/20 text-success border-success",
  rejected: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const AdminDashboard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => (m[p.user_id] = p));
    return m;
  }, [profiles]);

  const rolesByUser = useMemo(() => {
    const m: Record<string, string[]> = {};
    roles.forEach((r) => {
      m[r.user_id] = m[r.user_id] ?? [];
      m[r.user_id].push(r.role);
    });
    return m;
  }, [roles]);

  const load = async () => {
    const [a, r, p, e, ur] = await Promise.all([
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("responders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("evidence").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("*"),
    ]);
    setAlerts(a.data ?? []);
    setResponders(r.data ?? []);
    setProfiles(p.data ?? []);
    setEvidence(e.data ?? []);
    setRoles(ur.data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "responders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, load)
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

  const revokeResponderRole = async (userId: string) => {
    if (!confirm("Revoke responder role from this user?")) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "responder");
    if (error) return toast.error(error.message);
    await supabase
      .from("responders")
      .update({ status: "suspended", reviewed_at: new Date().toISOString() })
      .eq("user_id", userId);
    toast.success("Responder role revoked");
  };

  // ===== Stats =====
  const evidenceByUser = evidence.filter((e) => e.uploader_role === "user").length;
  const evidenceByResponder = evidence.filter((e) => e.uploader_role === "responder").length;

  const stats = {
    total: alerts.length,
    pending: alerts.filter((a) => a.status === "pending").length,
    active: alerts.filter((a) => ["accepted", "in_progress"].includes(a.status)).length,
    solved: alerts.filter((a) => a.status === "solved").length,
    cancelled: alerts.filter((a) => ["cancelled", "rejected"].includes(a.status)).length,
    users: profiles.length,
    responders: responders.filter((r) => r.status === "approved").length,
    pendingResponders: responders.filter((r) => r.status === "pending").length,
    evidence: evidence.length,
    evidenceByUser,
    evidenceByResponder,
  };

  // Last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const chartData = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const within = (t: string) => {
      const x = new Date(t).getTime();
      return x >= d.getTime() && x < next.getTime();
    };
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      alerts: alerts.filter((a) => within(a.created_at)).length,
      solved: alerts.filter((a) => a.status === "solved" && within(a.created_at)).length,
      evidence: evidence.filter((e) => within(e.created_at)).length,
    };
  });

  const statusPie = [
    { name: "Pending", value: stats.pending },
    { name: "Active", value: stats.active },
    { name: "Solved", value: stats.solved },
    { name: "Cancelled", value: stats.cancelled },
  ].filter((x) => x.value > 0);

  const evidencePie = [
    { name: "By users", value: stats.evidenceByUser },
    { name: "By responders", value: stats.evidenceByResponder },
  ].filter((x) => x.value > 0);

  const allMarkers: MapMarkerSpec[] = alerts.slice(0, 50).map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    color: a.status === "solved" ? "success" : a.status === "pending" ? "primary" : "accent",
    title: a.description.slice(0, 40),
  }));

  const filteredProfiles = profiles.filter((p) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.cnic?.toLowerCase().includes(q) ||
      p.area?.toLowerCase().includes(q) ||
      p.wallet_address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Command Center</h1>
        <p className="text-muted-foreground">
          Monitor alerts, responders, users, and on-chain evidence
        </p>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Siren} label="Total alerts" value={stats.total} />
        <StatCard icon={AlertTriangle} label="Pending alerts" value={stats.pending} accent="primary" />
        <StatCard icon={Activity} label="Active alerts" value={stats.active} accent="accent" />
        <StatCard icon={CheckCircle2} label="Solved alerts" value={stats.solved} accent="success" />
        <StatCard icon={Users} label="Users" value={stats.users} />
        <StatCard icon={ShieldCheck} label="Approved responders" value={stats.responders} accent="accent" />
        <StatCard icon={ImageIcon} label="Evidence by users" value={stats.evidenceByUser} accent="primary" />
        <StatCard icon={FileCheck2} label="Evidence by responders" value={stats.evidenceByResponder} accent="success" />
      </div>

      <Tabs defaultValue={stats.pendingResponders > 0 ? "responders" : "alerts"}>
        <TabsList className="flex flex-wrap h-auto md:w-fit">
          <TabsTrigger value="alerts"><Siren className="h-4 w-4 mr-1" />Alerts</TabsTrigger>
          <TabsTrigger value="responders" className="relative">
            <ShieldCheck className="h-4 w-4 mr-1" />Responders
            {stats.pendingResponders > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-warning-foreground">
                {stats.pendingResponders}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users"><UserCog className="h-4 w-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="evidence"><FileCheck2 className="h-4 w-4 mr-1" />Evidence</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>

        {/* ALERTS */}
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
                        {profileMap[a.user_id]?.display_name ?? "User"} • {new Date(a.created_at).toLocaleString()}
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

        {/* RESPONDERS */}
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
              const p = profileMap[r.user_id];
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
                      <div className="flex gap-2 flex-wrap">
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

        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage users</CardTitle>
              <CardDescription>
                Search, view profile details, and revoke responder privileges.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search by name, phone, CNIC, area, or wallet…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div className="space-y-2">
                {filteredProfiles.map((p) => {
                  const userRoles = rolesByUser[p.user_id] ?? ["user"];
                  const alertCount = alerts.filter((a) => a.user_id === p.user_id).length;
                  const evCount = evidence.filter((e) => e.uploaded_by === p.user_id).length;
                  return (
                    <div
                      key={p.user_id}
                      className="border rounded-lg p-3 flex items-start justify-between gap-3 flex-wrap"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{p.display_name ?? "Unnamed"}</span>
                          {userRoles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === "admin" ? "default" : role === "responder" ? "secondary" : "outline"}
                              className="capitalize"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {p.phone && <div>📞 {p.phone}</div>}
                          {p.cnic && <div>🪪 {p.cnic}</div>}
                          {p.area && <div>📍 {p.area}{p.address ? ` — ${p.address}` : ""}</div>}
                          {p.wallet_address && (
                            <div className="font-mono truncate max-w-xs">💼 {p.wallet_address}</div>
                          )}
                          <div>
                            {alertCount} alert{alertCount === 1 ? "" : "s"} • {evCount} evidence upload
                            {evCount === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                      {userRoles.includes("responder") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeResponderRole(p.user_id)}
                        >
                          Revoke responder
                        </Button>
                      )}
                    </div>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No users match your search.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVIDENCE */}
        <TabsContent value="evidence" className="space-y-2">
          {evidence.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4 pb-4 text-sm space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{e.file_name}</span>
                  <Badge variant="outline" className="capitalize">{e.uploader_role}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {profileMap[e.uploaded_by]?.display_name ?? "Unknown"}
                  </span>
                </div>
                <div className="font-mono text-xs text-muted-foreground truncate">{e.file_hash}</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <a href={e.ipfs_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">IPFS ({e.ipfs_cid.slice(0, 12)}…)</a>
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

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Alerts — last 7 days</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Bar dataKey="alerts" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="solved" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Evidence uploads — last 7 days</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="evidence" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Alert status breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  {statusPie.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No alert data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                          {statusPie.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Evidence source split</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  {evidencePie.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No evidence yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={evidencePie} dataKey="value" nameKey="name" outerRadius={90} label>
                          {evidencePie.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
