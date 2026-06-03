import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Siren, CheckCircle2, Loader2, Star, ShieldCheck } from "lucide-react";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];

/** Stats for the signed-in responder. */
export const ResponderStats = ({ responder }: { responder: Responder }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!user || !responder?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("assigned_responder_id", responder.id);
      setAlerts(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`resp-stats-${responder.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, responder?.id]);

  const count = (fn: (a: Alert) => boolean) => alerts.filter(fn).length;
  const accepted = count((a) => a.status === "accepted");
  const inProgress = count((a) => a.status === "in_progress");
  const solved = count((a) => a.status === "solved");
  const ratings = alerts.filter((a) => a.rating != null);
  const avg =
    ratings.length > 0
      ? (ratings.reduce((s, a) => s + (a.rating ?? 0), 0) / ratings.length).toFixed(1)
      : Number(responder.rating ?? 5).toFixed(1);

  const stats = [
    { label: "Total responses", value: responder.total_responses, icon: ShieldCheck, tone: "text-primary" },
    { label: "Accepted", value: accepted, icon: CheckCircle2, tone: "text-accent" },
    { label: "In progress", value: inProgress, icon: Loader2, tone: "text-primary" },
    { label: "Solved", value: solved, icon: CheckCircle2, tone: "text-success" },
    { label: "Avg rating", value: avg, icon: Star, tone: "text-warning" },
    { label: "Assigned (all-time)", value: alerts.length, icon: Siren, tone: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-5 pb-5">
            <div className={`flex items-center gap-2 text-sm font-medium ${s.tone}`}>
              <s.icon className="h-4 w-4 shrink-0" />
              <span className="break-words leading-tight">{s.label}</span>
            </div>
            <div className="text-3xl font-bold mt-2">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
