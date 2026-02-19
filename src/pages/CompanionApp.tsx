import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhoneHeartbeat } from "@/hooks/usePhoneHeartbeat";
import { useCompanionService } from "@/hooks/useCompanionService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import flowcallLogo from "@/assets/flowcall-logo.png";
import {
  Phone,
  MessageSquare,
  LogOut,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DialRequest {
  id: string;
  phone_number: string;
  status: string;
  created_at: string;
  lead_id: string | null;
}

interface SmsRequest {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  created_at: string;
  lead_id: string | null;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "pending") return <Clock className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-destructive" />;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed" ? "default" :
    status === "pending" ? "secondary" : "destructive";
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0 capitalize">{status}</Badge>;
}

export default function CompanionApp() {
  console.log("[CompanionApp] rendering");
  const { user, signOut } = useAuth();
  const [dialRequests, setDialRequests] = useState<DialRequest[]>([]);
  const [smsRequests, setSmsRequests] = useState<SmsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const serviceRunning = true; // always true when app is open and hook is running

  // Activate heartbeat + foreground service
  usePhoneHeartbeat();
  useCompanionService();
  console.log("[CompanionApp] hooks initialized, user:", user?.id ?? "null");

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [dialRes, smsRes] = await Promise.all([
      supabase
        .from("dial_requests")
        .select("id, phone_number, status, created_at, lead_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("sms_requests")
        .select("id, phone_number, message, status, created_at, lead_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (dialRes.data) setDialRequests(dialRes.data);
    if (smsRes.data) setSmsRequests(smsRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();

    // Live updates via realtime
    const dialChannel = supabase
      .channel("companion_dial")
      .on("postgres_changes", { event: "*", schema: "public", table: "dial_requests" }, () => {
        fetchHistory();
      })
      .subscribe();

    const smsChannel = supabase
      .channel("companion_sms")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_requests" }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dialChannel);
      supabase.removeChannel(smsChannel);
    };
  }, [fetchHistory]);

  const pendingDials = dialRequests.filter((r) => r.status === "pending").length;
  const pendingSms = smsRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <img src={flowcallLogo} alt="FlowCall" className="h-7 w-7" />
          <div>
            <p className="text-sm font-semibold leading-none">FlowCall Smart</p>
            <p className="text-[10px] text-sidebar-foreground/60 leading-none mt-0.5">
              {user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Service status */}
          <div className="flex items-center gap-1.5 bg-sidebar-accent px-2 py-1 rounded-full">
            {serviceRunning ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">Active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Inactive</span>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchHistory}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Service status card */}
      <div className="mx-4 mt-4 rounded-xl border bg-card p-4 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${serviceRunning ? "bg-emerald-500" : "bg-muted-foreground"}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {serviceRunning ? "Companion service running" : "Companion service stopped"}
          </p>
          <p className="text-xs text-muted-foreground">
            {serviceRunning
              ? "Your phone will automatically execute calls and SMS from the desktop"
              : "Open the app to restart the service"}
          </p>
        </div>
        {(pendingDials + pendingSms) > 0 && (
          <Badge variant="destructive" className="flex-shrink-0">
            {pendingDials + pendingSms} pending
          </Badge>
        )}
      </div>

      {/* History tabs */}
      <div className="flex-1 px-4 mt-4 pb-6">
        <Tabs defaultValue="calls">
          <TabsList className="w-full">
            <TabsTrigger value="calls" className="flex-1 gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Calls
              {pendingDials > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">{pendingDials}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex-1 gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              SMS
              {pendingSms > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">{pendingSms}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Calls tab */}
          <TabsContent value="calls" className="mt-3 space-y-0">
            {loading ? (
              <div className="space-y-2 mt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : dialRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Phone className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No call requests yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Click a call button in the desktop CRM
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden divide-y">
                {dialRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                    <StatusIcon status={req.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.phone_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SMS tab */}
          <TabsContent value="sms" className="mt-3">
            {loading ? (
              <div className="space-y-2 mt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : smsRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No SMS requests yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Send an SMS from the desktop CRM
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden divide-y">
                {smsRequests.map((req) => (
                  <div key={req.id} className="flex items-start gap-3 px-4 py-3 bg-card">
                    <StatusIcon status={req.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{req.phone_number}</p>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{req.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Separator />
      <p className="text-center text-[10px] text-muted-foreground py-3">
        Keep this app open for instant execution · Background service is active
      </p>
    </div>
  );
}
