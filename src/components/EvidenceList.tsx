import { useEffect, useState } from "react";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileCheck2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

export const EvidenceList = ({ alertId }: { alertId: string }) => {
  const [items, setItems] = useState<Evidence[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("evidence")
        .select("*")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
    };
    load();
    const channel = supabase
      .channel(`ev-${alertId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evidence", filter: `alert_id=eq.${alertId}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId]);

  if (!items.length) return <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>;

  return (
    <div className="space-y-2">
      {items.map((e) => (
        <Card key={e.id} className="bg-muted/30">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="h-4 w-4 text-success shrink-0" />
                <span className="text-sm font-medium truncate">{e.title || e.file_name}</span>
              </div>
              <Badge variant="secondary" className="capitalize text-[10px]">{e.uploader_role}</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {e.title && <div className="truncate">file: {e.file_name}</div>}
              {e.description && <div className="text-sm text-foreground/80 break-words">{e.description}</div>}
              <div className="font-mono truncate">hash: {e.file_hash}</div>
              <div className="font-mono truncate">cid: {e.ipfs_cid}</div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={e.ipfs_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  IPFS <ExternalLink className="h-3 w-3" />
                </a>
                {e.tx_hash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${e.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    Sepolia tx <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span>{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
