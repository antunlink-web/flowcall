import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Phone, Kanban, Users, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "", icon: LayoutDashboard, label: "Dashboard" },
  { to: "pipeline", icon: Kanban, label: "Pipeline" },
  { to: "contacts", icon: Users, label: "Kontakti" },
  { to: "calendar", icon: CalendarDays, label: "Kalendar" },
];

function FlowNav() {
  const location = useLocation();
  const basePath = location.pathname.match(/^\/flow/)?.[0] || "/flow";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          <Phone className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg tracking-tight">FlowCall</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const fullPath = item.to ? `${basePath}/${item.to}` : basePath;
            const isActive = item.to
              ? location.pathname.startsWith(fullPath)
              : location.pathname === basePath || location.pathname === basePath + "/";

            return (
              <NavLink
                key={item.label}
                to={fullPath}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <FlowNav />
      <main className="pt-14 min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  );
}
