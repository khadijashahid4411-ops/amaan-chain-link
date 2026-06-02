import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Siren, Clock, CheckCircle2, XCircle, Loader2, Star } from "lucide-react";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];

interface Stat {
  label: string;
  value: number | string;
  icon: typeof Siren;
  tone: string;
}

/** Compact stats grid summarising a user's alert history. */
export const UserStats = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id);
      setAlerts(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`user-stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const count = (fn: (a: Alert) => boolean) => alerts.filter(fn).length;
  const total = alerts.length;
  const solved = count((a) => a.status === "solved");
  const pending = count((a) => a.status === "pending");
  const accepted = count((a) => a.status === "accepted");
  const inProgress = count((a) => a.status === "in_progress");
  const rejected = count((a) => a.status === "rejected" || a.status === "cancelled");
  const ratings = alerts.filter((a) => a.rating != null);
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, a) => s + (a.rating ?? 0), 0) / ratings.length).toFixed(1)
      : "—";

  const stats: Stat[] = [
    { label: "Sent", value: total, icon: Siren, tone: "text-primary" },
    { label: "Pending", value: pending, icon: Clock, tone: "text-warning" },
    { label: "Accepted", value: accepted, icon: CheckCircle2, tone: "text-accent" },
    { label: "In progress", value: inProgress, icon: Loader2, tone: "text-primary" },
    { label: "Solved", value: solved, icon: CheckCircle2, tone: "text-success" },
    { label: "Rejected/cancelled", value: rejected, icon: XCircle, tone: "text-muted-foreground" },
    { label: "Avg rating given", value: avgRating, icon: Star, tone: "text-warning" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-4">
            <div className={`flex items-center gap-1.5 text-xs ${s.tone}`}>
              <s.icon className="h-3.5 w-3.5" />
              <span className="truncate">{s.label}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
