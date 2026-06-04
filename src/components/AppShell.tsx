import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  LayoutDashboard,
  Siren,
  ShieldCheck,
  LogOut,
  Smartphone,
  MessageSquareWarning,
  UserCog,
  FileImage,
  HandHelping,
  BookOpen,
  Palette,
  Library,
  Users,
  Phone,
  MapPinned,
  KeyRound,
  Radar,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  show: boolean;
}

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { roles, primaryRole, signOut, user } = useAuth();
  const navigate = useNavigate();

  const isResponder = roles.includes("responder");
  const isAdmin = roles.includes("admin");

  const items: NavItem[] = [
    { to: "/", icon: LayoutDashboard, label: "My Alerts", show: true },
    { to: "/responder", icon: Siren, label: "Responder", show: isResponder },
    { to: "/responder/performance", icon: Award, label: "Performance", show: isResponder },
    { to: "/admin", icon: ShieldCheck, label: "Admin", show: isAdmin },
    { to: "/admin/zones", icon: Radar, label: "Geofence Zones", show: isAdmin },
    { to: "/hotlines", icon: Phone, label: "Hotlines", show: true },
    { to: "/contacts", icon: Users, label: "Contacts", show: true },
    { to: "/safe-zones", icon: MapPinned, label: "Safe Zones", show: true },
    { to: isResponder ? "/responder/evidence" : "/evidence", icon: FileImage, label: "Upload Evidence", show: true },
    { to: "/evidence-library", icon: Library, label: "Evidence Library", show: true },
    { to: "/evidence-guide", icon: BookOpen, label: "Evidence Guide", show: true },
    { to: "/become-responder", icon: HandHelping, label: "Become Responder", show: !isResponder && !isAdmin },
    { to: "/complaints", icon: MessageSquareWarning, label: "Complaints", show: true },
    { to: "/security", icon: KeyRound, label: "Security (MFA)", show: true },
    { to: "/profile", icon: UserCog, label: "Profile", show: true },
    { to: "/appearance", icon: Palette, label: "Appearance", show: true },
    { to: "/install", icon: Smartphone, label: "Install App", show: true },
  ].filter((i) => i.show);


  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background w-full">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-emergency flex items-center justify-center shadow-emergency">
              <ShieldAlert className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold">AmaanChain</div>
              <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize">
                {primaryRole}
              </Badge>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 px-3 mb-2 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-gradient-command text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-emergency flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">AmaanChain</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground hover:bg-white/10">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t shadow-elevated z-40">
        <div className={cn("grid", items.length >= 5 ? "grid-cols-5" : `grid-cols-${items.length}`)}>
          {items.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
