import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Loader2, XCircle, Clock, RefreshCw } from "lucide-react";

type Responder = Database["public"]["Tables"]["responders"]["Row"];

export const BecomeResponder = () => {
  const { user, roles } = useAuth();
  const [app, setApp] = useState<Responder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [message, setMessage] = useState("");

  const isResponder = roles.includes("responder");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("responders")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setApp(data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("my-responder-app")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responders", filter: `user_id=eq.${user.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (message.trim().length < 10) {
      toast.error("Tell the admin why you want to become a responder (min 10 chars)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("responders").insert({
      user_id: user.id,
      status: "pending",
      specialty: specialty.trim() || null,
      request_message: message.trim(),
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Request sent to admin");
  };

  const reapply = async () => {
    if (!app) return;
    const { error } = await supabase.from("responders").delete().eq("id", app.id);
    if (error) toast.error(error.message);
    else {
      setApp(null);
      toast.success("You can submit a new request");
    }
  };

  if (loading || isResponder) return null;

  // Approved but role not yet picked up — ask user to re-login
  if (app?.status === "approved") {
    return (
      <Card className="border-success">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <ShieldCheck className="h-5 w-5" /> Responder application approved
          </CardTitle>
          <CardDescription>
            Sign out and sign back in to access your Responder dashboard.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (app?.status === "rejected") {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" /> Responder application rejected
          </CardTitle>
          <CardDescription>
            {app.rejection_reason
              ? `Reason: ${app.rejection_reason}`
              : "No reason was provided by the admin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={reapply}>
            <RefreshCw className="h-4 w-4 mr-2" /> Submit a new request
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (app?.status === "pending") {
    return (
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" /> Request pending
          </CardTitle>
          <CardDescription>
            The admin has been notified and will review your application shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {app.specialty && (
            <div>
              <Badge variant="outline">Specialty</Badge> {app.specialty}
            </div>
          )}
          {app.request_message && (
            <div className="text-muted-foreground">"{app.request_message}"</div>
          )}
        </CardContent>
      </Card>
    );
  }

  // suspended
  if (app?.status === "suspended") {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Responder access suspended</CardTitle>
          <CardDescription>Contact the admin for more information.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No application yet
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" /> Become a Responder
        </CardTitle>
        <CardDescription>
          Apply to join the responder network. The admin will review your request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="specialty">Specialty (optional)</Label>
          <Input
            id="specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Medical, Fire, Rescue, Police…"
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Why do you want to become a responder?</Label>
          <Textarea
            id="reason"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Share your training, experience, or motivation…"
          />
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Send request to admin
        </Button>
      </CardContent>
    </Card>
  );
};
