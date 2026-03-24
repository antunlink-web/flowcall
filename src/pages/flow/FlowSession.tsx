import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, X, RotateCcw, ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFlowLeads, useUpdateLeadStatus, type FlowLead } from "@/hooks/useFlowLeads";

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

export default function FlowSession() {
  const navigate = useNavigate();
  const { data: allLeads = [] } = useFlowLeads();
  const updateStatus = useUpdateLeadStatus();

  const queue = useMemo(() => {
    return allLeads.filter(
      (l) => l.status === "new" || l.status === "callback"
    );
  }, [allLeads]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const current: FlowLead | null = queue[currentIndex] || null;
  const remaining = Math.max(0, queue.length - currentIndex - 1);

  const handleOutcome = useCallback(
    async (status: string) => {
      if (!current || transitioning) return;
      setTransitioning(true);

      const callbackAt = status === "callback"
        ? new Date(Date.now() + 3600000).toISOString()
        : null;

      await updateStatus.mutateAsync({
        leadId: current.id,
        status,
        callbackAt,
        notes: notes || undefined,
      });

      setNotes("");
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setTransitioning(false);
      }, 200);
    },
    [current, notes, transitioning, updateStatus]
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border/40 px-4 py-3 flex items-center justify-between bg-background/80 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => navigate("/flow")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Exit
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {queue.length} · {remaining} remaining
        </span>
      </div>

      {/* Main content */}
      <div className={`flex-1 grid md:grid-cols-2 gap-4 p-4 max-w-6xl mx-auto w-full transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}>
        {/* Left: Contact Info */}
        <div className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{current.name || "Unknown Contact"}</CardTitle>
              {current.company && (
                <p className="text-sm text-muted-foreground">{current.company}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {current.phone && (
                <a
                  href={`tel:${current.phone}`}
                  className="flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <Phone className="h-4 w-4" />
                  {current.phone}
                </a>
              )}
              {current.email && (
                <p className="text-sm text-muted-foreground">{current.email}</p>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Attempts: {current.callAttempts}</p>
                {current.lastContactedAt && (
                  <p>Last contact: {new Date(current.lastContactedAt).toLocaleDateString()}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
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
              {defaultScript.replace("[Name]", current.name || "there")}
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
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => handleOutcome("no_answer")}
          >
            <X className="h-5 w-5 mr-2" />
            No Answer
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleOutcome("callback")}
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
        </div>
      </div>
    </div>
  );
}
