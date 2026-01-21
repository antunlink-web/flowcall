import React, { useState } from "react";
import { Lead, CallOutcome, LeadStatus, getLeadDisplayName, getLeadPhone, getLeadEmail, getLeadCompany, getLeadNotes } from "@/types/crm";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { SmsComposer } from "./SmsComposer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Clock,
  Trophy,
  ThumbsDown,
  RotateCcw,
  Archive,
  Copy,
  Check,
  X,
  Calendar,
  Linkedin,
  ExternalLink,
  Users,
  ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SmsTemplate } from "@/hooks/useListTemplates";

interface CallLog {
  id: string;
  outcome: string;
  notes: string | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  user_name?: string;
}

interface LeadCardProps {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onLogCall: (leadId: string, outcome: CallOutcome, notes: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onScheduleCallback: (leadId: string, date: Date) => void;
  onSendEmail: (lead: Lead) => void;
  onNext: () => void;
  hasNext: boolean;
  callLogs?: CallLog[];
  emailLogs?: EmailLog[];
  onGiveBack?: (leadId: string) => void;
  smsTemplates?: SmsTemplate[];
  smsTemplatesLoading?: boolean;
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
  callLogs = [],
  emailLogs = [],
  onGiveBack,
  smsTemplates = [],
  smsTemplatesLoading = false,
}: LeadCardProps) {
  const [notes, setNotes] = useState(getLeadNotes(lead));
  const [callNotes, setCallNotes] = useState("");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showCallbackDialog, setShowCallbackDialog] = useState(false);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<"call" | "email" | "sms">("call");
  const [followUpType, setFollowUpType] = useState<"after" | "at">("after");
  const [followUpDuration, setFollowUpDuration] = useState("27 hours");
  const { toast } = useToast();

  const fullName = getLeadDisplayName(lead);
  const phone = getLeadPhone(lead);
  const email = getLeadEmail(lead);
  const company = getLeadCompany(lead);
  const activityCount = callLogs.length + emailLogs.length;

  // Get all phone numbers from lead data
  const getPhoneNumbers = (): string[] => {
    if (!lead.data) return phone ? [phone] : [];
    const phones: string[] = [];
    for (const [key, value] of Object.entries(lead.data)) {
      const keyLower = key.toLowerCase();
      if (
        (keyLower.includes("phone") || keyLower.includes("tel") || keyLower.includes("mobile")) &&
        typeof value === "string" &&
        value.trim()
      ) {
        phones.push(value);
      }
    }
    return phones.length > 0 ? phones : (phone ? [phone] : []);
  };

  // Get all custom data fields for display
  const dataFields = Object.entries(lead.data || {}).filter(
    ([key]) => !["first_name", "last_name", "firstname", "lastname", "name", "phone", "telephone", "mobile", "email", "e-mail", "company", "organization", "business", "notes", "note", "comments"].includes(key.toLowerCase())
  );

  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`;
      onCall(lead);
      setShowCallDialog(true);
    }
  };

  const handleSms = () => {
    if (phone) {
      window.location.href = `sms:${phone}`;
    }
  };

  const copyPhone = async () => {
    if (phone) {
      await navigator.clipboard.writeText(phone);
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

  const handleQuickAction = (status: LeadStatus) => {
    onUpdateStatus(lead.id, status);
    if (hasNext) {
      onNext();
    }
  };

  // Get local time (for display purposes)
  const localTime = format(new Date(), "HH:mm");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-7xl mx-auto">
      {/* Left Column - Lead Details */}
      <div className="lg:col-span-3 space-y-4">
        {/* Header Card */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            {/* Company/Name Header */}
            <div className="flex items-start gap-3 mb-4">
              <LeadStatusBadge status={lead.status} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {company || fullName}
                  </h2>
                  <a 
                    href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(company || fullName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0077b5] hover:opacity-80"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                </div>
                
                {/* Phone Number */}
                {phone && (
                  <div className="flex items-center gap-2 mt-2">
                    <a 
                      href={`tel:${phone}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {phone}
                    </a>
                    <button
                      onClick={copyPhone}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedPhone ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {email && (
                <>
                  <span className="text-muted-foreground text-right font-medium">Email</span>
                  <a href={`mailto:${email}`} className="text-primary hover:underline">
                    {email}
                  </a>
                </>
              )}
              {company && fullName && (
                <>
                  <span className="text-muted-foreground text-right font-medium">Contact</span>
                  <span>{fullName}</span>
                </>
              )}
              {/* Custom data fields */}
              {dataFields.map(([key, value]) => (
                <React.Fragment key={key}>
                  <span className="text-muted-foreground text-right font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span>{String(value)}</span>
                </React.Fragment>
              ))}
              <span className="text-muted-foreground text-right font-medium">First created</span>
              <span>
                {format(new Date(lead.created_at), "dd-MM-yyyy HH:mm")}
                <span className="text-muted-foreground ml-1">
                  ({formatDistanceToNow(new Date(lead.created_at), { addSuffix: false })} ago)
                </span>
              </span>
              <span className="text-muted-foreground text-right font-medium">Last updated</span>
              <span>
                {format(new Date(lead.updated_at), "dd-MM-yyyy HH:mm")}
                <span className="text-muted-foreground ml-1">
                  ({formatDistanceToNow(new Date(lead.updated_at), { addSuffix: false })} ago)
                </span>
              </span>
              <span className="text-muted-foreground text-right font-medium">Claimed by</span>
              <div className="flex items-center gap-2">
                <span>You</span>
                {onGiveBack && (
                  <button
                    onClick={() => onGiveBack(lead.id)}
                    className="text-primary hover:underline text-xs"
                  >
                    - Give back
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communication Tabs Card */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="call"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </TabsTrigger>
                <TabsTrigger 
                  value="email"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
                >
                  <Mail className="w-4 h-4" />
                  E-mail
                </TabsTrigger>
                <TabsTrigger 
                  value="sms"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="call" className="mt-0 space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Comment"
                    className="min-h-[120px] resize-none"
                  />
                </TabsContent>
                
                <TabsContent value="email" className="mt-0 space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onSendEmail(lead)}
                    disabled={!email}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Compose Email
                  </Button>
                </TabsContent>
                
                <TabsContent value="sms" className="mt-0">
                  <SmsComposer
                    leadId={lead.id}
                    phoneNumbers={getPhoneNumbers()}
                    templates={smsTemplates}
                    templatesLoading={smsTemplatesLoading}
                    leadData={lead.data || {}}
                  />
                </TabsContent>
              </div>
            </Tabs>

            {/* Follow-up Row */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-border/50">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Follow-up</span>
              <Select value={followUpType} onValueChange={(v) => setFollowUpType(v as "after" | "at")}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after">after</SelectItem>
                  <SelectItem value="at">at</SelectItem>
                </SelectContent>
              </Select>
              <Select value={followUpDuration} onValueChange={setFollowUpDuration}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                  <SelectItem value="3 hours">3 hours</SelectItem>
                  <SelectItem value="27 hours">27 hours</SelectItem>
                  <SelectItem value="2 days">2 days</SelectItem>
                  <SelectItem value="1 week">1 week</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Calendar className="w-4 h-4" />
              </Button>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 p-4 border-t border-border/50">
              <div className="flex items-center">
                <Button
                  className="gap-2 bg-primary hover:bg-primary/90 rounded-r-none"
                  onClick={() => setShowCallbackDialog(true)}
                >
                  <RotateCcw className="w-4 h-4" />
                  Call back
                </Button>
                <Button className="bg-primary hover:bg-primary/90 rounded-l-none border-l border-primary-foreground/20 px-2">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center">
                <Button
                  className="gap-2 bg-success hover:bg-success/90 text-success-foreground rounded-r-none"
                  onClick={() => handleQuickAction("won")}
                >
                  <Trophy className="w-4 h-4" />
                  Winner
                </Button>
                <Button className="bg-success hover:bg-success/90 text-success-foreground rounded-l-none border-l border-success-foreground/20 px-2">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center">
                <Button
                  className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-r-none"
                  onClick={() => handleQuickAction("lost")}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Loser
                </Button>
                <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-l-none border-l border-destructive-foreground/20 px-2">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => handleQuickAction("archived")}
              >
                <Archive className="w-4 h-4" />
                Archive
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Activity Panel */}
      <div className="lg:col-span-2 space-y-4">
        {/* Activity Tabs */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Tabs defaultValue="activity">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="activity"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Activity
                  <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">
                    {activityCount}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="colleagues"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Colleagues
                  <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">
                    0
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="external"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <ExternalLink className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3 p-4">
                <div className="text-center p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold">{lead.call_attempts}</span>
                    <Phone className="w-5 h-5 text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Call attempts</p>
                </div>
                <div className="text-center p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold">{emailLogs.length}</span>
                    <Mail className="w-5 h-5 text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">E-mails</p>
                </div>
                <div className="text-center p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold">{localTime}</span>
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Local time</p>
                </div>
              </div>

              <TabsContent value="activity" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto">
                  {emailLogs.length === 0 && callLogs.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      No activity yet
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {/* Email Logs */}
                      {emailLogs.map((email) => (
                        <div key={email.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded bg-muted">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">
                                <span className="text-muted-foreground">Email</span>
                                {email.user_name && (
                                  <span> by {email.user_name}</span>
                                )}
                                : <span className="text-foreground">{email.subject}</span>
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                {email.body.substring(0, 150)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(email.created_at), "dd-MM-yyyy HH:mm")}
                                <span className="ml-1">
                                  ({formatDistanceToNow(new Date(email.created_at), { addSuffix: true })})
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Call Logs */}
                      {callLogs.map((log) => (
                        <div key={log.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded bg-muted">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium capitalize">{log.outcome.replace("_", " ")}</p>
                              {log.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(log.created_at), "dd-MM-yyyy HH:mm")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="colleagues" className="mt-0">
                <div className="p-6 text-center text-muted-foreground">
                  No colleagues found
                </div>
              </TabsContent>
              
              <TabsContent value="external" className="mt-0">
                <div className="p-6 text-center text-muted-foreground">
                  No external links
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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
                className="bg-success hover:bg-success/90 text-success-foreground"
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

      {/* Callback Dialog */}
      <Dialog open={showCallbackDialog} onOpenChange={setShowCallbackDialog}>
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
    </div>
  );
}
