import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle2, Clock, Star, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const ResponderPerformance = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ accepted: 0, solved: 0, avgMinutes: 0, avgRating: 0, successRate: 0 });
  const [weekly, setWeekly] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // resolve responder row
      const { data: resp } = await supabase.from("responders").select("id, rating").eq("user_id", user.id).maybeSingle();
      if (!resp) return;
      const { data: alerts } = await supabase
        .from("alerts")
        .select("status, created_at, accepted_at, solved_at, rating")
        .eq("assigned_responder_id", resp.id);
      const list = alerts ?? [];
      const accepted = list.filter((a) => a.accepted_at).length;
      const solved = list.filter((a) => a.status === "solved").length;
      const responseMs = list
        .filter((a) => a.accepted_at)
        .map((a) => new Date(a.accepted_at!).getTime() - new Date(a.created_at).getTime());
      const avgMinutes = responseMs.length ? Math.round(responseMs.reduce((s, m) => s + m, 0) / responseMs.length / 60000) : 0;
      const ratings = list.filter((a) => a.rating).map((a) => a.rating!);
      const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : (resp.rating ?? 0);
      const successRate = accepted ? Math.round((solved / accepted) * 100) : 0;
      setStats({ accepted, solved, avgMinutes, avgRating, successRate });

      // weekly count
      const days: Record<string, number> = {};
      const now = Date.now();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        days[d.toLocaleDateString(undefined, { weekday: "short" })] = 0;
      }
      list.forEach((a) => {
        const d = new Date(a.created_at);
        if (now - d.getTime() <= 7 * 86400000) {
          const k = d.toLocaleDateString(undefined, { weekday: "short" });
          if (k in days) days[k]++;
        }
      });
      setWeekly(Object.entries(days).map(([day, count]) => ({ day, count })));
    })();
  }, [user]);

  const cards = [
    { icon: CheckCircle2, label: "Cases solved", value: stats.solved, color: "text-success" },
    { icon: Clock, label: "Avg response", value: `${stats.avgMinutes} min`, color: "text-accent" },
    { icon: Star, label: "Avg rating", value: stats.avgRating.toFixed(1), color: "text-warning" },
    { icon: TrendingUp, label: "Success rate", value: `${stats.successRate}%`, color: "text-primary" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6" />Performance</h1>
        <p className="text-muted-foreground">Your responder metrics at a glance.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <div className="text-2xl font-bold mt-2">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Alerts in the last 7 days</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekly}>
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponderPerformance;
