import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileCheck2, Search, Library } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type Evidence = Database["public"]["Tables"]["evidence"]["Row"];
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id" | "display_name">;

type Filter = "all" | "mine" | "user" | "responder" | "admin";

const EvidenceLibrary = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Evidence[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("evidence")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = data ?? [];
      setItems(list);

      const ids = Array.from(new Set(list.map((e) => e.uploaded_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: Profile) => {
          if (p.user_id) map[p.user_id] = p.display_name ?? "Unknown";
        });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("evidence-library")
      .on("postgres_changes", { event: "*", schema: "public", table: "evidence" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((e) => {
      if (filter === "mine" && e.uploaded_by !== user?.id) return false;
      if (filter !== "all" && filter !== "mine" && e.uploader_role !== filter) return false;
      if (!term) return true;
      const name = (profiles[e.uploaded_by ?? ""] ?? "").toLowerCase();
      return (
        (e.title ?? "").toLowerCase().includes(term) ||
        (e.file_name ?? "").toLowerCase().includes(term) ||
        (e.description ?? "").toLowerCase().includes(term) ||
        (e.ipfs_cid ?? "").toLowerCase().includes(term) ||
        name.includes(term)
      );
    });
  }, [items, q, filter, profiles, user?.id]);

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Library className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Evidence Library</h1>
          <p className="text-sm text-muted-foreground">
            Shared view of every evidence file anchored on IPFS &amp; Sepolia by users, responders and admins.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Browse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, file name, description, CID, or uploader…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All"],
              ["mine", "Mine"],
              ["user", "Users"],
              ["responder", "Responders"],
              ["admin", "Admins"],
            ] as [Filter, string][]).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading library…</p>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No evidence matches the current filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((e) => (
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
                  <div className="text-foreground/80">
                    Uploaded by{" "}
                    <span className="font-medium">
                      {profiles[e.uploaded_by ?? ""] ?? "Unknown"}
                      {e.uploaded_by === user?.id && " (you)"}
                    </span>
                  </div>
                  {e.title && <div className="truncate">file: {e.file_name}</div>}
                  {e.description && (
                    <div className="text-sm text-foreground/80 break-words">{e.description}</div>
                  )}
                  <div className="font-mono truncate">cid: {e.ipfs_cid}</div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href={e.ipfs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      Open on IPFS <ExternalLink className="h-3 w-3" />
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
      )}
    </div>
  );
};

export default EvidenceLibrary;
