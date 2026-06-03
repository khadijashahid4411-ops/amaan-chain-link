import { useTheme, Theme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun; desc: string }[] = [
  { value: "light", label: "Light", icon: Sun, desc: "Bright background, easy in well-lit places." },
  { value: "dark", label: "Dark", icon: Moon, desc: "Low-light friendly, easier on the eyes at night." },
  { value: "system", label: "System", icon: Monitor, desc: "Follow your device setting automatically." },
];

const Appearance = () => {
  const { theme, setTheme, effective } = useTheme();
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <BackButton />
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how AmaanChain looks. Currently using <strong className="capitalize">{effective}</strong>.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {OPTIONS.map((o) => {
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setTheme(o.value)}
                className={`text-left rounded-xl border p-4 transition-smooth hover:bg-muted/40 ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <o.icon className="h-5 w-5" />
                  </div>
                  <div className="font-medium">{o.label}</div>
                  {active && <Check className="h-4 w-4 text-primary ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{o.desc}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appearance;
