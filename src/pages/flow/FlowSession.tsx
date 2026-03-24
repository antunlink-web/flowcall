import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, X, RotateCcw, ThumbsUp, ThumbsDown,
  CheckCircle2, Clock, AlertCircle, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useFlowLeads, type FlowLead } from "@/hooks/useFlowLeads";
import {
  useNextActions,
  useHandleCallOutcome,
  useCreateNextAction,
  getEffectiveTime,
  actionTypeLabels,
  laterToday,
  tomorrowMorning,
  type NextAction,
} from "@/hooks/useNextActions";
import { isToday, isPast } from "date-fns";

const defaultScript = `**Opening**
"Hi [Name], this is [Your Name] from [Company]. I'm calling because..."

**Key Points**
• Mention the value proposition
• Ask about their current situation
• Listen for pain points

**Objection Handling**
• "I'm not interested" → "I understand, may I ask what solution you're currently using?"
• "Send me an email" → "Of course! Before I do, can I ask one quick question?"
• "Too expensive" → "I hear you. What budget range works for you?"

**Closing**
"Based on what you've shared, I think we could help. Would you be open to a quick 15-minute demo?"`;

type QueueItem = { lead: FlowLead; action: NextAction | null };

export default function FlowSession() {
  const navigate = useNavigate();
  const { data: allLeads = [] } = useFlowLeads();
  const { data: actions = [] } = useNextActions();
  const handleOutcomeMut = useHandleCallOutcome();
  const createAction = useCreateNextAction();

  // Build queue: overdue call tasks → today call tasks → new leads without actions
  const queue = useMemo(() => {
    const leadMap = new Map<string, FlowLead>();
    allLeads.forEach((l) => leadMap.set(l.id, l));

    const leadsWithActions = new Set<string>();
    const callActions = actions.filter((a) =>
      ["call", "retry_call", "follow_up_call"].includes(a.action_type)
    );

    const overdueItems: QueueItem[] = [];
    const todayItems: QueueItem[] = [];

    callActions.forEach((a) => {
      const lead = leadMap.get(a.lead_id);
      if (!lead) return;
      leadsWithActions.add(a.lead_id);
      const t = getEffectiveTime(a);
      if (isPast(t) && !isToday(t)) {
        overdueItems.push({ lead, action: a });
      } else if (isToday(t) || (!a.scheduled_for && !a.due_at && !a.snoozed_until)) {
        todayItems.push({ lead, action: a });
      }
    });

    overdueItems.sort((a, b) => getEffectiveTime(a.action!).getTime() - getEffectiveTime(b.action!).getTime());
    todayItems.sort((a, b) => getEffectiveTime(a.action!).getTime() - getEffectiveTime(b.action!).getTime());

    // New leads without any active action
    const newLeads = allLeads
      .filter((l) => l.status === "new" && !leadsWithActions.has(l.id))
      .map((l) => ({ lead: l, action: null as NextAction | null }));

    return [...overdueItems, ...todayItems, ...newLeads];
  }, [allLeads, actions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [showPostCall, setShowPostCall] = useState<string | null>(null); // outcome after "answered"
  const [showCallLater, setShowCallLater] = useState(false);

  const current = queue[currentIndex] || null;
  const remaining = Math.max(0, queue.length - currentIndex - 1);

  const advance = useCallback(() => {
    setNotes("");
    setShowPostCall(null);
    setShowCallLater(false);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setTransitioning(false);
    }, 200);
  }, []);

  const handleOutcome = useCallback(
    async (outcome: string) => {
      if (!current || transitioning) return;

      // "answered" shows post-call options
      if (outcome === "answered") {
        setShowPostCall("answered");
        return;
      }

      setTransitioning(true);
      await handleOutcomeMut.mutateAsync({
        leadId: current.lead.id,
        outcome,
        notes: notes || undefined,
      });

      // Toast feedback
      const toastMessages: Record<string, string> = {
        no_answer: "Retry scheduled for tomorrow at 10:00",
        interested: "Follow-up scheduled for tomorrow",
        not_interested: "Lead marked as not interested",
        wrong_number: "Lead marked as wrong number",
        callback_requested: "Callback scheduled",
      };
      if (toastMessages[outcome]) {
        toast.success(toastMessages[outcome]);
      }

      advance();
    },
    [current, notes, transitioning, handleOutcomeMut, advance]
  );

  // Post-call follow-up choices after "Answered"
  const handlePostCallChoice = useCallback(
    async (choice: "follow_up" | "waiting" | "none") => {
      if (!current) return;
      setTransitioning(true);

      // First log the call as answered
      await handleOutcomeMut.mutateAsync({
        leadId: current.lead.id,
        outcome: "answered",
        notes: notes || undefined,
      });

      if (choice === "follow_up") {
        await createAction.mutateAsync({
          leadId: current.lead.id,
          actionType: "follow_up_call",
          scheduledFor: tomorrowMorning().toISOString(),
          source: "call_outcome",
          outcome: "answered",
        });
      } else if (choice === "waiting") {
        await createAction.mutateAsync({
          leadId: current.lead.id,
          actionType: "wait_for_reply",
          scheduledFor: tomorrowMorning().toISOString(),
          source: "call_outcome",
          outcome: "answered",
        });
      }

      advance();
    },
    [current, notes, handleOutcomeMut, createAction, advance]
  );

  // Call later options
  const handleCallLater = useCallback(
    async (when: "later_today" | "tomorrow" | "custom", customTime?: string) => {
      if (!current) return;
      setTransitioning(true);

      const scheduledFor =
        when === "later_today"
          ? laterToday().toISOString()
          : when === "tomorrow"
          ? tomorrowMorning().toISOString()
          : customTime || tomorrowMorning().toISOString();

      await createAction.mutateAsync({
        leadId: current.lead.id,
        actionType: "retry_call",
        scheduledFor,
        source: "manual",
      });

      advance();
    },
    [current, createAction, advance]
  );

  // Session complete
  if (!current) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold">Session complete!</h2>
          <p className="text-muted-foreground">You've gone through all available leads.</p>
          <Button onClick={() => navigate("/flow")} size="lg">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { lead, action } = current;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border/40 px-4 py-3 flex items-center justify-between bg-background/80 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => navigate("/flow")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Exit
        </Button>
        <div className="text-sm text-muted-foreground flex items-center gap-3">
          {action && (
            <Badge variant="outline" className="text-xs">
              {actionTypeLabels[action.action_type] || action.action_type}
            </Badge>
          )}
          <span>{currentIndex + 1} / {queue.length} · {remaining} remaining</span>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 grid md:grid-cols-2 gap-4 p-4 max-w-6xl mx-auto w-full transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}>
        {/* Left: Contact Info */}
        <div className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{lead.name || "Unknown Contact"}</CardTitle>
              {lead.company && (
                <p className="text-sm text-muted-foreground">{lead.company}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <Phone className="h-4 w-4" />
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <p className="text-sm text-muted-foreground">{lead.email}</p>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Attempts: {lead.callAttempts}</p>
                {lead.lastContactedAt && (
                  <p>Last contact: {new Date(lead.lastContactedAt).toLocaleDateString()}</p>
                )}
                {action?.outcome && (
                  <p>Last outcome: {action.outcome}</p>
                )}
                {lead.notes && (
                  <p className="italic border-l-2 border-primary/30 pl-2 mt-2">{lead.notes}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardContent className="p-4">
              <Textarea
                placeholder="Call notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] bg-muted/30 border-0 resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Call Script */}
        <Card className="border-border/40 overflow-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
              Call Script
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {defaultScript.replace("[Name]", lead.name || "there")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Action Buttons */}
      <div className="border-t border-border/40 bg-background/90 backdrop-blur px-4 py-4">
        <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto flex-wrap">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleOutcome("answered")}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Answered
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => handleOutcome("no_answer")}
          >
            <X className="h-5 w-5 mr-2" />
            No Answer
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowCallLater(true)}
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Call Later
          </Button>
          <Button
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => handleOutcome("interested")}
          >
            <ThumbsUp className="h-5 w-5 mr-2" />
            Interested
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-muted text-muted-foreground hover:bg-muted/30"
            onClick={() => handleOutcome("not_interested")}
          >
            <ThumbsDown className="h-5 w-5 mr-2" />
            Not Interested
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-muted text-muted-foreground hover:bg-muted/30"
            onClick={() => handleOutcome("wrong_number")}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Wrong #
          </Button>
        </div>
      </div>

      {/* Post-call dialog for "Answered" */}
      <Dialog open={showPostCall === "answered"} onOpenChange={() => setShowPostCall(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Call completed — what's next?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handlePostCallChoice("follow_up")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Follow up tomorrow
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handlePostCallChoice("waiting")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Waiting for reply
            </Button>
            <Button
              className="w-full justify-start"
              variant="ghost"
              onClick={() => handlePostCallChoice("none")}
            >
              No next action
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Later dialog */}
      <Dialog open={showCallLater} onOpenChange={setShowCallLater}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule call</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleCallLater("later_today")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Later today
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleCallLater("tomorrow")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Tomorrow morning
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
