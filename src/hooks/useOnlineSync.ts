import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readQueue, removeFromQueue } from "@/lib/offlineQueue";
import { toast } from "sonner";

export function useOnlineSync() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const flush = async () => {
      const queue = await readQueue();
      if (!queue.length) return;
      let ok = 0;
      for (const item of queue) {
        const { error } = await supabase.from("alerts").insert({
          user_id: item.user_id,
          description: item.description,
          priority: item.priority,
          lat: item.lat,
          lng: item.lng,
        });
        if (!error) {
          await removeFromQueue(item.id);
          ok++;
        }
      }
      if (ok) toast.success(`Synced ${ok} queued alert(s)`);
    };

    const onUp = () => {
      setOnline(true);
      flush();
    };
    const onDown = () => setOnline(false);

    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    // Try on mount too
    if (navigator.onLine) flush();
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  return online;
}
