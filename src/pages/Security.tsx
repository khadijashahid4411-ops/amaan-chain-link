import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Trash2 } from "lucide-react";

const Security = () => {
  const [factors, setFactors] = useState<any[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const refresh = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  };

  useEffect(() => { refresh(); }, []);

  const enroll = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${Date.now()}`,
    });
    if (error) return toast.error(error.message);
    setQr(data.totp.qr_code);
    setFactorId(data.id);
  };

  const verify = async () => {
    if (!factorId || !code) return;
    const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
    if (!ch) return toast.error("Challenge failed");
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });
    if (error) return toast.error(error.message);
    toast.success("MFA enabled");
    setQr(null); setFactorId(null); setCode("");
    refresh();
  };

  const unenroll = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error(error.message);
    toast.success("Removed");
    refresh();
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" />Security</h1>
        <p className="text-muted-foreground">Add a second factor to protect your account.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Authenticator app (TOTP)</CardTitle>
          <CardDescription>Use Google Authenticator, Authy, or 1Password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {factors.length > 0 && factors.map((f) => (
            <div key={f.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium">{f.friendly_name || "Authenticator"}</div>
                <div className="text-xs text-muted-foreground">Status: {f.status}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => unenroll(f.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          {!qr && (
            <Button onClick={enroll}><KeyRound className="h-4 w-4 mr-2" />Add authenticator</Button>
          )}

          {qr && (
            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm">Scan this QR with your authenticator app:</p>
              <img src={qr} alt="MFA QR code" className="w-48 h-48 bg-white p-2 rounded" />
              <div>
                <Label>Enter the 6-digit code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" />
              </div>
              <Button onClick={verify}>Verify & enable</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Security;
