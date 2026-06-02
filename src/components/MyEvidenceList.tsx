import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileCheck2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

/**
 * Shows ALL evidence uploaded by the current user — across every alert plus
 * standalone uploads (alert_id null). Used on the dedicated Evidence pages.
 */
export const MyEvidenceList = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("evidence")
        .select("*")
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`my-ev-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evidence", filter: `uploaded_by=eq.${user.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading evidence…</p>;
  if (!items.length)
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          You haven't uploaded any evidence yet. Use the uploader above to anchor your first file on IPFS + Sepolia.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-2">
      {items.map((e) => (
        <Card key={e.id} className="bg-muted/30">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="h-4 w-4 text-success shrink-0" />
                <span className="text-sm font-medium truncate">{e.title || e.file_name}</span>
              </div>
              <div className="flex gap-1.5">
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {e.uploader_role}
                </Badge>
                {!e.alert_id && (
                  <Badge variant="outline" className="text-[10px]">
                    Standalone
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {e.title && <div className="truncate">file: {e.file_name}</div>}
              {e.description && (
                <div className="text-sm text-foreground/80 break-words">{e.description}</div>
              )}
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
