import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EvidenceUpload } from "@/components/EvidenceUpload";
import { MyEvidenceList } from "@/components/MyEvidenceList";
import { FileImage, Plus } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const UserEvidence = () => {
  const { user } = useAuth();
  const [showUploader, setShowUploader] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // keep realtime hook (the MyEvidenceList has its own subscription, this is a backup)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("user-evidence-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, () =>
        setRefreshKey((k) => k + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <BackButton />
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <FileImage className="h-7 w-7 text-primary" /> Upload Evidence
        </h1>
        <p className="text-muted-foreground">
          Anchor photos, videos and documents on IPFS + Sepolia. Uploads here are independent and
          not tied to any specific alert.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">New evidence</CardTitle>
              <CardDescription>Add tamper-proof proof anchored on blockchain.</CardDescription>
            </div>
            <Button
              size="sm"
              variant={showUploader ? "secondary" : "default"}
              onClick={() => setShowUploader((s) => !s)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {showUploader ? "Close" : "New upload"}
            </Button>
          </div>
        </CardHeader>
        {showUploader && (
          <CardContent>
            <EvidenceUpload alertId={null} onUploaded={() => setShowUploader(false)} />
          </CardContent>
        )}
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your evidence history</h2>
        <MyEvidenceList key={refreshKey} />
      </section>
    </div>
  );
};

export default UserEvidence;
