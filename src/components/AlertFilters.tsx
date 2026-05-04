import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertFilterState, emptyFilters } from "@/lib/alertFilters";

interface Props {
  value: AlertFilterState;
  onChange: (next: AlertFilterState) => void;
  showArea?: boolean;
  showLocation?: boolean;
}

export const AlertFilters = ({ value, onChange, showArea = true, showLocation = true }: Props) => {
  const [local, setLocal] = useState<AlertFilterState>(value);
  const activeCount = Object.values(value).filter((v) => v !== undefined && v !== "" && v !== "all").length;

  const apply = () => onChange(local);
  const clear = () => {
    setLocal(emptyFilters);
    onChange(emptyFilters);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] space-y-3" align="end">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Filter alerts</h4>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={local.from ?? ""}
              onChange={(e) => setLocal({ ...local, from: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={local.to ?? ""}
              onChange={(e) => setLocal({ ...local, to: e.target.value || undefined })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={local.status ?? "all"} onValueChange={(v) => setLocal({ ...local, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select value={local.priority ?? "all"} onValueChange={(v) => setLocal({ ...local, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showArea && (
          <div className="space-y-1">
            <Label className="text-xs">Area (text match)</Label>
            <Input
              placeholder="e.g. Karachi"
              value={local.area ?? ""}
              onChange={(e) => setLocal({ ...local, area: e.target.value || undefined })}
            />
          </div>
        )}

        {showLocation && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Min lat</Label>
              <Input type="number" step="any" value={local.minLat ?? ""} onChange={(e) => setLocal({ ...local, minLat: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max lat</Label>
              <Input type="number" step="any" value={local.maxLat ?? ""} onChange={(e) => setLocal({ ...local, maxLat: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min lng</Label>
              <Input type="number" step="any" value={local.minLng ?? ""} onChange={(e) => setLocal({ ...local, minLng: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max lng</Label>
              <Input type="number" step="any" value={local.maxLng ?? ""} onChange={(e) => setLocal({ ...local, maxLng: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
        )}

        <Button className="w-full" onClick={apply}>Apply filters</Button>
      </PopoverContent>
    </Popover>
  );
};
