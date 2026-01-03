import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Lead, Campaign, LeadStatus } from "@/types/crm";
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const { user } = useAuth();
  const { isAdminOrManager } = useUserRole();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    phone: "",
    email: "",
    notes: "",
    status: "new" as LeadStatus,
    campaign_id: "",
  });

  const fetchData = async () => {
    setLoading(true);

    const [{ data: leadData }, { data: campaignData }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("*"),
    ]);

    setLeads((leadData as Lead[]) || []);
    setCampaigns((campaignData as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (lead.phone?.includes(searchQuery) ?? false);

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesCampaign =
      campaignFilter === "all" || lead.campaign_id === campaignFilter;

    return matchesSearch && matchesStatus && matchesCampaign;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name || null,
      company: formData.company || null,
      phone: formData.phone || null,
      email: formData.email || null,
      notes: formData.notes || null,
      status: formData.status,
      campaign_id: formData.campaign_id || null,
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
    setFormData({
      first_name: "",
      last_name: "",
      company: "",
      phone: "",
      email: "",
      notes: "",
      status: "new",
      campaign_id: "",
    });
  };

  const handleEdit = (lead: Lead) => {
    setFormData({
      first_name: lead.first_name,
      last_name: lead.last_name || "",
      company: lead.company || "",
      phone: lead.phone || "",
      email: lead.email || "",
      notes: lead.notes || "",
      status: lead.status,
      campaign_id: lead.campaign_id || "",
    });
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
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const newLeads = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const lead: Record<string, string> = {};
        headers.forEach((header, idx) => {
          lead[header] = values[idx] || "";
        });

        if (lead.first_name || lead.firstname) {
          newLeads.push({
            first_name: lead.first_name || lead.firstname,
            last_name: lead.last_name || lead.lastname || null,
            company: lead.company || null,
            phone: lead.phone || lead.telephone || null,
            email: lead.email || null,
            notes: lead.notes || null,
          });
        }
      }

      if (newLeads.length > 0) {
        const { error } = await supabase.from("leads").insert(newLeads);
        if (error) {
          toast({ title: "Import failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: `Imported ${newLeads.length} leads` });
          fetchData();
        }
      }

      setShowImportDialog(false);
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
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
                    Upload a CSV file with columns: first_name, last_name, company, phone, email, notes
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) =>
                          setFormData({ ...formData, status: v as LeadStatus })
                        }
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
                        value={formData.campaign_id}
                        onValueChange={(v) =>
                          setFormData({ ...formData, campaign_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full">
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
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.company || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}