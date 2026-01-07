import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
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
  Home,
  Search,
  History,
  Calendar,
  Users,
  Bell,
  HelpCircle,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const mainNavItems = [
  { to: "/work", label: "Work" },
  { to: "/leads", label: "Manage" },
  { to: "/reports", label: "Review" },
];

const iconNavItems = [
  { icon: History, label: "History", to: "/reports" },
  { icon: Calendar, label: "Calendar", to: "/" },
  { icon: Users, label: "Team", to: "/team" },
  { icon: Bell, label: "Alerts", to: "/" },
];

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  return (
    <>
      {/* Main Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-[hsl(200,20%,35%)] z-50 flex items-center px-4 text-white">
        {/* Left Section - Search & Home */}
        <div className="flex items-center gap-1">
          {/* Search Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 gap-1 h-8">
                <Search className="w-4 h-4" />
                Search
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>Search Leads</DropdownMenuItem>
              <DropdownMenuItem>Search Campaigns</DropdownMenuItem>
              <DropdownMenuItem>Search All</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Home Icon */}
          <NavLink to="/">
            <Button variant="ghost" size="icon" className="text-white/90 hover:text-white hover:bg-white/10 h-8 w-8">
              <Home className="w-4 h-4" />
            </Button>
          </NavLink>

          {/* Main Nav Links */}
          <nav className="hidden md:flex items-center ml-2">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "px-4 py-1 text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Section - Icons & User */}
        <div className="flex items-center ml-auto gap-1">
          {/* Icon Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {iconNavItems.map((item) => (
              <NavLink key={item.label} to={item.to}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
                  title={item.label}
                >
                  <item.icon className="w-4 h-4" />
                </Button>
              </NavLink>
            ))}
          </div>

          {/* Help */}
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1 h-8 hidden md:flex">
            <HelpCircle className="w-4 h-4" />
            Help
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 gap-1 h-8 ml-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2">
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

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white/90 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 pt-12"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="bg-card w-64 h-full p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="border-t my-4" />
            {iconNavItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
