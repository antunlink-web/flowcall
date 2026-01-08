import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadDetailView } from "@/components/leads/LeadDetailView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Lead, Campaign, LeadStatus, getLeadDisplayName, getLeadPhone, getLeadEmail, getLeadCompany } from "@/types/crm";
import {
  Plus,
  Search,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";

const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "callback",
  "won",
  "lost",
  "archived",
];

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedLeadId = searchParams.get("id");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [csvFields, setCsvFields] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = useState<LeadStatus>("new");
  const [formCampaignId, setFormCampaignId] = useState("");
  const [newFieldName, setNewFieldName] = useState("");
  
  const { user } = useAuth();
  const { isAdminOrManager } = useUserRole();
  const { toast } = useToast();

  const fetchData = async (search?: string) => {
    setLoading(true);

    let leadsResult;
    
    if (search && search.trim()) {
      // Use RPC function for searching JSONB data
      console.log("Searching with RPC:", search.trim());
      const { data, error } = await supabase.rpc("search_leads", { search_term: search.trim() });
      console.log("RPC result:", { data, error });
      leadsResult = data;
    } else {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      leadsResult = data;
    }

    const { data: campaignData } = await supabase.from("campaigns").select("*");

    setLeads((leadsResult as Lead[]) || []);
    setCampaigns((campaignData as Campaign[]) || []);
    setLoading(false);
  };

  // Debounced search
  useEffect(() => {
    if (!user) return;
    
    const timer = setTimeout(() => {
      fetchData(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [user, searchQuery]);

  // Derive available fields from all leads
  const allFields = Array.from(
    new Set(leads.flatMap((lead) => Object.keys(lead.data || {})))
  ).sort();

  // If a lead is selected via query param, show the detail view
  if (selectedLeadId) {
    return (
      <DashboardLayout>
        <LeadDetailView
          leadId={selectedLeadId}
          onClose={() => {
            setSearchParams({});
          }}
        />
      </DashboardLayout>
    );
  }

  // Apply local filters (status, campaign) on fetched leads
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesCampaign =
      campaignFilter === "all" || lead.campaign_id === campaignFilter;

    return matchesStatus && matchesCampaign;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      data: formData,
      status: formStatus,
      campaign_id: formCampaignId || null,
    };

    if (editingLead) {
      const { error } = await supabase
        .from("leads")
        .update(payload)
        .eq("id", editingLead.id);

      if (error) {
        toast({ title: "Failed to update lead", variant: "destructive" });
        return;
      }
      toast({ title: "Lead updated" });
    } else {
      const { error } = await supabase.from("leads").insert(payload);

      if (error) {
        toast({ title: "Failed to create lead", variant: "destructive" });
        return;
      }
      toast({ title: "Lead created" });
    }

    setShowAddDialog(false);
    setEditingLead(null);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({});
    setFormStatus("new");
    setFormCampaignId("");
  };

  const handleEdit = (lead: Lead) => {
    const data: Record<string, string> = {};
    Object.entries(lead.data || {}).forEach(([key, value]) => {
      data[key] = String(value ?? "");
    });
    setFormData(data);
    setFormStatus(lead.status);
    setFormCampaignId(lead.campaign_id || "");
    setEditingLead(lead);
    setShowAddDialog(true);
  };

  const handleDelete = async (leadId: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", leadId);

    if (error) {
      toast({ title: "Failed to delete lead", variant: "destructive" });
      return;
    }

    toast({ title: "Lead deleted" });
    fetchData();
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      // Store detected fields
      setCsvFields(headers);

      const newLeads = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const data: Record<string, string> = {};
        headers.forEach((header, idx) => {
          if (values[idx]) {
            data[header] = values[idx];
          }
        });

        if (Object.keys(data).length > 0) {
          newLeads.push({ data });
        }
      }

      if (newLeads.length > 0) {
        const { error } = await supabase.from("leads").insert(newLeads);
        if (error) {
          toast({ title: "Import failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: `Imported ${newLeads.length} leads with ${headers.length} fields` });
          fetchData();
        }
      }

      setShowImportDialog(false);
    };
    reader.readAsText(file);
  };

  // Dynamic field management
  const addField = () => {
    if (newFieldName && !Object.keys(formData).includes(newFieldName)) {
      setFormData({ ...formData, [newFieldName]: "" });
      setNewFieldName("");
    }
  };

  const removeField = (field: string) => {
    const { [field]: _, ...rest } = formData;
    setFormData(rest);
  };

  // Determine which fields to show in table (first 4 + status)
  const displayFields = allFields.slice(0, 4);

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
            <h1 className="text-2xl font-display font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">{leads.length} total leads</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Leads from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Upload any CSV file. The column headers will become field names for your leads.
                  </p>
                  <Input type="file" accept=".csv" onChange={handleCsvImport} />
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showAddDialog}
              onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) {
                  setEditingLead(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  {/* Dynamic Fields */}
                  {Object.entries(formData).map(([field, value]) => (
                    <div key={field} className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="capitalize">{field.replace(/_/g, " ")}</Label>
                        <Input
                          value={value}
                          onChange={(e) =>
                            setFormData({ ...formData, [field]: e.target.value })
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(field)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Add New Field */}
                  <div className="flex items-end gap-2 pt-2 border-t">
                    <div className="flex-1 space-y-2">
                      <Label>Add Field</Label>
                      <Input
                        placeholder="Field name (e.g., phone, company)"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addField();
                          }
                        }}
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={addField}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Quick add common fields */}
                  {Object.keys(formData).length === 0 && (
                    <div className="flex flex-wrap gap-2">
                      {["name", "phone", "email", "company", "notes"].map((field) => (
                        <Button
                          key={field}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, [field]: "" })}
                        >
                          + {field}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formStatus}
                        onValueChange={(v) => setFormStatus(v as LeadStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {leadStatuses.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Campaign</Label>
                      <Select
                        value={formCampaignId || "none"}
                        onValueChange={(v) => setFormCampaignId(v === "none" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={Object.keys(formData).length === 0}>
                    {editingLead ? "Update Lead" : "Create Lead"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {leadStatuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
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
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {displayFields.map((field) => (
                    <TableHead key={field} className="capitalize">
                      {field.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    {displayFields.map((field) => (
                      <TableCell key={field}>
                        {field === "phone" ? (
                          <a
                            href={`tel:${lead.data?.[field]}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {String(lead.data?.[field] || "-")}
                          </a>
                        ) : field === "email" ? (
                          <a
                            href={`mailto:${lead.data?.[field]}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {String(lead.data?.[field] || "-")}
                          </a>
                        ) : (
                          String(lead.data?.[field] || "-")
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>{lead.call_attempts}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(lead)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {isAdminOrManager && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(lead.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={displayFields.length + 3}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No leads found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}