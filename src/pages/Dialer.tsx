import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Smartphone, Wifi, WifiOff, Volume2, MessageSquare, Send, X, ShieldCheck, ShieldAlert, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { 
  isNativeApp, 
  makeCall, 
  sendSms, 
  getPermissionStatus, 
  requestAllPermissions 
} from "@/lib/native-dialer";

interface DialRequest {
  id: string;
  phone_number: string;
  lead_id: string | null;
  status: string;
  created_at: string;
}

interface SmsRequest {
  id: string;
  phone_number: string;
  message: string;
  lead_id: string | null;
  status: string;
  created_at: string;
}

interface CallLogEntry {
  id: string;
  lead_id: string;
  outcome: string;
  notes: string | null;
  duration_seconds: number | null;
  created_at: string;
  phone_number?: string;
}

interface SmsLogEntry {
  id: string;
  lead_id: string;
  message: string;
  created_at: string;
  phone_number?: string;
}

interface PermissionState {
  isNative: boolean;
  call: boolean;
  sms: boolean;
}

export default function Dialer() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<DialRequest | null>(null);
  const [currentSmsRequest, setCurrentSmsRequest] = useState<SmsRequest | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>([]);
  const [smsHistory, setSmsHistory] = useState<SmsLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionState>({
    isNative: false,
    call: false,
    sms: false,
  });

  // Check permission status on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const status = await getPermissionStatus();
      setPermissions(status);
    };
    checkPermissions();
  }, []);

  // Load call and SMS history from database
  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    setHistoryLoading(true);
    try {
      // Load call logs
      const { data: callLogs } = await supabase
        .from("call_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Load SMS logs
      const { data: smsLogs } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setCallHistory(callLogs || []);
      setSmsHistory(smsLogs || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Load history on mount
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  // Log completed call to call_logs
  const logCall = useCallback(async (request: DialRequest, outcome: string = "dialed") => {
    if (!user || !request.lead_id) return;
    
    try {
      // Get tenant_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      await supabase.from("call_logs").insert({
        user_id: user.id,
        lead_id: request.lead_id,
        outcome: outcome,
        notes: `Dialed via FlowCall Smart: ${request.phone_number}`,
        tenant_id: profile?.tenant_id,
      });
      
      // Reload history to show new entry
      loadHistory();
    } catch (error) {
      console.error("Failed to log call:", error);
    }
  }, [user, loadHistory]);

  // Log completed SMS to sms_logs
  const logSms = useCallback(async (request: SmsRequest) => {
    if (!user || !request.lead_id) return;
    
    try {
      // Get tenant_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      await supabase.from("sms_logs").insert({
        user_id: user.id,
        lead_id: request.lead_id,
        message: request.message,
        tenant_id: profile?.tenant_id,
      });
      
      // Reload history to show new entry
      loadHistory();
    } catch (error) {
      console.error("Failed to log SMS:", error);
    }
  }, [user, loadHistory]);

  // Delete a call log entry
  const deleteCallLog = useCallback(async (id: string) => {
    try {
      await supabase.from("call_logs").delete().eq("id", id);
      setCallHistory(prev => prev.filter(c => c.id !== id));
      toast({ title: "Call deleted from history" });
    } catch (error) {
      console.error("Failed to delete call log:", error);
    }
  }, [toast]);

  // Delete an SMS log entry
  const deleteSmsLog = useCallback(async (id: string) => {
    try {
      await supabase.from("sms_logs").delete().eq("id", id);
      setSmsHistory(prev => prev.filter(s => s.id !== id));
      toast({ title: "SMS deleted from history" });
    } catch (error) {
      console.error("Failed to delete SMS log:", error);
    }
  }, [toast]);

  // Request permissions
  const handleRequestPermissions = async () => {
    const result = await requestAllPermissions();
    setPermissions(prev => ({
      ...prev,
      call: result.call,
      sms: result.sms,
    }));
    
    if (result.call && result.sms) {
      toast({
        title: "Permissions granted",
        description: "Auto-dial and auto-SMS are now enabled!",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Some permissions denied",
        description: "Go to Settings to grant permissions manually.",
      });
    }
  };

  // Register this device
  const registerDevice = useCallback(async () => {
    if (!user) return;

    try {
      const deviceName = isNativeApp() ? "FlowCall Native" : 
        navigator.userAgent.includes("Android") ? "Android" : "Mobile";
      
      // Check if a mobile device already exists for this user
      const { data: existingDevice } = await supabase
        .from("user_devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("device_type", "mobile")
        .maybeSingle();

      if (existingDevice) {
        const { error } = await supabase
          .from("user_devices")
          .update({
            device_name: deviceName,
            is_active: true,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", existingDevice.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_devices")
          .insert({
            user_id: user.id,
            device_type: "mobile",
            device_name: deviceName,
            is_active: true,
            last_seen_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setDeviceRegistered(true);
      toast({
        title: "Device registered",
        description: isNativeApp() 
          ? "Native mode: Auto-dial & SMS enabled!" 
          : "Web mode: Manual confirmation required.",
      });
    } catch (error) {
      console.error("Failed to register device:", error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: "Could not register this device.",
      });
    }
  }, [user, toast]);

  // Handle incoming dial request - auto-dial if native permissions granted
  const handleDialRequest = useCallback(async (request: DialRequest) => {
    setCurrentRequest(request);
    
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch (_e) { /* ignore */ }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Update status
    await supabase
      .from("dial_requests")
      .update({ status: "dialing" })
      .eq("id", request.id);

    // If native with permissions, auto-dial immediately
    if (permissions.isNative && permissions.call) {
      toast({
        title: "Auto-dialing...",
        description: `Calling ${request.phone_number}`,
      });

      const result = await makeCall(request.phone_number);
      
      if (result.success) {
        await supabase
          .from("dial_requests")
          .update({ status: "completed" })
          .eq("id", request.id);
        
        // Log the call to permanent history
        await logCall(request, "dialed");
        setCurrentRequest(null);
        
        toast({
          title: result.native ? "Call initiated" : "Dialer opened",
          description: result.native 
            ? "Direct call placed automatically" 
            : "Phone dialer opened with number",
        });
      }
    } else {
      // Web mode - show notification, user must tap
      toast({
        title: "Incoming call request",
        description: `Number: ${request.phone_number}`,
      });
    }
  }, [permissions, toast, logCall]);

  // Handle incoming SMS request - auto-send if native permissions granted
  const handleSmsRequest = useCallback(async (request: SmsRequest) => {
    setCurrentSmsRequest(request);
    
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch (_e) { /* ignore */ }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Update status
    await supabase
      .from("sms_requests")
      .update({ status: "sending" })
      .eq("id", request.id);

    // If native with permissions, auto-send immediately
    if (permissions.isNative && permissions.sms) {
      toast({
        title: "Auto-sending SMS...",
        description: `To: ${request.phone_number}`,
      });

      const result = await sendSms(request.phone_number, request.message);
      
      if (result.success) {
        await supabase
          .from("sms_requests")
          .update({ status: "completed" })
          .eq("id", request.id);
        
        // Log the SMS to permanent history
        await logSms(request);
        setCurrentSmsRequest(null);
        
        toast({
          title: result.native ? "SMS sent!" : "SMS app opened",
          description: result.native 
            ? "Message sent automatically" 
            : "SMS app opened with message",
        });
      }
    } else {
      // Web mode - show notification, user must tap
      toast({
        title: "Incoming SMS request",
        description: `To: ${request.phone_number}`,
      });
    }
  }, [permissions, toast, logSms]);

  // Manual dial (fallback)
  const dialNumber = useCallback(async () => {
    if (!currentRequest) return;

    const result = await makeCall(currentRequest.phone_number);

    if (result.success) {
      await supabase
        .from("dial_requests")
        .update({ status: "completed" })
        .eq("id", currentRequest.id);
      
      // Log the call to permanent history
      await logCall(currentRequest, "dialed");
      setCurrentRequest(null);
    }
  }, [currentRequest, logCall]);

  // Dismiss dial request
  const dismissRequest = useCallback(async () => {
    if (!currentRequest) return;

    await supabase
      .from("dial_requests")
      .update({ status: "dismissed" })
      .eq("id", currentRequest.id);

    setCurrentRequest(null);
  }, [currentRequest]);

  // Manual send SMS (fallback)
  const handleSendSms = useCallback(async () => {
    if (!currentSmsRequest) return;

    const result = await sendSms(currentSmsRequest.phone_number, currentSmsRequest.message);

    if (result.success) {
      await supabase
        .from("sms_requests")
        .update({ status: "completed" })
        .eq("id", currentSmsRequest.id);
      
      // Log the SMS to permanent history
      await logSms(currentSmsRequest);
      setCurrentSmsRequest(null);
    }
  }, [currentSmsRequest, logSms]);

  // Dismiss SMS request
  const dismissSmsRequest = useCallback(async () => {
    if (!currentSmsRequest) return;

    await supabase
      .from("sms_requests")
      .update({ status: "dismissed" })
      .eq("id", currentSmsRequest.id);

    setCurrentSmsRequest(null);
  }, [currentSmsRequest]);

  // Subscribe to dial and SMS requests
  useEffect(() => {
    if (!user || !deviceRegistered) return;

    const channel = supabase
      .channel("smart-dialer")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dial_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const request = payload.new as DialRequest;
          if (request.status === "pending") {
            handleDialRequest(request);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sms_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const request = payload.new as SmsRequest;
          if (request.status === "pending") {
            handleSmsRequest(request);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, deviceRegistered, handleDialRequest, handleSmsRequest]);

  // Auto-register on mount
  useEffect(() => {
    if (user && !deviceRegistered) {
      registerDevice();
    }
  }, [user, deviceRegistered, registerDevice]);

  // Update last seen periodically
  useEffect(() => {
    if (!user || !deviceRegistered) return;

    const interval = setInterval(async () => {
      await supabase
        .from("user_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("device_type", "mobile");
    }, 30000);

    return () => clearInterval(interval);
  }, [user, deviceRegistered]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Smartphone className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>FlowCall Dialer</CardTitle>
            <CardDescription>
              Sign in to receive dial and SMS requests from your PC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">FlowCall Smart</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? "Connected" : "Connecting..."}
        </Badge>
      </div>

      {/* Native Mode Banner */}
      {permissions.isNative && (
        <Card className={`mb-4 ${permissions.call && permissions.sms ? 'border-green-500 bg-green-500/5' : 'border-yellow-500 bg-yellow-500/5'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {permissions.call && permissions.sms ? (
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                ) : (
                  <ShieldAlert className="h-8 w-8 text-yellow-600" />
                )}
                <div>
                  <p className="font-medium">
                    {permissions.call && permissions.sms 
                      ? "Fully Automatic Mode" 
                      : "Permissions Required"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {permissions.call && permissions.sms 
                      ? "Calls & SMS will be sent automatically" 
                      : "Grant permissions for auto-dial/SMS"}
                  </p>
                </div>
              </div>
              {!(permissions.call && permissions.sms) && (
                <Button size="sm" onClick={handleRequestPermissions}>
                  Grant
                </Button>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant={permissions.call ? "default" : "outline"} className="text-xs">
                <Phone className="h-3 w-3 mr-1" />
                Call: {permissions.call ? "✓" : "✗"}
              </Badge>
              <Badge variant={permissions.sms ? "default" : "outline"} className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                SMS: {permissions.sms ? "✓" : "✗"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Card */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${deviceRegistered ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">
                {deviceRegistered ? "Device Ready" : "Registering..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {permissions.isNative && permissions.call && permissions.sms
                  ? "Auto-mode: No interaction needed!"
                  : deviceRegistered 
                    ? "Waiting for requests..." 
                    : "Setting up your device..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Call Request (only shown if not auto-handled) */}
      {currentRequest && !(permissions.isNative && permissions.call) && (
        <Card className="mb-4 border-green-500 bg-green-500/5 animate-pulse">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Incoming Call Request</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold mb-4">
              {currentRequest.phone_number}
            </p>
            <div className="flex gap-3">
              <Button 
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700" 
                size="lg"
                onClick={dialNumber}
              >
                <Phone className="h-5 w-5" />
                Dial
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={dismissRequest}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incoming SMS Request (only shown if not auto-handled) */}
      {currentSmsRequest && !(permissions.isNative && permissions.sms) && (
        <Card className="mb-4 border-blue-500 bg-blue-500/5 animate-pulse">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Incoming SMS Request</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-mono font-bold mb-2">
              {currentSmsRequest.phone_number}
            </p>
            <p className="text-sm bg-muted p-3 rounded-md mb-4 max-h-32 overflow-y-auto">
              {currentSmsRequest.message}
            </p>
            <div className="flex gap-3">
              <Button 
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700" 
                size="lg"
                onClick={handleSendSms}
              >
                <Send className="h-5 w-5" />
                Send SMS
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={dismissSmsRequest}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Tabs */}
      <Card>
        <Tabs defaultValue="calls" className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">History</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadHistory}
                disabled={historyLoading}
              >
                <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calls" className="gap-1">
                <Phone className="h-4 w-4" /> Calls ({callHistory.length})
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-1">
                <MessageSquare className="h-4 w-4" /> SMS ({smsHistory.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="calls" className="mt-0 space-y-2 max-h-64 overflow-y-auto">
              {historyLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : callHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No call history</p>
              ) : (
                callHistory.map((call) => (
                  <div 
                    key={call.id} 
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block">{call.notes || "Call"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCallLog(call.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="sms" className="mt-0 space-y-2 max-h-64 overflow-y-auto">
              {historyLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : smsHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No SMS history</p>
              ) : (
                smsHistory.map((sms) => (
                  <div 
                    key={sms.id} 
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{sms.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(sms.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSmsLog(sms.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Instructions when idle */}
      {!currentRequest && !currentSmsRequest && callHistory.length === 0 && smsHistory.length === 0 && !historyLoading && (
        <Card className="mt-4">
          <CardContent className="pt-6 text-center">
            <Volume2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {permissions.isNative && permissions.call && permissions.sms
                ? "Keep this app open. Calls & SMS will be handled automatically!"
                : "Keep this app open to receive dial and SMS requests from your PC."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
