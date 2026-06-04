import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, MessageCircle, Trash2, Star, Plus, Bell } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  relation: string | null;
  phone: string;
  is_priority: boolean;
}

const EmergencyContacts = () => {
  const { user } = useAuth();
  const { coords } = useGeolocation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("emergency_contacts")
      .select("*")
      .order("is_priority", { ascending: false })
      .order("created_at", { ascending: false });
    setContacts(data ?? []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const add = async () => {
    if (!name.trim() || !phone.trim()) return toast.error("Name and phone required");
    const { error } = await (supabase as any).from("emergency_contacts").insert({
      user_id: user!.id,
      name: name.trim(),
      relation: relation.trim() || null,
      phone: phone.trim(),
      is_priority: priority,
    });
    if (error) return toast.error(error.message);
    setName(""); setRelation(""); setPhone(""); setPriority(false);
    toast.success("Contact added");
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("emergency_contacts").delete().eq("id", id);
    load();
  };

  const togglePriority = async (c: Contact) => {
    await (supabase as any)
      .from("emergency_contacts")
      .update({ is_priority: !c.is_priority })
      .eq("id", c.id);
    load();
  };

  const buildMessage = () => {
    const loc = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";
    return `EMERGENCY: I need help. ${loc ? `My location: ${loc}` : ""} — sent via AmaanChain`;
  };

  const notifyAll = () => {
    if (!contacts.length) return toast.error("Add contacts first");
    const msg = encodeURIComponent(buildMessage());
    contacts.forEach((c, i) => {
      const phone = c.phone.replace(/\D/g, "");
      setTimeout(() => window.open(`https://wa.me/${phone}?text=${msg}`, "_blank"), i * 300);
    });
    toast.success(`Opening WhatsApp for ${contacts.length} contact(s)`);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Emergency Contacts</h1>
        <p className="text-muted-foreground">Family & trusted friends to notify in emergencies.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Add contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Relation</Label><Input placeholder="Father, friend..." value={relation} onChange={(e) => setRelation(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Phone (with country code)</Label><Input placeholder="+923001234567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={priority} onCheckedChange={setPriority} id="prio" />
            <Label htmlFor="prio">Priority contact</Label>
          </div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>My contacts ({contacts.length})</CardTitle>
          <Button onClick={notifyAll} variant="default" size="sm" disabled={!contacts.length}>
            <Bell className="h-4 w-4 mr-2" />Notify all
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
          {contacts.map((c) => {
            const cleanPhone = c.phone.replace(/\D/g, "");
            const msg = encodeURIComponent(buildMessage());
            return (
              <div key={c.id} className="flex items-center justify-between gap-2 border rounded-lg p-3">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.name}
                    {c.is_priority && <Badge variant="secondary"><Star className="h-3 w-3 mr-1" />Priority</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.relation} • {c.phone}</div>
                </div>
                <div className="flex gap-1">
                  <Button asChild size="icon" variant="outline"><a href={`tel:${c.phone}`}><Phone className="h-4 w-4" /></a></Button>
                  <Button asChild size="icon" variant="outline"><a href={`https://wa.me/${cleanPhone}?text=${msg}`} target="_blank"><MessageCircle className="h-4 w-4" /></a></Button>
                  <Button size="icon" variant="ghost" onClick={() => togglePriority(c)}><Star className={`h-4 w-4 ${c.is_priority ? "fill-warning text-warning" : ""}`} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyContacts;
