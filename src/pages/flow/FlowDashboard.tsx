import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, PhoneCall, ThumbsUp, TrendingUp, Clock, RotateCcw,
  CalendarClock, CheckCircle2, ArrowRight, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFlowLeads, useTodayStats } from "@/hooks/useFlowLeads";
import {
  useNextActions,
  getEffectiveTime,
  actionTypeLabels,
  type NextAction,
} from "@/hooks/useNextActions";
import { format, isToday, isPast } from "date-fns";

const actionIcons: Record<string, typeof Clock> = {
  call: Phone,
  retry_call: RotateCcw,
  follow_up_call: ArrowRight,
  wait_for_reply: Clock,
  send_sms: ArrowRight,
  send_email: ArrowRight,
  meeting: CalendarClock,
  custom: ArrowRight,
};

export default function FlowDashboard() {
  const navigate = useNavigate();
  const { data: leads = [] } = useFlowLeads();
  const { data: stats } = useTodayStats();
  const { data: actions = [], isLoading } = useNextActions();

  // Build lead lookup
  const leadMap = useMemo(() => {
    const m = new Map<string, (typeof leads)[0]>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);

  // Split actions into overdue vs today
  const { overdue, today } = useMemo(() => {
    const now = new Date();
    const ov: (NextAction & { lead: (typeof leads)[0] | undefined })[] = [];
    const td: (NextAction & { lead: (typeof leads)[0] | undefined })[] = [];

    actions.forEach((a) => {
      const t = getEffectiveTime(a);
      const lead = leadMap.get(a.lead_id);
      const item = { ...a, lead };

      if (isPast(t) && !isToday(t)) {
        ov.push(item);
      } else if (isToday(t) || (!a.scheduled_for && !a.due_at && !a.snoozed_until)) {
        td.push(item);
      }
      // future tasks are hidden in Simple Mode
    });

    ov.sort((a, b) => getEffectiveTime(a).getTime() - getEffectiveTime(b).getTime());
    td.sort((a, b) => getEffectiveTime(a).getTime() - getEffectiveTime(b).getTime());
    return { overdue: ov, today: td };
  }, [actions, leadMap]);

  const statCards = [
    { label: "Calls today", value: stats?.calls ?? 0, icon: Phone, color: "text-primary" },
    { label: "Pickups", value: stats?.pickups ?? 0, icon: PhoneCall, color: "text-emerald-400" },
    { label: "Interested", value: stats?.interested ?? 0, icon: ThumbsUp, color: "text-amber-400" },
    { label: "Conversion", value: `${stats?.conversionPct ?? 0}%`, icon: TrendingUp, color: "text-violet-400" },
  ];

  const callableCount = actions.filter((a) =>
    ["call", "retry_call", "follow_up_call"].includes(a.action_type)
  ).length;

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

      {/* Start Calling */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Ready to call?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {callableCount} tasks waiting
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

      {/* Overdue */}
      {overdue.length > 0 && (
        <TaskSection
          title="⚠️ Overdue"
          count={overdue.length}
          items={overdue}
          isOverdue
          onCall={() => navigate("session")}
        />
      )}

      {/* Today's Tasks */}
      <TaskSection
        title="🔥 Today's Tasks"
        count={today.length}
        items={today}
        isLoading={isLoading}
        onCall={() => navigate("session")}
      />
    </div>
  );
}

// ── Task section component ──────────────────────────────────────────

function TaskSection({
  title,
  count,
  items,
  isOverdue = false,
  isLoading = false,
  onCall,
}: {
  title: string;
  count: number;
  items: (NextAction & { lead: any })[];
  isOverdue?: boolean;
  isLoading?: boolean;
  onCall: () => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        {title}
        <span className="text-sm font-normal text-muted-foreground">({count})</span>
      </h3>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-6 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No pending tasks</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((task) => {
            const ActionIcon = actionIcons[task.action_type] || Phone;
            const effectiveTime = getEffectiveTime(task);

            return (
              <Card key={task.id} className="border-border/40 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <ActionIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {task.lead?.name || "Unknown"}
                        </p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {actionTypeLabels[task.action_type] || task.action_type}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive">
                            Overdue
                          </Badge>
                        )}
                        {task.priority === "high" || task.priority === "urgent" ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                            {task.priority}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {task.lead?.company && `${task.lead.company} · `}
                        {task.lead?.phone}
                        {task.scheduled_for && ` · ${format(effectiveTime, "HH:mm")}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary hover:bg-primary/10"
                    onClick={onCall}
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
  );
}
