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
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, FileText, BarChart3, Search, Eye, ExternalLink, RefreshCw } from "lucide-react";
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

interface TenantStats {
  tenant_id: string;
  user_count: number;
  lead_count: number;
  list_count: number;
}

export default function ProductOwnerDashboard() {
  const { user } = useAuth();
  const { isProductOwner, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!roleLoading && !isProductOwner) {
      navigate("/");
    }
  }, [roleLoading, isProductOwner, navigate]);

  useEffect(() => {
    if (isProductOwner) {
      fetchTenants();
    }
  }, [isProductOwner]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      // Fetch all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch stats for each tenant
      const tenantsWithStats = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          // Get user count
          const { count: userCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

          // Get lead count
          const { count: leadCount } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

          // Get list count
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

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStats = {
    tenants: tenants.length,
    users: tenants.reduce((sum, t) => sum + (t.user_count || 0), 0),
    leads: tenants.reduce((sum, t) => sum + (t.lead_count || 0), 0),
    lists: tenants.reduce((sum, t) => sum + (t.list_count || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "trial":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Trial</Badge>;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{totalStats.tenants}</span>
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

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organizations</CardTitle>
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

        {/* Tenant Detail Modal/Card could be added here */}
      </div>
    </DashboardLayout>
  );
}
