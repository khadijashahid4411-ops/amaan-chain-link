import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EvidenceUpload } from "@/components/EvidenceUpload";
import { EvidenceList } from "@/components/EvidenceList";
import { FileImage, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BackButton } from "@/components/BackButton";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Responder = Database["public"]["Tables"]["responders"]["Row"];

const ResponderEvidence = () => {
  const { user } = useAuth();
  const [responder, setResponder] = useState<Responder | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showStandalone, setShowStandalone] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("responders")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setResponder(data);
    })();
  }, [user]);

  useEffect(() => {
    if (!responder?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("assigned_responder_id", responder.id)
        .order("created_at", { ascending: false });
      setAlerts(data ?? []);
    };
    load();
    const ch = supabase
      .channel("responder-evidence")
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [responder?.id]);

  if (!responder || responder.status !== "approved") {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You need an approved responder profile to upload evidence here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <BackButton />
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <FileImage className="h-7 w-7 text-primary" /> Responder Evidence
        </h1>
        <p className="text-muted-foreground">
          Upload tamper-proof evidence for alerts you've handled — or independently as a field report.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Independent field report</CardTitle>
              <CardDescription>Anchor evidence not linked to any specific alert.</CardDescription>
            </div>
            <Button
              size="sm"
              variant={showStandalone ? "secondary" : "default"}
              onClick={() => setShowStandalone((s) => !s)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {showStandalone ? "Close" : "New upload"}
            </Button>
          </div>
        </CardHeader>
        {showStandalone && (
          <CardContent>
            <EvidenceUpload alertId={null} onUploaded={() => setShowStandalone(false)} />
          </CardContent>
        )}
      </Card>

      {alerts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You haven't accepted any alerts yet. Use the independent uploader above to anchor field evidence.
          </CardContent>
        </Card>
      )}

      {alerts.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="text-base break-words">{a.description}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">{a.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="capitalize">{a.priority}</Badge>
                  <span className="text-xs">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant={openId === a.id ? "secondary" : "default"}
                onClick={() => setOpenId(openId === a.id ? null : a.id)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {openId === a.id ? "Close uploader" : "Add evidence"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <EvidenceList alertId={a.id} />
            {openId === a.id && <EvidenceUpload alertId={a.id} onUploaded={() => setOpenId(null)} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ResponderEvidence;
