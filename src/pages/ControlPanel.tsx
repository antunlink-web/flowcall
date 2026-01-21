import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useDueCallbacks } from "@/hooks/useDueCallbacks";
import { format, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  Megaphone,
  Settings,
  History,
  Lock,
  Bell,
  Grip,
  Briefcase,
  ClipboardList,
  Eye,
  ListChecks,
  FileText,
  UserCog,
  Cog,
  Copy,
  Flag,
  CreditCard,
} from "lucide-react";

type TabType = "main" | "work" | "manage" | "review" | "history" | "scheduled" | "locked" | "due";

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

// Main category items
const categoryItems = [
  { id: "work" as TabType, name: "Work", icon: Briefcase, description: "Dialer & your workflow", roles: ["agent", "owner", "account_manager"] },
  { id: "manage" as TabType, name: "Manage", icon: Cog, description: "Settings & team", roles: ["owner", "account_manager"] },
  { id: "review" as TabType, name: "Review", icon: Eye, description: "Reports & campaigns", roles: ["owner", "account_manager"] },
];

// Work section items
const workItems = [
  { id: "dialer", name: "Dialer", href: "/work?autostart=true", icon: Phone, description: "Start & manage calls" },
  { id: "history" as TabType, name: "History", icon: History, description: "Recently worked leads", isTab: true },
  { id: "scheduled" as TabType, name: "Scheduled", icon: Calendar, description: "Upcoming callbacks", isTab: true },
  { id: "locked" as TabType, name: "Locked", icon: Lock, description: "Your claimed leads", isTab: true },
  { id: "due" as TabType, name: "Due", icon: Bell, description: "Callbacks due now", isTab: true },
];

// Manage section items
const manageItems = [
  { name: "Lists", href: "/manage/lists", icon: ListChecks, description: "Configure lead lists" },
  { name: "Users", href: "/team", icon: Users, description: "View & manage team" },
  { name: "Duplicates", href: "/manage/duplicates", icon: Copy, description: "Merge duplicate leads" },
  { name: "Claims", href: "/manage/claims", icon: Flag, description: "Review claimed leads" },
  { name: "Settings", href: "/preferences", icon: Settings, description: "System preferences" },
  { name: "Account", href: "/manage/account", icon: CreditCard, description: "Billing & subscription" },
];

// Review section items
const reviewItems = [
  { name: "Reports", href: "/reports", icon: BarChart3, description: "Performance & stats" },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone, description: "Cold call campaigns" },
];

