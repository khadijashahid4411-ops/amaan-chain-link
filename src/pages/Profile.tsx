import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import { PAKISTAN_AREAS } from "@/lib/pakistan-areas";
import { z } from "zod";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Name too short").max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  cnic: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  area: z.string().trim().max(60).optional().or(z.literal("")),
  wallet_address: z.string().trim().max(64).optional().or(z.literal("")),
});

const Profile = () => {
  const { user, roles, primaryRole } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    cnic: "",
    address: "",
    area: "",
    wallet_address: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile(data);
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          phone: data.phone ?? "",
          cnic: data.cnic ?? "",
          address: data.address ?? "",
          area: data.area ?? "",
          wallet_address: data.wallet_address ?? "",
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const payload = {
      display_name: form.display_name,
      phone: form.phone || null,
      cnic: form.cnic || null,
      address: form.address || null,
      area: form.area || null,
      wallet_address: form.wallet_address || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <BackButton />
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UserIcon className="h-7 w-7 text-primary" /> My profile
            </h1>
            <p className="text-muted-foreground">View and update your account details.</p>
          </div>
          <div className="flex items-center gap-2">
            {roles.map((r) => (
              <Badge key={r} variant="outline" className="capitalize">{r}</Badge>
            ))}
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Email: {user?.email} • Role: {primaryRole}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name *</Label>
                <Input id="name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cnic">CNIC</Label>
                <Input id="cnic" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Select value={form.area || undefined} onValueChange={(v) => setForm({ ...form, area: v })}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {PAKISTAN_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="addr">Address</Label>
                <Textarea id="addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} rows={2} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wallet">Wallet address (Sepolia)</Label>
                <Input id="wallet" className="font-mono text-xs" value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })} maxLength={64} placeholder="0x…" />
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default Profile;
