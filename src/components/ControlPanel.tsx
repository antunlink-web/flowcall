import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  LayoutDashboard, 
  Phone, 
  Users, 
  Settings, 
  BarChart3, 
  Megaphone,
  History,
  Calendar,
  Lock,
  Timer,
  Bell,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useDueCallbacks } from "@/hooks/useDueCallbacks";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RecentLead {
  id: string;
  company_name: string;
  status: string;
  updated_at: string;
}

interface ScheduledLead {
  id: string;
  company_name: string;
  callback_scheduled_at: string;
}

interface LockedLead {
  id: string;
  company_name: string;
  claimed_at: string;
}

const mainNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["agent", "owner", "account_manager"] },
  { name: "Work", href: "/work", icon: Phone, roles: ["agent", "owner", "account_manager"] },
  { name: "Leads", href: "/leads", icon: Users, roles: ["agent", "owner", "account_manager"] },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["owner", "account_manager"] },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone, roles: ["owner", "account_manager"] },
  { name: "Team", href: "/team", icon: Users, roles: ["owner"] },
  { name: "Manage", href: "/manage", icon: Settings, roles: ["owner", "account_manager"] },
];

export function ControlPanel({ open, onOpenChange }: ControlPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { roles } = useUserRole();
  const { dueCallbacks } = useDueCallbacks();

  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<ScheduledLead[]>([]);
  const [lockedLeads, setLockedLeads] = useState<LockedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("navigation");

  const filteredNavItems = mainNavItems.filter(item => {
    if (!roles || roles.length === 0) return false;
    return item.roles.some(role => roles.includes(role as any));
  });

  useEffect(() => {
    if (open && activeTab === "history") {
      fetchRecentLeads();
    } else if (open && activeTab === "scheduled") {
      fetchScheduledLeads();
    } else if (open && activeTab === "locked") {
      fetchLockedLeads();
    }
  }, [open, activeTab]);

  const fetchRecentLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("id, data, status, updated_at")
        .eq("claimed_by", user.id)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (data) {
        setRecentLeads(data.map(lead => ({
          id: lead.id,
          company_name: (lead.data as any)?.company_name || (lead.data as any)?.name || "Unknown",
          status: lead.status,
          updated_at: lead.updated_at
        })));
      }
    } catch (error) {
      console.error("Error fetching recent leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("id, data, callback_scheduled_at")
        .eq("claimed_by", user.id)
        .not("callback_scheduled_at", "is", null)
        .order("callback_scheduled_at", { ascending: true })
        .limit(10);

      if (data) {
        setScheduledLeads(data.map(lead => ({
          id: lead.id,
          company_name: (lead.data as any)?.company_name || (lead.data as any)?.name || "Unknown",
          callback_scheduled_at: lead.callback_scheduled_at!
        })));
      }
    } catch (error) {
      console.error("Error fetching scheduled leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLockedLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("id, data, claimed_at")
        .eq("claimed_by", user.id)
        .not("claimed_at", "is", null)
        .eq("status", "in_progress")
        .order("claimed_at", { ascending: false })
        .limit(10);

      if (data) {
        setLockedLeads(data.map(lead => ({
          id: lead.id,
          company_name: (lead.data as any)?.company_name || (lead.data as any)?.name || "Unknown",
          claimed_at: lead.claimed_at!
        })));
      }
    } catch (error) {
      console.error("Error fetching locked leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-500";
      case "in_progress": return "bg-yellow-500";
      case "qualified": return "bg-green-500";
      case "lost": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Control Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="navigation" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Navigate
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger 
              value="locked"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <Lock className="h-4 w-4 mr-2" />
              Locked
            </TabsTrigger>
            <TabsTrigger 
              value="callbacks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 relative"
            >
              <Bell className="h-4 w-4 mr-2" />
              Due
              {dueCallbacks.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {dueCallbacks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            <TabsContent value="navigation" className="m-0 p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                  return (
                    <Button
                      key={item.name}
                      variant={isActive ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => handleNavClick(item.href)}
                    >
                      <item.icon className="h-6 w-6" />
                      <span>{item.name}</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="history" className="m-0 p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : recentLeads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent leads</p>
              ) : (
                <div className="space-y-2">
                  {recentLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadClick(lead.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(lead.status)}`} />
                        <div>
                          <p className="font-medium">{lead.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lead.updated_at), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="m-0 p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : scheduledLeads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No scheduled callbacks</p>
              ) : (
                <div className="space-y-2">
                  {scheduledLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadClick(lead.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{lead.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lead.callback_scheduled_at), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="locked" className="m-0 p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : lockedLeads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No locked leads</p>
              ) : (
                <div className="space-y-2">
                  {lockedLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadClick(lead.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p className="font-medium">{lead.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Locked {format(new Date(lead.claimed_at), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="callbacks" className="m-0 p-4">
              {dueCallbacks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No due callbacks</p>
              ) : (
                <div className="space-y-2">
                  {dueCallbacks.map((callback) => (
                    <button
                      key={callback.id}
                      onClick={() => handleLeadClick(callback.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left border-l-2 border-destructive"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-destructive" />
                        <div>
                          <p className="font-medium">{callback.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(callback.callback_scheduled_at), "MMM d, HH:mm")}
                          </p>
                          {callback.phone && (
                            <p className="text-xs text-muted-foreground">{callback.phone}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  <Separator className="my-3" />
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handleNavClick("/work")}
                  >
                    Go to Work Queue
                  </Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
