import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LeadCard } from "@/components/leads/LeadCard";
import { EmailComposer } from "@/components/leads/EmailComposer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Lead, Campaign, CallOutcome, LeadStatus, EmailTemplate } from "@/types/crm";
import { Phone, Users, RefreshCw, Inbox, FileText, Loader2 } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

export default function Work() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [scripts, setScripts] = useState<{ id: string; name: string; content: string; campaign_id: string | null }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [showScript, setShowScript] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch campaigns
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active");
    setCampaigns((campaignData as Campaign[]) || []);

    // Fetch unclaimed/claimed-by-me leads that are workable
    let query = supabase
      .from("leads")
      .select("*")
      .in("status", ["new", "contacted", "callback", "qualified"])
      .or(`claimed_by.is.null,claimed_by.eq.${user?.id}`)
      .order("callback_scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (selectedCampaign !== "all") {
      query = query.eq("campaign_id", selectedCampaign);
    }

    const { data: leadData } = await query;
    const mappedLeads = (leadData || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[];
    setLeads(mappedLeads);

    // Fetch email templates
    const { data: templateData } = await supabase
      .from("email_templates")
      .select("*");
    setEmailTemplates((templateData as EmailTemplate[]) || []);

    // Fetch scripts
    const { data: scriptData } = await supabase.from("call_scripts").select("*");
    setScripts(scriptData || []);

    setLoading(false);
  }, [user?.id, selectedCampaign]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const claimLead = async (lead: Lead) => {
    if (!user || lead.claimed_by === user.id) return;

    await supabase
      .from("leads")
      .update({
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  };

  const handleCall = async (lead: Lead) => {
    await claimLead(lead);
    
    // Increment call attempts
    await supabase
      .from("leads")
      .update({
        call_attempts: lead.call_attempts + 1,
        last_contacted_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    // Update local state
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              call_attempts: l.call_attempts + 1,
              last_contacted_at: new Date().toISOString(),
              claimed_by: user?.id || null,
            }
          : l
      )
    );
  };

  const handleLogCall = async (leadId: string, outcome: CallOutcome, notes: string) => {
    if (!user) return;

    await supabase.from("call_logs").insert({
      lead_id: leadId,
      user_id: user.id,
      outcome,
      notes: notes || null,
    });

    toast({ title: "Call logged" });
  };

  const handleUpdateStatus = async (leadId: string, status: LeadStatus) => {
    await supabase.from("leads").update({ status }).eq("id", leadId);

    if (["won", "lost", "archived"].includes(status)) {
      // Remove from queue
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      if (currentIndex >= leads.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } else {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      );
    }

    toast({ title: `Lead marked as ${status}` });
  };

  const handleScheduleCallback = async (leadId: string, date: Date) => {
    await supabase
      .from("leads")
      .update({ callback_scheduled_at: date.toISOString() })
      .eq("id", leadId);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, callback_scheduled_at: date.toISOString() }
          : l
      )
    );

    toast({ title: "Callback scheduled" });
  };

  const handleNext = () => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentLead = leads[currentIndex];
  const currentScript = scripts.find(
    (s) => s.campaign_id === currentLead?.campaign_id
  ) || scripts[0];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Work Queue</h1>
            <p className="text-muted-foreground">
              {leads.length} leads to call
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leads.length}</p>
                <p className="text-xs text-muted-foreground">In Queue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {leads.filter((l) => l.status === "new").length}
                </p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {leads.filter((l) => l.callback_scheduled_at).length}
                </p>
                <p className="text-xs text-muted-foreground">Callbacks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentIndex + 1}</p>
                <p className="text-xs text-muted-foreground">of {leads.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Card */}
          <div className="lg:col-span-2">
            {currentLead ? (
              <LeadCard
                lead={currentLead}
                onCall={handleCall}
                onLogCall={handleLogCall}
                onUpdateStatus={handleUpdateStatus}
                onScheduleCallback={handleScheduleCallback}
                onSendEmail={(lead) => setEmailLead(lead)}
                onNext={handleNext}
                hasNext={currentIndex < leads.length - 1}
              />
            ) : (
              <Card className="text-center py-16">
                <CardContent>
                  <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <Phone className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Queue Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    No more leads to call in this queue.
                  </p>
                  <Button onClick={fetchData}>Refresh Queue</Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Script Panel */}
          <div className="lg:col-span-1">
            <Card className="h-fit sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Call Script</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowScript(!showScript)}
                  >
                    {showScript ? "Hide" : "Show"}
                  </Button>
                </div>
              </CardHeader>
              {showScript && currentScript && (
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {currentScript.name}
                    </p>
                    <div className="whitespace-pre-wrap text-sm">
                      {currentScript.content}
                    </div>
                  </div>
                </CardContent>
              )}
              {showScript && !currentScript && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No script available for this campaign.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Email Composer */}
      <EmailComposer
        lead={emailLead}
        open={!!emailLead}
        onOpenChange={(open) => !open && setEmailLead(null)}
        templates={emailTemplates}
        onSent={fetchData}
      />
    </DashboardLayout>
  );
}