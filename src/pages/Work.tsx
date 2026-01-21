import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [lists, setLists] = useState<ListWithStats[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [claimedLeads, setClaimedLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<WorkTab>("queues");
  const [loading, setLoading] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalLeadsInQueue, setTotalLeadsInQueue] = useState(0);
  const [leadLoading, setLeadLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const autostartHandled = useRef(false);
  const isAutostarting = searchParams.get("autostart") === "true";

  // Fetch list statistics (optimized - parallel queries)
  const fetchListStats = useCallback(async (showLoading = false) => {
    if (!user) return;
    if (showLoading) setLoading(true);

    const now = new Date().toISOString();

    // Run all initial queries in parallel
    const [listUserResult, scheduledResult, claimedResult] = await Promise.all([
      supabase.from("list_users").select("list_id").eq("user_id", user.id),
      supabase
        .from("leads")
        .select("id, list_id, status, data, callback_scheduled_at, claimed_at, claimed_by")
        .eq("claimed_by", user.id)
        .not("callback_scheduled_at", "is", null)
        .gt("callback_scheduled_at", now)
        .order("callback_scheduled_at", { ascending: true })
        .limit(100),
      supabase
        .from("leads")
        .select("id, list_id, status, data, callback_scheduled_at, claimed_at, claimed_by")
        .eq("claimed_by", user.id)
        .not("status", "in", '("won","lost","archived")')
        .order("claimed_at", { ascending: false })
        .limit(100),
    ]);

    const userListIds = (listUserResult.data || []).map((lu) => lu.list_id);

    // Set scheduled and claimed leads immediately
    setScheduledLeads((scheduledResult.data || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[]);

    setClaimedLeads((claimedResult.data || []).map((l) => ({
      ...l,
      data: (l.data as Record<string, unknown>) || {},
    })) as Lead[]);

    if (userListIds.length === 0) {
      setLists([]);
      setLoading(false);
      return;
    }

    // Fetch list details
    const { data: listsData } = await supabase
      .from("lists")
      .select("id, name, status")
      .in("id", userListIds)
      .eq("status", "active");

    if (!listsData || listsData.length === 0) {
      setLists([]);
      setLoading(false);
      return;
    }

    // Fetch all stats for all lists in parallel (all 4 queries per list run simultaneously)
    const listsWithStats: ListWithStats[] = await Promise.all(
      listsData.map(async (list) => {
        const [totalResult, doneResult, queuedResult, followupsResult] = await Promise.all([
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("list_id", list.id),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("list_id", list.id).in("status", ["won", "lost", "archived"]),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("list_id", list.id).not("status", "in", '("won","lost","archived")').or(`claimed_by.is.null,claimed_by.eq.${user.id}`),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("list_id", list.id).not("callback_scheduled_at", "is", null).lte("callback_scheduled_at", now),
        ]);

        const total = totalResult.count || 0;
        const done = doneResult.count || 0;
        const donePercentage = total > 0 ? (done / total) * 100 : 0;

        return {
          ...list,
          totalLeads: total,
          donePercentage,
          queuedNow: queuedResult.count || 0,
          followupsNow: followupsResult.count || 0,
          followupsLater: 0,
          dueCount: followupsResult.count || 0,
        };
      })
    );

    setLists(listsWithStats);
    setLoading(false);
  }, [user]);

  // Fetch a single lead at the given index for the selected list
  const fetchLeadAtIndex = useCallback(async (listId: string, index: number) => {
    if (!user) return;
    setLeadLoading(true);

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
    setLeadLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && lists.length === 0) {
      fetchListStats(true); // Show loading only on initial load
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start calling when navigated with autostart=true
  useEffect(() => {
    if (searchParams.get("autostart") === "true" && lists.length > 0 && !autostartHandled.current) {
      autostartHandled.current = true;
      // Find first list with queued leads
      const listWithLeads = lists.find(l => l.queuedNow > 0) || lists[0];
      if (listWithLeads) {
        handleStartCalling(listWithLeads.id);
        // Clear the autostart param
        setSearchParams({}, { replace: true });
      }
    }
  }, [lists, searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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
    fetchListStats(false); // Refresh silently without showing loader
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

  // Show loading when auth loading, initial loading, or autostarting
  if (authLoading || loading || (isAutostarting && !autostartHandled.current)) {
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
    
    // Show loading while fetching lead
    if (leadLoading) {
      return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      );
    }
    
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
            <div className="space-y-4 max-w-xl">
              {lists.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No lists assigned to you. Ask an admin to assign you to a list.</p>
                  </CardContent>
                </Card>
              ) : (
                lists.map((list) => (
                  <Card key={list.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      {/* Row 1: Name + Star */}
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                          {list.name}
                        </h3>
                        <button className="text-muted-foreground hover:text-warning transition-colors">
                          <Star className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Row 2: Stats */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <span>{list.totalLeads.toLocaleString()} TOTAL</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{list.donePercentage.toFixed(2)}% DONE</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{list.queuedNow > 1000 ? "1000+" : list.queuedNow} QUEUED NOW</span>
                      </div>

                      {/* Row 3: Followups */}
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-2xl font-light">{list.followupsNow}</span>
                        <span className="text-sm text-muted-foreground">
                          Followups now, {list.followupsLater} later today
                        </span>
                      </div>

                      {/* Row 4: Badge + Actions */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="secondary" 
                          className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5"
                        >
                          {list.dueCount} due
                        </Badge>

                        <div className="flex items-center border rounded">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartCalling(list.id)}
                            className="h-8 w-8 rounded-none border-r"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none">
                                <MoreHorizontal className="w-4 h-4" />
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
