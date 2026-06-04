import { AlertTriangle } from "lucide-react";
import { useGeofence } from "@/hooks/useGeofence";

export const GeofenceBanner = ({ coords }: { coords: { lat: number; lng: number } | null }) => {
  const { inside } = useGeofence(coords);
  if (!inside.length) return null;
  return (
    <div className="space-y-2">
      {inside.map((z) => (
        <div key={z.id} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-destructive">{z.name} — Emergency warning in your area</div>
            <div className="text-sm break-words">{z.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
