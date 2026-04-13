import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTenant } from "./useTenant";
import { toast } from "sonner";
import { getEffectiveTime, type NextAction } from "./useNextActions";

interface ReminderPreferences {
  reminder_minutes: number;
  notify_toast: boolean;
  notify_browser: boolean;
  notify_email: boolean;
}

const DEFAULT_PREFS: ReminderPreferences = {
  reminder_minutes: 15,
  notify_toast: true,
  notify_browser: true,
  notify_email: true,
};

export function useCalendarReminders() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [prefs, setPrefs] = useState<ReminderPreferences>(DEFAULT_PREFS);
  const notifiedActionIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  // Load preferences
  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      const { data } = await supabase
        .from("account_settings")
        .select("setting_value")
        .eq("setting_key", `reminder_prefs_${user.id}`)
        .is("tenant_id", null)
        .maybeSingle();

      if (data?.setting_value) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.setting_value as Record<string, unknown>) } as ReminderPreferences);
      }
    };
    loadPrefs();
  }, [user]);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setBrowserPermission(result);
    return result;
  }, []);

  // Save preferences
  const savePrefs = useCallback(async (newPrefs: ReminderPreferences) => {
    if (!user) return;
    setPrefs(newPrefs);

    const { data: existing } = await supabase
      .from("account_settings")
      .select("id")
      .eq("setting_key", `reminder_prefs_${user.id}`)
      .is("tenant_id", null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("account_settings")
        .update({ setting_value: JSON.parse(JSON.stringify(newPrefs)) })
        .eq("id", existing.id);
    } else {
      await supabase.from("account_settings").insert([{
        setting_key: `reminder_prefs_${user.id}`,
        setting_value: JSON.parse(JSON.stringify(newPrefs)),
        tenant_id: null,
      }]);
    }
  }, [user]);

  // Poll for upcoming actions and trigger notifications
  const checkUpcoming = useCallback(async () => {
    if (!user || !tenant?.id) return;
    if (!prefs.notify_toast && !prefs.notify_browser) return;

    const now = new Date();
    const windowEnd = new Date(now.getTime() + prefs.reminder_minutes * 60 * 1000);

    const { data: actions, error } = await supabase
      .from("next_actions")
      .select("*")
      .eq("tenant_id", tenant.id)
      .in("status", ["pending", "snoozed"])
      .lte("scheduled_for", windowEnd.toISOString())
      .gte("scheduled_for", now.toISOString())
      .limit(50);

    if (error || !actions) return;

    if (isInitialLoad.current) {
      // Mark all current as already notified on first load
      actions.forEach((a) => notifiedActionIds.current.add(a.id));
      isInitialLoad.current = false;
      return;
    }

    const newActions = actions.filter((a) => !notifiedActionIds.current.has(a.id));
    if (newActions.length === 0) return;

    // Fetch lead data for context
    const leadIds = [...new Set(newActions.map((a) => a.lead_id))];
    const { data: leads } = await supabase
      .from("leads")
      .select("id, data")
      .in("id", leadIds);

    const leadMap = new Map<string, string>();
    leads?.forEach((l) => {
      const d = l.data as Record<string, unknown> | null;
      if (!d) return;
      const nameFields = ["name", "company", "pavadinimas", "Pavadinimas", "Company", "company name"];
      for (const f of nameFields) {
        if (d[f] && typeof d[f] === "string") {
          leadMap.set(l.id, d[f] as string);
          break;
        }
      }
    });

    for (const action of newActions) {
      notifiedActionIds.current.add(action.id);
      const contactName = leadMap.get(action.lead_id) || "Unknown contact";
      const effectiveTime = getEffectiveTime(action as NextAction);
      const timeStr = effectiveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      const typeLabel = action.action_type.replace(/_/g, " ");

      // In-app toast
      if (prefs.notify_toast) {
        toast(`📅 ${contactName}`, {
          description: `${typeLabel} scheduled at ${timeStr}`,
          duration: 10000,
        });
      }

      // Browser push notification
      if (prefs.notify_browser && browserPermission === "granted") {
        try {
          new Notification(`Upcoming: ${typeLabel}`, {
            body: `${contactName} at ${timeStr}`,
            icon: "/favicon.ico",
            tag: `calendar-${action.id}`,
          });
        } catch (e) {
          console.warn("Browser notification failed:", e);
        }
      }
    }
  }, [user, tenant?.id, prefs, browserPermission]);

  // Poll every 60 seconds
  useEffect(() => {
    if (!user || !tenant?.id) return;

    checkUpcoming();
    const interval = setInterval(checkUpcoming, 60000);
    return () => clearInterval(interval);
  }, [user, tenant?.id, checkUpcoming]);

  return {
    prefs,
    savePrefs,
    browserPermission,
    requestBrowserPermission,
    DEFAULT_PREFS,
  };
}
