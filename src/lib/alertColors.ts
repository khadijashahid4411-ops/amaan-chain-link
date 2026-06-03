import { MapMarkerSpec } from "@/components/LiveMap";

/** Map alert status → marker color tone (matches LiveMap COLORS). */
export const statusMarkerColor = (status: string): NonNullable<MapMarkerSpec["color"]> => {
  switch (status) {
    case "pending":
      return "warning";
    case "accepted":
      return "accent";
    case "in_progress":
      return "primary";
    case "solved":
      return "success";
    default:
      return "muted";
  }
};

export const statusLabel = (status: string) =>
  status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const STATUS_LEGEND: { status: string; color: string; label: string }[] = [
  { status: "pending", color: "#eab308", label: "Pending" },
  { status: "accepted", color: "#0ea5e9", label: "Accepted" },
  { status: "in_progress", color: "#dc2626", label: "In progress" },
  { status: "solved", color: "#16a34a", label: "Solved" },
  { status: "responder", color: "#16a34a", label: "Responder on duty" },
];
