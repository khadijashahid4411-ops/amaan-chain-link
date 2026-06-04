import { useOnlineSync } from "@/hooks/useOnlineSync";
import { WifiOff } from "lucide-react";

export const OfflineIndicator = () => {
  const online = useOnlineSync();
  if (online) return null;
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex items-center gap-2 text-sm">
      <WifiOff className="h-4 w-4 text-warning" />
      <span>You're offline. Alerts will be sent automatically when you reconnect.</span>
    </div>
  );
};
