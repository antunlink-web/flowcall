import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Phone, Trophy, XCircle, Users, Mail, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalLeads: number;
  totalCalls: number;
  totalEmails: number;
  won: number;
  lost: number;
  callsByOutcome: { name: string; value: number }[];
  leadsByStatus: { name: string; value: number }[];
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];

export default function Reports() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const { user } = useAuth();
  const { isAdminOrManager } = useUserRole();

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      setLoading(true);

      // Get leads
      const { data: leads } = await supabase.from("leads").select("status");

      // Get call logs (with date filter if needed)
      let callQuery = supabase.from("call_logs").select("outcome, created_at");
      if (!isAdminOrManager) {
        callQuery = callQuery.eq("user_id", user.id);
      }
      const { data: calls } = await callQuery;

      // Get email logs
      let emailQuery = supabase.from("email_logs").select("id");
      if (!isAdminOrManager) {
        emailQuery = emailQuery.eq("user_id", user.id);
      }
      const { data: emails } = await emailQuery;

      // Calculate stats
      const leadsByStatus = [
        { name: "New", value: leads?.filter((l) => l.status === "new").length || 0 },
        { name: "Contacted", value: leads?.filter((l) => l.status === "contacted").length || 0 },
        { name: "Qualified", value: leads?.filter((l) => l.status === "qualified").length || 0 },
        { name: "Callback", value: leads?.filter((l) => l.status === "callback").length || 0 },
        { name: "Won", value: leads?.filter((l) => l.status === "won").length || 0 },
        { name: "Lost", value: leads?.filter((l) => l.status === "lost").length || 0 },
      ];

      const callsByOutcome = [
        { name: "Answered", value: calls?.filter((c) => c.outcome === "answered").length || 0 },
        { name: "No Answer", value: calls?.filter((c) => c.outcome === "no_answer").length || 0 },
        { name: "Busy", value: calls?.filter((c) => c.outcome === "busy").length || 0 },
        { name: "Voicemail", value: calls?.filter((c) => c.outcome === "voicemail").length || 0 },
        { name: "Won", value: calls?.filter((c) => c.outcome === "won").length || 0 },
        { name: "Lost", value: calls?.filter((c) => c.outcome === "lost").length || 0 },
      ];

      setStats({
        totalLeads: leads?.length || 0,
        totalCalls: calls?.length || 0,
        totalEmails: emails?.length || 0,
        won: leads?.filter((l) => l.status === "won").length || 0,
        lost: leads?.filter((l) => l.status === "lost").length || 0,
        callsByOutcome,
        leadsByStatus,
      });

      setLoading(false);
    }

    fetchStats();
  }, [user, isAdminOrManager, period]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const conversionRate = stats && stats.won + stats.lost > 0
    ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(1)
    : "0";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">
              {isAdminOrManager ? "Team performance overview" : "Your performance overview"}
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats?.totalLeads}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats?.totalCalls}</p>
                <p className="text-sm text-muted-foreground">Calls Made</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats?.won}</p>
                <p className="text-sm text-muted-foreground">Won</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-3xl font-bold">{conversionRate}%</p>
                <p className="text-sm text-muted-foreground">Win Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Outcomes */}
          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.callsByOutcome}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Lead Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.leadsByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {stats?.leadsByStatus.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}