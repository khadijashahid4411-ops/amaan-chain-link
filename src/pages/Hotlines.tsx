import { HotlinesPanel } from "@/components/HotlinesPanel";

const Hotlines = () => (
  <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
    <header>
      <h1 className="text-2xl font-bold">Emergency Hotlines</h1>
      <p className="text-muted-foreground">One-tap direct dialing for national services.</p>
    </header>
    <HotlinesPanel />
  </div>
);

export default Hotlines;
