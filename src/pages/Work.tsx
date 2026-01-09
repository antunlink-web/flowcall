import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LeadDetailView } from "@/components/leads/LeadDetailView";
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
import { Lead } from "@/types/crm";
import { Phone, Star, MoreHorizontal, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

type WorkTab = "queues" | "scheduled" | "claimed" | "worklog";

interface ListWithStats {
  id: string;
  name: string;
  status: string;
  totalLeads: number;
  donePercentage: number;
  queuedNow: number;
  followupsNow: number;
  followupsLater: number;
  dueCount: number;
}

export default function Work() {
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [lists, setLists] = useState<ListWithStats[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [claimedLeads, setClaimedLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<WorkTab>("queues");
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalLeadsInQueue, setTotalLeadsInQueue] = useState(0);
  const { user } = useAuth();

  // Fetch list statistics (uses counts, not full data)
  const fetchListStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch lists assigned to current user via list_users table
    const { data: listUserData } = await supabase
      .from("list_users")
      .select("list_id")
      .eq("user_id", user.id);

    const userListIds = (listUserData || []).map((lu) => lu.list_id);

    // Fetch list details for assigned lists
    let listsData: { id: string; name: string; status: string }[] = [];
    if (userListIds.length > 0) {
      const { data } = await supabase
        .from("lists")
        .select("id, name, status")
        .in("id", userListIds)
        .eq("status", "active");
      listsData = data || [];
    }

    // Fetch stats per list using counts
    const now = new Date();
    const listsWithStats: ListWithStats[] = await Promise.all(
      listsData.map(async (list) => {
        // Get total leads count
        const { count: totalLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id);

        // Get done leads count
        const { count: doneLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id)
          .in("status", ["won", "lost", "archived"]);

        // Get queued now count (not done, unclaimed or claimed by me)
        const { count: queuedNow } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id)
          .not("status", "in", '("won","lost","archived")')
          .or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

        // Get followups now (callback due)
        const { count: followupsNow } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id)
          .not("callback_scheduled_at", "is", null)
          .lte("callback_scheduled_at", now.toISOString());

        const total = totalLeads || 0;
        const done = doneLeads || 0;
        const donePercentage = total > 0 ? (done / total) * 100 : 0;

        return {
          ...list,
          totalLeads: total,
          donePercentage,
          queuedNow: queuedNow || 0,
          followupsNow: followupsNow || 0,
          followupsLater: 0,
          dueCount: followupsNow || 0,
        };
      })
    );

    setLists(listsWithStats);

    // Fetch scheduled callbacks (leads with callback_scheduled_at in the future, claimed by user)
    const { data: scheduledData } = await supabase
      .from("leads")
      .select("*")
      .eq("claimed_by", user.id)
      .not("callback_scheduled_at", "is", null)
      .gt("callback_scheduled_at", now.toISOString())
      .order("callback_scheduled_at", { ascending: true })
      .limit(100);
    
    setScheduledLeads((scheduledData || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[]);

    // Fetch claimed leads
    const { data: claimedData } = await supabase
      .from("leads")
      .select("*")
      .eq("claimed_by", user.id)
      .not("status", "in", '("won","lost","archived")')
      .order("claimed_at", { ascending: false })
      .limit(100);
    
    setClaimedLeads((claimedData || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[]);

    setLoading(false);
  }, [user]);

  // Fetch a single lead at the given index for the selected list
  const fetchLeadAtIndex = useCallback(async (listId: string, index: number) => {
    if (!user) return;

    const { data, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("list_id", listId)
      .not("status", "in", '("won","lost","archived")')
      .or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .range(index, index);

    setTotalLeadsInQueue(count || 0);

    if (data && data.length > 0) {
      const lead = {
        ...data[0],
        data: (data[0].data as Record<string, unknown>) || {},
      } as Lead;
      setCurrentLead(lead);
    } else {
      setCurrentLead(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchListStats();
    }
  }, [user, fetchListStats]);

  // When selectedList or currentIndex changes, fetch the lead
  useEffect(() => {
    if (selectedList) {
      fetchLeadAtIndex(selectedList, currentIndex);
    }
  }, [selectedList, currentIndex, fetchLeadAtIndex]);

  const handleNext = () => {
    if (currentIndex < totalLeadsInQueue - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleStartCalling = (listId: string) => {
    setSelectedList(listId);
    setCurrentIndex(0);
  };

  const handleBackToQueues = () => {
    setSelectedList(null);
    setCurrentIndex(0);
    setCurrentLead(null);
    fetchListStats();
  };

  const handleLeadClose = () => {
    // When lead detail view closes, refetch current position (lead may have been completed)
    if (selectedList) {
      fetchLeadAtIndex(selectedList, currentIndex);
    }
  };

  const filteredLeads = currentLead ? [currentLead] : [];

  const tabs = [
    { id: "queues" as WorkTab, label: "Queues" },
    { id: "scheduled" as WorkTab, label: "Scheduled" },
    { id: "claimed" as WorkTab, label: "Claimed" },
    { id: "worklog" as WorkTab, label: "Work log" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // If a list is selected, show the lead calling view
  if (selectedList) {
    const list = lists.find((l) => l.id === selectedList);
    
    if (!currentLead) {
      return (
        <DashboardLayout>
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <Button variant="ghost" onClick={handleBackToQueues} className="mb-2 -ml-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Queues
            </Button>
            <Card className="text-center py-16">
              <CardContent>
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Phone className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Queue Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  No more leads to call in this queue.
                </p>
                <Button onClick={handleBackToQueues}>Back to Queues</Button>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      );
    }
    
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" onClick={handleBackToQueues} className="-ml-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Queues
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {list?.name}: {currentIndex + 1} of {filteredLeads.length}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNext}
                  disabled={currentIndex >= filteredLeads.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lead Detail View - Same as search */}
        <LeadDetailView 
          leadId={currentLead.id} 
          onClose={handleLeadClose}
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

            {/* List Cards */}
            <div className="space-y-4">
              {lists.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No lists assigned to you. Ask an admin to assign you to a list.</p>
                  </CardContent>
                </Card>
              ) : (
                lists.map((list) => (
                  <Card key={list.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button className="text-muted-foreground hover:text-warning transition-colors flex-shrink-0">
                            <Star className="w-4 h-4" />
                          </button>
                          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide truncate">
                            {list.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                          <span>{list.totalLeads.toLocaleString()} total</span>
                          <span>{list.donePercentage.toFixed(0)}% done</span>
                          <span>{list.queuedNow} queued</span>
                          <Badge 
                            variant="secondary" 
                            className="bg-primary/10 text-primary border-0 text-xs px-2 py-0"
                          >
                            {list.followupsNow} followups
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleStartCalling(list.id)}
                            className="h-8 w-8"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStartCalling(list.id)}>
                                Start Calling
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            
            {scheduledLeads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No scheduled callbacks.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {scheduledLeads.map((lead) => (
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
            
            {claimedLeads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No claimed leads.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {claimedLeads.map((lead) => (
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
