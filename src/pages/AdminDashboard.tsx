import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LiveMap, MapMarkerSpec } from "@/components/LiveMap";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShieldAlert,
  Home,
  BarChart3,
  Siren,
  ListChecks,
  Users,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  UserCog,
  Settings,
  Bell,
  LogOut,
  Menu,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { AlertFilters } from "@/components/AlertFilters";
import { AlertFilterState, emptyFilters, filterAlerts } from "@/lib/alertFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

type SectionId =
  | "home"
  | "analytics"
  | "alerts"
  | "alert-details"
  | "responders"
  | "pending"
  | "users"
  | "evidence"
  | "audit"
  | "profile"
  | "settings";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning",
  accepted: "bg-accent/20 text-accent border-accent",
  in_progress: "bg-primary/20 text-primary border-primary",
  solved: "bg-success/20 text-success border-success",
  rejected: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const NAV: { id: SectionId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "alerts", label: "All Alerts", icon: Siren },
  { id: "alert-details", label: "Alert Details", icon: ListChecks },
  { id: "responders", label: "Responders", icon: Users },
  { id: "pending", label: "Pending Requests", icon: ClipboardList },
  { id: "users", label: "Users", icon: UserCog },
  { id: "evidence", label: "Evidence", icon: FileCheck2 },
  { id: "audit", label: "Audit Evidence", icon: ShieldCheck },
  { id: "profile", label: "Profile", icon: UserCog },
  { id: "settings", label: "Settings", icon: Settings },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [section, setSection] = useState<SectionId>("home");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [alertFilters, setAlertFilters] = useState<AlertFilterState>(emptyFilters);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const load = async () => {
    const [a, r, p, e] = await Promise.all([
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("responders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("evidence").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setAlerts(a.data ?? []);
    setResponders(r.data ?? []);
    setEvidence(e.data ?? []);
    const map: Record<string, Profile> = {};
    (p.data ?? []).forEach((x) => (map[x.user_id] = x));
    setProfiles(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "responders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const deleteUser = async (targetId: string) => {
    setDeletingUserId(targetId);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { target_user_id: targetId },
    });
    setDeletingUserId(null);
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Delete failed");
    } else {
      toast.success("User account deleted");
      load();
    }
  };

  const areaLookup = (uid: string) => profiles[uid]?.area;

  const stats = useMemo(() => {
    const totalUsers = Object.keys(profiles).length;
    return {
      totalAlerts: alerts.length,
      pending: alerts.filter((a) => a.status === "pending").length,
      active: alerts.filter((a) => ["accepted", "in_progress"].includes(a.status)).length,
      solved: alerts.filter((a) => a.status === "solved").length,
      rejected: alerts.filter((a) => ["rejected", "cancelled"].includes(a.status)).length,
      totalUsers,
      totalEvidence: evidence.length,
      totalResponders: responders.filter((r) => r.status === "approved").length,
      pendingResponders: responders.filter((r) => r.status === "pending").length,
    };
  }, [alerts, responders, evidence, profiles]);

  const notifications = useMemo(() => {
    const items: { id: string; title: string; description: string; time: string; section: SectionId }[] = [];
    responders
      .filter((r) => r.status === "pending")
      .slice(0, 5)
      .forEach((r) => {
        items.push({
          id: `r-${r.id}`,
          title: "New responder request",
          description: profiles[r.user_id]?.display_name ?? "Applicant",
          time: new Date(r.created_at).toLocaleString(),
          section: "pending",
        });
      });
    alerts
      .filter((a) => a.status === "pending")
      .slice(0, 5)
      .forEach((a) => {
        items.push({
          id: `a-${a.id}`,
          title: "New emergency alert",
          description: a.description.slice(0, 60),
          time: new Date(a.created_at).toLocaleString(),
          section: "alerts",
        });
      });
    return items.slice(0, 8);
  }, [alerts, responders, profiles]);

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
      .update({ status, rejection_reason, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Role sync is now handled by DB trigger on responders status change.
    toast.success(`Responder ${status}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // 7-day chart
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map((d) => {
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
  }, [alerts]);

  const statusPie = useMemo(
    () => [
      { name: "Pending", value: stats.pending, color: "hsl(var(--warning))" },
      { name: "Active", value: stats.active, color: "hsl(var(--primary))" },
      { name: "Solved", value: stats.solved, color: "hsl(var(--success))" },
      { name: "Rejected", value: stats.rejected, color: "hsl(var(--muted-foreground))" },
    ],
    [stats]
  );

  const allMarkers: MapMarkerSpec[] = alerts.slice(0, 100).map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    color: a.status === "solved" ? "success" : a.status === "pending" ? "primary" : "accent",
    title: a.description.slice(0, 40),
  }));

  const filteredUsers = useMemo(() => {
    const list = Object.values(profiles);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.display_name?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.cnic?.toLowerCase().includes(q) ||
        p.area?.toLowerCase().includes(q) ||
        p.wallet_address?.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const detailedAlert = selectedAlert ? alerts.find((a) => a.id === selectedAlert) : null;

  // ---------- SIDEBAR ----------
  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-emergency flex items-center justify-center shadow-emergency">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold leading-tight">AmaanChain</div>
            <Badge variant="secondary" className="text-[10px] mt-0.5">Admin</Badge>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((n) => {
          const active = section === n.id;
          const badge =
            n.id === "pending" && stats.pendingResponders > 0
              ? stats.pendingResponders
              : n.id === "alerts" && stats.pending > 0
              ? stats.pending
              : null;
          return (
            <button
              key={n.id}
              onClick={() => {
                setSection(n.id);
                onNavigate?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <n.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{n.label}</span>
              {badge !== null && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-warning-foreground">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60 px-3 mb-2 truncate">{user?.email}</div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );

  // ---------- SECTIONS ----------
  const HomeSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Siren} label="Total alerts" value={stats.totalAlerts} />
        <StatCard icon={Siren} label="Pending" value={stats.pending} accent="primary" />
        <StatCard icon={CheckCircle2} label="Solved" value={stats.solved} accent="success" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} accent="muted" />
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} accent="accent" />
        <StatCard icon={ShieldCheck} label="Total responders" value={stats.totalResponders} accent="accent" />
        <StatCard icon={FileCheck2} label="Evidence" value={stats.totalEvidence} accent="primary" />
        <StatCard icon={ClipboardList} label="Pending requests" value={stats.pendingResponders} accent="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Jump straight into the most-used admin tools</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction icon={BarChart3} label="Open analytics" onClick={() => setSection("analytics")} />
          <QuickAction icon={Siren} label="View all alerts" onClick={() => setSection("alerts")} />
          <QuickAction icon={ListChecks} label="Alert details" onClick={() => setSection("alert-details")} />
          <QuickAction icon={Users} label="Responders" onClick={() => setSection("responders")} />
          <QuickAction
            icon={ClipboardList}
            label={`Pending requests${stats.pendingResponders ? ` (${stats.pendingResponders})` : ""}`}
            onClick={() => setSection("pending")}
            highlight={stats.pendingResponders > 0}
          />
          <QuickAction icon={UserCog} label="Manage users" onClick={() => setSection("users")} />
          <QuickAction icon={FileCheck2} label="Evidence" onClick={() => setSection("evidence")} />
          <QuickAction icon={ShieldCheck} label="Audit evidence" onClick={() => setSection("audit")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Live alert map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 rounded-lg overflow-hidden">
            <LiveMap
              center={alerts[0] ? { lat: alerts[0].lat, lng: alerts[0].lng } : { lat: 30.3753, lng: 69.3451 }}
              markers={allMarkers}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AnalyticsSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Siren} label="Total alerts" value={stats.totalAlerts} />
        <StatCard icon={CheckCircle2} label="Solved" value={stats.solved} accent="success" />
        <StatCard icon={Users} label="Users" value={stats.totalUsers} accent="accent" />
        <StatCard icon={ShieldCheck} label="Responders" value={stats.totalResponders} accent="accent" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
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
        <Card>
          <CardHeader><CardTitle>Alert status breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {statusPie.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const AlertsSection = () => {
    const filtered = filterAlerts(alerts, alertFilters, areaLookup);
    return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>All alerts ({filtered.length}{filtered.length !== alerts.length && ` of ${alerts.length}`})</CardTitle>
          <AlertFilters value={alertFilters} onChange={setAlertFilters} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell><Badge className={STATUS_COLORS[a.status]}>{a.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="capitalize">{a.priority}</TableCell>
                <TableCell className="text-xs">{profiles[a.user_id]?.display_name ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{a.description}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedAlert(a.id); setSection("alert-details"); }}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {alerts.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No alerts.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const AlertDetailsSection = () => {
    if (!detailedAlert) {
      return (
        <Card>
          <CardHeader><CardTitle>Alert details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Select an alert from the list below.</p>
            <div className="space-y-2">
              {alerts.slice(0, 10).map((a) => (
                <button
                  key={a.id}
                  className="w-full text-left border rounded-lg p-3 hover:bg-muted/40 transition-smooth"
                  onClick={() => setSelectedAlert(a.id)}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                    <span className="text-sm font-medium truncate">{a.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    const p = profiles[detailedAlert.user_id];
    const ev = evidence.filter((e) => e.alert_id === detailedAlert.id);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>← Back to list</Button>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Alert {detailedAlert.id.slice(0, 8)}</CardTitle>
              <Badge className={STATUS_COLORS[detailedAlert.status]}>{detailedAlert.status}</Badge>
            </div>
            <CardDescription>{new Date(detailedAlert.created_at).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <p className="text-sm">{detailedAlert.description}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Reporter</div>
                <p className="text-sm">{p?.display_name ?? "—"} {p?.phone ? `• ${p.phone}` : ""}</p>
                <p className="text-xs text-muted-foreground">{p?.area} {p?.address ? `— ${p.address}` : ""}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <p className="font-mono text-xs">{detailedAlert.lat.toFixed(5)}, {detailedAlert.lng.toFixed(5)}</p>
                <p className="text-xs text-muted-foreground">{detailedAlert.address ?? "—"}</p>
              </div>
            </div>
            <div className="h-64 rounded-lg overflow-hidden">
              <LiveMap
                center={{ lat: detailedAlert.lat, lng: detailedAlert.lng }}
                markers={[{ id: detailedAlert.id, lat: detailedAlert.lat, lng: detailedAlert.lng, color: "primary", title: detailedAlert.description }]}
              />
            </div>
            <div>
              <div className="text-xs font-medium mb-2">Evidence ({ev.length})</div>
              {ev.length === 0 && <p className="text-xs text-muted-foreground">No evidence uploaded.</p>}
              {ev.map((e) => (
                <a
                  key={e.id}
                  href={e.ipfs_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between border rounded-md p-2 hover:bg-muted/40 mb-1.5"
                >
                  <span className="text-sm truncate">{e.file_name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const RespondersSection = ({ onlyPending = false }: { onlyPending?: boolean }) => {
    const list = onlyPending ? responders.filter((r) => r.status === "pending") : responders;
    return (
      <div className="space-y-3">
        {list.length === 0 && (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">{onlyPending ? "No pending requests." : "No responders yet."}</CardContent></Card>
        )}
        {list.map((r) => {
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
                      {p?.wallet_address && <div className="font-mono truncate max-w-xs">💼 {p.wallet_address}</div>}
                      <div>{r.specialty ? `Specialty: ${r.specialty}` : "No specialty"} • Rating {r.rating}★ • {r.total_responses} responses</div>
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
      </div>
    );
  };

  const UsersSection = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Users ({Object.keys(profiles).length})</CardTitle>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8 w-64" placeholder="Search name, CNIC, area…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>CNIC</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Role intent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((p) => (
              <TableRow key={p.user_id}>
                <TableCell>{p.display_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{p.phone ?? "—"}</TableCell>
                <TableCell className="text-xs">{p.cnic ?? "—"}</TableCell>
                <TableCell className="text-xs">{p.area ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[160px]">{p.wallet_address ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.role_intent ?? "user"}</Badge></TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const EvidenceSection = ({ audit = false }: { audit?: boolean }) => (
    <Card>
      <CardHeader>
        <CardTitle>{audit ? "Audit evidence (chain + IPFS)" : `Evidence (${evidence.length})`}</CardTitle>
        {audit && <CardDescription>Verify that every record has both an IPFS CID and a blockchain transaction hash.</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>IPFS CID</TableHead>
              <TableHead>Tx hash</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidence.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="max-w-[180px] truncate">{e.file_name}</TableCell>
                <TableCell className="text-xs">{profiles[e.uploaded_by]?.display_name ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[140px]">{e.wallet_address ?? "—"}</TableCell>
                <TableCell>
                  <a href={e.ipfs_url} target="_blank" rel="noreferrer" className="text-accent hover:underline text-xs font-mono truncate max-w-[140px] inline-block">
                    {e.ipfs_cid.slice(0, 14)}…
                  </a>
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {e.tx_hash ? (
                    <a href={`https://sepolia.etherscan.io/tx/${e.tx_hash}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      {e.tx_hash.slice(0, 10)}…
                    </a>
                  ) : audit ? <Badge variant="outline" className="text-warning-foreground border-warning">missing</Badge> : "—"}
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {evidence.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No evidence on record.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const ProfileSection = () => (
    <Card>
      <CardHeader><CardTitle>Admin profile</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div><span className="text-muted-foreground">Email: </span>{user?.email}</div>
        <div><span className="text-muted-foreground">User ID: </span><span className="font-mono text-xs">{user?.id}</span></div>
        <div><span className="text-muted-foreground">Role: </span><Badge>Admin</Badge></div>
      </CardContent>
    </Card>
  );

  const SettingsSection = () => (
    <Card>
      <CardHeader><CardTitle>Settings</CardTitle><CardDescription>Platform configuration</CardDescription></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <div className="font-medium">Auto-approve email signups</div>
            <div className="text-xs text-muted-foreground">Currently enabled for fast onboarding.</div>
          </div>
          <Badge variant="outline">enabled</Badge>
        </div>
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <div className="font-medium">Alert cooldown</div>
            <div className="text-xs text-muted-foreground">Users can only create one active alert per 20 minutes.</div>
          </div>
          <Badge variant="outline">20 min</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Responder role guard</div>
            <div className="text-xs text-muted-foreground">DB trigger blocks the responder role unless an approved application exists.</div>
          </div>
          <Badge variant="outline" className="border-success text-success">active</Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderSection = () => {
    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    switch (section) {
      case "home": return <HomeSection />;
      case "analytics": return <AnalyticsSection />;
      case "alerts": return <AlertsSection />;
      case "alert-details": return <AlertDetailsSection />;
      case "responders": return <RespondersSection />;
      case "pending": return <RespondersSection onlyPending />;
      case "users": return <UsersSection />;
      case "evidence": return <EvidenceSection />;
      case "audit": return <EvidenceSection audit />;
      case "profile": return <ProfileSection />;
      case "settings": return <SettingsSection />;
    }
  };

  const titleMap: Record<SectionId, string> = {
    home: "Admin Command Center",
    analytics: "Analytics",
    alerts: "All Alerts",
    "alert-details": "Alert Details",
    responders: "Responders",
    pending: "Pending Requests",
    users: "Manage Users",
    evidence: "Evidence",
    audit: "Audit Evidence",
    profile: "Profile",
    settings: "Settings",
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex sticky top-0 h-screen">
        <Sidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b px-4 md:px-6 h-14 flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold flex-1 truncate">{titleMap[section]}</h1>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b font-medium text-sm">Notifications</div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">You're all caught up.</div>
                )}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSection(n.section)}
                    className="w-full text-left p-3 border-b hover:bg-muted/40 transition-smooth"
                  >
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{n.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{n.time}</div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{renderSection()}</main>
      </div>
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

const QuickAction = ({
  icon: Icon,
  label,
  onClick,
  highlight,
}: {
  icon: typeof Home;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 rounded-lg border p-3 text-left transition-smooth hover:bg-muted/40",
      highlight && "border-warning bg-warning/5"
    )}
  >
    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
      <Icon className="h-4 w-4" />
    </div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default AdminDashboard;
