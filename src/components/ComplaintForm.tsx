import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquareWarning, Loader2 } from "lucide-react";
import { z } from "zod";

type Responder = Database["public"]["Tables"]["responders"]["Row"];

const schema = z.object({
  category: z.enum(["misconduct", "negligence", "false_response", "rude_behavior", "other"]),
  message: z.string().trim().min(10, "Please give at least 10 characters of detail").max(1000),
});

interface Props {
  /** Responder being reported. If omitted, user picks from approved responders. */
  responder?: Responder;
  /** Optional alert this complaint relates to. */
  alertId?: string;
  /** Optional override for the trigger button label. */
  triggerLabel?: string;
  /** Render as a small ghost button (used inside cards). */
  small?: boolean;
}

export const ComplaintForm = ({ responder, alertId, triggerLabel = "Report responder", small }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<z.infer<typeof schema>["category"]>("misconduct");
  const [message, setMessage] = useState("");
  const [responders, setResponders] = useState<Responder[]>([]);
  const [chosenResponderId, setChosenResponderId] = useState<string | undefined>(responder?.id);

  useEffect(() => {
    if (!open || responder) return;
    supabase
      .from("responders")
      .select("*")
      .eq("status", "approved")
      .then(({ data }) => setResponders(data ?? []));
  }, [open, responder]);

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ category, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const targetResponderId = chosenResponderId ?? responder?.id;
    if (!targetResponderId) {
      toast.error("Pick a responder to report");
      return;
    }
    const target = responder ?? responders.find((r) => r.id === targetResponderId);
    if (!target) {
      toast.error("Responder not found");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("complaints").insert({
      kind: "user_against_responder",
      complainant_id: user.id,
      target_user_id: target.user_id,
      target_responder_id: target.id,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File a complaint</DialogTitle>
          <DialogDescription>
            Your report goes directly to admins. Please be accurate — false complaints may result in account action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!responder && (
            <div className="space-y-2">
              <Label>Responder</Label>
              <Select value={chosenResponderId} onValueChange={setChosenResponderId}>
                <SelectTrigger><SelectValue placeholder="Select a responder" /></SelectTrigger>
                <SelectContent>
                  {responders.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.specialty ?? "Responder"} • {r.rating}★
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="misconduct">Misconduct</SelectItem>
                <SelectItem value="negligence">Negligence / no-show</SelectItem>
                <SelectItem value="false_response">False response</SelectItem>
                <SelectItem value="rude_behavior">Rude behavior</SelectItem>
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
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit complaint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
