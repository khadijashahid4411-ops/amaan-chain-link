import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ComplaintForm } from "@/components/ComplaintForm";
import { ComplaintAgainstUser } from "@/components/ComplaintAgainstUser";
import { toast } from "sonner";
import { MessageSquareWarning, Loader2, Trash2, ShieldCheck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ComplaintRow {
  id: string;
  kind: "user_against_responder" | "admin_against_user" | "responder_against_user";
  complainant_id: string;
  target_user_id: string;
  target_responder_id: string | null;
  alert_id: string | null;
  category: string;
  message: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_notes: string | null;
  action_taken: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-warning/20 text-warning-foreground border-warning",
  reviewing: "bg-accent/20 text-accent border-accent",
  resolved: "bg-success/20 text-success border-success",
  dismissed: "bg-muted text-muted-foreground",
};

const Complaints = () => {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [items, setItems] = useState<ComplaintRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; phone: string | null; area: string | null }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as ComplaintRow[]);

    const ids = new Set<string>();
    (data ?? []).forEach((c: any) => {
      ids.add(c.complainant_id);
      ids.add(c.target_user_id);
    });
    if (ids.size > 0) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone, area")
        .in("user_id", Array.from(ids));
      const map: Record<string, any> = {};
      (ps ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("complaints-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <BackButton />
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <MessageSquareWarning className="h-7 w-7 text-primary" /> Complaints
            </h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Review user complaints and take action." : "File and track complaints about responders."}
            </p>
          </div>
          {!isAdmin && <ComplaintForm triggerLabel="File a complaint" />}
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isAdmin ? (
          <AdminView items={items} profiles={profiles} onChanged={load} />
        ) : (
          <UserView items={items.filter((c) => c.complainant_id === user?.id)} profiles={profiles} />
        )}
      </div>
    </AppShell>
  );
};

const UserView = ({ items, profiles }: { items: ComplaintRow[]; profiles: Record<string, any> }) => {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          You haven't filed any complaints yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <Card key={c.id}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                <Badge variant="outline" className="ml-2 capitalize">{c.category.replace("_", " ")}</Badge>
                <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <p className="text-sm">{c.message}</p>
            <div className="text-xs text-muted-foreground">
              About: {profiles[c.target_user_id]?.display_name ?? "—"}
            </div>
            {c.action_taken && (
              <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                <div className="font-medium text-success flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Admin response
                </div>
                <p className="mt-1">{c.action_taken}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const AdminView = ({
  items,
  profiles,
  onChanged,
}: {
  items: ComplaintRow[];
  profiles: Record<string, any>;
  onChanged: () => void;
}) => {
  const open = items.filter((c) => c.status === "open" || c.status === "reviewing");
  const closed = items.filter((c) => c.status === "resolved" || c.status === "dismissed");

  return (
    <Tabs defaultValue="open">
      <TabsList>
        <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
        <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="open" className="space-y-3 mt-4">
        {open.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No open complaints.</CardContent></Card>
        ) : (
          open.map((c) => (
            <AdminComplaintCard key={c.id} complaint={c} profiles={profiles} onChanged={onChanged} />
          ))
        )}
      </TabsContent>
      <TabsContent value="closed" className="space-y-3 mt-4">
        {closed.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No closed complaints.</CardContent></Card>
        ) : (
          closed.map((c) => (
            <AdminComplaintCard key={c.id} complaint={c} profiles={profiles} onChanged={onChanged} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};

const AdminComplaintCard = ({
  complaint,
  profiles,
  onChanged,
}: {
  complaint: ComplaintRow;
  profiles: Record<string, any>;
  onChanged: () => void;
}) => {
  const { user } = useAuth();
  const [action, setAction] = useState(complaint.action_taken ?? "");
  const [status, setStatus] = useState(complaint.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const targetProfile = profiles[complaint.target_user_id];
  const complainantProfile = profiles[complaint.complainant_id];

  const saveDecision = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("complaints")
      .update({
        status,
        action_taken: action || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", complaint.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Complaint updated");
      onChanged();
    }
  };

  const revokeResponder = async () => {
    if (!complaint.target_responder_id) return;
    const { error } = await supabase
      .from("responders")
      .update({ status: "rejected", rejection_reason: "Revoked due to complaint" })
      .eq("id", complaint.target_responder_id);
    if (error) toast.error(error.message);
    else toast.success("Responder approval revoked");
  };

  const deleteUser = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { target_user_id: complaint.target_user_id },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Delete failed");
    } else {
      toast.success("User account deleted");
      onChanged();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">
              {complaint.kind === "user_against_responder" ? "User → Responder" : "Admin → User"}
            </CardTitle>
            <CardDescription className="mt-1">
              By <strong>{complainantProfile?.display_name ?? "—"}</strong> against{" "}
              <strong>{targetProfile?.display_name ?? "—"}</strong>
              {targetProfile?.area && ` (${targetProfile.area})`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[complaint.status]}>{complaint.status}</Badge>
            <Badge variant="outline" className="capitalize">{complaint.category.replace("_", " ")}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="text-xs text-muted-foreground mb-1">Complaint message</p>
          {complaint.message}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Update status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`action-${complaint.id}`} className="text-xs">Action taken / response to complainant</Label>
          <Textarea
            id={`action-${complaint.id}`}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Explain what action you took…"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button onClick={saveDecision} disabled={saving} size="sm">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save decision
          </Button>
          {complaint.target_responder_id && (
            <Button onClick={revokeResponder} variant="outline" size="sm">
              Revoke responder approval
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete user account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this user permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove <strong>{targetProfile?.display_name ?? "the user"}</strong> from authentication and
                  delete their profile, roles, responder record, evidence uploads, and active alerts. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteUser}>Yes, delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default Complaints;
