/**
 * usePhoneHeartbeat
 * 
 * Runs inside the native Android/iOS app.
 * Registers the device in user_devices and sends a heartbeat every 30 seconds
 * so the desktop can show the phone as "online".
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp, isAndroid } from "@/lib/native-dialer";

const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

export function usePhoneHeartbeat() {
  const { user } = useAuth();
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isNativeApp()) return;

    const deviceType = isAndroid() ? "android" : "ios";
    const deviceName = `${deviceType === "android" ? "Android" : "iPhone"} Companion`;

    const upsertHeartbeat = async () => {
      try {
        if (deviceIdRef.current) {
          // Update existing device's last_seen_at
          await supabase
            .from("user_devices")
            .update({ last_seen_at: new Date().toISOString(), is_active: true })
            .eq("id", deviceIdRef.current);
        } else {
          // Try to find an existing device row for this user (any mobile type)
          const { data: existing } = await supabase
            .from("user_devices")
            .select("id")
            .eq("user_id", user.id)
            .in("device_type", [deviceType, "mobile"])
            .limit(1)
            .maybeSingle();

          if (existing) {
            deviceIdRef.current = existing.id;
            await supabase
              .from("user_devices")
              .update({
                device_name: deviceName,
                device_type: deviceType,
                last_seen_at: new Date().toISOString(),
                is_active: true,
              })
              .eq("id", existing.id);
          } else {
            // Register new device
            const { data: newDevice } = await supabase
              .from("user_devices")
              .insert({
                user_id: user.id,
                device_name: deviceName,
                device_type: deviceType,
                is_active: true,
                last_seen_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (newDevice) {
              deviceIdRef.current = newDevice.id;
            }
          }
        }
      } catch (err) {
        console.error("[PhoneHeartbeat] error:", err);
      }
    };

    // Send immediately, then on interval
    upsertHeartbeat();
    const interval = setInterval(upsertHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Mark offline when app closes / user signs out
    return () => {
      clearInterval(interval);
      if (deviceIdRef.current) {
        supabase
          .from("user_devices")
          .update({ is_active: false })
          .eq("id", deviceIdRef.current)
          .then(() => {});
      }
    };
  }, [user]);
}
