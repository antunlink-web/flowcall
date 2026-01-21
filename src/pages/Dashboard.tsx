import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Lead } from "@/types/crm";
import {
  Phone,
  Calendar,
  CalendarClock,
  CalendarX,
  CalendarMinus,
  ThumbsUp,
  Clock,
  Trophy,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CallLog {
  id: string;
  created_at: string;
  duration_seconds: number | null;
  outcome: string;
}

interface PipelineItem {
  icon: React.ElementType;
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
  showRelease?: boolean;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [yesterdayCallCount, setYesterdayCallCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchCallLogs();
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

    // Fetch today's calls
    const { data: todayData } = await supabase
      .from("call_logs")
      .select("id, created_at, duration_seconds, outcome")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    setCallLogs(todayData || []);

    // Fetch yesterday's call count for comparison
    const { count } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString());

    setYesterdayCallCount(count || 0);
  };

  // Calculate call stats from real data
  const callStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Group calls by hour (9:00 - 17:00)
    const hourlyData: { [key: string]: number } = {};
    for (let h = 9; h <= 17; h++) {
      const hourKey = `${h.toString().padStart(2, "0")}:00`;
      hourlyData[hourKey] = 0;
    }

    let totalDurationSeconds = 0;

    callLogs.forEach((log) => {
      const callDate = new Date(log.created_at);
      const hour = callDate.getHours();
      const hourKey = `${hour.toString().padStart(2, "0")}:00`;

      if (hourlyData[hourKey] !== undefined) {
        hourlyData[hourKey]++;
      }

      if (log.duration_seconds) {
        totalDurationSeconds += log.duration_seconds;
      }
    });

    const chartData = Object.entries(hourlyData).map(([hour, calls]) => ({
      hour,
      calls,
    }));

    const totalCalls = callLogs.length;
    const avgSecondsPerLead = totalCalls > 0 ? totalDurationSeconds / totalCalls : 0;

    // Format durations
    const totalHours = Math.floor(totalDurationSeconds / 3600);
    const totalMinutes = Math.floor((totalDurationSeconds % 3600) / 60);
    const totalTimeStr = `${totalHours}h ${totalMinutes}m`;

    const avgMinutes = Math.floor(avgSecondsPerLead / 60);
    const avgSeconds = Math.floor(avgSecondsPerLead % 60);
    const avgTimeStr = totalCalls > 0 ? `${avgMinutes}m ${avgSeconds}s` : "N/A";

    // Calculate percentage change from yesterday
    let percentChange = 0;
    if (yesterdayCallCount > 0) {
      percentChange = Math.round(((totalCalls - yesterdayCallCount) / yesterdayCallCount) * 100);
    } else if (totalCalls > 0) {
      percentChange = 100;
    }

    return {
      chartData,
      totalCalls,
      totalTimeStr,
      avgTimeStr,
      percentChange,
    };
  }, [callLogs, yesterdayCallCount]);

  // Calculate lead stats
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

  // Count deals won today
  const wonsToday = callLogs.filter((log) => log.outcome === "won").length;

  const pipelineItems: PipelineItem[] = [
    { icon: ThumbsUp, label: "WON", count: won, percentage: 100, color: "bg-green-500", bgColor: "bg-green-100" },
    { icon: Calendar, label: "ON SCHEDULE", count: onSchedule, percentage: total > 0 ? (onSchedule / total) * 100 : 0, color: "bg-blue-500", bgColor: "bg-blue-100" },
    { icon: CalendarClock, label: "DUE", count: due, percentage: total > 0 ? (due / total) * 100 : 0, color: "bg-amber-500", bgColor: "bg-amber-100" },
    { icon: CalendarX, label: "OVERDUE", count: overdue, percentage: total > 0 ? (overdue / total) * 100 : 0, color: "bg-red-500", bgColor: "bg-red-100" },
    { icon: CalendarMinus, label: "NOT SCHEDULED", count: notScheduled, percentage: total > 0 ? (notScheduled / total) * 100 : 0, color: "bg-gray-400", bgColor: "bg-gray-100", showRelease: notScheduled > 0 },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Calls Made */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Calls Made</span>
                  {callStats.percentChange !== 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${callStats.percentChange >= 0 ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"}`}>
                      {callStats.percentChange >= 0 ? "↑" : "↓"} {Math.abs(callStats.percentChange)}% from yesterday
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{callStats.totalCalls}</p>
                    <p className="text-sm text-muted-foreground">Calls Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Followups Due */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Followups Due</span>
                  {dueToday.length === 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> All caught up!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{dueToday.length}</p>
                    <p className="text-sm text-muted-foreground">Due Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Talk Time */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Talk Time</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{callStats.totalTimeStr}</p>
                    <p className="text-sm text-muted-foreground">Total Talk Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities Won */}
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Opportunities Won</span>
                  {wonsToday > 0 && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">↑ +{wonsToday}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{won}</p>
                    <p className="text-sm text-muted-foreground">Deals Won Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Your Activity - Takes 2 columns */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Your Activity</h3>
                  <Button 
                    onClick={() => navigate("/work?autostart=true")} 
                    className="bg-green-500 hover:bg-green-600 text-white gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Call now
                  </Button>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Calls Per Hour</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={callStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis 
                          dataKey="hour" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          domain={[0, 'auto']}
                          allowDecimals={false}
                        />
                        <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                          {callStats.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="hsl(217, 91%, 60%)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Avg Time/Lead: <strong className="text-foreground">{callStats.avgTimeStr}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Total Time: <strong className="text-foreground">{callStats.totalTimeStr}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Pipeline */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Your Pipeline</h3>
                <div className="space-y-5">
                  {pipelineItems.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                            <item.icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">{item.count}</span>
                          {item.label === "WON" && (
                            <span className="text-xs text-muted-foreground">({Math.round(item.percentage)}%)</span>
                          )}
                          {item.showRelease && (
                            <Button size="sm" variant="default" className="h-6 text-xs bg-blue-500 hover:bg-blue-600">
                              Release Now
                            </Button>
                          )}
                        </div>
                      </div>
                      <Progress 
                        value={item.percentage} 
                        className={`h-2 ${item.bgColor}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}