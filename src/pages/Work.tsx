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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<ListWithStats[]>([]);
  
  const [activeTab, setActiveTab] = useState<WorkTab>("queues");
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useAuth();
  

  const fetchData = useCallback(async () => {
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

    // Fetch leads for assigned lists (no limit to get all leads)
    let leadData: Lead[] = [];
    if (userListIds.length > 0) {
      const { data, count } = await supabase
        .from("leads")
        .select("*", { count: "exact" })
        .in("list_id", userListIds)
        .or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
        .range(0, 49999); // Fetch up to 50,000 leads
      
      leadData = (data || []).map((l) => ({
        ...l,
        data: (l.data as Record<string, unknown>) || {},
      })) as Lead[];
    }
    setLeads(leadData);

    // Calculate stats per list
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const listsWithStats: ListWithStats[] = listsData.map((list) => {
      const listLeads = leadData.filter((l) => l.list_id === list.id);
      const totalLeads = listLeads.length;
      const doneLeads = listLeads.filter((l) => ["won", "lost", "archived"].includes(l.status)).length;
      const donePercentage = totalLeads > 0 ? (doneLeads / totalLeads) * 100 : 0;
      const queuedNow = listLeads.filter((l) => !["won", "lost", "archived"].includes(l.status)).length;
      
      const followupsNow = listLeads.filter((l) => {
        if (!l.callback_scheduled_at) return false;
        return new Date(l.callback_scheduled_at) <= now;
      }).length;

      const followupsLater = listLeads.filter((l) => {
        if (!l.callback_scheduled_at) return false;
        const callbackDate = new Date(l.callback_scheduled_at);
        return callbackDate > now && callbackDate <= todayEnd;
      }).length;

      const dueCount = listLeads.filter((l) => {
        if (!l.callback_scheduled_at) return false;
        return new Date(l.callback_scheduled_at) <= now;
      }).length;

      return {
        ...list,
        totalLeads,
        donePercentage,
        queuedNow,
        followupsNow,
        followupsLater,
        dueCount,
      };
    });

    setLists(listsWithStats);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const getFilteredLeads = () => {
    if (!selectedList) return [];
    return leads
      .filter((l) => l.list_id === selectedList)
      .filter((l) => !["won", "lost", "archived"].includes(l.status));
  };

  const handleNext = () => {
    const filteredLeads = getFilteredLeads();
    if (currentIndex < filteredLeads.length - 1) {
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
    fetchData();
  };

  const handleLeadClose = () => {
    // When lead detail view closes, move to next lead or go back to queues
    const filteredLeads = getFilteredLeads();
    if (currentIndex < filteredLeads.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleBackToQueues();
    }
    fetchData();
  };

  const filteredLeads = getFilteredLeads();
  const currentLead = filteredLeads[currentIndex];

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
                  <Card key={list.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* List Name */}
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                              {list.name}
                            </h3>
                            <button className="text-muted-foreground hover:text-warning transition-colors">
                              <Star className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                            <span>{list.totalLeads.toLocaleString()} TOTAL</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{list.donePercentage.toFixed(2)}% DONE</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{list.queuedNow}+ QUEUED NOW</span>
                          </div>

                          {/* Followups */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-light">{list.followupsNow}</span>
                              <span className="text-sm text-muted-foreground">
                                Followups now, {list.followupsLater} later today
                              </span>
                            </div>
                          </div>

                          {/* Due Badge & Actions */}
                          <div className="flex items-center justify-between mt-4">
                            <Badge 
                              variant="secondary" 
                              className="bg-primary/10 text-primary border-0"
                            >
                              {list.dueCount} due
                            </Badge>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleStartCalling(list.id)}
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
                                  <DropdownMenuItem onClick={() => handleStartCalling(list.id)}>
                                    Start Calling
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
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
