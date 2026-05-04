import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Home,
  Bell,
  FileImage,
  User,
  MessageSquareWarning,
  Map as MapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  show: boolean;
}

interface SectionItem {
  hash: string;
  icon: typeof Home;
  label: string;
}

const userSections: SectionItem[] = [
  { hash: "#home", icon: Home, label: "Home" },
  { hash: "#active", icon: Siren, label: "Active alert" },
  { hash: "#map", icon: MapIcon, label: "Live map" },
  { hash: "#history", icon: Bell, label: "Alert history" },
  { hash: "#evidence", icon: FileImage, label: "Evidence" },
  { hash: "#complaints", icon: MessageSquareWarning, label: "Complaints" },
  { hash: "#profile", icon: User, label: "Profile" },
];

const responderSections: SectionItem[] = [
  { hash: "#home", icon: Home, label: "Home" },
  { hash: "#map", icon: MapIcon, label: "Live map" },
  { hash: "#active", icon: Siren, label: "Active responses" },
  { hash: "#pending", icon: Bell, label: "Pending alerts" },
  { hash: "#evidence", icon: FileImage, label: "Evidence" },
  { hash: "#profile", icon: User, label: "Profile" },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { roles, primaryRole, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { to: "/", icon: LayoutDashboard, label: "My Alerts", show: true },
    { to: "/responder", icon: Siren, label: "Responder", show: roles.includes("responder") },
    { to: "/admin", icon: ShieldCheck, label: "Admin", show: roles.includes("admin") },
    { to: "/install", icon: Smartphone, label: "Install App", show: true },
  ];

  // Role-specific in-page sections
  let sections: SectionItem[] = [];
  if (location.pathname === "/") sections = userSections;
  else if (location.pathname === "/responder") sections = responderSections;

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
              <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize">{primaryRole}</Badge>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold">Workspaces</p>
            {items.filter((i) => i.show).map((item) => (
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
          </div>

          {sections.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold">Sections</p>
              {sections.map((s) => {
                const isActive = location.hash === s.hash;
                return (
                  <a
                    key={s.hash}
                    href={s.hash}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-smooth",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </a>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 px-3 mb-2 truncate">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
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
        <div className="grid grid-cols-4">
          {items.filter((i) => i.show).slice(0, 4).map((item) => (
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
