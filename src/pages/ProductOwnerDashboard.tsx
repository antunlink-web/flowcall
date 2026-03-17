import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperatorAnalytics, OrgAnalytics } from "@/hooks/useOperatorAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { TenantDetailDialog } from "@/components/admin/TenantDetailDialog";
import { CreateTenantDialog } from "@/components/admin/CreateTenantDialog";
import { SmtpSettingsPanel } from "@/components/admin/SmtpSettingsPanel";
import { format, formatDistanceToNow } from "date-fns";
import {
  RefreshCw, Plus, Search, Eye, AlertTriangle, TrendingUp,
  DollarSign, Activity, Shield, Zap, Users, Phone,
  ArrowUpRight, Clock, Flame, LogOut, Mail, ChevronDown, ChevronUp,
} from "lucide-react";

function StatCard({ label, value, icon: Icon, color = "text-muted-foreground", alert = false, hint }: {
  label: string; value: string | number; icon: any; color?: string; alert?: boolean; hint?: string;
}) {
  const hasData = value !== 0 && value !== "0" && value !== "N/A";
  return (
    <div className={`rounded-lg border p-3 ${alert ? "border-red-500/50 bg-red-500/5" : "border-border/50 bg-card/50"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${alert ? "text-red-400" : color}`} />
      </div>
      {hasData ? (
        <span className={`text-xl font-bold tabular-nums ${alert ? "text-red-400" : "text-foreground"}`}>{value}</span>
      ) : (
        <span className="text-xs text-muted-foreground/60 italic">{hint || "No data yet"}</span>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const config = {
    high: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "HIGH" },
    medium: { cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "MED" },
    low: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "LOW" },
  };
  const c = config[level as keyof typeof config] || config.low;
  return <Badge className={`${c.cls} text-[10px] font-bold px-1.5 py-0`}>{c.label}</Badge>;
}

function PlanBadge({ status, trialEnd }: { status: string; trialEnd: string | null }) {
  const configs: Record<string, { cls: string; label: string }> = {
    unlimited: { cls: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: "FREE" },
    trial: { cls: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "TRIAL" },
    expired: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "EXPIRED" },
    active: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "ACTIVE" },
  };
  const c = configs[status] || configs.active;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge className={`${c.cls} text-[10px] font-bold px-1.5 py-0`}>{c.label}</Badge>
      {status === "trial" && trialEnd && (
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(trialEnd), { addSuffix: true })}
        </span>
      )}
    </div>
  );
}

function TimeAgo({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground/50 text-xs">Never</span>;
  const d = new Date(date);
  const hoursAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  const color = hoursAgo > 48 ? "text-red-400" : hoursAgo > 24 ? "text-yellow-400" : "text-emerald-400";
  return <span className={`text-xs ${color}`}>{formatDistanceToNow(d, { addSuffix: true })}</span>;
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
    </div>
  );
}

