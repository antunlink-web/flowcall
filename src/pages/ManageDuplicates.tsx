import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check,
  ArrowLeftRight,
  Maximize2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
  { label: "Settings", href: "/manage/settings" },
  { label: "Account", href: "/manage/account" },
];

interface Lead {
  id: string;
  data: Record<string, any>;
  status: string;
  list_id: string | null;
  created_at: string;
  campaign_id: string | null;
}

interface List {
  id: string;
  name: string;
}

interface DuplicateGroup {
  key: string;
  matchType: "phone" | "mokėtojo_kodas" | "both";
  matchValue: string;
  leads: Lead[];
}

// Normalize phone number for comparison
const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  return phone.replace(/[\s\-\(\)\+]/g, "").replace(/^00/, "").replace(/^370/, "");
};

// Extract phone from lead data
const getLeadPhone = (data: Record<string, any>): string => {
  const phoneFields = ["phone", "telefonas", "tel", "mobile", "mobilus"];
  for (const field of phoneFields) {
    const value = data[field] || data[field.toLowerCase()] || data[field.toUpperCase()];
    if (value) return String(value);
  }
  return "";
};

// Extract mokėtojo kodas from lead data
const getMoketojoKodas = (data: Record<string, any>): string => {
  const codeFields = ["mokėtojo kodas", "moketojo kodas", "mokėtojo_kodas", "moketojo_kodas", "company_code", "imones_kodas", "įmonės kodas"];
  for (const field of codeFields) {
    const value = data[field] || data[field.toLowerCase()] || data[field.toUpperCase()];
    if (value) return String(value);
  }
  return "";
};

// Get display name for lead
const getLeadDisplayName = (data: Record<string, any>): string => {
  return data.company || data.name || data.pavadinimas || data.įmonė || data.imone || "Unknown";
};

// Get lead email
const getLeadEmail = (data: Record<string, any>): string => {
  return data.email || data.el_pastas || data["el. paštas"] || "";
};

// Get lead website
const getLeadWebsite = (data: Record<string, any>): string => {
  return data.website || data.svetaine || data.svetainė || "";
};

// Get lead address
const getLeadAddress = (data: Record<string, any>): string => {
  return data.address || data.adresas || "";
};

// Get lead category
const getLeadCategory = (data: Record<string, any>): string => {
  return data.category || data.kategorija || "";
};

// Get lead remark
const getLeadRemark = (data: Record<string, any>): string => {
  return data.remark || data.pastaba || data.notes || "";
};

