import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ChevronDown,
} from "lucide-react";

interface PipelineItem {
  icon: React.ElementType;
  label: string;
  count: number;
  percentage?: number;
  color: string;
  showRelease?: boolean;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
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
      </div>
    </DashboardLayout>
  );
}
