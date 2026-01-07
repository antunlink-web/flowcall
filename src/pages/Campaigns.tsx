import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Campaign } from "@/types/crm";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Loader2, Play, Pause } from "lucide-react";

type CampaignStatus = "active" | "paused" | "completed";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<(Campaign & { lead_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { user } = useAuth();
  const { isAdminOrManager } = useUserRole();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as CampaignStatus,
  });

  const fetchData = async () => {
    setLoading(true);

    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    // Get lead counts for each campaign
    const campaignsWithCounts = await Promise.all(
      (campaignData || []).map(async (campaign) => {
        const { count } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id);
        return { ...campaign, lead_count: count || 0 };
      })
    );

    setCampaigns(campaignsWithCounts as (Campaign & { lead_count?: number })[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      description: formData.description || null,
      status: formData.status,
      created_by: user?.id,
    };

    if (editingCampaign) {
      const { error } = await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", editingCampaign.id);

      if (error) {
        toast({ title: "Failed to update campaign", variant: "destructive" });
        return;
      }
      toast({ title: "Campaign updated" });
    } else {
      const { error } = await supabase.from("campaigns").insert(payload);

      if (error) {
        toast({ title: "Failed to create campaign", variant: "destructive" });
        return;
      }
      toast({ title: "Campaign created" });
    }

    setShowDialog(false);
    setEditingCampaign(null);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", status: "active" });
  };

  const handleEdit = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      status: campaign.status as CampaignStatus,
    });
    setEditingCampaign(campaign);
    setShowDialog(true);
  };

  const handleDelete = async (campaignId: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);

    if (error) {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
      return;
    }

    toast({ title: "Campaign deleted" });
    fetchData();
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await supabase.from("campaigns").update({ status: newStatus }).eq("id", campaign.id);
    toast({ title: `Campaign ${newStatus}` });
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/15 text-success border-success/30">Active</Badge>;
      case "paused":
        return <Badge className="bg-warning/15 text-warning border-warning/30">Paused</Badge>;
      case "completed":
        return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
      default:
        return null;
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Campaigns</h1>
            <p className="text-muted-foreground">{campaigns.length} campaigns</p>
          </div>
          {isAdminOrManager && (
            <Dialog
              open={showDialog}
              onOpenChange={(open) => {
                setShowDialog(open);
                if (!open) {
                  setEditingCampaign(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCampaign ? "Edit Campaign" : "Create Campaign"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        setFormData({ ...formData, status: v as CampaignStatus })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCampaign ? "Update" : "Create"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Campaign Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                  </div>
                  {isAdminOrManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                          {campaign.status === "active" ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(campaign.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {campaign.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{campaign.lead_count || 0} leads</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <Card className="col-span-full text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">No campaigns yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}