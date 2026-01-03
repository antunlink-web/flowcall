import { useState } from "react";
import { Lead, CallOutcome, LeadStatus } from "@/types/crm";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  MessageSquare,
  Building2,
  Clock,
  ChevronRight,
  Trophy,
  XCircle,
  CalendarClock,
  Archive,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LeadCardProps {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onLogCall: (leadId: string, outcome: CallOutcome, notes: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onScheduleCallback: (leadId: string, date: Date) => void;
  onSendEmail: (lead: Lead) => void;
  onNext: () => void;
  hasNext: boolean;
}

export function LeadCard({
  lead,
  onCall,
  onLogCall,
  onUpdateStatus,
  onScheduleCallback,
  onSendEmail,
  onNext,
  hasNext,
}: LeadCardProps) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [callNotes, setCallNotes] = useState("");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showCallbackDialog, setShowCallbackDialog] = useState(false);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [copiedPhone, setCopiedPhone] = useState(false);
  const { toast } = useToast();

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");

  const handleCall = () => {
    if (lead.phone) {
      // Opens VoIP app on desktop or phone dialer on mobile
      window.location.href = `tel:${lead.phone}`;
      onCall(lead);
      setShowCallDialog(true);
    }
  };

  const handleSms = () => {
    if (lead.phone) {
      window.location.href = `sms:${lead.phone}`;
    }
  };

  const copyPhone = async () => {
    if (lead.phone) {
      await navigator.clipboard.writeText(lead.phone);
      setCopiedPhone(true);
      toast({ title: "Phone number copied" });
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleLogCall = (outcome: CallOutcome) => {
    onLogCall(lead.id, outcome, callNotes);
    setCallNotes("");
    setShowCallDialog(false);
    
    if (outcome === "won") {
      onUpdateStatus(lead.id, "won");
    } else if (outcome === "lost") {
      onUpdateStatus(lead.id, "lost");
    } else if (outcome === "callback") {
      setShowCallbackDialog(true);
    } else {
      onUpdateStatus(lead.id, "contacted");
    }
  };

  const handleScheduleCallback = () => {
    if (callbackDate && callbackTime) {
      const dateTime = new Date(`${callbackDate}T${callbackTime}`);
      onScheduleCallback(lead.id, dateTime);
      onUpdateStatus(lead.id, "callback");
      setShowCallbackDialog(false);
      setCallbackDate("");
      setCallbackTime("");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold text-foreground">{fullName}</h2>
            {lead.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{lead.company}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <LeadStatusBadge status={lead.status} />
            <Badge variant="outline" className="text-xs">
              {lead.call_attempts} calls
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lead.phone && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Phone className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{lead.phone}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyPhone}
                className="h-8 w-8"
              >
                {copiedPhone ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Mail className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium truncate">{lead.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Callback reminder */}
        {lead.callback_scheduled_at && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <CalendarClock className="w-5 h-5 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">Callback Scheduled</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(lead.callback_scheduled_at), "PPp")}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this lead..."
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button
            size="lg"
            className="gap-2"
            onClick={handleCall}
            disabled={!lead.phone}
          >
            <Phone className="w-5 h-5" />
            Call
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => onSendEmail(lead)}
            disabled={!lead.email}
          >
            <Mail className="w-5 h-5" />
            Email
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={handleSms}
            disabled={!lead.phone}
          >
            <MessageSquare className="w-5 h-5" />
            SMS
          </Button>
        </div>

        {/* Quick Outcome Buttons */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="gap-2 border-success/50 text-success hover:bg-success/10"
              onClick={() => {
                onUpdateStatus(lead.id, "won");
                onNext();
              }}
            >
              <Trophy className="w-4 h-4" />
              Winner
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                onUpdateStatus(lead.id, "lost");
                onNext();
              }}
            >
              <XCircle className="w-4 h-4" />
              Loser
            </Button>
            <Dialog open={showCallbackDialog} onOpenChange={setShowCallbackDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Callback
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Callback</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={callbackTime}
                      onChange={(e) => setCallbackTime(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleScheduleCallback}
                    disabled={!callbackDate || !callbackTime}
                  >
                    Schedule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                onUpdateStatus(lead.id, "archived");
                onNext();
              }}
            >
              <Archive className="w-4 h-4" />
              Archive
            </Button>
          </div>
        </div>

        {/* Next Lead */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full gap-2"
          onClick={onNext}
          disabled={!hasNext}
        >
          Next Lead
          <ChevronRight className="w-5 h-5" />
        </Button>
      </CardContent>

      {/* Call Log Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Call Notes</Label>
              <Textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="What happened on the call?"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleLogCall("answered")}>Answered</Button>
              <Button variant="outline" onClick={() => handleLogCall("no_answer")}>
                No Answer
              </Button>
              <Button variant="outline" onClick={() => handleLogCall("busy")}>
                Busy
              </Button>
              <Button variant="outline" onClick={() => handleLogCall("voicemail")}>
                Voicemail
              </Button>
              <Button
                className="bg-success hover:bg-success/90"
                onClick={() => handleLogCall("won")}
              >
                Won!
              </Button>
              <Button variant="destructive" onClick={() => handleLogCall("lost")}>
                Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}