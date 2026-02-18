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

// How long since last_seen_at before we consider the device offline
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

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
    if (!user) return;

    fetchDevices();

    // Realtime subscription: update device list whenever any device changes
    const channel = supabase
      .channel(`user_devices:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_devices",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setDevices((prev) => prev.filter((d) => d.id !== (payload.old as any).id));
          } else if (payload.eventType === "INSERT") {
            const newDevice = payload.new as ConnectedDevice;
            setDevices((prev) => [newDevice, ...prev.filter((d) => d.id !== newDevice.id)]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ConnectedDevice;
            setDevices((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
          }
        }
      )
      .subscribe();

    // Also poll every 60s as a safety net (realtime may miss edge cases)
    const interval = setInterval(fetchDevices, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchDevices]);

  // Check if a device is online (seen within threshold)
  const isDeviceOnline = useCallback((lastSeenAt: string) => {
    const diffMs = Date.now() - new Date(lastSeenAt).getTime();
    return diffMs < ONLINE_THRESHOLD_MS;
  }, []);

  const onlineDevices = devices.filter((d) => isDeviceOnline(d.last_seen_at));
  const hasOnlinePhone = onlineDevices.some(
    (d) => d.device_type === "android" || d.device_type === "ios" || d.device_type === "mobile"
  );

  return {
    devices,
    onlineDevices,
    hasOnlinePhone,
    loading,
    refetch: fetchDevices,
    isDeviceOnline,
  };
}
