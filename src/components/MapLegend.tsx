import { STATUS_LEGEND } from "@/lib/alertColors";

interface Props {
  /** Which legend items to show. Defaults to all alert statuses + responder. */
  items?: { color: string; label: string }[];
  className?: string;
}

export const MapLegend = ({ items = STATUS_LEGEND, className }: Props) => (
  <div className={`flex flex-wrap gap-x-3 gap-y-1.5 text-xs ${className ?? ""}`}>
    {items.map((i) => (
      <div key={i.label} className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-full ring-2 ring-background"
          style={{ background: i.color }}
        />
        <span className="text-muted-foreground">{i.label}</span>
      </div>
    ))}
  </div>
);
