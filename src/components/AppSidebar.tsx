import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Phone,
  Users,
  LayoutGrid,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
  Home,
  LayoutDashboard,
  List,
  Copy,
  Flag,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import flowcallLogo from "@/assets/flowcall-logo.png";

const navItems = [
  { to: "/", icon: Home, label: "Dashboard", roles: ["owner", "account_manager", "agent"] },
  { to: "/control-panel", icon: LayoutDashboard, label: "Control Panel", roles: ["owner", "account_manager", "agent"] },
  { to: "/work", icon: Phone, label: "Dialer", roles: ["owner", "account_manager", "agent"] },
  { to: "/campaigns", icon: LayoutGrid, label: "Campaigns", roles: ["owner", "account_manager"] },
  { to: "/reports", icon: BarChart3, label: "Reports", roles: ["owner", "account_manager"] },
];

const manageSubItems = [
  { to: "/manage/lists", icon: List, label: "Lists" },
  { to: "/team", icon: Users, label: "Team" },
  { to: "/manage/duplicates", icon: Copy, label: "Duplicates" },
  { to: "/manage/claims", icon: Flag, label: "Claims" },
  { to: "/preferences", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { roles, primaryRole } = useUserRole();
  const { branding } = useBranding();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(
    location.pathname.startsWith("/manage") || 
    location.pathname === "/team" || 
    location.pathname === "/preferences"
  );

  const appName = branding?.app_name || "FlowCall";
  const logoUrl = branding?.logo_url || flowcallLogo;

  const visibleItems = navItems.filter(
    (item) => roles.some(r => item.roles.includes(r)) || (roles.length === 0 && item.roles.includes("agent"))
  );

  // Check if Manage section should be shown (owner or account_manager)
  const showManageSection = roles.includes("owner") || roles.includes("account_manager");

  // Check if current route is a manage sub-route
  const isManageSubRoute = manageSubItems.some(item => location.pathname === item.to);

  // Format roles for display
  const displayRole = roles.length > 0 
    ? roles.map(r => r === "owner" ? "Owner" : r === "account_manager" ? "Manager" : "Agent").join(", ")
    : "Agent";

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt={appName} className="w-8 h-8 object-contain" />
          <span className="font-display font-semibold text-sidebar-foreground">{appName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-16"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="bg-sidebar w-64 h-full p-4 space-y-2 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
            
            {/* Manage Section - Mobile */}
            {showManageSection && (
              <Collapsible open={manageOpen} onOpenChange={setManageOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5" />
                    Manage
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", manageOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {manageSubItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        location.pathname === item.to
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex-col z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <img src={logoUrl} alt={appName} className="w-9 h-9 object-contain" />
          <span className="font-display font-bold text-lg text-sidebar-foreground">{appName}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          
          {/* Manage Section - Desktop */}
          {showManageSection && (
            <Collapsible open={manageOpen} onOpenChange={setManageOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5" />
                  Manage
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform", manageOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                {manageSubItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.to
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-sidebar-muted">{displayRole}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <NavLink to="/preferences" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}