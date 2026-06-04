import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  alert_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export const AlertChat = ({ alertId }: { alertId: string }) => {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("alert_messages")
        .select("*")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: true });
      setMsgs(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`chat-${alertId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_messages", filter: `alert_id=eq.${alertId}` },
        (p) => setMsgs((m) => [...m, p.new as Msg])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [alertId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    await (supabase as any).from("alert_messages").insert({
      alert_id: alertId,
      sender_id: user!.id,
      body,
    });
  };

  return (
    <div className="border rounded-lg flex flex-col h-64">
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {msgs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say hi 👋</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-3 py-1.5 text-sm break-words",
                mine ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
        />
        <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};
