/**
 * useCompanionService
 *
 * Controls the Android foreground service (CompanionForegroundService).
 * - On mount (native app + logged in): passes Supabase credentials to the
 *   native plugin, then starts the service.
 * - On unmount / sign-out: stops the service.
 *
 * The service polls Supabase every 5 s for pending dial/SMS requests and
 * executes them even when the screen is off or the app is in the background.
 */
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp, isAndroid } from "@/lib/native-dialer";
import { supabase } from "@/integrations/supabase/client";

// Capacitor plugin interface
interface CompanionServicePlugin {
  setCredentials(opts: {
    supabaseUrl: string;
    anonKey: string;
    accessToken: string;
    userId: string;
  }): Promise<{ success: boolean }>;
  start(): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
}

function getPlugin(): CompanionServicePlugin | null {
  if (!isNativeApp()) return null;
  try {
    return (window as any).Capacitor?.Plugins?.CompanionService ?? null;
  } catch {
    return null;
  }
}

export function useCompanionService() {
  const { user, session } = useAuth();

  useEffect(() => {
    if (!isAndroid()) return;
    const plugin = getPlugin();
    if (!plugin) return;

    let started = false;

    const startService = async () => {
      const accessToken = session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      if (!accessToken || !user?.id || !supabaseUrl || !anonKey) return;

      try {
        await plugin.setCredentials({
          supabaseUrl,
          anonKey,
          accessToken,
          userId: user.id,
        });
      } catch (err) {
        console.error("[CompanionService] setCredentials failed:", err);
        return;
      }

      try {
        await plugin.start();
        started = true;
        console.log("[CompanionService] foreground service started");
      } catch (err) {
        // Non-fatal: foreground service may be blocked on Android 14+ without
        // FOREGROUND_SERVICE_PHONE permission — app continues without background polling.
        console.warn("[CompanionService] foreground service start failed (non-fatal):", err);
      }
    };

    startService();

    // Re-pass fresh token whenever the session refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!newSession || !user?.id) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        plugin.setCredentials({
          supabaseUrl,
          anonKey,
          accessToken: newSession.access_token,
          userId: user.id,
        }).catch(console.error);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (started) {
        plugin.stop().catch(console.error);
      }
    };
  }, [user, session]);
}
