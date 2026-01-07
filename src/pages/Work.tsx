import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LeadCard } from "@/components/leads/LeadCard";
import { EmailComposer } from "@/components/leads/EmailComposer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Lead, Campaign, CallOutcome, LeadStatus, EmailTemplate } from "@/types/crm";
import { Phone, Star, MoreHorizontal, Loader2, ArrowRight } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

type WorkTab = "queues" | "scheduled" | "claimed" | "worklog";

interface CampaignWithStats extends Campaign {
  totalLeads: number;
  donePercentage: number;
  queuedNow: number;
  followupsNow: number;
  followupsLater: number;
  dueCount: number;
}

export default function Work() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [scripts, setScripts] = useState<{ id: string; name: string; content: string; campaign_id: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<WorkTab>("queues");
  const [loading, setLoading] = useState(true);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch campaigns
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active");

    // Fetch all leads
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

    const allLeads = (leadData || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[];
    setLeads(allLeads);

    // Calculate stats per campaign
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const campaignsWithStats: CampaignWithStats[] = (campaignData || []).map((c) => {
      const campaignLeads = allLeads.filter((l) => l.campaign_id === c.id);
      const totalLeads = campaignLeads.length;
      const doneLeads = campaignLeads.filter((l) => ["won", "lost", "archived"].includes(l.status)).length;
      const donePercentage = totalLeads > 0 ? (doneLeads / totalLeads) * 100 : 0;
      const queuedNow = campaignLeads.filter((l) => !["won", "lost", "archived"].includes(l.status)).length;
      
      const followupsNow = campaignLeads.filter((l) => {
        if (!l.callback_scheduled_at) return false;
        return new Date(l.callback_scheduled_at) <= now;
      }).length;

      const followupsLater = campaignLeads.filter((l) => {
        if (!l.callback_scheduled_at) return false;
        const callbackDate = new Date(l.callback_scheduled_at);
        return callbackDate > now && callbackDate <= todayEnd;
      }).length;

      const dueCount = campaignLeads.filter((l) => {
        if (!l.callback_scheduled_at) return false;
        return new Date(l.callback_scheduled_at) <= now;
      }).length;

      return {
        ...c,
        totalLeads,
        donePercentage,
        queuedNow,
        followupsNow,
        followupsLater,
        dueCount,
      } as CampaignWithStats;
    });

    setCampaigns(campaignsWithStats);

    // Fetch email templates
    const { data: templateData } = await supabase.from("email_templates").select("*");
    setEmailTemplates((templateData as EmailTemplate[]) || []);

    // Fetch scripts
    const { data: scriptData } = await supabase.from("call_scripts").select("*");
    setScripts(scriptData || []);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const getFilteredLeads = () => {
    if (!selectedCampaign) return [];
    return leads
      .filter((l) => l.campaign_id === selectedCampaign)
      .filter((l) => !["won", "lost", "archived"].includes(l.status));
  };

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
    
    await supabase
      .from("leads")
      .update({
        call_attempts: lead.call_attempts + 1,
        last_contacted_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

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

    const filteredLeads = getFilteredLeads();
    if (["won", "lost", "archived"].includes(status)) {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      if (currentIndex >= filteredLeads.length - 1) {
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
    const filteredLeads = getFilteredLeads();
    if (currentIndex < filteredLeads.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleStartCalling = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setCurrentIndex(0);
  };

  const handleBackToQueues = () => {
    setSelectedCampaign(null);
    setCurrentIndex(0);
    fetchData();
  };

  const filteredLeads = getFilteredLeads();
  const currentLead = filteredLeads[currentIndex];
  const currentScript = scripts.find(
    (s) => s.campaign_id === currentLead?.campaign_id
  ) || scripts[0];

  const tabs = [
    { id: "queues" as WorkTab, label: "Queues" },
    { id: "scheduled" as WorkTab, label: "Scheduled" },
    { id: "claimed" as WorkTab, label: "Claimed" },
    { id: "worklog" as WorkTab, label: "Work log" },
  ];

  // Get leads based on active tab
  const getTabLeads = () => {
    const now = new Date();
    switch (activeTab) {
      case "scheduled":
        return leads.filter((l) => l.callback_scheduled_at && new Date(l.callback_scheduled_at) > now);
      case "claimed":
        return leads.filter((l) => l.claimed_by === user?.id);
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // If a campaign is selected, show the lead calling view
  if (selectedCampaign) {
    const campaign = campaigns.find((c) => c.id === selectedCampaign);
    
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={handleBackToQueues} className="mb-2 -ml-2 text-muted-foreground">
                ← Back to Queues
              </Button>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {campaign?.name || "Work Queue"}
              </h1>
              <p className="text-muted-foreground">
                {filteredLeads.length} leads to call • {currentIndex + 1} of {filteredLeads.length}
              </p>
            </div>
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
                  hasNext={currentIndex < filteredLeads.length - 1}
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
                    <Button onClick={handleBackToQueues}>Back to Queues</Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Script Panel */}
            <div className="lg:col-span-1">
              <Card className="h-fit sticky top-20">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Call Script</h3>
                  {currentScript ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {currentScript.name}
                      </p>
                      <div className="whitespace-pre-wrap text-sm">
                        {currentScript.content}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No script available for this campaign.
                    </p>
                  )}
                </CardContent>
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

  return (
    <DashboardLayout>
      {/* Sub-navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "queues" && (
          <div className="space-y-6">
            {/* Section Header */}
            <div>
              <h2 className="text-2xl font-light italic text-primary">Your lists</h2>
              <div className="w-16 h-0.5 bg-primary mt-2" />
            </div>

            {/* Campaign Cards */}
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No active campaigns. Create one in Manage to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Campaign Name */}
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                              {campaign.name}
                            </h3>
                            <button className="text-muted-foreground hover:text-warning transition-colors">
                              <Star className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                            <span>{campaign.totalLeads.toLocaleString()} TOTAL</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{campaign.donePercentage.toFixed(2)}% DONE</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{campaign.queuedNow}+ QUEUED NOW</span>
                          </div>

                          {/* Followups */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-light">{campaign.followupsNow}</span>
                              <span className="text-sm text-muted-foreground">
                                Followups now, {campaign.followupsLater} later today
                              </span>
                            </div>
                          </div>

                          {/* Due Badge & Actions */}
                          <div className="flex items-center justify-between mt-4">
                            <Badge 
                              variant="secondary" 
                              className="bg-primary/10 text-primary border-0"
                            >
                              {campaign.dueCount} due
                            </Badge>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleStartCalling(campaign.id)}
                                className="h-10 w-10"
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-10 w-10">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleStartCalling(campaign.id)}>
                                    Start Calling
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
                                  <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "scheduled" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-light italic text-primary">Scheduled callbacks</h2>
              <div className="w-16 h-0.5 bg-primary mt-2" />
            </div>
            
            {getTabLeads().length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No scheduled callbacks.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {getTabLeads().map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {(lead.data?.first_name as string) || (lead.data?.name as string) || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {lead.callback_scheduled_at && new Date(lead.callback_scheduled_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "claimed" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-light italic text-primary">Claimed leads</h2>
              <div className="w-16 h-0.5 bg-primary mt-2" />
            </div>
            
            {getTabLeads().length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No claimed leads.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {getTabLeads().map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {(lead.data?.first_name as string) || (lead.data?.name as string) || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">{lead.status}</p>
                      </div>
                      <Badge variant="secondary">{lead.call_attempts} calls</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "worklog" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-light italic text-primary">Work log</h2>
              <div className="w-16 h-0.5 bg-primary mt-2" />
            </div>
            
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Work log coming soon.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
