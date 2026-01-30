import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  CalendarClock, 
  CalendarX, 
  CalendarMinus, 
  ThumbsUp,
  Users,
  Settings,
  Loader2
} from "lucide-react";


interface ClaimStats {
  onSchedule: number;
  due: number;
  overdue: number;
  notScheduled: number;
  won: number;
  total: number;
}

interface ListClaim {
  id: string;
  name: string;
  totalLeads: number;
  claimedLeads: number;
  overdueCount: number;
}

interface AgentClaim {
  id: string;
  name: string;
  email: string;
  claimedCount: number;
  overdueCount: number;
}

export default function ManageClaims() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClaimStats>({
    onSchedule: 0,
    due: 0,
    overdue: 0,
    notScheduled: 0,
    won: 0,
    total: 0,
  });
  const [listClaims, setListClaims] = useState<ListClaim[]>([]);
  const [agentClaims, setAgentClaims] = useState<AgentClaim[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedList, setSelectedList] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    
    // Fetch all claimed leads
    const { data: claimedLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, status, claimed_by, claimed_at, callback_scheduled_at, list_id");

    if (leadsError) {
      toast({ title: "Failed to fetch claims", variant: "destructive" });
      setLoading(false);
      return;
    }

    const claimed = claimedLeads?.filter(l => l.claimed_by) || [];

    // Calculate stats
    let onSchedule = 0;
    let due = 0;
    let overdue = 0;
    let notScheduled = 0;
    let won = 0;

    claimed.forEach(lead => {
      if (lead.status === "won") {
        won++;
      } else if (!lead.callback_scheduled_at) {
        notScheduled++;
      } else {
        const scheduledTime = new Date(lead.callback_scheduled_at);
        const hoursDiff = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 0) {
          overdue++;
        } else if (hoursDiff < 1) {
          due++;
        } else {
          onSchedule++;
        }
      }
    });

    setStats({
      onSchedule,
      due,
      overdue,
      notScheduled,
      won,
      total: claimed.length,
    });

    // Fetch lists with claim stats
    const { data: listsData } = await supabase.from("lists").select("id, name");
    setLists(listsData || []);

    const listClaimsMap = new Map<string, ListClaim>();
    listsData?.forEach(list => {
      listClaimsMap.set(list.id, {
        id: list.id,
        name: list.name,
        totalLeads: 0,
        claimedLeads: 0,
        overdueCount: 0,
      });
    });

    // Count leads per list
    const { data: allLeads } = await supabase.from("leads").select("id, list_id, claimed_by, callback_scheduled_at");
    allLeads?.forEach(lead => {
      if (lead.list_id && listClaimsMap.has(lead.list_id)) {
        const listClaim = listClaimsMap.get(lead.list_id)!;
        listClaim.totalLeads++;
        if (lead.claimed_by) {
          listClaim.claimedLeads++;
          if (lead.callback_scheduled_at && new Date(lead.callback_scheduled_at) < now) {
            listClaim.overdueCount++;
          }
        }
      }
    });

    setListClaims(Array.from(listClaimsMap.values()).filter(l => l.claimedLeads > 0));

    // Fetch agents with claim stats
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
    setAgents(profiles?.map(p => ({ id: p.id, name: p.full_name || p.email })) || []);

    const agentClaimsMap = new Map<string, AgentClaim>();
    profiles?.forEach(profile => {
      agentClaimsMap.set(profile.id, {
        id: profile.id,
        name: profile.full_name || profile.email,
        email: profile.email,
        claimedCount: 0,
        overdueCount: 0,
      });
    });

    claimed.forEach(lead => {
      if (lead.claimed_by && agentClaimsMap.has(lead.claimed_by)) {
        const agentClaim = agentClaimsMap.get(lead.claimed_by)!;
        agentClaim.claimedCount++;
        if (lead.callback_scheduled_at && new Date(lead.callback_scheduled_at) < now) {
          agentClaim.overdueCount++;
        }
      }
    });

    setAgentClaims(Array.from(agentClaimsMap.values()).filter(a => a.claimedCount > 0));
    setLoading(false);
  };

  const handleReleaseByStatus = async (status: string) => {
    let filter: any = { claimed_by: { not: null } };
    const now = new Date();

    const { data: leads } = await supabase
      .from("leads")
      .select("id, callback_scheduled_at, status")
      .not("claimed_by", "is", null);

    if (!leads) return;

    let idsToRelease: string[] = [];

    if (status === "overdue") {
      idsToRelease = leads
        .filter(l => l.callback_scheduled_at && new Date(l.callback_scheduled_at) < now && l.status !== "won")
        .map(l => l.id);
    } else if (status === "due") {
      idsToRelease = leads
        .filter(l => {
          if (!l.callback_scheduled_at || l.status === "won") return false;
          const scheduledTime = new Date(l.callback_scheduled_at);
          const hoursDiff = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursDiff >= 0 && hoursDiff < 1;
        })
        .map(l => l.id);
    } else if (status === "not_scheduled") {
      idsToRelease = leads
        .filter(l => !l.callback_scheduled_at && l.status !== "won")
        .map(l => l.id);
    } else if (status === "won") {
      idsToRelease = leads.filter(l => l.status === "won").map(l => l.id);
    } else if (status === "all") {
      idsToRelease = leads.map(l => l.id);
    }

    if (idsToRelease.length === 0) {
      toast({ title: "No leads to release" });
      return;
    }

    const { error } = await supabase
      .from("leads")
      .update({ claimed_by: null, claimed_at: null })
      .in("id", idsToRelease);

    if (error) {
      toast({ title: "Failed to release leads", variant: "destructive" });
    } else {
      toast({ title: `Released ${idsToRelease.length} leads` });
      fetchData();
    }
  };

  const getOverduePercentage = (overdue: number, total: number) => {
    if (total === 0) return 0;
    return ((overdue / total) * 100).toFixed(2);
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

  const totalPercentage = stats.total > 0 ? ((stats.onSchedule / stats.total) * 100).toFixed(0) : "0";

  return (
    <DashboardLayout>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-light text-primary mb-2">Claimed leads</h1>
            <div className="w-16 h-0.5 bg-primary" />
          </div>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account wide claims */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Account wide claims</h2>
            <div className="w-12 h-0.5 bg-primary mb-4" />

            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">ON SCHEDULE</span>
                <span className="ml-auto text-muted-foreground">
                  ({totalPercentage}%)
                </span>
                <span className="font-bold">{stats.onSchedule}</span>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium">DUE</span>
                <button 
                  onClick={() => handleReleaseByStatus("due")}
                  className="text-primary text-sm hover:underline"
                >
                  (RELEASE NOW)
                </button>
                <span className="ml-auto text-muted-foreground">
                  ({stats.total > 0 ? ((stats.due / stats.total) * 100).toFixed(2) : 0}%)
                </span>
                <span className="font-bold">{stats.due}</span>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                  <CalendarX className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-medium">OVERDUE</span>
                <button 
                  onClick={() => handleReleaseByStatus("overdue")}
                  className="text-primary text-sm hover:underline"
                >
                  (RELEASE NOW)
                </button>
                <span className="ml-auto text-muted-foreground">
                  ({stats.total > 0 ? ((stats.overdue / stats.total) * 100).toFixed(2) : 0}%)
                </span>
                <span className="font-bold">{stats.overdue}</span>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <CalendarMinus className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="font-medium">NOT SCHEDULED</span>
                <button 
                  onClick={() => handleReleaseByStatus("not_scheduled")}
                  className="text-primary text-sm hover:underline"
                >
                  (RELEASE NOW)
                </button>
                <span className="ml-auto text-muted-foreground">
                  ({stats.total > 0 ? ((stats.notScheduled / stats.total) * 100).toFixed(2) : 0}%)
                </span>
                <span className="font-bold">{stats.notScheduled}</span>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-medium">WON</span>
                <button 
                  onClick={() => handleReleaseByStatus("won")}
                  className="text-primary text-sm hover:underline"
                >
                  (RELEASE NOW)
                </button>
                <span className="ml-auto text-muted-foreground">
                  ({stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(2) : 0}%)
                </span>
                <span className="font-bold">{stats.won}</span>
              </div>

              <div className="flex items-center gap-3 py-2 border-t pt-4">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">TOTAL CLAIMS</span>
                <button 
                  onClick={() => handleReleaseByStatus("all")}
                  className="text-primary text-sm hover:underline"
                >
                  (RELEASE NOW)
                </button>
                <span className="ml-auto font-bold text-lg">{stats.total}</span>
              </div>
            </div>
          </div>

          {/* Custom scope */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Custom scope</h2>
            <div className="w-12 h-0.5 bg-primary mb-4" />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right">Lists</Label>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {lists.map(list => (
                      <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-20 text-right">Agents</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-red-500 hover:bg-red-600 text-white">
                Show Claims
              </Button>
            </div>
          </div>
        </div>

        {/* Claimed leads per list */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-1">
            Claimed leads per list <span className="text-sm font-normal text-muted-foreground">Sorted by list name</span>
          </h2>
          <div className="w-12 h-0.5 bg-primary mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listClaims.map(list => (
              <Card key={list.id} className="border">
                <CardContent className="p-4">
                  <Link to={`/manage/lists/${list.id}`} className="text-primary hover:underline font-medium">
                    {list.name.toUpperCase()}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    ({list.totalLeads.toLocaleString()} LEADS/{list.totalLeads > 0 ? ((list.claimedLeads / list.totalLeads) * 100).toFixed(2) : 0}% CLAIMED)
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold">{list.claimedLeads.toLocaleString()}</span>
                    <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs">
                      {getOverduePercentage(list.overdueCount, list.claimedLeads)}% overdue
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {listClaims.length === 0 && (
              <p className="text-muted-foreground col-span-full">No claimed leads in any list</p>
            )}
          </div>
        </div>

        {/* Claimed leads per agent */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-1">
            Claimed leads per agent <span className="text-sm font-normal text-muted-foreground">Sorted by agent name</span>
          </h2>
          <div className="w-12 h-0.5 bg-primary mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agentClaims.map(agent => (
              <Card key={agent.id} className="border">
                <CardContent className="p-4">
                  <p className="text-primary font-medium">{agent.name.toUpperCase()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold">{agent.claimedCount.toLocaleString()}</span>
                    <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs">
                      {getOverduePercentage(agent.overdueCount, agent.claimedCount)}% overdue
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {agentClaims.length === 0 && (
              <p className="text-muted-foreground col-span-full">No agents have claimed leads</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
