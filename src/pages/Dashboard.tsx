import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Lead } from "@/types/crm";
import {
  Phone,
  Clock,
  Trophy,
  TrendingUp,
  Mail,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  ArrowRight,
  ListTodo,
  CheckCircle,
  User,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CallLog {
  id: string;
  created_at: string;
  duration_seconds: number | null;
  outcome: string;
  lead_id: string;
}

interface RecentActivity {
  id: string;
  type: "call" | "email" | "sms";
  title: string;
  subtitle: string;
  time: string;
  timestamp: Date;
  lead_id?: string;
}

interface PipelineLead {
  id: string;
  name: string;
  contact: string;
  status: string;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [yesterdayCallCount, setYesterdayCallCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchCallLogs();
      fetchRecentActivities();
    }
  }, [user]);

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

  const fetchCallLogs = async () => {
    if (!user) return;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const { data: todayData } = await supabase
      .from("call_logs")
      .select("id, created_at, duration_seconds, outcome, lead_id")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    setCallLogs(todayData || []);

    const { count } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString());

    setYesterdayCallCount(count || 0);
  };

  const fetchRecentActivities = async () => {
    if (!user) return;
    const activities: RecentActivity[] = [];

    // Fetch leads to get names for activity items
    const { data: leadsData } = await supabase
      .from("leads")
      .select("id, data")
      .or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

    const leadMap = new Map<string, string>();
    (leadsData || []).forEach((lead) => {
      const name = getLeadDisplayName(lead.data as Record<string, unknown>);
      leadMap.set(lead.id, name);
    });

    // Recent calls
    const { data: calls } = await supabase
      .from("call_logs")
      .select("id, created_at, outcome, lead_id, duration_seconds")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    (calls || []).forEach((call) => {
      const mins = call.duration_seconds ? Math.floor(call.duration_seconds / 60) : 0;
      const leadName = leadMap.get(call.lead_id) || "Unknown";
      activities.push({
        id: call.id,
        type: "call",
        title: `Call to ${leadName}`,
        subtitle: `${call.outcome} • ${mins} min`,
        time: formatTimeAgo(new Date(call.created_at)),
        timestamp: new Date(call.created_at),
        lead_id: call.lead_id,
      });
    });

    // Recent emails
    const { data: emails } = await supabase
      .from("email_logs")
      .select("id, created_at, subject, lead_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    (emails || []).forEach((email) => {
      const leadName = leadMap.get(email.lead_id) || "Unknown";
      activities.push({
        id: email.id,
        type: "email",
        title: `Email to ${leadName}`,
        subtitle: email.subject || "No subject",
        time: formatTimeAgo(new Date(email.created_at)),
        timestamp: new Date(email.created_at),
        lead_id: email.lead_id,
      });
    });

    // Recent SMS
    const { data: sms } = await supabase
      .from("sms_logs")
      .select("id, created_at, message, lead_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2);

    (sms || []).forEach((s) => {
      const leadName = leadMap.get(s.lead_id) || "Unknown";
      activities.push({
        id: s.id,
        type: "sms",
        title: `SMS to ${leadName}`,
        subtitle: s.message?.substring(0, 40) + (s.message?.length > 40 ? "..." : "") || "Message",
        time: formatTimeAgo(new Date(s.created_at)),
        timestamp: new Date(s.created_at),
        lead_id: s.lead_id,
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setRecentActivities(activities.slice(0, 6));
  };

  const getLeadDisplayName = (data: Record<string, unknown> | null): string => {
    if (!data) return "Unknown";
    const entries = Object.entries(data);
    
    // Try company name first
    const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma", "business"];
    for (const [key, value] of entries) {
      if (companyFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    // Try name fields
    const nameFields = ["name", "full_name", "first_name", "vardas", "contact"];
    for (const [key, value] of entries) {
      if (nameFields.some(f => key.toLowerCase().includes(f)) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    // Return first string value
    for (const [, value] of entries) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    return "Unknown";
  };

  const getLeadContact = (data: Record<string, unknown> | null): string => {
    if (!data) return "";
    const entries = Object.entries(data);
    
    // Try phone first
    for (const [key, value] of entries) {
      const keyLower = key.toLowerCase();
      if ((keyLower.includes("phone") || keyLower.includes("tel") || keyLower.includes("mobile")) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    // Try email
    for (const [key, value] of entries) {
      const keyLower = key.toLowerCase();
      if ((keyLower.includes("email") || keyLower.includes("mail")) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    return "";
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Calculate call stats
  const callStats = useMemo(() => {
    const hourlyData: { [key: string]: number } = {};
    for (let h = 8; h <= 20; h++) {
      hourlyData[`${h}`] = 0;
    }

    let totalDurationSeconds = 0;

    callLogs.forEach((log) => {
      const callDate = new Date(log.created_at);
      const hour = callDate.getHours();
      if (hourlyData[`${hour}`] !== undefined) {
        hourlyData[`${hour}`]++;
      }
      if (log.duration_seconds) {
        totalDurationSeconds += log.duration_seconds;
      }
    });

    const chartData = Object.entries(hourlyData).map(([hour, calls]) => ({
      hour: `${hour}:00`,
      calls,
    }));

    const totalCalls = callLogs.length;

    let percentChange = 0;
    if (yesterdayCallCount > 0) {
      percentChange = Math.round(((totalCalls - yesterdayCallCount) / yesterdayCallCount) * 100);
    } else if (totalCalls > 0) {
      percentChange = 100;
    }

    const totalHours = Math.floor(totalDurationSeconds / 3600);
    const totalMinutes = Math.floor((totalDurationSeconds % 3600) / 60);
    const totalTimeStr = `${totalHours}h ${totalMinutes}m`;

    return { chartData, totalCalls, percentChange, totalTimeStr };
  }, [callLogs, yesterdayCallCount]);

  // Lead pipeline calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const followupsToday = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    const callbackDate = new Date(l.callback_scheduled_at);
    return callbackDate >= todayStart;
  });

  const onSchedule = leads.filter((l) => l.callback_scheduled_at && new Date(l.callback_scheduled_at) > now).length;
  const due = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    const cb = new Date(l.callback_scheduled_at);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return cb <= now && cb > hourAgo;
  }).length;
  const overdue = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    return new Date(l.callback_scheduled_at) <= new Date(now.getTime() - 60 * 60 * 1000);
  }).length;

  // Get leads for each pipeline stage
  const pipelineStages = useMemo(() => {
    const stages = [
      { 
        label: "New Lead", 
        status: "new",
        color: "bg-blue-500", 
        leads: leads.filter((l) => l.status === "new").slice(0, 3)
      },
      { 
        label: "Qualified", 
        status: "qualified",
        color: "bg-purple-500", 
        leads: leads.filter((l) => l.status === "qualified").slice(0, 3)
      },
      { 
        label: "Contacted", 
        status: "contacted",
        color: "bg-teal-500", 
        leads: leads.filter((l) => l.status === "contacted").slice(0, 3)
      },
      { 
        label: "Callback", 
        status: "callback",
        color: "bg-orange-500", 
        leads: leads.filter((l) => l.status === "callback").slice(0, 3)
      },
      { 
        label: "Won", 
        status: "won",
        color: "bg-green-500", 
        leads: leads.filter((l) => l.status === "won").slice(0, 3)
      },
    ];

    return stages.map((stage) => ({
      ...stage,
      count: leads.filter((l) => l.status === stage.status).length,
      pipelineLeads: stage.leads.map((lead) => ({
        id: lead.id,
        name: getLeadDisplayName(lead.data),
        contact: getLeadContact(lead.data),
        status: lead.status,
      })),
    }));
  }, [leads]);

  const wonsToday = callLogs.filter((log) => log.outcome === "won").length;
  const totalWon = leads.filter((l) => l.status === "won").length;

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}, {firstName}. <span className="text-primary">Here's your day.</span>
          </h1>
        </div>

        {/* Top Stats Cards - Gradient style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Calls Today */}
          <Card className="gradient-purple border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Live Calls Today</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-white">{callStats.totalCalls}</p>
                    {callStats.percentChange !== 0 && (
                      <span className="text-xs text-white/90 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {callStats.percentChange > 0 ? "+" : ""}{callStats.percentChange}%
                      </span>
                    )}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Talk Time */}
          <Card className="gradient-blue border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Talk Time</p>
                  <p className="text-3xl font-bold text-white">{callStats.totalTimeStr}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Due */}
          <Card className="gradient-teal border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Tasks Due</p>
                  <p className="text-3xl font-bold text-white">{followupsToday.length}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Deals Closed */}
          <Card className="gradient-green border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Deals Closed</p>
                  <p className="text-3xl font-bold text-white">{totalWon}</p>
                  {wonsToday > 0 && (
                    <p className="text-xs text-white/80 mt-1">+{wonsToday} today</p>
                  )}
                </div>
                <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Stream & Live Feed */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Activity Stream & Live Feed</h2>
            <Button variant="link" className="text-primary gap-1 p-0 h-auto" onClick={() => navigate("/work")}>
              Quick actions <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Card className="border-border/50 bg-card">
            <CardContent className="p-6">
              {/* Chart */}
              <div className="h-40 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={callStats.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(270 60% 55%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(270 60% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="hsl(270 60% 55%)"
                      strokeWidth={2}
                      fill="url(#callGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Activity Cards */}
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex-shrink-0 bg-muted/30 border border-border/50 rounded-xl p-4 min-w-[220px] hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => activity.lead_id && navigate(`/leads?id=${activity.lead_id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          activity.type === "call" ? "bg-purple-500/20 text-purple-400" :
                          activity.type === "email" ? "bg-blue-500/20 text-blue-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {activity.type === "call" ? <Phone className="w-4 h-4" /> :
                           activity.type === "email" ? <Mail className="w-4 h-4" /> :
                           <MessageSquare className="w-4 h-4" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity yet</p>
                    <p className="text-xs">Start making calls to see your activity here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Board & Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pipeline Board - 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Pipeline Board</h2>
              <Button variant="link" className="text-primary gap-1 p-0 h-auto" onClick={() => navigate("/leads")}>
                View all <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2">
              {pipelineStages.map((stage) => (
                <Card
                  key={stage.label}
                  className="flex-shrink-0 w-[200px] border-border/50 bg-card hover:border-primary/30 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                        <span className="text-xs font-medium text-foreground">{stage.label}</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{stage.count}</span>
                    </div>

                    {stage.pipelineLeads.length > 0 ? (
                      <div className="space-y-2">
                        {stage.pipelineLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="bg-muted/50 rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => navigate(`/leads?id=${lead.id}`)}
                          >
                            <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                            {lead.contact && (
                              <p className="text-xs text-muted-foreground truncate">{lead.contact}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-muted/30 rounded-lg p-4 text-center">
                        <User className="w-5 h-5 mx-auto text-muted-foreground/50 mb-1" />
                        <p className="text-xs text-muted-foreground">No leads</p>
                      </div>
                    )}

                    {stage.count > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/leads?status=${stage.status}`)}
                      >
                        +{stage.count - 3} more
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions & Summary */}
          <div className="space-y-6">
            {/* Top Priorities */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Top Priorities</h3>
                <div className="space-y-3">
                  {overdue > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded border-2 border-destructive" />
                      <span className="text-sm text-foreground">{overdue} overdue callbacks</span>
                    </div>
                  )}
                  {due > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded border-2 border-warning" />
                      <span className="text-sm text-foreground">{due} due callbacks</span>
                    </div>
                  )}
                  {onSchedule > 0 && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm text-foreground">{onSchedule} scheduled</span>
                    </div>
                  )}
                  {followupsToday.length === 0 && overdue === 0 && due === 0 && (
                    <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-11 border-border/50 hover:bg-muted/50"
                    onClick={() => navigate("/work?autostart=true")}
                  >
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-400" />
                      Start Calling
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-11 border-border/50 hover:bg-muted/50"
                    onClick={() => navigate("/leads")}
                  >
                    <span className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-blue-400" />
                      View Leads ({leads.length})
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-11 border-border/50 hover:bg-muted/50"
                    onClick={() => navigate("/reports")}
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      View Reports
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
