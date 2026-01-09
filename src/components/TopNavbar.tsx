import { NavLink, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import callstackLogo from "@/assets/callstack-logo.png";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Lock,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

interface SearchResult {
  id: string;
  name: string;
  phone: string;
  email: string;
  list_name: string;
  status: string;
  created_at: string;
  allData: string; // All data fields concatenated for display
}

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

interface ScheduledLead {
  id: string;
  campaign_name: string;
  company_name: string;
  phone: string;
  callback_scheduled_at: string;
}

interface LockedLead {
  id: string;
  campaign_name: string;
  company_name: string;
  phone: string;
  claimed_at: string;
}

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [timersOpen, setTimersOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [scheduledLeads, setScheduledLeads] = useState<ScheduledLead[]>([]);
  const [lockedLeads, setLockedLeads] = useState<LockedLead[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user]);

  // Search contacts when query changes - uses RPC for full database search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchContacts = async () => {
      setSearchLoading(true);
      try {
        // Use RPC function for searching all leads in the database
        console.log("Searching for:", searchQuery.trim());
        const { data, error } = await supabase.rpc("search_leads", { 
          search_term: searchQuery.trim() 
        });

        console.log("Search results:", data?.length || 0, "leads found", error);
        
        if (error) throw error;

        const results = (data || []).slice(0, 20).map((lead: any) => {
          const leadData = lead.data || {};
          const entries = Object.entries(leadData);
          
          // Prioritize company name fields (Pavadinimas, Company, etc.)
          let displayName = "Unknown";
          const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma"];
          for (const [key, value] of entries) {
            if (companyFields.includes(key.toLowerCase()) && typeof value === 'string' && value.trim()) {
              displayName = value;
              break;
            }
          }
          // Fallback to first non-empty string value
          if (displayName === "Unknown") {
            for (const [key, value] of entries) {
              if (typeof value === 'string' && value.trim()) {
                displayName = value;
                break;
              }
            }
          }

          // Find phone - look for fields containing "phone", "tel", "telefonas"
          let phone = "";
          for (const [key, value] of entries) {
            const keyLower = key.toLowerCase();
            if ((keyLower.includes('phone') || keyLower.includes('tel')) && typeof value === 'string' && value.trim()) {
              phone = value;
              break;
            }
          }

          // Find email - look for fields containing "email", "e-mail", "mail"
          let email = "";
          for (const [key, value] of entries) {
            const keyLower = key.toLowerCase();
            if ((keyLower.includes('email') || keyLower.includes('e-mail') || keyLower === 'mail') && typeof value === 'string' && value.trim()) {
              email = value;
              break;
            }
          }

          // Create formatted data display showing field labels and values
          const formattedData = entries
            .filter(([key, value]) => typeof value === 'string' && value.trim())
            .map(([key, value]) => `${key}: ${value}`)
            .join(' • ');

          return {
            id: lead.id,
            name: displayName,
            phone,
            email,
            list_name: "Lead",
            status: lead.status,
            created_at: lead.created_at,
            allData: formattedData,
          };
        });

        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
    if (historyOpen && user) {
      fetchRecentLeads();
    }
  }, [historyOpen, user]);

  useEffect(() => {
    if (calendarOpen && user) {
      fetchScheduledLeads();
    }
  }, [calendarOpen, user]);

  useEffect(() => {
    if (lockedOpen && user) {
      fetchLockedLeads();
    }
  }, [lockedOpen, user]);

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

  const fetchScheduledLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select(`
        id,
        callback_scheduled_at,
        data,
        campaigns(name)
      `)
      .not("callback_scheduled_at", "is", null)
      .gt("callback_scheduled_at", new Date().toISOString())
      .order("callback_scheduled_at", { ascending: true })
      .limit(5);

    if (!error && data) {
      setScheduledLeads(
        data.map((lead: any) => ({
          id: lead.id,
          campaign_name: lead.campaigns?.name || "Unknown Campaign",
          company_name: (lead.data as any)?.company || (lead.data as any)?.name || "Unknown",
          phone: (lead.data as any)?.phone || "",
          callback_scheduled_at: lead.callback_scheduled_at,
        }))
      );
    }
  };

  const fetchLockedLeads = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("leads")
      .select(`
        id,
        claimed_at,
        data,
        campaigns(name)
      `)
      .eq("claimed_by", user.id)
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setLockedLeads(
        data.map((lead: any) => ({
          id: lead.id,
          campaign_name: lead.campaigns?.name || "Unknown Campaign",
          company_name: (lead.data as any)?.company || (lead.data as any)?.name || "Unknown",
          phone: (lead.data as any)?.phone || "",
          claimed_at: lead.claimed_at,
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
      <header className="fixed top-0 left-0 right-0 h-14 bg-sidebar z-50 flex items-center justify-between px-4 text-sidebar-foreground shadow-md">
        {/* Left Section - Logo & Name */}
        <div className="flex items-center gap-2 flex-shrink-0 w-40">
          <Link to="/" className="flex items-center gap-2">
            <img src={callstackLogo} alt="CallStack" className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">CallStack</span>
          </Link>
        </div>

        {/* Center Section - Search, Home & Nav */}
        <div className="flex items-center gap-4 justify-center flex-1">
          {/* Search Field with Dropdown */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-40 md:w-48 h-7 px-2 text-sm bg-sidebar-accent border border-sidebar-border rounded text-sidebar-foreground placeholder:text-sidebar-muted focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
            />
            {searchQuery.length >= 2 && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[500px] bg-popover text-popover-foreground border rounded-md shadow-md outline-none z-[60] animate-in fade-in-0 zoom-in-95">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    No contacts found
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {searchResults.map((result) => {
                      const dateStr = result.created_at 
                        ? format(new Date(result.created_at), "dd.MM.yyyy")
                        : "";
                      const highlightText = (text: string) => {
                        if (!searchQuery || searchQuery.length < 2) return text;
                        const regex = new RegExp(`(${searchQuery})`, 'gi');
                        const parts = text.split(regex);
                        return parts.map((part, i) => 
                          regex.test(part) ? <em key={i} className="not-italic font-medium text-foreground">{part}</em> : part
                        );
                      };
                      
                      return (
                        <Link
                          key={result.id}
                          to={`/leads?id=${result.id}`}
                          className="block px-3 py-2 hover:bg-muted border-b last:border-b-0"
                          onClick={() => setSearchQuery("")}
                        >
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {result.list_name}
                          </p>
                          <p className="font-semibold text-sm">
                            {highlightText(result.name)}
                            {result.phone && <span className="ml-2 font-normal text-muted-foreground">{result.phone}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {dateStr && <span>{dateStr} </span>}
                            {highlightText(result.allData)}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Home Icon */}
          <NavLink to="/">
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9">
              <Home className="w-5 h-5" />
            </Button>
          </NavLink>

          {/* Main Nav Links */}
          <nav className="hidden md:flex items-center">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors rounded-md",
                  location.pathname === item.to || location.pathname.startsWith(item.to + "/") || (item.to === "/work" && location.pathname === "/")
                    ? "text-sidebar-foreground bg-sidebar-accent"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Section - Icons & User */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* History Popover */}
          <div className="hidden md:flex items-center gap-1">
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
                  title="History"
                >
                  <History className="w-5 h-5" />
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

            {/* Calendar - Scheduled Leads Popover */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
                  title="Scheduled leads"
                >
                  <Calendar className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Scheduled leads</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {scheduledLeads.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-primary font-medium">No scheduled leads</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Go ahead and work your queue to schedule some.
                      </p>
                    </div>
                  ) : (
                    scheduledLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        to={`/leads?id=${lead.id}`}
                        className="block p-3 hover:bg-muted border-b last:border-b-0"
                        onClick={() => setCalendarOpen(false)}
                      >
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {lead.campaign_name}
                        </p>
                        <p className="font-medium text-sm">
                          {lead.company_name}{" "}
                          {lead.phone && <span className="text-muted-foreground">{lead.phone}</span>}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Callback: {format(new Date(lead.callback_scheduled_at), "dd-MM-yyyy HH:mm")}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Lock - Currently Locked Leads Popover */}
            <Popover open={lockedOpen} onOpenChange={setLockedOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
                  title="Currently working/locked by you"
                >
                  <Lock className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Currently working/locked by you</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {lockedLeads.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-primary font-medium">You have no locked leads</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Find a lead and call them. It is why we are here after all isn't it?
                      </p>
                      <Button 
                        variant="destructive" 
                        className="mt-4"
                        onClick={() => setLockedOpen(false)}
                      >
                        Switch to view only mode
                      </Button>
                    </div>
                  ) : (
                    lockedLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        to={`/leads?id=${lead.id}`}
                        className="block p-3 hover:bg-muted border-b last:border-b-0"
                        onClick={() => setLockedOpen(false)}
                      >
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {lead.campaign_name}
                        </p>
                        <p className="font-medium text-sm">
                          {lead.company_name}{" "}
                          {lead.phone && <span className="text-muted-foreground">{lead.phone}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Locked {formatDistanceToNow(new Date(lead.claimed_at), { addSuffix: true })}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Timer Popover */}
            <Popover open={timersOpen} onOpenChange={setTimersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
                  title="Timers"
                >
                  <Clock className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Your most recent timers</h4>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">No timers yet</p>
                </div>
                <div className="p-2 border-t">
                  <Link
                    to="/work?tab=timers"
                    className="text-primary text-sm hover:underline block text-center"
                    onClick={() => setTimersOpen(false)}
                  >
                    View all timers
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* Alerts Popover */}
            <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
                  title="Alerts"
                >
                  <AlertTriangle className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Alerts</h4>
                </div>
                <div className="p-6 text-center">
                  <p className="text-primary font-medium">No alerts here</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All clear. Please move along - nothing to view 'ere.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Help */}
          <Button variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-1 h-9 hidden md:flex">
            <HelpCircle className="w-5 h-5" />
            Help
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-1 h-11 ml-2">
                <Avatar className="w-9 h-9 rounded-lg ring-2 ring-sidebar-foreground/20">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} className="object-cover rounded-lg" />
                  ) : (
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm rounded-lg">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background">
              <DropdownMenuItem asChild>
                <NavLink to="/preferences">
                  Preferences
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/manage/account">
                  Account Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/manage/account?section=billing">
                  Billing
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/manage/account?section=referral">
                  Make Money
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 pt-14"
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
            <NavLink
              to="/work?tab=worklog"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted"
            >
              <History className="w-4 h-4" />
              Recently worked
            </NavLink>
            <NavLink
              to="/leads?filter=scheduled"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted"
            >
              <Calendar className="w-4 h-4" />
              Scheduled leads
            </NavLink>
            <NavLink
              to="/leads?filter=locked"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted"
            >
              <Lock className="w-4 h-4" />
              Locked leads
            </NavLink>
            <NavLink
              to="/work?tab=timers"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted"
            >
              <Clock className="w-4 h-4" />
              Timers
            </NavLink>
            <NavLink
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted"
            >
              <AlertTriangle className="w-4 h-4" />
              Alerts
            </NavLink>
          </nav>
        </div>
      )}
    </>
  );
}
