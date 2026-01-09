import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Smartphone, Wifi, WifiOff, Volume2, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function Dialer() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<DialRequest | null>(null);
  const [currentSmsRequest, setCurrentSmsRequest] = useState<SmsRequest | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [recentCalls, setRecentCalls] = useState<DialRequest[]>([]);
  const [recentSms, setRecentSms] = useState<SmsRequest[]>([]);

  // Register this device
  const registerDevice = useCallback(async () => {
    if (!user) return;

    try {
      const deviceName = navigator.userAgent.includes("Android") ? "Android" : "Mobile";
      const deviceInfo = {
        user_id: user.id,
        device_type: "mobile" as const,
        device_name: deviceName,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_devices")
        .upsert(deviceInfo, { onConflict: "user_id,device_type,device_name" });

      if (error) throw error;
      setDeviceRegistered(true);
      toast({
        title: "Device registered",
        description: "This device is now ready to receive requests.",
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

  // Handle incoming dial request
  const handleDialRequest = useCallback(async (request: DialRequest) => {
    setCurrentRequest(request);
    
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    toast({
      title: "Incoming dial request",
      description: `Number: ${request.phone_number}`,
    });
  }, [toast]);

  // Handle incoming SMS request
  const handleSmsRequest = useCallback(async (request: SmsRequest) => {
    setCurrentSmsRequest(request);
    
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    toast({
      title: "Incoming SMS request",
      description: `To: ${request.phone_number}`,
    });
  }, [toast]);

  // Dial the number
  const dialNumber = useCallback(async () => {
    if (!currentRequest) return;

    await supabase
      .from("dial_requests")
      .update({ status: "dialing" })
      .eq("id", currentRequest.id);

    window.location.href = `tel:${currentRequest.phone_number}`;

    setTimeout(async () => {
      await supabase
        .from("dial_requests")
        .update({ status: "completed" })
        .eq("id", currentRequest.id);
      
      setRecentCalls(prev => [currentRequest, ...prev.slice(0, 9)]);
      setCurrentRequest(null);
    }, 1000);
  }, [currentRequest]);

  // Dismiss dial request
  const dismissRequest = useCallback(async () => {
    if (!currentRequest) return;

    await supabase
      .from("dial_requests")
      .update({ status: "dismissed" })
      .eq("id", currentRequest.id);

    setCurrentRequest(null);
  }, [currentRequest]);

  // Send SMS
  const sendSms = useCallback(async () => {
    if (!currentSmsRequest) return;

    await supabase
      .from("sms_requests")
      .update({ status: "sending" })
      .eq("id", currentSmsRequest.id);

    window.location.href = `sms:${currentSmsRequest.phone_number}?body=${encodeURIComponent(currentSmsRequest.message)}`;

    setTimeout(async () => {
      await supabase
        .from("sms_requests")
        .update({ status: "completed" })
        .eq("id", currentSmsRequest.id);
      
      setRecentSms(prev => [currentSmsRequest, ...prev.slice(0, 9)]);
      setCurrentSmsRequest(null);
    }, 1000);
  }, [currentSmsRequest]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">FlowCall Smart</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? "Connected" : "Connecting..."}
        </Badge>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${deviceRegistered ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">
                {deviceRegistered ? "Device Ready" : "Registering..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {deviceRegistered 
                  ? "Waiting for dial or SMS requests" 
                  : "Setting up your device..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Call Request */}
      {currentRequest && (
        <Card className="mb-6 border-green-500 bg-green-500/5 animate-pulse">
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

      {/* Incoming SMS Request */}
      {currentSmsRequest && (
        <Card className="mb-6 border-blue-500 bg-blue-500/5 animate-pulse">
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
                onClick={sendSms}
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

      {/* Recent Activity Tabs */}
      {(recentCalls.length > 0 || recentSms.length > 0) && (
        <Card>
          <Tabs defaultValue="calls" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calls" className="gap-1">
                  <Phone className="h-4 w-4" /> Calls
                </TabsTrigger>
                <TabsTrigger value="sms" className="gap-1">
                  <MessageSquare className="h-4 w-4" /> SMS
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="calls" className="mt-0 space-y-2">
                {recentCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent calls</p>
                ) : (
                  recentCalls.map((call) => (
                    <div 
                      key={call.id} 
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span className="font-mono text-sm">{call.phone_number}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = `tel:${call.phone_number}`}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>
              <TabsContent value="sms" className="mt-0 space-y-2">
                {recentSms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent SMS</p>
                ) : (
                  recentSms.map((sms) => (
                    <div 
                      key={sms.id} 
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm block">{sms.phone_number}</span>
                        <span className="text-xs text-muted-foreground truncate block">{sms.message}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = `sms:${sms.phone_number}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      )}

      {/* Instructions when idle */}
      {!currentRequest && !currentSmsRequest && recentCalls.length === 0 && recentSms.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center gap-4 mb-3">
              <Phone className="h-10 w-10 text-muted-foreground" />
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Keep this page open. When you click a number or send SMS from your PC, 
              it will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
