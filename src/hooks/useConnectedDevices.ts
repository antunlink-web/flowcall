import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ConnectedDevice {
  id: string;
  device_name: string;
  device_type: string;
  is_active: boolean;
  last_seen_at: string;
}

export function useConnectedDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    if (!user) {
      setDevices([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_devices")
      .select("id, device_name, device_type, is_active, last_seen_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch devices:", error);
    } else {
      setDevices(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDevices();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Check if a device is online (seen within last 2 minutes)
  const isDeviceOnline = useCallback((lastSeenAt: string) => {
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    return diffMs < 2 * 60 * 1000; // 2 minutes
  }, []);

  const onlineDevices = devices.filter(d => isDeviceOnline(d.last_seen_at));

  return { 
    devices, 
    onlineDevices,
    loading, 
    refetch: fetchDevices,
    isDeviceOnline 
  };
}
