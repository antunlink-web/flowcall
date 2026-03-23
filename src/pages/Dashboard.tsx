import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Lead } from "@/types/crm";
import {
  Phone,
  Clock,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Zap,
  Calendar,
  Target,
  Loader2,
  PhoneCall,
  PhoneOff,
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

interface QueueLead {
  id: string;
  name: string;
  phone: string;
  status: string;
  isOverdue: boolean;
  callbackAt: string | null;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [yesterdayCallCount, setYesterdayCallCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useTranslation();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? t.goodMorning : currentHour < 18 ? t.goodAfternoon : t.goodEvening;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [leadsRes, callsRes, yesterdayRes] = await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
        .not("status", "in", '("won","lost","archived")'),
      supabase
        .from("call_logs")
        .select("id, created_at, duration_seconds, outcome, lead_id")
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", yesterdayStart.toISOString())
        .lt("created_at", todayStart.toISOString()),
    ]);

    setLeads((leadsRes.data || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[]);
    setCallLogs(callsRes.data || []);
    setYesterdayCallCount(yesterdayRes.count || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Helpers
  const getLeadDisplayName = (data: Record<string, unknown> | null): string => {
    if (!data) return "Unknown";
    const entries = Object.entries(data);
    const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma", "business"];
    for (const [key, value] of entries) {
      if (companyFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) return value;
    }
    const nameFields = ["name", "full_name", "first_name", "vardas", "contact"];
    for (const [key, value] of entries) {
      if (nameFields.some(f => key.toLowerCase().includes(f)) && typeof value === "string" && value.trim()) return value;
    }
    for (const [, value] of entries) {
      if (typeof value === "string" && value.trim()) return value;
    }
    return "Unknown";
  };

  const getLeadPhone = (data: Record<string, unknown> | null): string => {
    if (!data) return "";
    for (const [key, value] of Object.entries(data)) {
      const k = key.toLowerCase();
      if ((k.includes("phone") || k.includes("tel") || k.includes("mobile")) && typeof value === "string" && value.trim()) return value;
    }
    return "";
  };

  // Stats
  const now = new Date();
  const callStats = useMemo(() => {
    const hourlyData: { [key: string]: number } = {};
    for (let h = 8; h <= 20; h++) hourlyData[`${h}`] = 0;
    let totalDuration = 0;
    let answered = 0;

    callLogs.forEach((log) => {
      const hour = new Date(log.created_at).getHours();
      if (hourlyData[`${hour}`] !== undefined) hourlyData[`${hour}`]++;
      if (log.duration_seconds) totalDuration += log.duration_seconds;
      if (log.outcome === "answered" || log.outcome === "called") answered++;
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

    const connectionRate = totalCalls > 0 ? Math.round((answered / totalCalls) * 100) : 0;
    const hasData = chartData.some(d => d.calls > 0);

    return { chartData, totalCalls, percentChange, connectionRate, hasData };
  }, [callLogs, yesterdayCallCount]);

  // Lead categorization
  const overdueCallbacks = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    return new Date(l.callback_scheduled_at) <= now;
  });

  const dueCallbacks = leads.filter((l) => {
    if (!l.callback_scheduled_at) return false;
    const cb = new Date(l.callback_scheduled_at);
    return cb > now && cb <= new Date(now.getTime() + 2 * 60 * 60 * 1000);
  });

  const newLeads = leads.filter(l => l.status === "new");
  const callbackLeads = leads.filter(l => l.status === "callback");
  const contactedLeads = leads.filter(l => l.status === "contacted");
  const leadsReady = newLeads.length + overdueCallbacks.length;

  // Call queue - overdue first, then new leads
  const queueLeads: QueueLead[] = useMemo(() => {
    const queue: QueueLead[] = [];
    overdueCallbacks.slice(0, 5).forEach(l => {
      queue.push({
        id: l.id,
        name: getLeadDisplayName(l.data),
        phone: getLeadPhone(l.data),
        status: "overdue",
        isOverdue: true,
        callbackAt: l.callback_scheduled_at,
      });
    });
    if (queue.length < 5) {
      newLeads.slice(0, 5 - queue.length).forEach(l => {
        queue.push({
          id: l.id,
          name: getLeadDisplayName(l.data),
          phone: getLeadPhone(l.data),
          status: "new",
          isOverdue: false,
          callbackAt: null,
        });
      });
    }
    return queue;
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daily goal (target 50 calls)
  const dailyGoal = 50;
  const dailyProgress = Math.min((callStats.totalCalls / dailyGoal) * 100, 100);

  // Pipeline stages for interactive board
  const pipelineStages = useMemo(() => [
    { label: t.statusNew, status: "new", color: "bg-blue-500", textColor: "text-blue-400", leads: newLeads },
    { label: t.statusContacted, status: "contacted", color: "bg-purple-500", textColor: "text-purple-400", leads: contactedLeads },
    { label: t.statusCallback, status: "callback", color: "bg-warning", textColor: "text-warning", leads: callbackLeads },
  ], [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Header + Daily Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {callStats.totalCalls} / {dailyGoal} {t.callsToday}
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[200px]">
            <Progress value={dailyProgress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(dailyProgress)}%</span>
          </div>
        </div>

        {/* START CALLING - Hero CTA */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t.startCalling}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                      <span className="text-foreground font-semibold">{leadsReady}</span> {t.leadsReady}
                    </span>
                    {overdueCallbacks.length > 0 && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {overdueCallbacks.length} {t.overdue}
                      </Badge>
                    )}
                    {dueCallbacks.length > 0 && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs gap-1">
                        <Clock className="w-3 h-3" />
                        {dueCallbacks.length} {t.dueSoon}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 gap-2 font-semibold w-full sm:w-auto"
                onClick={() => navigate("/work?autostart=true")}
              >
                <Phone className="w-5 h-5" />
                {t.startCalling}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Urgency Alerts */}
        {(overdueCallbacks.length > 0 || dueCallbacks.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {overdueCallbacks.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-destructive">{overdueCallbacks.length} {t.overdueCallbacks}</p>
                      <p className="text-xs text-muted-foreground">{t.leadsWaiting}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => navigate("/work")}>
                    {t.view}
                  </Button>
                </CardContent>
              </Card>
            )}
            {dueCallbacks.length > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-warning">{dueCallbacks.length} {t.callbacksDueSoon}</p>
                      <p className="text-xs text-muted-foreground">{t.scheduledWithin2h}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-warning/30 text-warning hover:bg-warning/10" onClick={() => navigate("/work")}>
                    {t.view}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">{t.callsMetric}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{callStats.totalCalls}</span>
                {callStats.percentChange !== 0 && (
                  <span className={`text-xs flex items-center gap-0.5 ${callStats.percentChange > 0 ? "text-success" : "text-destructive"}`}>
                    <TrendingUp className="w-3 h-3" />
                    {callStats.percentChange > 0 ? "+" : ""}{callStats.percentChange}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted-foreground font-medium">{t.leadsRemaining}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{leads.length}</span>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground font-medium">{t.callbacksDue}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{overdueCallbacks.length + dueCallbacks.length}</span>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground font-medium">{t.connectionRate}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{callStats.connectionRate}%</span>
            </CardContent>
          </Card>
        </div>

        {/* Call Queue Preview */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{t.nextLeadsToCall}</h3>
              </div>
              <Button variant="link" className="text-primary gap-1 p-0 h-auto text-xs" onClick={() => navigate("/work")}>
                {t.viewQueue} <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {queueLeads.length > 0 ? (
              <div className="space-y-2">
                {queueLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      lead.isOverdue
                        ? "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
                        : "bg-muted/30 border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {lead.isOverdue && (
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.phone || t.noPhone}
                          {lead.callbackAt && (
                            <span className="ml-2">
                              · Callback {new Date(lead.callbackAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/leads?id=${lead.id}`)}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1 bg-primary/20 text-primary hover:bg-primary/30 border-0"
                        onClick={() => navigate(`/leads?id=${lead.id}`)}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <PhoneOff className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{t.noLeadsInQueue}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t.uploadLeadsToStart}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interactive Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">{t.pipeline}</h2>
            <Button variant="link" className="text-primary gap-1 p-0 h-auto text-xs" onClick={() => navigate("/leads")}>
              {t.viewAll} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pipelineStages.map((stage) => (
              <Card key={stage.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{stage.leads.length}</span>
                  </div>

                  {stage.leads.length > 0 ? (
                    <div className="space-y-2">
                      {stage.leads.slice(0, 3).map((lead) => {
                        const isOverdue = lead.callback_scheduled_at && new Date(lead.callback_scheduled_at) <= now;
                        return (
                          <div
                            key={lead.id}
                            className={`rounded-lg p-3 transition-colors group ${
                              isOverdue ? "bg-destructive/10 border border-destructive/20" : "bg-muted/40 hover:bg-muted/60"
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground truncate">{getLeadDisplayName(lead.data)}</p>
                            <p className="text-xs text-muted-foreground truncate">{getLeadPhone(lead.data) || t.noPhone}</p>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1 mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => navigate(`/leads?id=${lead.id}`)}
                              >
                                <Phone className="w-3 h-3" /> {t.call}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => navigate(`/leads?id=${lead.id}`)}
                              >
                                <Calendar className="w-3 h-3" /> {t.schedule}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => navigate(`/leads?id=${lead.id}`)}
                              >
                                Note
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {stage.leads.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-muted-foreground"
                          onClick={() => navigate(`/leads?status=${stage.status}`)}
                        >
                          +{stage.leads.length - 3} more <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground/50">
                      <p className="text-xs">No leads in this stage</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Activity Graph - compact, only if data */}
        {callStats.hasData && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">TODAY'S CALL ACTIVITY</h3>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={callStats.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#callGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
