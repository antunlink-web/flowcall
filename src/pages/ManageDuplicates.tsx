import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ListField } from "@/hooks/useLists";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
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
  fields: ListField[];
}

interface DuplicateGroup {
  key: string;
  matchFields: string[];
  matchValue: string;
  leads: Lead[];
}

// Normalize value for comparison based on field type
const normalizeValue = (value: string, fieldName: string): string => {
  if (!value) return "";
  const lowerName = fieldName.toLowerCase();
  
  // Phone normalization
  if (lowerName.includes("phone") || lowerName.includes("tel") || lowerName.includes("mobile") || lowerName.includes("mobilus")) {
    return value.replace(/[\s\-\(\)\+]/g, "").replace(/^00/, "").replace(/^370/, "");
  }
  
  // Email normalization (lowercase)
  if (lowerName.includes("email") || lowerName.includes("mail")) {
    return value.toLowerCase().trim();
  }
  
  // Default: trim and lowercase for comparison
  return String(value).toLowerCase().trim();
};

// Get display name for lead
const getLeadDisplayName = (data: Record<string, any>): string => {
  return data.company || data.name || data.pavadinimas || data.įmonė || data.imone || 
         data.first_name || data.firstname || "Unknown";
};

// Get lead email
const getLeadEmail = (data: Record<string, any>): string => {
  return data.email || data.el_pastas || data["el. paštas"] || "";
};

// Get lead phone
const getLeadPhone = (data: Record<string, any>): string => {
  return data.phone || data.telefonas || data.tel || data.mobile || data.mobilus || "";
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
  
  // Field selection for deduplication
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Bulk handling states
  const [bulkListId, setBulkListId] = useState<string>("all");
  const [dedupeStrategy, setDedupeStrategy] = useState("keep_new");
  const [dedupeMethod, setDedupeMethod] = useState("dry_run");
  const [runningBulk, setRunningBulk] = useState(false);

  // Get all unique fields across all lists or from selected list
  const availableFields = useMemo(() => {
    const fieldSet = new Map<string, ListField>();
    
    const listsToCheck = selectedListId === "all" 
      ? lists 
      : lists.filter(l => l.id === selectedListId);
    
    listsToCheck.forEach(list => {
      if (list.fields && Array.isArray(list.fields)) {
        list.fields.forEach(field => {
          if (!fieldSet.has(field.name)) {
            fieldSet.set(field.name, field);
          }
        });
      }
    });
    
    return Array.from(fieldSet.values());
  }, [lists, selectedListId]);

  useEffect(() => {
    fetchLists();
  }, []);

  // Reset selected fields when list changes
  useEffect(() => {
    setSelectedFields([]);
  }, [selectedListId]);

  const fetchLists = async () => {
    const { data, error } = await supabase
      .from("lists")
      .select("id, name, fields")
      .eq("status", "active");
    
    if (!error && data) {
      setLists(data.map(list => ({
        ...list,
        fields: (list.fields as unknown as ListField[]) || []
      })));
    }
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldName) 
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const findDuplicates = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to compare");
      return;
    }

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

      // Group leads by the combination of selected fields
      const groups: Record<string, Lead[]> = {};

      leads.forEach((lead) => {
        const data = (lead.data as Record<string, any>) || {};
        
        // Create a composite key from all selected fields
        const keyParts: string[] = [];
        selectedFields.forEach(fieldName => {
          const value = data[fieldName];
          if (value) {
            const normalized = normalizeValue(String(value), fieldName);
            if (normalized.length >= 2) { // Minimum length to avoid false positives
              keyParts.push(`${fieldName}:${normalized}`);
            }
          }
        });
        
        // Only group if we have at least one valid field value
        if (keyParts.length > 0) {
          const key = keyParts.join("|");
          if (!groups[key]) groups[key] = [];
          groups[key].push(lead as Lead);
        }
      });

      // Filter to only groups with duplicates
      const duplicates: DuplicateGroup[] = [];

      Object.entries(groups).forEach(([key, groupLeads]) => {
        if (groupLeads.length > 1) {
          // Check if internal only filter applies
          if (internalOnly && selectedListId !== "all") {
            const allInSelectedList = groupLeads.every(l => l.list_id === selectedListId);
            if (!allInSelectedList) return;
          }
          
          // Extract the display value for the match
          const firstLead = groupLeads[0];
          const data = (firstLead.data as Record<string, any>) || {};
          const matchValues = selectedFields
            .map(f => data[f])
            .filter(Boolean)
            .join(", ");
          
          duplicates.push({
            key,
            matchFields: selectedFields,
            matchValue: matchValues || key,
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
          const [_keep, ...remove] = sorted;
          for (const lead of remove) {
            await supabase.from("leads").delete().eq("id", lead.id);
          }
        } else if (dedupeStrategy === "keep_old") {
          // Keep oldest, delete others
          const sorted = [...group.leads].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const [_keep, ...remove] = sorted;
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

              {/* Field Selection for Deduplication */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Label>Fields to compare</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select which fields should be used to identify duplicates.
                </p>
                {availableFields.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-md bg-background">
                    {availableFields.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`field-${field.id}`}
                          checked={selectedFields.includes(field.name)}
                          onCheckedChange={() => toggleField(field.name)}
                        />
                        <Label 
                          htmlFor={`field-${field.id}`}
                          className="text-sm cursor-pointer flex items-center gap-1"
                        >
                          {field.name}
                          <Badge variant="outline" className="text-xs ml-1">
                            {field.type === "Phone" ? "📞" : 
                             field.type === "E-mail" ? "📧" : 
                             field.type === "Number" ? "#" : "Aa"}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {selectedListId === "all" 
                      ? "Select a list to see available fields, or no lists have fields defined."
                      : "No fields defined for this list."}
                  </p>
                )}
                {selectedFields.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedFields.map(field => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

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
              <p className={group.matchFields.some(f => f.toLowerCase().includes("phone") || f.toLowerCase().includes("tel")) ? "text-destructive font-medium" : ""}>
                +370 {getLeadPhone(data)}
              </p>
            )}
            
            {getLeadEmail(data) && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Email</span>
                <span className={group.matchFields.some(f => f.toLowerCase().includes("email") || f.toLowerCase().includes("mail")) ? "text-destructive font-medium" : ""}>
                  {getLeadEmail(data)}
                </span>
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
              <span className="font-medium text-destructive">Matching fields: </span>
              <span className="text-primary">
                {group.matchFields.join(", ")} ({group.leads.length} duplicates)
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
                        {getLeadPhone(leadData)} {getLeadEmail(leadData) && `• ${getLeadEmail(leadData)}`}
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

