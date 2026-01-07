import { NavLink, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  User,
  CreditCard,
  DollarSign,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

const mainNavItems = [
  { to: "/work", label: "Work" },
  { to: "/manage", label: "Manage" },
  { to: "/reports", label: "Review" },
];

interface RecentLead {
  id: string;
  campaign_name: string;
  company_name: string;
  phone: string;
  status: string;
  updated_at: string;
  callback_scheduled_at: string | null;
}

const iconNavItems = [
  { icon: Calendar, label: "Calendar", to: "/" },
  { icon: Users, label: "Team", to: "/team" },
  { icon: Bell, label: "Alerts", to: "/" },
];

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (historyOpen && user) {
      fetchRecentLeads();
    }
  }, [historyOpen, user]);

  const fetchRecentLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select(`
        id,
        status,
        updated_at,
        callback_scheduled_at,
        data,
        campaigns(name)
      `)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentLeads(
        data.map((lead: any) => ({
          id: lead.id,
          campaign_name: lead.campaigns?.name || "Unknown Campaign",
          company_name: (lead.data as any)?.company || (lead.data as any)?.name || "Unknown",
          phone: (lead.data as any)?.phone || "",
          status: lead.status,
          updated_at: lead.updated_at,
          callback_scheduled_at: lead.callback_scheduled_at,
        }))
      );
    }
  };

  const getStatusBadge = (status: string, callbackAt: string | null) => {
    if (callbackAt && new Date(callbackAt) > new Date()) {
      const diff = formatDistanceToNow(new Date(callbackAt));
      return <Badge className="bg-amber-500 text-white text-xs">Call back in {diff}</Badge>;
    }
    if (status === "won") {
      return <Badge className="bg-green-600 text-white text-xs">Won</Badge>;
    }
    if (status === "lost") {
      return <Badge className="bg-red-600 text-white text-xs">Lost</Badge>;
    }
    return <Badge variant="secondary" className="text-xs capitalize">{status}</Badge>;
  };

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
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 gap-1 h-8">
                Search
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <div className="p-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 border border-foreground rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <p className="px-3 pb-3 text-sm text-muted-foreground">
                Please enter 3 or more characters
              </p>
            </PopoverContent>
          </Popover>

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
          {/* History Popover */}
          <div className="hidden md:flex items-center gap-1">
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
                  title="History"
                >
                  <History className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Recently worked</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentLeads.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No recent activity
                    </div>
                  ) : (
                    recentLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        to={`/leads?id=${lead.id}`}
                        className="block p-3 hover:bg-muted border-b last:border-b-0"
                        onClick={() => setHistoryOpen(false)}
                      >
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {lead.campaign_name}
                        </p>
                        <p className="font-medium text-sm">
                          {lead.company_name}{" "}
                          {lead.phone && <span className="text-muted-foreground">{lead.phone}</span>}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(lead.status, lead.callback_scheduled_at)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last updated {format(new Date(lead.updated_at), "dd-MM-yyyy HH:mm")} (
                          {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })})
                        </p>
                      </Link>
                    ))
                  )}
                </div>
                <div className="p-2 border-t">
                  <Link
                    to="/work?tab=worklog"
                    className="text-primary text-sm hover:underline block text-center"
                    onClick={() => setHistoryOpen(false)}
                  >
                    View full work log
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* Icon Navigation */}
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
            <DropdownMenuContent align="end" className="w-48 bg-background">
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  My Preferences
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/manage/account" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Account Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/manage/account?section=billing" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Billing
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/manage/account?section=referral" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Make Money
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