export default function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>("main");
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<ScheduledLead[]>([]);
  const [lockedLeads, setLockedLeads] = useState<LockedLead[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const { user } = useAuth();
  const { roles } = useUserRole();
  const { dueCallbacks } = useDueCallbacks();
  const navigate = useNavigate();

  const filteredCategories = categoryItems.filter(item => {
    if (!roles || roles.length === 0) return item.roles.includes("agent");
    return item.roles.some(role => roles.includes(role as any));
  });

  useEffect(() => {
    if (activeTab === "history") fetchRecentLeads();
    else if (activeTab === "scheduled") fetchScheduledLeads();
    else if (activeTab === "locked") fetchLockedLeads();
  }, [activeTab, user]);

  const getLeadDisplayName = (data: any): string => {
    if (!data) return "Unknown";
    return data.Pavadinimas || data.pavadinimas || data.company_name || data.name || data.Company || data.Name || "Unknown";
  };

  const fetchRecentLeads = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("id, data, status, last_contacted_at")
        .eq("claimed_by", user.id)
        .not("last_contacted_at", "is", null)
        .order("last_contacted_at", { ascending: false })
        .limit(10);

      if (data) {
        setRecentLeads(data.map(lead => ({
          id: lead.id,
          company_name: getLeadDisplayName(lead.data),
          status: lead.status,
          updated_at: lead.last_contacted_at!
        })));
      }
    } catch (error) {
      console.error("Error fetching recent leads:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchScheduledLeads = async () => {
    if (!user) return;
    setDataLoading(true);
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
          company_name: getLeadDisplayName(lead.data),
          callback_scheduled_at: lead.callback_scheduled_at!
        })));
      }
    } catch (error) {
      console.error("Error fetching scheduled leads:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchLockedLeads = async () => {
    if (!user) return;
    setDataLoading(true);
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
          company_name: getLeadDisplayName(lead.data),
          claimed_at: lead.claimed_at!
        })));
      }
    } catch (error) {
      console.error("Error fetching locked leads:", error);
    } finally {
      setDataLoading(false);
    }
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

  const getSectionInfo = () => {
    switch (activeTab) {
      case "work": return { name: "Work", icon: Briefcase };
      case "manage": return { name: "Manage", icon: Cog };
      case "review": return { name: "Review", icon: Eye };
      case "history": return { name: "History", icon: History, parent: "work" };
      case "scheduled": return { name: "Scheduled", icon: Calendar, parent: "work" };
      case "locked": return { name: "Locked", icon: Lock, parent: "work" };
      case "due": return { name: "Due", icon: Bell, parent: "work", badge: dueCallbacks.length };
      default: return null;
    }
  };

  const currentSection = getSectionInfo();
  const isSubSection = activeTab !== "main";

  const handleBack = () => {
    if (currentSection?.parent) {
      setActiveTab(currentSection.parent as TabType);
    } else {
      setActiveTab("main");
    }
  };

  return (
    <DashboardLayout>
      {/* Section Header - shows when in a sub-section */}
      {isSubSection && currentSection && (
        <div className="bg-[hsl(215,25%,27%)] sticky top-14 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <Grip className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-slate-500" />
              <div className="flex items-center gap-2 text-white">
                <currentSection.icon className="w-5 h-5" />
                <span className="font-medium">{currentSection.name}</span>
                {currentSection.badge !== undefined && currentSection.badge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1">
                    {currentSection.badge}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Panel - Category Selection */}
        {activeTab === "main" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {filteredCategories.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center p-8 rounded-xl bg-card border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all group"
              >
                <div className="mb-4 p-4 rounded-full bg-primary/10">
                  <item.icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground text-center mb-2">{item.name}</h3>
                <p className="text-sm text-muted-foreground text-center">{item.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Work Section */}
        {activeTab === "work" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {workItems.map((item) => {
              const badge = item.id === "due" ? dueCallbacks.length : undefined;
              
              if (item.isTab) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className="relative flex flex-col items-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    {badge !== undefined && badge > 0 && (
                      <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 px-1">
                        {badge}
                      </Badge>
                    )}
                    <div className="mb-4">
                      <item.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-foreground text-center mb-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground text-center">{item.description}</p>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.id}
                  to={item.href!}
                  className="flex flex-col items-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="mb-4">
                    <item.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-foreground text-center mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground text-center">{item.description}</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Manage Section */}
        {activeTab === "manage" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {manageItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="mb-4">
                  <item.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-foreground text-center mb-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground text-center">{item.description}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Review Section */}
        {activeTab === "review" && (
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            {reviewItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="mb-4">
                  <item.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-foreground text-center mb-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground text-center">{item.description}</p>
              </Link>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Recently Worked</h2>
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : recentLeads.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No recent activity</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {recentLeads.map((lead) => (
                  <Link key={lead.id} to={`/work?leadId=${lead.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(lead.status)}`} />
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(lead.updated_at), "MMM d, HH:mm")} · {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === "scheduled" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Scheduled Callbacks</h2>
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : scheduledLeads.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No scheduled callbacks. Work your queue to schedule some.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {scheduledLeads.map((lead) => (
                  <Link key={lead.id} to={`/work?leadId=${lead.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        <p className="text-sm text-amber-600">{format(new Date(lead.callback_scheduled_at), "MMM d, HH:mm")}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Locked Tab */}
        {activeTab === "locked" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Your Locked Leads</h2>
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : lockedLeads.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">You have no locked leads. Find a lead and start calling!</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {lockedLeads.map((lead) => (
                  <Link key={lead.id} to={`/work?leadId=${lead.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        <p className="text-sm text-muted-foreground">Locked {formatDistanceToNow(new Date(lead.claimed_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Due Callbacks Tab */}
        {activeTab === "due" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-primary">Due Callbacks</h2>
              {dueCallbacks.length > 0 && <Badge variant="destructive">{dueCallbacks.length}</Badge>}
            </div>
            {dueCallbacks.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">All clear! No callbacks waiting for you.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {dueCallbacks.map((callback) => (
                    <Link key={callback.id} to={`/work?leadId=${callback.id}`} className="flex items-center justify-between p-4 rounded-lg border border-l-4 border-l-destructive bg-card hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-destructive" />
                        <div>
                          <p className="font-medium">{callback.company_name}</p>
                          <p className="text-sm text-destructive font-medium">Due: {format(new Date(callback.callback_scheduled_at), "MMM d, HH:mm")}</p>
                          {callback.phone && <p className="text-sm text-muted-foreground">{callback.phone}</p>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
                <Button onClick={() => navigate("/work")} className="w-full">Start Working Callbacks</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
