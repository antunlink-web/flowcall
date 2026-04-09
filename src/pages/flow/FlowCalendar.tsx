import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone, RotateCcw, ArrowRight, Clock, CalendarClock,
  Plus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useFlowLeads } from "@/hooks/useFlowLeads";
import {
  useNextActions,
  useCreateNextAction,
  actionTypeLabels,
  getEffectiveTime,
  type ActionType,
  type NextAction,
} from "@/hooks/useNextActions";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from "date-fns";
import { toast } from "sonner";

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

export default function FlowCalendar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const { data: leads = [] } = useFlowLeads();
  const { data: actions = [] } = useNextActions();
  const createAction = useCreateNextAction();

  // Schedule form state
  const [scheduleLeadId, setScheduleLeadId] = useState("");
  const [scheduleType, setScheduleType] = useState<ActionType>("call");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  // Map lead_id -> lead for display
  const leadMap = useMemo(() => {
    const m = new Map<string, (typeof leads)[0]>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);

  // Group actions by date
  const actionsByDate = useMemo(() => {
    const map = new Map<string, (NextAction & { lead?: (typeof leads)[0] })[]>();
    actions.forEach((a) => {
      const t = getEffectiveTime(a);
      const key = format(t, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...a, lead: leadMap.get(a.lead_id) });
    });
    // Sort each day's actions by time
    map.forEach((items) => {
      items.sort((a, b) => getEffectiveTime(a).getTime() - getEffectiveTime(b).getTime());
    });
    return map;
  }, [actions, leadMap]);

  // Dates that have actions (for calendar dots)
  const datesWithActions = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => {
      set.add(format(getEffectiveTime(a), "yyyy-MM-dd"));
    });
    return set;
  }, [actions]);

  // Actions for selected date
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedActions = actionsByDate.get(selectedDateKey) || [];

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
      {
        leadId: scheduleLeadId,
        actionType: scheduleType,
        scheduledFor,
        source: "manual",
      },
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kalendar</h1>
        <Button onClick={openScheduleDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Zakaži akciju
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        {/* Calendar */}
        <Card className="w-fit">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={month}
              onMonthChange={setMonth}
              className="pointer-events-auto"
              modifiers={{
                hasAction: (date) => datesWithActions.has(format(date, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                hasAction: "bg-primary/15 font-bold text-primary",
              }}
            />
          </CardContent>
        </Card>

        {/* Day detail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {format(selectedDate, "EEEE, d. MMMM yyyy.")}
              {isToday(selectedDate) && (
                <Badge variant="secondary" className="text-xs">Danas</Badge>
              )}
              <Badge variant="outline" className="text-xs ml-auto">
                {selectedActions.length} {selectedActions.length === 1 ? "zadatak" : "zadataka"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedActions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nema zakazanih zadataka</p>
                <p className="text-sm mt-1">Kliknite "Zakaži akciju" za dodavanje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedActions.map((action) => {
                  const ActionIcon = actionIcons[action.action_type] || Phone;
                  const effectiveTime = getEffectiveTime(action);
                  const typeLabel = actionTypeLabels[action.action_type] || action.action_type;
                  const { primary, secondary } = getContactLabel(action.lead);
                  const overdue = isPast(effectiveTime) && !isToday(effectiveTime);

                  return (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 hover:bg-accent/50 hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => action.lead && navigate(`lead/${action.lead.id}`)}
                      role="button"
                      tabIndex={0}
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
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {typeLabel}
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                              Zakašnjelo
                            </Badge>
                          )}
                        </div>
                        {secondary && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{secondary}</p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={!action.lead?.phone}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("session");
                        }}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        Pozovi
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zakaži akciju</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kontakt</label>
              <Select value={scheduleLeadId} onValueChange={setScheduleLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi kontakt..." />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vrijeme</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Odustani
            </Button>
            <Button onClick={handleSchedule} disabled={createAction.isPending}>
              {createAction.isPending ? "Spremanje..." : "Zakaži"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
