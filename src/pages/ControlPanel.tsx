import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  LayoutDashboard,
  Users,
  BarChart3,
  Megaphone,
  Settings,
  History,
  Lock,
  Bell,
  ListPlus,
  UserCircle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

type TabType = "dashboard" | "welcome" | "navigate" | "history" | "scheduled" | "locked" | "due";

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

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  completed?: boolean;
}

const mainNavItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["agent", "owner", "account_manager"], description: "View your stats and activity" },
  { name: "Work", href: "/work", icon: Phone, roles: ["agent", "owner", "account_manager"], description: "Start calling leads" },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["owner", "account_manager"], description: "View performance reports" },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone, roles: ["owner", "account_manager"], description: "Manage campaigns" },
  { name: "Team", href: "/team", icon: Users, roles: ["owner"], description: "Manage team members" },
  { name: "Manage", href: "/manage", icon: Settings, roles: ["owner", "account_manager"], description: "System settings and lists" },
];

export default function ControlPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);

    const { data } = await supabase
      .from("leads")
      .select("*")
      .or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

    const mappedLeads = (data || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[];

    setLeads(mappedLeads);
    setLoading(false);
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

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const appName = branding?.app_name || "the CRM";

  const onboardingSteps: OnboardingStep[] = [
    { icon: Phone, title: "Choose how you want to call", description: "Select from our range of calling options.", link: "/preferences" },
    { icon: ListPlus, title: "Create a list", description: "Upload and configure a list of leads.", link: "/manage/lists" },
    { icon: Users, title: "Invite Co-Workers", description: "Give others access to work your lists.", link: "/team" },
    { icon: UserCircle, title: "Complete your profile", description: "Complete your details and preferences.", link: "/preferences" },
    { icon: Settings, title: "Manage your account", description: "Subscription, invoices, and settings.", link: "/manage/account" },
  ];

  const tabs = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
    { id: "navigate" as TabType, label: "Navigate", icon: ChevronRight },
    { id: "history" as TabType, label: "History", icon: History },
    { id: "scheduled" as TabType, label: "Scheduled", icon: Calendar },
    { id: "locked" as TabType, label: "Locked", icon: Lock },
    { id: "due" as TabType, label: "Due", icon: Bell, badge: dueCallbacks.length },
    { id: "welcome" as TabType, label: "Getting Started", icon: CheckCircle2 },
  ];

  return (
    <DashboardLayout>
      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollArea className="w-full">
            <div className="flex gap-1 py-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

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

        {/* Navigate Tab */}
        {activeTab === "navigate" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Quick Navigation</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </Link>
              ))}
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

        {/* Welcome/Getting Started Tab */}
        {activeTab === "welcome" && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl text-primary font-light">
                <span className="italic">Hello, {userName}!</span>
                <span className="text-muted-foreground text-xl ml-2">Here's a few simple steps to get started with {appName}.</span>
              </h1>
              <div className="h-0.5 bg-primary/30 mt-3 max-w-md" />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {onboardingSteps.map((step, index) => (
                  <Link key={index} to={step.link} className="flex items-start gap-4 group hover:bg-muted/50 p-3 rounded-lg transition-colors -ml-3">
                    <div className="relative mt-1">
                      <step.icon className="w-8 h-8 text-muted-foreground/60" />
                      {step.completed && <CheckCircle2 className="w-4 h-4 text-green-500 absolute -bottom-1 -right-1 bg-background rounded-full" />}
                    </div>
                    <div>
                      <h3 className="text-primary font-medium group-hover:underline">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div>
                <Card className="bg-muted/30 border-muted">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-3">Need help?</h3>
                    <p className="text-sm text-muted-foreground mb-1">Read the <a href="#" className="text-primary hover:underline">Getting Started Guide</a></p>
                    <p className="text-sm text-muted-foreground mb-4">Find answers in the <a href="#" className="text-primary hover:underline">FAQ</a></p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-muted-foreground">Or simply</span>
                      <Button variant="outline" size="sm" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Ask a question</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">We read and reply to every message.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
