import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneCall, ThumbsUp, TrendingUp, Clock, RotateCcw, CalendarClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFlowLeads, useTodayStats } from "@/hooks/useFlowLeads";
import { format, isToday, isBefore } from "date-fns";

export default function FlowDashboard() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useFlowLeads();
  const { data: stats } = useTodayStats();

  const todayTasks = useMemo(() => {
    const now = new Date();
    return leads
      .filter((l) => {
        if (l.status === "new" && l.callAttempts === 0) return true;
        if (l.callbackAt && (isToday(new Date(l.callbackAt)) || isBefore(new Date(l.callbackAt), now))) return true;
        if (l.status === "callback") return true;
        return false;
      })
      .slice(0, 10)
      .map((l) => ({
        ...l,
        actionType: l.callbackAt ? "callback" : l.callAttempts > 0 ? "retry" : "call",
        actionTime: l.callbackAt ? format(new Date(l.callbackAt), "HH:mm") : null,
      }));
  }, [leads]);

  const statCards = [
    { label: "Calls today", value: stats?.calls ?? 0, icon: Phone, color: "text-primary" },
    { label: "Pickups", value: stats?.pickups ?? 0, icon: PhoneCall, color: "text-emerald-400" },
    { label: "Interested", value: stats?.interested ?? 0, icon: ThumbsUp, color: "text-amber-400" },
    { label: "Conversion", value: `${stats?.conversionPct ?? 0}%`, icon: TrendingUp, color: "text-violet-400" },
  ];

  const actionIcons: Record<string, typeof Clock> = {
    callback: CalendarClock,
    retry: RotateCcw,
    call: Phone,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Start Calling — hero button */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Ready to call?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {leads.filter((l) => l.status === "new").length} new leads waiting
            </p>
          </div>
          <Button
            size="lg"
            className="text-base px-8 py-6 rounded-xl shadow-lg shadow-primary/20"
            onClick={() => navigate("session")}
          >
            <Phone className="h-5 w-5 mr-2" />
            Start Calling Session
          </Button>
        </CardContent>
      </Card>

      {/* Today's Tasks */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🔥 Today's Tasks
          <span className="text-sm font-normal text-muted-foreground">({todayTasks.length})</span>
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : todayTasks.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-6 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending tasks for today</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => {
              const ActionIcon = actionIcons[task.actionType] || Phone;
              return (
                <Card key={task.id} className="border-border/40 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <ActionIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.company && `${task.company} · `}
                          {task.phone}
                          {task.actionTime && ` · ${task.actionTime}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary/10"
                      onClick={() => navigate("session")}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
