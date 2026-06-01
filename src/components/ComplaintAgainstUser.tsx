import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquareWarning, Loader2, Search } from "lucide-react";
import { z } from "zod";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const schema = z.object({
  category: z.enum(["false_alert", "abuse", "harassment", "no_emergency", "other"]),
  message: z.string().trim().min(10, "Please give at least 10 characters of detail").max(1000),
});

interface Props {
  /** Optional alert this complaint relates to. */
  alertId?: string;
  /** Optional pre-selected user. */
  targetUserId?: string;
  triggerLabel?: string;
  small?: boolean;
  /** Who is filing: "responder" sends `responder_against_user`, "admin" sends `admin_against_user`. */
  filerKind: "responder" | "admin";
}

export const ComplaintAgainstUser = ({
  alertId,
  targetUserId,
  triggerLabel = "Report a user",
  small,
  filerKind,
}: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<z.infer<typeof schema>["category"]>("false_alert");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chosenUserId, setChosenUserId] = useState<string | undefined>(targetUserId);

  useEffect(() => {
    if (!open) return;
    setChosenUserId(targetUserId);
    supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true })
      .limit(500)
      .then(({ data }) => setProfiles(data ?? []));
  }, [open, targetUserId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = profiles.filter((p) => p.user_id !== user?.id);
    if (!q) return list.slice(0, 30);
    return list
      .filter((p) =>
        (p.display_name ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        (p.cnic ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [profiles, search, user?.id]);

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ category, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!chosenUserId) {
      toast.error("Pick a user to report");
      return;
    }

    setSubmitting(true);
    const kind = filerKind === "admin" ? "admin_against_user" : "responder_against_user";
    const { error } = await supabase.from("complaints").insert({
      kind,
      complainant_id: user.id,
      target_user_id: chosenUserId,
      alert_id: alertId ?? null,
      category: parsed.data.category,
      message: parsed.data.message,
    });
    setSubmitting(false);

    if (error) toast.error(error.message);
    else {
      toast.success("Complaint submitted — admin will review it");
      setOpen(false);
      setMessage("");
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={small ? "ghost" : "outline"} size={small ? "sm" : "default"}>
          <MessageSquareWarning className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a user</DialogTitle>
          <DialogDescription>
            Use this to report a user for false alerts, abuse, or misuse of the emergency system. Admin will review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!targetUserId && (
            <div className="space-y-2">
              <Label>Search user by name, phone or CNIC</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Start typing a name…"
                  className="pl-8"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {filtered.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">No matching users.</div>
                )}
                {filtered.map((p) => (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => setChosenUserId(p.user_id)}
                    className={`w-full text-left p-2 text-sm hover:bg-muted/40 ${
                      chosenUserId === p.user_id ? "bg-accent/20" : ""
                    }`}
                  >
                    <div className="font-medium">{p.display_name ?? "Unnamed user"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.phone ?? ""} {p.area ? `• ${p.area}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false_alert">False / fake alert</SelectItem>
                <SelectItem value="abuse">Abusive behaviour</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="no_emergency">No real emergency on arrival</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg">What happened?</Label>
            <Textarea
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the incident in detail…"
              maxLength={1000}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !chosenUserId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit complaint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
