import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Phone, RotateCcw, ArrowRight, Clock, CalendarClock, Plus,
} from "lucide-react";
import {
  useNextActions, useCreateNextAction,
  actionTypeLabels, getEffectiveTime,
  type ActionType, type NextAction,
} from "@/hooks/useNextActions";
import { useFlowLeads } from "@/hooks/useFlowLeads";
import {
  format, isSameDay, isToday, isPast,
  startOfWeek, endOfWeek, addDays,
  eachDayOfInterval, eachHourOfInterval,
  startOfDay, endOfDay, setHours,
} from "date-fns";
import { hr } from "date-fns/locale";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────
export type CalendarView = "month" | "week" | "day";

const actionIcons: Record<string, typeof Clock> = {
  call: Phone, retry_call: RotateCcw, follow_up_call: ArrowRight,
  wait_for_reply: Clock, send_sms: ArrowRight, send_email: ArrowRight,
  meeting: CalendarClock, custom: ArrowRight,
};

interface ScheduleCalendarProps {
  /** Base path for lead navigation, e.g. "/flow" or "/work" */
  leadBasePath?: string;
  /** Navigate to session path */
  sessionPath?: string;
}

export function ScheduleCalendar({
  leadBasePath = "/flow",
  sessionPath = "/flow/session",
}: ScheduleCalendarProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const { data: leads = [] } = useFlowLeads();
  const { data: actions = [] } = useNextActions();
  const createAction = useCreateNextAction();

  const [scheduleLeadId, setScheduleLeadId] = useState("");
  const [scheduleType, setScheduleType] = useState<ActionType>("call");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  const leadMap = useMemo(() => {
    const m = new Map<string, (typeof leads)[0]>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);

  type EnrichedAction = NextAction & { lead?: (typeof leads)[0] };

  const actionsByDate = useMemo(() => {
    const map = new Map<string, EnrichedAction[]>();
    actions.forEach((a) => {
      const t = getEffectiveTime(a);
      const key = format(t, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...a, lead: leadMap.get(a.lead_id) });
    });
    map.forEach((items) => {
      items.sort((a, b) => getEffectiveTime(a).getTime() - getEffectiveTime(b).getTime());
    });
    return map;
  }, [actions, leadMap]);

  const datesWithActions = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => set.add(format(getEffectiveTime(a), "yyyy-MM-dd")));
    return set;
  }, [actions]);

  function getContactLabel(lead?: (typeof leads)[0]) {
    if (!lead) return { primary: "Nepoznat kontakt", secondary: "" };
    const primary = lead.name || lead.company || lead.phone || lead.email || "Nepoznat kontakt";
    const parts: string[] = [];
    if (lead.name && lead.company) parts.push(lead.company);
    if (lead.phone) parts.push(lead.phone);
    return { primary, secondary: parts.join(" · ") };
  }

  function handleSchedule() {
    if (!scheduleLeadId || !scheduleDate || !scheduleTime) {
      toast.error("Ispunite sva polja");
      return;
    }
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    createAction.mutate(
      { leadId: scheduleLeadId, actionType: scheduleType, scheduledFor, source: "manual" },
      {
        onSuccess: () => {
          toast.success("Akcija zakazana");
          setShowScheduleDialog(false);
          setScheduleLeadId("");
          setScheduleDate("");
          setScheduleTime("10:00");
        },
      }
    );
  }

  function openScheduleDialog() {
    setScheduleDate(format(selectedDate, "yyyy-MM-dd"));
    setShowScheduleDialog(true);
  }

  // ── Action row renderer ──────────────────────────────────
  function ActionRow({ action }: { action: EnrichedAction }) {
    const ActionIcon = actionIcons[action.action_type] || Phone;
    const effectiveTime = getEffectiveTime(action);
    const typeLabel = actionTypeLabels[action.action_type] || action.action_type;
    const { primary, secondary } = getContactLabel(action.lead);
    const overdue = isPast(effectiveTime) && !isToday(effectiveTime);

    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 hover:bg-accent/50 hover:border-primary/30 transition-colors cursor-pointer group"
        onClick={() => action.lead && navigate(`${leadBasePath}/lead/${action.lead.id}`)}
        role="button" tabIndex={0}
      >
        <div className="p-2 rounded-lg bg-muted/40 group-hover:bg-primary/10 transition-colors">
          <ActionIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="text-sm font-mono text-muted-foreground w-14 shrink-0">
          {format(effectiveTime, "HH:mm")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{primary}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{typeLabel}</Badge>
            {overdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">Zakašnjelo</Badge>}
          </div>
          {secondary && <p className="text-xs text-muted-foreground truncate mt-0.5">{secondary}</p>}
        </div>
        <Button size="sm" className="shrink-0" disabled={!action.lead?.phone}
          onClick={(e) => { e.stopPropagation(); navigate(sessionPath); }}>
          <Phone className="h-3.5 w-3.5 mr-1" />Pozovi
        </Button>
      </div>
    );
  }

  // ── View: Month ──────────────────────────────────
  function MonthView() {
    const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
    const selectedActions = actionsByDate.get(selectedDateKey) || [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        <Card className="w-fit">
          <CardContent className="p-3">
            <Calendar
              mode="single" selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={month} onMonthChange={setMonth}
              className="pointer-events-auto"
              modifiers={{ hasAction: (date) => datesWithActions.has(format(date, "yyyy-MM-dd")) }}
              modifiersClassNames={{ hasAction: "bg-primary/15 font-bold text-primary" }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {format(selectedDate, "EEEE, d. MMMM yyyy.", { locale: hr })}
              {isToday(selectedDate) && <Badge variant="secondary" className="text-xs">Danas</Badge>}
              <Badge variant="outline" className="text-xs ml-auto">
                {selectedActions.length} {selectedActions.length === 1 ? "zadatak" : "zadataka"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedActions.length === 0 ? (
              <EmptyDay />
            ) : (
              <div className="space-y-2">
                {selectedActions.map((a) => <ActionRow key={a.id} action={a} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── View: Week ──────────────────────────────────
  function WeekView() {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground font-medium">
          {format(weekStart, "d. MMM", { locale: hr })} — {format(weekEnd, "d. MMM yyyy.", { locale: hr })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayActions = actionsByDate.get(key) || [];
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={`rounded-xl border p-3 min-h-[120px] cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"
                } ${today ? "ring-1 ring-primary/30" : ""}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${today ? "text-primary" : ""}`}>
                    {format(day, "EEE d", { locale: hr })}
                  </span>
                  {dayActions.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {dayActions.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {dayActions.slice(0, 3).map((a) => {
                    const ActionIcon = actionIcons[a.action_type] || Phone;
                    const { primary } = getContactLabel(leadMap.get(a.lead_id));
                    return (
                      <div key={a.id} className="flex items-center gap-1.5 text-xs truncate">
                        <ActionIcon className="h-3 w-3 text-primary shrink-0" />
                        <span className="font-mono text-muted-foreground">{format(getEffectiveTime(a), "HH:mm")}</span>
                        <span className="truncate">{primary}</span>
                      </div>
                    );
                  })}
                  {dayActions.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayActions.length - 3} više</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail below week grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {format(selectedDate, "EEEE, d. MMMM", { locale: hr })}
              {isToday(selectedDate) && <Badge variant="secondary" className="text-xs">Danas</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(actionsByDate.get(format(selectedDate, "yyyy-MM-dd")) || []).length === 0 ? (
              <EmptyDay />
            ) : (
              <div className="space-y-2">
                {(actionsByDate.get(format(selectedDate, "yyyy-MM-dd")) || []).map((a) => (
                  <ActionRow key={a.id} action={{ ...a, lead: leadMap.get(a.lead_id) } as EnrichedAction} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── View: Day ──────────────────────────────────
  function DayView() {
    const dayKey = format(selectedDate, "yyyy-MM-dd");
    const dayActions = actionsByDate.get(dayKey) || [];
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 07:00–18:00

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>←</Button>
          <h3 className="text-lg font-semibold">
            {format(selectedDate, "EEEE, d. MMMM yyyy.", { locale: hr })}
            {isToday(selectedDate) && <Badge variant="secondary" className="text-xs ml-2">Danas</Badge>}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>→</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {hours.map((h) => {
                const hourActions = dayActions.filter((a) => {
                  const t = getEffectiveTime(a);
                  return t.getHours() === h;
                });

                return (
                  <div key={h} className="flex min-h-[56px]">
                    <div className="w-16 shrink-0 py-2 px-3 text-xs font-mono text-muted-foreground border-r border-border/30 flex items-start pt-3">
                      {String(h).padStart(2, "0")}:00
                    </div>
                    <div className="flex-1 py-1 px-2 space-y-1">
                      {hourActions.map((a) => (
                        <ActionRow key={a.id} action={a} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function EmptyDay() {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nema zakazanih zadataka</p>
        <p className="text-sm mt-1">Kliknite "Zakaži akciju" za dodavanje</p>
      </div>
    );
  }

  const viewLabels: Record<CalendarView, string> = { month: "Mjesec", week: "Tjedan", day: "Dan" };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {(["month", "week", "day"] as CalendarView[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              className="text-xs px-3"
              onClick={() => setView(v)}
            >
              {viewLabels[v]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Danas
          </Button>
          <Button onClick={openScheduleDialog}>
            <Plus className="h-4 w-4 mr-2" />Zakaži akciju
          </Button>
        </div>
      </div>

      {/* Active view */}
      {view === "month" && <MonthView />}
      {view === "week" && <WeekView />}
      {view === "day" && <DayView />}

      {/* Schedule dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Zakaži akciju</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kontakt</label>
              <Select value={scheduleLeadId} onValueChange={setScheduleLeadId}>
                <SelectTrigger><SelectValue placeholder="Odaberi kontakt..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name || lead.company || lead.phone || lead.email || "Nepoznat"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tip akcije</label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ActionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Poziv</SelectItem>
                  <SelectItem value="follow_up_call">Follow-up poziv</SelectItem>
                  <SelectItem value="retry_call">Ponovni poziv</SelectItem>
                  <SelectItem value="send_sms">SMS</SelectItem>
                  <SelectItem value="send_email">Email</SelectItem>
                  <SelectItem value="meeting">Sastanak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Datum</label>
                <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vrijeme</label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Odustani</Button>
            <Button onClick={handleSchedule} disabled={createAction.isPending}>
              {createAction.isPending ? "Spremanje..." : "Zakaži"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
