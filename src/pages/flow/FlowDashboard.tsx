import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, PhoneCall, ThumbsUp, TrendingUp, Clock, RotateCcw,
  CalendarClock, CheckCircle2, ArrowRight, Upload, Plus, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFlowLeads, useTodayStats } from "@/hooks/useFlowLeads";
import {
  useNextActions,
  getEffectiveTime,
  type NextAction,
} from "@/hooks/useNextActions";
import { format, isToday, isPast } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

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

type TaskItem = NextAction & { lead: ReturnType<typeof useFlowLeads>["data"] extends (infer T)[] ? T : never | undefined };

export default function FlowDashboard() {
  const navigate = useNavigate();
  const t = useTranslation();
  const { data: leads = [] } = useFlowLeads();
  const { data: stats } = useTodayStats();
  const { data: actions = [], isLoading } = useNextActions();

  const actionTypeLabelsLocalized: Record<string, string> = {
    call: t.flowActionCall, retry_call: t.flowActionRetry,
    follow_up_call: t.flowActionFollowUp, send_sms: t.flowActionSms,
    send_email: t.flowActionEmail, wait_for_reply: t.flowActionWaiting,
    meeting: t.flowActionMeeting, custom: t.flowActionTask,
  };

  const leadMap = useMemo(() => {
    const m = new Map<string, (typeof leads)[0]>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);

  const { overdue, today } = useMemo(() => {
    const ov: TaskItem[] = [];
    const td: TaskItem[] = [];

    actions.forEach((a) => {
      const time = getEffectiveTime(a);
      const lead = leadMap.get(a.lead_id);
      const item = { ...a, lead } as TaskItem;

      if (isPast(time) && !isToday(time)) {
        ov.push(item);
      } else if (isToday(time) || (!a.scheduled_for && !a.due_at && !a.snoozed_until)) {
        td.push(item);
      }
    });

    ov.sort((a, b) => getEffectiveTime(a).getTime() - getEffectiveTime(b).getTime());
    td.sort((a, b) => getEffectiveTime(a).getTime() - getEffectiveTime(b).getTime());
    return { overdue: ov, today: td };
  }, [actions, leadMap]);

  const callableCount = actions.filter((a) =>
    ["call", "retry_call", "follow_up_call"].includes(a.action_type)
  ).length;

  const totalTasks = overdue.length + today.length;
  const isEmpty = totalTasks === 0 && !isLoading;

  function getContactLabel(lead: TaskItem["lead"]) {
    const name = lead?.name?.trim();
    const company = lead?.company?.trim();
    const phone = lead?.phone?.trim();
    const email = lead?.email?.trim();

    const primary = name || company || phone || email || t.flowUnknownContact;
    const parts: string[] = [];
    if (name && company) parts.push(company);
    if (phone) parts.push(phone);
    else parts.push(t.flowNoPhone);
    if (email && !name && !company) { /* already used as primary */ }
    else if (email) parts.push(email);

    return { primary, secondary: parts.join(" · "), hasPhone: !!phone };
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Stats — compact row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t.flowCalls, value: stats?.calls ?? 0, icon: Phone },
          { label: t.flowPickups, value: stats?.pickups ?? 0, icon: PhoneCall },
          { label: t.flowInterested, value: stats?.interested ?? 0, icon: ThumbsUp },
          { label: t.flowRate, value: `${stats?.conversionPct ?? 0}%`, icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
            <s.icon className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="text-lg py-7 rounded-2xl shadow-lg shadow-primary/25 font-semibold"
          onClick={() => navigate("session")}
        >
          <Phone className="h-6 w-6 mr-3" />
          {t.flowStartCalling}
          {callableCount > 0 && (
            <Badge variant="secondary" className="ml-3 text-xs">
              {callableCount}
            </Badge>
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="text-lg py-7 rounded-2xl font-semibold"
          onClick={() => navigate("calendar")}
        >
          <CalendarDays className="h-6 w-6 mr-3" />
          {t.flowCalendar}
        </Button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400/70" />
            <div>
              <p className="font-semibold text-lg">{t.flowDoneForNow}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.flowNoTasks}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/manage/lists")}>
                <Upload className="h-4 w-4 mr-2" />{t.flowImportLeads}
              </Button>
              <Button variant="outline" onClick={() => navigate("/manage/lists")}>
                <Plus className="h-4 w-4 mr-2" />{t.flowNewList}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <TaskQueue
          title={t.flowOverdue}
          badge="destructive"
          items={overdue}
          isOverdue
          overdueLabel={t.flowOverdue}
          callLabel={t.calCall}
          actionLabels={actionTypeLabelsLocalized}
          getContactLabel={getContactLabel}
          onCall={() => navigate("session")}
          onRowClick={(leadId) => navigate(`lead/${leadId}`)}
        />
      )}

      {/* Today's Calls Queue */}
      {(today.length > 0 || isLoading) && (
        <TaskQueue
          title={t.flowTodaysCalls}
          items={today}
          isLoading={isLoading}
          callLabel={t.calCall}
          actionLabels={actionTypeLabelsLocalized}
          getContactLabel={getContactLabel}
          onCall={() => navigate("session")}
          onRowClick={(leadId) => navigate(`lead/${leadId}`)}
        />
      )}
    </div>
  );
}

/* ── Task Queue Section ──────────────────────────────────────── */

function TaskQueue({
  title,
  badge,
  items,
  isOverdue = false,
  isLoading = false,
  overdueLabel = "Overdue",
  callLabel = "Call",
  actionLabels,
  getContactLabel,
  onCall,
  onRowClick,
}: {
  title: string;
  badge?: "destructive" | "default";
  items: TaskItem[];
  isOverdue?: boolean;
  isLoading?: boolean;
  overdueLabel?: string;
  callLabel: string;
  actionLabels: Record<string, string>;
  getContactLabel: (lead: TaskItem["lead"]) => { primary: string; secondary: string; hasPhone: boolean };
  onCall: () => void;
  onRowClick: (leadId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <Badge
          variant={badge === "destructive" ? "destructive" : "outline"}
          className="text-[10px] px-1.5 py-0"
        >
          {items.length}
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((task) => {
            const ActionIcon = actionIcons[task.action_type] || Phone;
            const effectiveTime = getEffectiveTime(task);
            const typeLabel = actionLabels[task.action_type] || task.action_type;
            const { primary, secondary, hasPhone } = getContactLabel(task.lead);

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3.5 hover:bg-accent/50 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => task.lead && onRowClick(task.lead.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && task.lead) onRowClick(task.lead.id);
                }}
              >
                <div className="p-2 rounded-lg bg-muted/40 group-hover:bg-primary/10 transition-colors">
                  <ActionIcon className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {primary}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {typeLabel}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                        {overdueLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {secondary}
                    {task.scheduled_for && ` · ${format(effectiveTime, "HH:mm")}`}
                  </p>
                </div>

                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={!hasPhone}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall();
                  }}
                >
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  {callLabel}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
