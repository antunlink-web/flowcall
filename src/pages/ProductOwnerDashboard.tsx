import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, FileText, BarChart3, Search, Eye, ExternalLink, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  created_at: string;
  user_count?: number;
  lead_count?: number;
  list_count?: number;
}

interface PendingTenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  created_at: string;
  owner_email?: string;
  owner_name?: string;
}

export default function ProductOwnerDashboard() {
  const { user } = useAuth();
  const { isProductOwner, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pendingTenants, setPendingTenants] = useState<PendingTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isProductOwner) {
      navigate("/");
    }
  }, [roleLoading, isProductOwner, navigate]);

  useEffect(() => {
    if (isProductOwner) {
      fetchTenants();
      fetchPendingTenants();
    }
  }, [isProductOwner]);

  const fetchPendingTenants = async () => {
    setPendingLoading(true);
    try {
      // Fetch pending tenants
      const { data: pendingData, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch owner info for each pending tenant
      const pendingWithOwners = await Promise.all(
        (pendingData || []).map(async (tenant) => {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("tenant_id", tenant.id)
            .limit(1);

          const owner = profiles?.[0];
          return {
            ...tenant,
            owner_email: owner?.email,
            owner_name: owner?.full_name,
          };
        })
      );

      setPendingTenants(pendingWithOwners);
    } catch (error) {
      console.error("Error fetching pending tenants:", error);
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) throw tenantsError;

      const tenantsWithStats = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { count: userCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

          const { count: leadCount } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

          const { count: listCount } = await supabase
            .from("lists")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

          return {
            ...tenant,
            user_count: userCount || 0,
            lead_count: leadCount || 0,
            list_count: listCount || 0,
          };
        })
      );

      setTenants(tenantsWithStats);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tenantId: string) => {
    setApprovingId(tenantId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("approve-tenant", {
        body: { tenantId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to approve tenant");
      }

      toast({
        title: "Tenant Approved",
        description: "The organization has been approved and the owner has been notified.",
      });

      // Refresh both lists
      fetchPendingTenants();
      fetchTenants();
    } catch (error: any) {
      console.error("Error approving tenant:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve tenant",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (tenantId: string) => {
    setRejectingId(tenantId);
    try {
      // Delete profiles first (due to FK constraints)
      await supabase
        .from("profiles")
        .delete()
        .eq("tenant_id", tenantId);

      // Delete the tenant
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);

      if (error) throw error;

      toast({
        title: "Tenant Rejected",
        description: "The registration has been rejected and removed.",
      });

      // Refresh both lists
      fetchPendingTenants();
      fetchTenants();
    } catch (error: any) {
      console.error("Error rejecting tenant:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject tenant",
        variant: "destructive",
      });
    } finally {
      setRejectingId(null);
    }
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTenants = filteredTenants.filter(t => t.status === "active");

  const totalStats = {
    tenants: tenants.filter(t => t.status === "active").length,
    pending: pendingTenants.length,
    users: tenants.reduce((sum, t) => sum + (t.user_count || 0), 0),
    leads: tenants.reduce((sum, t) => sum + (t.lead_count || 0), 0),
    lists: tenants.reduce((sum, t) => sum + (t.list_count || 0), 0),
  };

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

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isProductOwner) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{totalStats.tenants}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={pendingTenants.length > 0 ? "border-yellow-500/50 bg-yellow-500/5" : ""}>
            <CardHeader className="pb-2">
              <CardDescription>Pending Approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{totalStats.pending}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{totalStats.users}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{totalStats.leads.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Lists</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">{totalStats.lists}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue={pendingTenants.length > 0 ? "pending" : "all"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending Approvals
              {pendingTenants.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingTenants.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Organizations</TabsTrigger>
          </TabsList>

          {/* Pending Approvals Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      Pending Registrations
                    </CardTitle>
                    <CardDescription>Review and approve new organization registrations</CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchPendingTenants}>
                    <RefreshCw className={`w-4 h-4 ${pendingLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Subdomain</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : pendingTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <span>No pending registrations</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingTenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {tenant.subdomain}.flowcall.eu
                            </code>
                          </TableCell>
                          <TableCell>{tenant.owner_name || "-"}</TableCell>
                          <TableCell>{tenant.owner_email || "-"}</TableCell>
                          <TableCell>{format(new Date(tenant.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(tenant.id)}
                                disabled={approvingId === tenant.id || rejectingId === tenant.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {approvingId === tenant.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(tenant.id)}
                                disabled={approvingId === tenant.id || rejectingId === tenant.id}
                              >
                                {rejectingId === tenant.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Organizations Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>Manage all registered organizations</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchTenants}>
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Subdomain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Lists</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No organizations match your search" : "No organizations registered yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {tenant.subdomain}.flowcall.eu
                            </code>
                          </TableCell>
                          <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                          <TableCell className="text-right">{tenant.user_count}</TableCell>
                          <TableCell className="text-right">{tenant.lead_count?.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{tenant.list_count}</TableCell>
                          <TableCell>{format(new Date(tenant.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedTenant(tenant)}
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`https://${tenant.subdomain}.flowcall.eu`, "_blank")}
                                title="Open subdomain"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
