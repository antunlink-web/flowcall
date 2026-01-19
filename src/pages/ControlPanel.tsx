import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/hooks/useBranding";
import { useDueCallbacks } from "@/hooks/useDueCallbacks";
import { Lead } from "@/types/crm";
import { format, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  CalendarClock,
  CalendarX,
  CalendarMinus,
  ThumbsUp,
  ChevronDown,
  ChevronRight,
  
  Users,
  BarChart3,
  Megaphone,
  Settings,
  History,
  Lock,
  Bell,
} from "lucide-react";

type TabType = "dashboard" | "navigate" | "history" | "scheduled" | "locked" | "due";

interface PipelineItem {
  icon: React.ElementType;
  label: string;
  count: number;
  percentage?: number;
  color: string;
  showRelease?: boolean;
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
  { name: "Dialer", href: "/work", icon: Phone, roles: ["agent", "owner", "account_manager"], description: "Start & manage calls" },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["owner", "account_manager"], description: "Performance & stats" },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone, roles: ["owner", "account_manager"], description: "Cold call campaigns" },
  { name: "Team", href: "/team", icon: Users, roles: ["owner"], description: "View & manage team" },
  { name: "Settings", href: "/manage", icon: Settings, roles: ["owner", "account_manager"], description: "System preferences" },
];

