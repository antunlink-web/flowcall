import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, FileText, BarChart3, Trash2, Save, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  created_at: string;
  max_seats?: number | null;
  seat_count?: number;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  user_count?: number;
  lead_count?: number;
  list_count?: number;
}

interface TenantProfile {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
}

interface TenantDetailDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function TenantDetailDialog({ tenant, open, onOpenChange, onUpdated }: TenantDetailDialogProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState<TenantProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMaxSeats, setEditMaxSeats] = useState<string>("");

  useEffect(() => {
    if (tenant && open) {
      setEditName(tenant.name);
      setEditStatus(tenant.status);
      setEditMaxSeats(tenant.max_seats?.toString() || "");
      setEditing(false);
      fetchUsers(tenant.id);
    }
  }, [tenant, open]);

  const fetchUsers = async (tenantId: string) => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        name: editName,
        status: editStatus,
      };
      if (editMaxSeats) {
        updates.max_seats = parseInt(editMaxSeats, 10);
      } else {
        updates.max_seats = null;
      }

      const { error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", tenant.id);

      if (error) throw error;

      toast({ title: "Organization updated", description: `${editName} has been updated.` });
      setEditing(false);
      onUpdated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant) return;
    setDeleting(true);
    try {
      const response = await supabase.functions.invoke("delete-tenant", {
        body: { tenantId: tenant.id },
      });

      if (response.error) throw new Error(response.error.message || "Failed to delete tenant");
      const data = response.data;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Organization deleted", description: `${tenant.name} has been permanently removed.` });
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      toast({ title: "Error", description: error.message || "Failed to delete organization", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!tenant) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "trial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {editing ? "Edit Organization" : tenant.name}
          </DialogTitle>
          <DialogDescription>
            <code className="text-sm bg-muted px-2 py-0.5 rounded">{tenant.subdomain}.flowcall.eu</code>
            <span className="ml-2">{getStatusBadge(tenant.status)}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Organization Name</Label>
                  <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-seats">Max Seats (empty = unlimited)</Label>
                  <Input
                    id="edit-seats"
                    type="number"
                    value={editMaxSeats}
                    onChange={(e) => setEditMaxSeats(e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <p className="font-medium">{tenant.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Subdomain</span>
                  <p className="font-medium">{tenant.subdomain}.flowcall.eu</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>{getStatusBadge(tenant.status)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Seats</span>
                  <p className="font-medium">{tenant.max_seats ?? "Unlimited"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{format(new Date(tenant.created_at), "MMM d, yyyy HH:mm")}</p>
                </div>
                {tenant.trial_end_date && (
                  <div>
                    <span className="text-muted-foreground">Trial Ends</span>
                    <p className="font-medium">{format(new Date(tenant.trial_end_date), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{u.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-4 rounded-lg border">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{tenant.user_count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-4 rounded-lg border">
                <FileText className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{(tenant.lead_count ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-4 rounded-lg border">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{tenant.list_count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Lists</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between sm:justify-between mt-4 gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {tenant.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the organization, all its users, leads, lists, and associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
