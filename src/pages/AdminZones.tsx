import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus, MapPin } from "lucide-react";

const AdminZones = () => {
  const { user } = useAuth();
  const { coords } = useGeolocation();
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", message: "", lat: "", lng: "", radius_km: "1" });

  const load = async () => {
    const { data } = await (supabase as any).from("geo_zones").select("*").order("created_at", { ascending: false });
    setZones(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const useMyLocation = () => {
    if (!coords) return toast.error("No location yet");
    setForm((f) => ({ ...f, lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) }));
  };

  const create = async () => {
    if (!form.name || !form.message || !form.lat || !form.lng) return toast.error("Fill all fields");
    const { error } = await (supabase as any).from("geo_zones").insert({
      name: form.name,
      message: form.message,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      radius_km: parseFloat(form.radius_km),
      created_by: user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Zone created");
    setForm({ name: "", message: "", lat: "", lng: "", radius_km: "1" });
    load();
  };

  const toggle = async (z: any) => {
    await (supabase as any).from("geo_zones").update({ is_active: !z.is_active }).eq("id", z.id);
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("geo_zones").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Geofence Zones</h1>
        <p className="text-muted-foreground">Broadcast emergency warnings to users inside a defined area.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Create zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Radius (km)</Label><Input type="number" step="0.1" value={form.radius_km} onChange={(e) => setForm({ ...form, radius_km: e.target.value })} /></div>
            <div><Label>Latitude</Label><Input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
            <div><Label>Longitude</Label><Input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
          </div>
          <div><Label>Warning message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button onClick={create}><Plus className="h-4 w-4 mr-2" />Create</Button>
            <Button variant="outline" onClick={useMyLocation}><MapPin className="h-4 w-4 mr-2" />Use my location</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active zones ({zones.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {zones.map((z) => (
            <div key={z.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{z.name}</div>
                <div className="text-sm text-muted-foreground break-words">{z.message}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {z.lat.toFixed(4)}, {z.lng.toFixed(4)} • {z.radius_km} km
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={z.is_active} onCheckedChange={() => toggle(z)} />
                <Button size="icon" variant="ghost" onClick={() => remove(z.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {zones.length === 0 && <p className="text-sm text-muted-foreground">No zones yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminZones;
