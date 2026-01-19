import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import flowcallLogo from "@/assets/flowcall-logo.png";
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
  Home,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useDueCallbacks } from "@/hooks/useDueCallbacks";

interface SearchResult {
  id: string;
  name: string;
  phone: string;
  email: string;
  list_name: string;
  status: string;
  created_at: string;
  allData: string;
}

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const { isOwnerOrManager } = useUserRole();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dueCount } = useDueCallbacks();

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

  // Search contacts when query changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchContacts = async () => {
      setSearchLoading(true);
      try {
        const { data, error } = await supabase.rpc("search_leads_with_access", { 
          search_term: searchQuery.trim(),
          _user_id: user?.id
        });
        
        if (error) throw error;

        const results = (data || []).slice(0, 20).map((lead: any) => {
          const leadData = lead.data || {};
          const entries = Object.entries(leadData);
          
          let displayName = "Unknown";
          const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma"];
          for (const [key, value] of entries) {
            if (companyFields.includes(key.toLowerCase()) && typeof value === 'string' && value.trim()) {
              displayName = value;
              break;
            }
          }
          if (displayName === "Unknown") {
            for (const [key, value] of entries) {
              if (typeof value === 'string' && value.trim()) {
                displayName = value;
                break;
              }
            }
          }

          let phone = "";
          for (const [key, value] of entries) {
            const keyLower = key.toLowerCase();
            if ((keyLower.includes('phone') || keyLower.includes('tel')) && typeof value === 'string' && value.trim()) {
              phone = value;
              break;
            }
          }

          let email = "";
          for (const [key, value] of entries) {
            const keyLower = key.toLowerCase();
            if ((keyLower.includes('email') || keyLower.includes('e-mail') || keyLower === 'mail') && typeof value === 'string' && value.trim()) {
              email = value;
              break;
            }
          }

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
  }, [searchQuery, user?.id]);

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  return (
    <>
      {/* Main Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-sidebar z-50 flex items-center px-4 text-sidebar-foreground shadow-md">
        {/* Left Section - Logo, Name, Search & Home */}
        <div className="flex items-center gap-4">
          {/* Logo and Brand Name */}
          <Link to="/" className="flex items-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">FlowCall</span>
          </Link>

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
              <div className="absolute top-full left-0 mt-1 w-[500px] bg-popover text-popover-foreground border rounded-md shadow-md outline-none z-[60] animate-in fade-in-0 zoom-in-95">
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

          {/* Home Icon - Navigates to Control Panel */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9 relative"
            title="Control Panel"
          >
            <Home className="w-5 h-5" />
            {dueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {dueCount > 9 ? "9+" : dueCount}
              </span>
            )}
          </Button>
        </div>

        {/* Right Section - Help & User */}
        <div className="flex items-center ml-auto gap-1">
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
              {isOwnerOrManager && (
                <>
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
                    <NavLink to="/">
                      Getting Started
                    </NavLink>
                  </DropdownMenuItem>
                </>
              )}
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

      {/* Mobile Menu - navigates to control panel */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 pt-14"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="bg-card w-64 h-full p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                setMobileOpen(false);
                navigate("/");
              }}
            >
              <Home className="w-4 h-4" />
              Open Control Panel
              {dueCount > 0 && (
                <Badge variant="destructive" className="ml-auto">{dueCount}</Badge>
              )}
            </Button>
          </nav>
        </div>
      )}
    </>
  );
}