export default function ProductOwnerDashboard() {
  const { isProductOwner, loading: roleLoading } = useUserRole();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  
  const { stats, orgs, loading, refetch } = useOperatorAnalytics();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSmtp, setShowSmtp] = useState(false);
  const [sortField, setSortField] = useState<string>("calls_7d");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isProductOwner) navigate("/");
  }, [roleLoading, isProductOwner, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (roleLoading || !isProductOwner) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredOrgs = orgs
    .filter(o => !searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.subdomain.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField as keyof OrgAnalytics];
      const bv = b[sortField as keyof OrgAnalytics];
      const mult = sortAsc ? 1 : -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
      return String(av || "").localeCompare(String(bv || "")) * mult;
    });

  const churnOrgs = orgs.filter(o => o.risk_level === "high" || o.risk_level === "medium").sort((a, b) => {
    if (a.risk_level === "high" && b.risk_level !== "high") return -1;
    if (a.risk_level !== "high" && b.risk_level === "high") return 1;
    return a.calls_7d - b.calls_7d;
  });

  const powerOrgs = [...orgs].sort((a, b) => b.calls_today - a.calls_today).filter(o => o.calls_today > 0).slice(0, 5);

  const totalActiveOrgs = orgs.filter(o => o.status === "active").length;
  
  const avgCalls = totalActiveOrgs > 0 ? Math.round((stats?.total_calls_7d || 0) / totalActiveOrgs) : 0;
  const medianCalls = (() => {
    const sorted = orgs.map(o => o.calls_7d).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  })();
  const pctActiveUsers = stats && stats.total_users > 0 ? Math.round((stats.total_active_users_7d / stats.total_users) * 100) : 0;
  const callsPerUser = stats && stats.total_active_users_7d > 0 ? Math.round(stats.total_calls_7d / stats.total_active_users_7d) : 0;

  // MRR estimation: Basic €12/seat, assume all seats are Basic for now
  const estimatedMRR = (stats?.total_seats || 0) * 12;

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm tracking-wide">OPERATOR CONTROL CENTER</span>
            <span className="text-[10px] text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">
              {format(new Date(), "EEE, MMM d · HH:mm")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="text-xs gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSmtp(!showSmtp)} className="text-xs gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              SMTP
            </Button>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-[1600px] mx-auto space-y-5">
        {/* SMTP Panel (collapsible) */}
        {showSmtp && (
          <Card className="bg-card/30 border-border/30">
            <CardContent className="pt-4"><SmtpSettingsPanel /></CardContent>
          </Card>
        )}

        {/* ROW 1: TODAY + MONEY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* TODAY PANEL */}
          <div>
            <SectionHeader title="Today" icon={Zap} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatCard label="New Signups" value={stats?.signups_today ?? 0} icon={ArrowUpRight} color="text-blue-400" hint="No new signups today" />
              <StatCard label="Trials Expiring Today" value={stats?.trials_expiring_today ?? 0} icon={Clock} alert={(stats?.trials_expiring_today ?? 0) > 0} hint="No trials expiring today" />
              <StatCard label="Expiring Tomorrow" value={stats?.trials_expiring_tomorrow ?? 0} icon={Clock} color="text-yellow-400" hint="None expiring tomorrow" />
              <StatCard label="Inactive 48h" value={stats?.inactive_orgs_48h ?? 0} icon={AlertTriangle} alert={(stats?.inactive_orgs_48h ?? 0) > 0} hint="All orgs active" />
              <StatCard label="Failed Calls Today" value={stats?.failed_calls_today ?? 0} icon={Phone} alert={(stats?.failed_calls_today ?? 0) > 0} hint="No failed calls" />
              <StatCard label="Total Calls Today" value={stats?.total_calls_today ?? 0} icon={Phone} color="text-emerald-400" hint="No calls yet today" />
            </div>
          </div>

          {/* MONEY PANEL */}
          <div>
            <SectionHeader title="Revenue" icon={DollarSign} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatCard label="Active Orgs" value={stats?.total_active_orgs ?? 0} icon={Users} color="text-emerald-400" hint="No active orgs" />
              <StatCard label="Total Seats" value={stats?.total_seats ?? 0} icon={Users} color="text-blue-400" hint="No seats" />
              <StatCard label="Est. MRR" value={estimatedMRR > 0 ? `€${estimatedMRR}` : 0} icon={DollarSign} color="text-emerald-400" hint="No revenue yet" />
              <StatCard label="Product Health" value={`${pctActiveUsers}%`} icon={Activity} color="text-blue-400" hint="Need user activity" />
              <StatCard label="Avg Calls/Org (7d)" value={avgCalls} icon={TrendingUp} color="text-purple-400" hint="No call data" />
              <StatCard label="Calls/User (7d)" value={callsPerUser} icon={TrendingUp} color="text-purple-400" hint="No call data" />
            </div>
          </div>
        </div>

        {/* ROW 2: CHURN RADAR + POWER USERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CHURN RADAR */}
          <div className="lg:col-span-2">
            <SectionHeader title="Churn Radar" icon={AlertTriangle} />
            <Card className="bg-card/30 border-border/30">
              <CardContent className="p-0">
                {churnOrgs.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground/60 text-sm">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                    All organizations look healthy — no churn signals detected.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="text-[11px]">Organization</TableHead>
                        <TableHead className="text-[11px]">Last Activity</TableHead>
                        <TableHead className="text-[11px] text-right">Calls 7d</TableHead>
                        <TableHead className="text-[11px] text-right">Users</TableHead>
                        <TableHead className="text-[11px]">Risk</TableHead>
                        <TableHead className="text-[11px]">Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {churnOrgs.map(org => (
                        <TableRow key={org.id} className="border-border/20 cursor-pointer hover:bg-muted/10" onClick={() => setSelectedTenant(org)}>
                          <TableCell className="font-medium text-xs py-2">{org.name}</TableCell>
                          <TableCell className="py-2"><TimeAgo date={org.last_activity} /></TableCell>
                          <TableCell className="text-right text-xs py-2 tabular-nums">{org.calls_7d}</TableCell>
                          <TableCell className="text-right text-xs py-2 tabular-nums">{org.user_count}</TableCell>
                          <TableCell className="py-2"><RiskBadge level={org.risk_level} /></TableCell>
                          <TableCell className="py-2"><PlanBadge status={org.plan_status} trialEnd={org.trial_end_date} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* POWER USERS + SYSTEM STATUS */}
          <div className="space-y-4">
            <div>
              <SectionHeader title="Power Users" icon={Flame} />
              <Card className="bg-card/30 border-border/30">
                <CardContent className="p-3">
                  {powerOrgs.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-3">No call activity today yet — check back later.</p>
                  ) : (
                    <div className="space-y-2">
                      {powerOrgs.map((org, i) => (
                        <div key={org.id} className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/10 rounded px-2 py-1.5 -mx-2" onClick={() => setSelectedTenant(org)}>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-4">{i + 1}.</span>
                            <span className="font-medium">{org.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums font-bold text-emerald-400">{org.calls_today}</span>
                            <span className="text-muted-foreground">calls</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <SectionHeader title="System Status" icon={Activity} />
              <Card className="bg-card/30 border-border/30">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Call Success Rate (7d)</span>
                    <span className={`font-bold tabular-nums ${(stats?.call_success_rate_7d ?? 0) > 80 ? "text-emerald-400" : (stats?.call_success_rate_7d ?? 0) > 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {stats?.total_calls_7d ? `${stats.call_success_rate_7d}%` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">SMS Sent (7d)</span>
                    <span className="font-bold tabular-nums">{stats?.sms_total_7d ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Disconnected Devices</span>
                    <span className={`font-bold tabular-nums ${(stats?.device_issues ?? 0) > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                      {stats?.device_issues ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Median Calls/Org (7d)</span>
                    <span className="font-bold tabular-nums">{medianCalls}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ROW 3: ORGANIZATION TABLE */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="All Organizations" icon={Users} />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="text-xs gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" />
                Create Org
              </Button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48 h-8 text-xs bg-card/30 border-border/30"
                />
              </div>
            </div>
          </div>

          <Card className="bg-card/30 border-border/30">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredOrgs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground/60 text-sm">
                  {searchQuery ? "No organizations match your search." : "No organizations yet — create one to get started."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="text-[11px] cursor-pointer" onClick={() => toggleSort("name")}>Organization <SortIcon field="name" /></TableHead>
                        <TableHead className="text-[11px]">Plan</TableHead>
                        <TableHead className="text-[11px] cursor-pointer" onClick={() => toggleSort("last_activity")}>Last Activity <SortIcon field="last_activity" /></TableHead>
                        <TableHead className="text-[11px] text-right cursor-pointer" onClick={() => toggleSort("calls_today")}>Today <SortIcon field="calls_today" /></TableHead>
                        <TableHead className="text-[11px] text-right cursor-pointer" onClick={() => toggleSort("calls_7d")}>7d Calls <SortIcon field="calls_7d" /></TableHead>
                        <TableHead className="text-[11px] text-right cursor-pointer" onClick={() => toggleSort("user_count")}>Users <SortIcon field="user_count" /></TableHead>
                        <TableHead className="text-[11px] text-right cursor-pointer" onClick={() => toggleSort("lead_count")}>Leads <SortIcon field="lead_count" /></TableHead>
                        <TableHead className="text-[11px]">Risk</TableHead>
                        <TableHead className="text-[11px]">Trial End</TableHead>
                        <TableHead className="text-[11px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrgs.map(org => (
                        <TableRow key={org.id} className="border-border/20 hover:bg-muted/10">
                          <TableCell className="font-medium text-xs py-2">
                            <div>
                              <span>{org.name}</span>
                              <span className="block text-[10px] text-muted-foreground">/{org.subdomain}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2"><PlanBadge status={org.plan_status} trialEnd={org.trial_end_date} /></TableCell>
                          <TableCell className="py-2"><TimeAgo date={org.last_activity} /></TableCell>
                          <TableCell className="text-right text-xs py-2 tabular-nums">{org.calls_today || <span className="text-muted-foreground/40">—</span>}</TableCell>
                          <TableCell className="text-right text-xs py-2 tabular-nums">{org.calls_7d || <span className="text-muted-foreground/40">—</span>}</TableCell>
                          <TableCell className="text-right text-xs py-2 tabular-nums">{org.user_count}</TableCell>
                          <TableCell className="text-right text-xs py-2 tabular-nums">{org.lead_count.toLocaleString()}</TableCell>
                          <TableCell className="py-2"><RiskBadge level={org.risk_level} /></TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {org.plan_status === "unlimited" ? "∞" :
                              org.trial_end_date ? format(new Date(org.trial_end_date), "MMM d") : "—"}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedTenant(org)} title="View details">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`${window.location.origin}/t/${org.subdomain}`, "_blank")} title="Open as org">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialogs */}
      <TenantDetailDialog
        tenant={selectedTenant}
        open={!!selectedTenant}
        onOpenChange={(open) => { if (!open) setSelectedTenant(null); }}
        onUpdated={refetch}
      />
      <CreateTenantDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={refetch}
      />
    </div>
  );
}