export default function ManageDuplicates() {
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [internalOnly, setInternalOnly] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Bulk handling states
  const [bulkListId, setBulkListId] = useState<string>("all");
  const [dedupeStrategy, setDedupeStrategy] = useState("keep_new");
  const [dedupeMethod, setDedupeMethod] = useState("dry_run");
  const [runningBulk, setRunningBulk] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    const { data, error } = await supabase
      .from("lists")
      .select("id, name")
      .eq("status", "active");
    
    if (!error && data) {
      setLists(data);
    }
  };

  const findDuplicates = async () => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      let query = supabase.from("leads").select("*");
      
      if (selectedListId !== "all") {
        query = query.eq("list_id", selectedListId);
      }
      
      const { data: leads, error } = await query;
      
      if (error) throw error;
      
      if (!leads || leads.length === 0) {
        setDuplicateGroups([]);
        setDuplicateCount(0);
        toast.info("No leads found");
        return;
      }

      // Group by phone number
      const phoneGroups: Record<string, Lead[]> = {};
      // Group by mokėtojo kodas
      const codeGroups: Record<string, Lead[]> = {};

      leads.forEach((lead) => {
        const data = (lead.data as Record<string, any>) || {};
        const phone = normalizePhone(getLeadPhone(data));
        const code = getMoketojoKodas(data);

        if (phone && phone.length >= 6) {
          if (!phoneGroups[phone]) phoneGroups[phone] = [];
          phoneGroups[phone].push(lead as Lead);
        }

        if (code && code.length >= 5) {
          if (!codeGroups[code]) codeGroups[code] = [];
          codeGroups[code].push(lead as Lead);
        }
      });

      // Filter to only groups with duplicates
      const duplicates: DuplicateGroup[] = [];
      const processedLeadIds = new Set<string>();

      // Process mokėtojo kodas duplicates first (higher priority)
      Object.entries(codeGroups).forEach(([code, groupLeads]) => {
        if (groupLeads.length > 1) {
          // Check if internal only filter applies
          if (internalOnly && selectedListId !== "all") {
            const allInSelectedList = groupLeads.every(l => l.list_id === selectedListId);
            if (!allInSelectedList) return;
          }
          
          duplicates.push({
            key: `code-${code}`,
            matchType: "mokėtojo_kodas",
            matchValue: code,
            leads: groupLeads,
          });
          groupLeads.forEach(l => processedLeadIds.add(l.id));
        }
      });

      // Process phone duplicates
      Object.entries(phoneGroups).forEach(([phone, groupLeads]) => {
        if (groupLeads.length > 1) {
          // Skip if all leads already processed
          const unprocessedLeads = groupLeads.filter(l => !processedLeadIds.has(l.id));
          if (unprocessedLeads.length < 2 && groupLeads.every(l => processedLeadIds.has(l.id))) {
            return;
          }

          // Check if internal only filter applies
          if (internalOnly && selectedListId !== "all") {
            const allInSelectedList = groupLeads.every(l => l.list_id === selectedListId);
            if (!allInSelectedList) return;
          }

          duplicates.push({
            key: `phone-${phone}`,
            matchType: "phone",
            matchValue: phone,
            leads: groupLeads,
          });
        }
      });

      setDuplicateGroups(duplicates);
      setDuplicateCount(duplicates.reduce((sum, g) => sum + g.leads.length, 0));
      
      if (duplicates.length === 0) {
        toast.success("No duplicates found!");
      } else {
        toast.success(`Found ${duplicates.length} duplicate groups`);
      }
    } catch (error: any) {
      toast.error("Error finding duplicates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeepLead = async (group: DuplicateGroup, keepLeadId: string) => {
    try {
      // Delete all other leads in the group
      const leadsToDelete = group.leads.filter(l => l.id !== keepLeadId);
      
      for (const lead of leadsToDelete) {
        await supabase.from("leads").delete().eq("id", lead.id);
      }
      
      // Remove this group from the list
      setDuplicateGroups(prev => prev.filter(g => g.key !== group.key));
      setDuplicateCount(prev => prev - group.leads.length);
      toast.success("Duplicates resolved - kept selected lead");
    } catch (error: any) {
      toast.error("Error resolving duplicates: " + error.message);
    }
  };

  const handleMergeLeads = async (group: DuplicateGroup) => {
    try {
      // Keep the first lead and merge data from others
      const [keepLead, ...otherLeads] = group.leads;
      const mergedData = { ...(keepLead.data as Record<string, any>) };
      
      // Merge data from other leads (fill in missing fields)
      otherLeads.forEach(lead => {
        const leadData = (lead.data as Record<string, any>) || {};
        Object.entries(leadData).forEach(([key, value]) => {
          if (!mergedData[key] && value) {
            mergedData[key] = value;
          }
        });
      });
      
      // Update the kept lead with merged data
      await supabase
        .from("leads")
        .update({ data: mergedData })
        .eq("id", keepLead.id);
      
      // Delete other leads
      for (const lead of otherLeads) {
        await supabase.from("leads").delete().eq("id", lead.id);
      }
      
      setDuplicateGroups(prev => prev.filter(g => g.key !== group.key));
      setDuplicateCount(prev => prev - group.leads.length);
      toast.success("Leads merged successfully");
    } catch (error: any) {
      toast.error("Error merging leads: " + error.message);
    }
  };

  const runBulkDedupe = async () => {
    if (dedupeMethod === "dry_run") {
      toast.info("Dry run complete - no changes made. Change method to 'Execute' to apply changes.");
      return;
    }
    
    setRunningBulk(true);
    try {
      let processed = 0;
      
      for (const group of duplicateGroups) {
        if (bulkListId !== "all" && !group.leads.some(l => l.list_id === bulkListId)) {
          continue;
        }
        
        if (dedupeStrategy === "keep_new") {
          // Keep newest, delete others
          const sorted = [...group.leads].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const [keep, ...remove] = sorted;
          for (const lead of remove) {
            await supabase.from("leads").delete().eq("id", lead.id);
          }
        } else if (dedupeStrategy === "keep_old") {
          // Keep oldest, delete others
          const sorted = [...group.leads].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const [keep, ...remove] = sorted;
          for (const lead of remove) {
            await supabase.from("leads").delete().eq("id", lead.id);
          }
        } else if (dedupeStrategy === "merge") {
          await handleMergeLeads(group);
        }
        processed++;
      }
      
      toast.success(`Processed ${processed} duplicate groups`);
      findDuplicates(); // Refresh the list
    } catch (error: any) {
      toast.error("Error during bulk dedupe: " + error.message);
    } finally {
      setRunningBulk(false);
    }
  };

  const getListName = (listId: string | null): string => {
    if (!listId) return "No list";
    const list = lists.find(l => l.id === listId);
    return list?.name || "Unknown list";
  };

  return (
    <DashboardLayout>
      {/* Sub Navigation */}
      <div className="border-b border-border bg-background">
        <div className="flex gap-6 px-6">
          {subNavItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                item.label === "Duplicates"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <h1 className="text-3xl font-light text-primary mb-2">Duplicates</h1>
        <div className="w-16 h-0.5 bg-primary mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Report Section */}
          <div>
            <h2 className="text-xl font-light text-primary mb-4">Report</h2>
            
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="list-filter">Lists</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Leave empty for all lists.</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="internal-only" 
                  checked={internalOnly}
                  onCheckedChange={(checked) => setInternalOnly(!!checked)}
                />
                <Label htmlFor="internal-only">Internal only</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Only show duplicates if they belong to one of the lists chosen.
              </p>

              <Button 
                onClick={findDuplicates} 
                disabled={loading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "View Duplicates"
                )}
              </Button>
            </div>

            {hasSearched && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">LISTS</span>
                  <span className="font-medium">{selectedListId === "all" ? "All" : getListName(selectedListId)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">INTERNAL ONLY</span>
                  <span className="font-medium">{internalOnly ? "true" : "false"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">NUMBER OF DUPLICATES</span>
                  <span className="font-medium text-lg">{duplicateCount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Handle Duplicates in Bulk Section */}
          <div>
            <h2 className="text-xl font-light text-primary mb-4">Handle duplicates in bulk</h2>
            
            <div className="border-2 border-dashed border-border rounded-full p-8 space-y-4">
              <div className="space-y-2">
                <Label>Lists</Label>
                <Select value={bulkListId} onValueChange={setBulkListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}</SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground text-center">Leave empty for all lists.</p>
              </div>

              <div className="space-y-2">
                <Label>Dedupe Strategy</Label>
                <Select value={dedupeStrategy} onValueChange={setDedupeStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep_new">Dedupe only new and keep others</SelectItem>
                    <SelectItem value="keep_old">Keep oldest and delete others</SelectItem>
                    <SelectItem value="merge">Merge all duplicates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dedupe Method</Label>
                <Select value={dedupeMethod} onValueChange={setDedupeMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dry_run">Dry run (Test only - no changes made)</SelectItem>
                    <SelectItem value="execute">Execute (Apply changes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={runBulkDedupe}
                disabled={runningBulk || duplicateGroups.length === 0}
                className="bg-destructive hover:bg-destructive/90"
              >
                {runningBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  "Run"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Duplicate Groups List */}
        {duplicateGroups.length > 0 && (
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <DuplicateGroupCard 
                key={group.key} 
                group={group} 
                lists={lists}
                onKeep={handleKeepLead}
                onMerge={handleMergeLeads}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  lists: List[];
  onKeep: (group: DuplicateGroup, keepLeadId: string) => void;
  onMerge: (group: DuplicateGroup) => void;
}

function DuplicateGroupCard({ group, lists, onKeep, onMerge }: DuplicateGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentLead = group.leads[currentIndex];
  const data = (currentLead.data as Record<string, any>) || {};
  
  const getListName = (listId: string | null): string => {
    if (!listId) return "No list";
    const list = lists.find(l => l.id === listId);
    return list?.name || "Unknown list";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusBadge = (lead: Lead) => {
    const isNew = lead.status === "new";
    const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated <= 7) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Less</Badge>;
    } else if (daysSinceCreated <= 30) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Cold</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Old</Badge>;
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex">
        {/* Left side - Lead details */}
        <div className="flex-1 p-4 border-r border-border">
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(currentLead)}
            <Badge variant="secondary">{getListName(currentLead.list_id)}</Badge>
          </div>
          
          <h3 className="text-lg font-medium text-primary mb-1">
            {getLeadDisplayName(data)}
          </h3>
          
          <div className="space-y-1 text-sm">
            {getLeadPhone(data) && (
              <p className={group.matchType === "phone" || group.matchType === "both" ? "text-destructive font-medium" : ""}>
                +370 {getLeadPhone(data)}
              </p>
            )}
            
            {getMoketojoKodas(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Mokėtojo kodas</span>
                <span className={group.matchType === "mokėtojo_kodas" || group.matchType === "both" ? "text-destructive font-medium" : ""}>
                  {getMoketojoKodas(data)}
                </span>
              </div>
            )}
            
            {getLeadEmail(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Email</span>
                <span>{getLeadEmail(data)}</span>
              </div>
            )}
            
            {getLeadWebsite(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Svetainė</span>
                <a href={getLeadWebsite(data)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {getLeadWebsite(data)}
                </a>
              </div>
            )}
            
            {getLeadAddress(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Adresas</span>
                <span>{getLeadAddress(data)}</span>
              </div>
            )}
            
            {getLeadCategory(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Category</span>
                <span>{getLeadCategory(data)}</span>
              </div>
            )}
            
            {getLeadRemark(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Remark</span>
                <span>{getLeadRemark(data)}</span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm">
              <span className="font-medium text-destructive">Matching: </span>
              <span className="text-primary">
                {group.matchType === "phone" ? `Telefonas (${group.leads.length})` : 
                 group.matchType === "mokėtojo_kodas" ? `Mokėtojo kodas (${group.leads.length})` :
                 `Both (${group.leads.length})`}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created {formatDate(currentLead.created_at)}
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="w-64 p-4 flex flex-col justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Viewing {currentIndex + 1} of {group.leads.length} duplicates for this lead
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onKeep(group, currentLead.id)}
              title="Keep this lead, delete others"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMerge(group)}
              title="Merge all duplicates"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              title="Expand details"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            
            {group.leads.length > 1 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentIndex(prev => Math.min(group.leads.length - 1, prev + 1))}
                  disabled={currentIndex === group.leads.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Expanded view showing all duplicates */}
      {expanded && (
        <div className="border-t border-border p-4 bg-muted/50">
          <h4 className="font-medium mb-3">All duplicates in this group:</h4>
          <div className="grid gap-2">
            {group.leads.map((lead, idx) => {
              const leadData = (lead.data as Record<string, any>) || {};
              return (
                <div 
                  key={lead.id} 
                  className={`p-3 rounded border ${idx === currentIndex ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{getLeadDisplayName(leadData)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getLeadPhone(leadData)} • {getMoketojoKodas(leadData)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onKeep(group, lead.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Keep
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

