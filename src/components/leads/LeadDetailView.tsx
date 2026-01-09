import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  MessageSquare,
  X,
  ArrowLeft,
  Loader2,
  ExternalLink,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Archive,
  Clock,
  Users,
  ChevronDown,
  UserRoundCog,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";

interface LeadDetailViewProps {
  leadId: string;
  onClose: () => void;
}

interface Lead {
  id: string;
  data: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
  list_id: string | null;
  campaign_id: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  call_attempts: number;
  callback_scheduled_at: string | null;
  last_contacted_at: string | null;
}

interface ListSettings {
  callbackCategories?: string;
  winnerCategories?: string;
  loserCategories?: string;
  archiveCategories?: string;
}

interface List {
  id: string;
  name: string;
  fields: Array<{ id: string; name: string; type: string; show: boolean }>;
  settings?: ListSettings;
}

export function LeadDetailView({ leadId, onClose }: LeadDetailViewProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [emailCount, setEmailCount] = useState(0);
  const [claimedByName, setClaimedByName] = useState<string | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string | null; email: string }>>([]);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLead();
    fetchEmailCount();
  }, [leadId]);

  const fetchLead = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*, lists(id, name, fields, settings)")
      .eq("id", leadId)
      .single();

    if (error) {
      toast({ title: "Failed to load lead", variant: "destructive" });
      onClose();
      return;
    }

    setLead(data as Lead);
    if (data.lists) {
      setList(data.lists as unknown as List);
    }
    
    // Fetch claimed_by user name
    if (data.claimed_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.claimed_by)
        .single();
      setClaimedByName(profile?.full_name || null);
    }
    
    // Auto-claim the lead if not already claimed
    if (!data.claimed_by) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("leads")
          .update({ 
            claimed_by: user.id, 
            claimed_at: new Date().toISOString() 
          })
          .eq("id", leadId);
        
        // Refetch to get updated data
        const { data: updatedLead } = await supabase
          .from("leads")
          .select("*, lists(id, name, fields, settings)")
          .eq("id", leadId)
          .single();
        
        if (updatedLead) {
          setLead(updatedLead as Lead);
          toast({ title: "Lead claimed automatically" });
        }
      }
    }
    
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("status", "active");
    setAgents(data || []);
  };

  const handleDelegate = async (agentId: string) => {
    if (!lead) return;
    
    const { error } = await supabase
      .from("leads")
      .update({ 
        claimed_by: agentId, 
        claimed_at: new Date().toISOString() 
      })
      .eq("id", lead.id);

    if (error) {
      toast({ title: "Failed to delegate lead", variant: "destructive" });
    } else {
      const agent = agents.find(a => a.id === agentId);
      toast({ title: `Lead delegated to ${agent?.full_name || agent?.email}` });
      setDelegateOpen(false);
      fetchLead();
    }
  };

  const fetchEmailCount = async () => {
    const { count } = await supabase
      .from("email_logs")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", leadId);
    setEmailCount(count || 0);
  };

  const handleStatusChange = async (newStatus: string, subcategory?: string) => {
    if (!lead) return;

    const updateData: Record<string, any> = { 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    };
    
    // Store subcategory in lead data if provided
    if (subcategory) {
      updateData.data = { ...lead.data, _subcategory: subcategory };
    }

    const { error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead.id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: subcategory || `Status changed to ${newStatus}` });
      fetchLead();
    }
  };

  // Parse categories from list settings
  const getCategories = (type: "callback" | "winner" | "loser" | "archive"): string[] => {
    if (!list?.settings) return [];
    const categoryMap = {
      callback: list.settings.callbackCategories,
      winner: list.settings.winnerCategories,
      loser: list.settings.loserCategories,
      archive: list.settings.archiveCategories,
    };
    const raw = categoryMap[type] || "";
    return raw.split(",").map(c => c.trim()).filter(Boolean);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-cyan-500 text-white",
      contacted: "bg-blue-500 text-white",
      qualified: "bg-purple-500 text-white",
      callback: "bg-amber-500 text-white",
      won: "bg-green-600 text-white",
      lost: "bg-red-600 text-white",
      archived: "bg-gray-500 text-white",
    };
    return (
      <Badge className={`${colors[status] || "bg-muted"} capitalize text-xs px-2`}>
        {status}
      </Badge>
    );
  };

  // Get primary display info - prioritize company name fields
  const getDisplayName = () => {
    if (!lead?.data) return "Unknown";
    const entries = Object.entries(lead.data);
    
    // Prioritize company name fields (Pavadinimas, Company, etc.)
    const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma"];
    for (const [key, value] of entries) {
      if (companyFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    // Fallback to first non-empty string value
    for (const [key, value] of entries) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "Unknown";
  };

  const getPhones = () => {
    if (!lead?.data) return [];
    const phones: string[] = [];
    for (const [key, value] of Object.entries(lead.data)) {
      const keyLower = key.toLowerCase();
      if (
        (keyLower.includes("phone") || keyLower.includes("tel")) &&
        typeof value === "string" &&
        value.trim()
      ) {
        phones.push(value);
      }
    }
    return phones;
  };

  // Get non-phone data fields for display
  const getDataFields = () => {
    if (!lead?.data) return [];
    return Object.entries(lead.data).filter(([key]) => {
      const keyLower = key.toLowerCase();
      return !(keyLower.includes("phone") || keyLower.includes("tel"));
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) return null;

  const phones = getPhones();
  const displayName = getDisplayName();
  const dataFields = getDataFields();
  const currentTime = format(new Date(), "HH:mm");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            {getStatusBadge(lead.status)}
            <h1 className="text-2xl font-semibold">{displayName}</h1>
          </div>
        </div>
        {/* Phone numbers */}
        <div className="ml-14 mt-2 space-y-1">
          {phones.map((phone, i) => (
            <a
              key={i}
              href={`tel:${phone}`}
              className="text-primary hover:underline flex items-center gap-2 text-sm"
            >
              {phone}
              <X className="w-3 h-3 text-muted-foreground hover:text-destructive cursor-pointer" />
            </a>
          ))}
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Left Column - Lead Info & Actions */}
        <div className="flex-1 p-6 space-y-6 max-w-2xl">
          {/* Lead Data Fields */}
          <div className="space-y-2">
            {dataFields.slice(0, 6).map(([key, value]) => (
              <div key={key} className="flex text-sm">
                <span className="w-40 text-right pr-4 text-muted-foreground font-medium flex-shrink-0">
                  {key}
                </span>
                <span>
                  {String(value || "").startsWith("http") ? (
                    <a
                      href={String(value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {String(value)}
                    </a>
                  ) : (
                    String(value || "-")
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Metadata Section */}
          <div className="space-y-1 border-t pt-4">
            <div className="flex text-sm">
              <span className="w-40 text-right pr-4 text-muted-foreground font-medium flex-shrink-0">
                First created
              </span>
              <span className="text-primary">
                {format(new Date(lead.created_at), "dd-MM-yyyy HH:mm")} ({formatDistanceToNow(new Date(lead.created_at))} ago)
              </span>
            </div>
            <div className="flex text-sm">
              <span className="w-40 text-right pr-4 text-muted-foreground font-medium flex-shrink-0">
                Last updated
              </span>
              <span className="text-primary">
                {format(new Date(lead.updated_at), "dd-MM-yyyy HH:mm")} ({formatDistanceToNow(new Date(lead.updated_at))} ago)
              </span>
            </div>
            <div className="flex text-sm">
              <span className="w-40 text-right pr-4 text-muted-foreground font-medium flex-shrink-0">
                Current List
              </span>
              <span className="text-primary flex items-center gap-1">
                {list?.name || "No list"} <span className="text-muted-foreground">→</span>
              </span>
            </div>
            <div className="flex text-sm">
              <span className="w-40 text-right pr-4 text-muted-foreground font-medium flex-shrink-0">
                Claimed by
              </span>
              <span>
                {lead.claimed_by ? (
                  "Claimed"
                ) : (
                  <>
                    Not claimed - <span className="text-primary cursor-pointer hover:underline">Claim now</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Communication Tabs */}
          <Tabs defaultValue="call" className="mt-6">
            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0">
              <TabsTrigger 
                value="call" 
                className="gap-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2"
              >
                <Phone className="w-4 h-4 text-red-500" />
                Call
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="gap-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2"
              >
                <Mail className="w-4 h-4" />
                E-mail
              </TabsTrigger>
              <TabsTrigger 
                value="sms" 
                className="gap-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2"
              >
                <MessageSquare className="w-4 h-4" />
                SMS
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="call" className="mt-4">
              <div className="border rounded-md p-4 space-y-4">
                <Textarea
                  placeholder="Comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                
                {/* Follow-up Section */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {/* Delegate Button */}
                  <Popover open={delegateOpen} onOpenChange={(open) => {
                    setDelegateOpen(open);
                    if (open) fetchAgents();
                  }}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Delegate to another agent">
                        <UserRoundCog className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="text-sm font-medium mb-2">Delegate to agent</div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {agents.filter(a => a.id !== user?.id).map((agent) => (
                          <Button
                            key={agent.id}
                            variant="ghost"
                            className="w-full justify-start h-8 text-sm"
                            onClick={() => handleDelegate(agent.id)}
                          >
                            {agent.full_name || agent.email}
                          </Button>
                        ))}
                        {agents.filter(a => a.id !== user?.id).length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">No other agents available</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="flex-1" />
                  <span className="text-sm text-muted-foreground">Follow-up</span>
                  <Select defaultValue="after">
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after">after</SelectItem>
                      <SelectItem value="on">on</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="27">
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="27">27 hours</SelectItem>
                      <SelectItem value="48">2 days</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Action Buttons with Subcategory Dropdowns */}
                <div className="flex gap-2 pt-2">
                  {/* Callback Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-1 bg-[hsl(200,20%,40%)] hover:bg-[hsl(200,20%,35%)] rounded-md">
                        <RotateCcw className="w-4 h-4" />
                        Call back
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border shadow-md z-50">
                      {getCategories("callback").length > 0 ? (
                        getCategories("callback").map((cat) => (
                          <DropdownMenuItem key={cat} onClick={() => handleStatusChange("callback", cat)}>
                            {cat}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem onClick={() => handleStatusChange("callback")}>
                          Call back
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Winner Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-1 bg-green-600 hover:bg-green-700 rounded-md">
                        <ThumbsUp className="w-4 h-4" />
                        Winner
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border shadow-md z-50">
                      {getCategories("winner").length > 0 ? (
                        getCategories("winner").map((cat) => (
                          <DropdownMenuItem key={cat} onClick={() => handleStatusChange("won", cat)}>
                            {cat}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem onClick={() => handleStatusChange("won")}>
                          Winner
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Loser Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-1 bg-red-600 hover:bg-red-700 rounded-md">
                        <ThumbsDown className="w-4 h-4" />
                        Loser
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border shadow-md z-50">
                      {getCategories("loser").length > 0 ? (
                        getCategories("loser").map((cat) => (
                          <DropdownMenuItem key={cat} onClick={() => handleStatusChange("lost", cat)}>
                            {cat}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem onClick={() => handleStatusChange("lost")}>
                          Loser
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Archive Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="gap-1 rounded-md">
                        <Archive className="w-4 h-4" />
                        Archive
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border shadow-md z-50">
                      {getCategories("archive").length > 0 ? (
                        getCategories("archive").map((cat) => (
                          <DropdownMenuItem key={cat} onClick={() => handleStatusChange("archived", cat)}>
                            {cat}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem onClick={() => handleStatusChange("archived")}>
                          Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="email" className="mt-4">
              <div className="text-muted-foreground text-sm p-4 border rounded-md">
                Email composer coming soon...
              </div>
            </TabsContent>
            
            <TabsContent value="sms" className="mt-4">
              <div className="text-muted-foreground text-sm p-4 border rounded-md">
                SMS composer coming soon...
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Activity & Stats */}
        <div className="w-[400px] border-l bg-muted/10">
          {/* Tabs Header */}
          <div className="border-b px-4 py-2">
            <Tabs defaultValue="activity">
              <div className="flex items-center justify-between">
                <TabsList className="bg-transparent h-auto p-0 gap-4">
                  <TabsTrigger 
                    value="activity" 
                    className="px-0 py-1 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent data-[state=active]:text-red-500"
                  >
                    Activity <Badge variant="secondary" className="ml-1 text-xs">{lead.call_attempts}</Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="colleagues" 
                    className="px-0 py-1 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Colleagues <Badge variant="secondary" className="ml-1 text-xs">0</Badge>
                  </TabsTrigger>
                </TabsList>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </Tabs>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 p-4">
            <div className="border rounded-lg p-3 bg-background text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold">{lead.call_attempts}</span>
                <Phone className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Call attempts</p>
            </div>
            <div className="border rounded-lg p-3 bg-background text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold">{emailCount}</span>
                <Mail className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">E-mails</p>
            </div>
            <div className="border rounded-lg p-3 bg-background text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold">{currentTime}</span>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Local time</p>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="px-4 pb-4">
            {lead.status === "lost" || lead.status === "won" ? (
              <div className="flex gap-3 p-3 border rounded-lg bg-background">
                <div className={`w-10 h-10 rounded flex items-center justify-center ${
                  lead.status === "lost" ? "bg-red-100" : "bg-green-100"
                }`}>
                  {lead.status === "lost" ? (
                    <ThumbsDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {lead.status === "lost" ? "Loser" : "Winner"} <span className="text-muted-foreground font-normal">by {claimedByName || "Unknown"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(lead.updated_at), "dd-MM-yyyy HH:mm")} ({formatDistanceToNow(new Date(lead.updated_at))} ago)
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity recorded yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
