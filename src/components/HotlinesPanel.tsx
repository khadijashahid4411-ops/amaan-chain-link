import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export const HOTLINES = [
  { name: "Police", number: "15", color: "bg-blue-600" },
  { name: "Rescue 1122", number: "1122", color: "bg-red-600" },
  { name: "Ambulance (Edhi)", number: "115", color: "bg-emerald-600" },
  { name: "Fire Brigade", number: "16", color: "bg-orange-600" },
];

export const HotlinesPanel = () => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Emergency Hotlines</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-2">
      {HOTLINES.map((h) => (
        <Button
          key={h.number}
          asChild
          variant="outline"
          className="h-auto py-3 flex-col items-start"
        >
          <a href={`tel:${h.number}`}>
            <div className="flex items-center gap-2 w-full">
              <Phone className="h-4 w-4" /> <span className="font-semibold">{h.name}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Dial {h.number}</span>
          </a>
        </Button>
      ))}
    </CardContent>
  </Card>
);
