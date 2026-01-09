import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Smartphone, Wifi, WifiOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DialRequest {
  id: string;
  phone_number: string;
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
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [recentCalls, setRecentCalls] = useState<DialRequest[]>([]);

  // Register this device
  const registerDevice = useCallback(async () => {
    if (!user) return;

    try {
      const deviceInfo = {
        user_id: user.id,
        device_type: "mobile",
        device_name: `${navigator.userAgent.includes("Android") ? "Android" : "Mobile"} Browser`,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_devices")
        .upsert(deviceInfo, { onConflict: "user_id,device_type" });

      if (error) throw error;
      setDeviceRegistered(true);
      toast({
        title: "Device registered",
        description: "This device is now ready to receive dial requests.",
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
    
    // Play a notification sound
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch (e) {}

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    toast({
      title: "Incoming dial request",
      description: `Number: ${request.phone_number}`,
    });
  }, [toast]);

  // Dial the number
  const dialNumber = useCallback(async () => {
    if (!currentRequest) return;

    // Update status to dialing
    await supabase
      .from("dial_requests")
      .update({ status: "dialing" })
      .eq("id", currentRequest.id);

    // Open the phone dialer
    window.location.href = `tel:${currentRequest.phone_number}`;

    // Mark as completed after a short delay
    setTimeout(async () => {
      await supabase
        .from("dial_requests")
        .update({ status: "completed" })
        .eq("id", currentRequest.id);
      
      setRecentCalls(prev => [currentRequest, ...prev.slice(0, 9)]);
      setCurrentRequest(null);
    }, 1000);
  }, [currentRequest]);

  // Dismiss the request
  const dismissRequest = useCallback(async () => {
    if (!currentRequest) return;

    await supabase
      .from("dial_requests")
      .update({ status: "dismissed" })
      .eq("id", currentRequest.id);

    setCurrentRequest(null);
  }, [currentRequest]);

  // Subscribe to dial requests
  useEffect(() => {
    if (!user || !deviceRegistered) return;

    const channel = supabase
      .channel("dial-requests")
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
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, deviceRegistered, handleDialRequest]);

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
              Sign in to receive dial requests from your PC
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
          <h1 className="text-xl font-bold">FlowCall Dialer</h1>
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
                  ? "Waiting for dial requests from your PC" 
                  : "Setting up your device..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Call Card */}
      {currentRequest && (
        <Card className="mb-6 border-primary bg-primary/5 animate-pulse">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Incoming Request</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold mb-4">
              {currentRequest.phone_number}
            </p>
            <div className="flex gap-3">
              <Button 
                className="flex-1 gap-2" 
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
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCalls.map((call) => (
              <div 
                key={call.id} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="font-mono">{call.phone_number}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = `tel:${call.phone_number}`}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions when idle */}
      {!currentRequest && recentCalls.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Keep this page open. When you click a number on your PC, 
              it will appear here for you to dial.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