export default function ControlPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<ScheduledLead[]>([]);
  const [lockedLeads, setLockedLeads] = useState<LockedLead[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const { user } = useAuth();
  const { roles } = useUserRole();
  const { branding } = useBranding();
  const { dueCallbacks } = useDueCallbacks();
  const navigate = useNavigate();

  const filteredNavItems = mainNavItems.filter(item => {
    if (!roles || roles.length === 0) return item.roles.includes("agent");
    return item.roles.some(role => roles.includes(role as any));
  });

  useEffect(() => {
    fetchLeads();
  }, [user]);

  useEffect(() => {
    if (activeTab === "history") fetchRecentLeads();
    else if (activeTab === "scheduled") fetchScheduledLeads();
    else if (activeTab === "locked") fetchLockedLeads();
  }, [activeTab, user]);

  const fetchLeads = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("leads")
      .select("*")
      .or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

    const mappedLeads = (data || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[];

    setLeads(mappedLeads);
  };

  const fetchRecentLeads = async () => {
    if (!user) return;
    setDataLoading(true);
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
          company_name: (lead.data as any)?.company_name || (lead.data as any)?.name || (lead.data as any)?.pavadinimas || "Unknown",
          status: lead.status,
          updated_at: lead.updated_at
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
          company_name: (lead.data as any)?.company_name || (lead.data as any)?.name || (lead.data as any)?.pavadinimas || "Unknown",
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
          company_name: (lead.data as any)?.company_name || (lead.data as any)?.name || (lead.data as any)?.pavadinimas || "Unknown",
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

  // Calculate stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const followupsToday = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    const callbackDate = new Date(l.callback_scheduled_at);
    return callbackDate >= todayStart;
  });

  const dueToday = followupsToday.filter((l) => {
    const callbackDate = new Date(l.callback_scheduled_at!);
    return callbackDate <= now;
  });

  const onSchedule = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    return new Date(l.callback_scheduled_at) > now;
  }).length;

  const due = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    const callbackDate = new Date(l.callback_scheduled_at);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return callbackDate <= now && callbackDate > hourAgo;
  }).length;

  const overdue = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    const callbackDate = new Date(l.callback_scheduled_at);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return callbackDate <= hourAgo;
  }).length;

  const notScheduled = leads.filter((l) => !l.callback_scheduled_at && l.status !== "won").length;
  const won = leads.filter((l) => l.status === "won").length;
  const total = leads.length || 1;

  const pipelineItems: PipelineItem[] = [
    { icon: Calendar, label: "ON SCHEDULE", count: onSchedule, color: "bg-blue-500" },
    { icon: CalendarClock, label: "DUE", count: due, color: "bg-amber-500" },
    { icon: CalendarX, label: "OVERDUE", count: overdue, color: "bg-red-500" },
    { icon: CalendarMinus, label: "NOT SCHEDULED", count: notScheduled, percentage: Math.round((notScheduled / total) * 100), color: "bg-gray-400", showRelease: notScheduled > 0 },
    { icon: ThumbsUp, label: "WON", count: won, percentage: Math.round((won / total) * 100), color: "bg-green-500", showRelease: won > 0 },
  ];

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";



  const workflowItems = [
    { id: "history" as TabType, name: "History", icon: History, description: "Recently worked leads" },
    { id: "scheduled" as TabType, name: "Scheduled", icon: Calendar, description: "Upcoming callbacks" },
    { id: "locked" as TabType, name: "Locked", icon: Lock, description: "Your claimed leads" },
    { id: "due" as TabType, name: "Due", icon: Bell, description: "Callbacks due now", badge: dueCallbacks.length },
  ];

  return (
    <DashboardLayout>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="flex justify-center">
              <Card className="w-full max-w-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-xs font-medium text-muted-foreground tracking-wider mb-2">FOLLOWUPS TODAY</p>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-4xl font-bold text-foreground">{followupsToday.length}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{dueToday.length} due</Badge>
                  </div>
                  <Button onClick={() => navigate("/work?autostart=true")} className="bg-[hsl(0,65%,55%)] hover:bg-[hsl(0,65%,50%)] text-white gap-2">
                    <Phone className="w-4 h-4" />
                    Call now
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-primary">Your stats Today</h2>
              <ChevronDown className="w-4 h-4 text-primary" />
              <div className="flex-1 h-0.5 bg-primary max-w-[80px] ml-2" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-8">
                    <h3 className="text-lg font-medium text-muted-foreground tracking-wide">YOUR ACTIVITY</h3>
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xl">{userInitials}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="h-24 flex items-end justify-between px-2 mb-4 border-b" />
                  <div className="flex justify-between text-xs text-muted-foreground mb-8">
                    <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">AVG TIME/LEAD</p>
                      <p className="text-xl font-semibold text-muted-foreground">N/A</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">TOTAL TIME</p>
                      <p className="text-xl font-semibold">about 0.0 hrs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-muted-foreground tracking-wide mb-6">YOUR PIPELINE</h3>
                  <div className="space-y-4">
                    {pipelineItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          {item.showRelease && <button className="text-xs text-primary hover:underline">(RELEASE NOW)</button>}
                        </div>
                        <div className="text-right">
                          {item.percentage !== undefined && <span className="text-sm text-muted-foreground mr-2">({item.percentage}%)</span>}
                          <span className="text-lg font-semibold">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Navigate Section (shown on dashboard) */}
        {activeTab === "dashboard" && (
          <div className="py-8 space-y-8">
            {/* Workflow Cards */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Your Workflow</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {workflowItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="relative flex flex-col items-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 px-1">
                        {item.badge}
                      </Badge>
                    )}
                    <div className="mb-4">
                      <item.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-foreground text-center mb-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground text-center">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Cards */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Quick Access</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredNavItems.map((item) => (
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
            </div>
          </div>
        )}

        {/* Navigate Tab - now shows same content */}
        {activeTab === "navigate" && (
          <div className="py-8 space-y-8">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Your Workflow</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {workflowItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="relative flex flex-col items-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 px-1">
                        {item.badge}
                      </Badge>
                    )}
                    <div className="mb-4">
                      <item.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-foreground text-center mb-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground text-center">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Quick Access</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredNavItems.map((item) => (
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
            </div>
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
                  <Link key={lead.id} to={`/leads?id=${lead.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors">
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
                  <Link key={lead.id} to={`/leads?id=${lead.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors">
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
                  <Link key={lead.id} to={`/leads?id=${lead.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors">
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
                    <Link key={callback.id} to={`/leads?id=${callback.id}`} className="flex items-center justify-between p-4 rounded-lg border border-l-4 border-l-destructive bg-card hover:bg-muted transition-colors">
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
