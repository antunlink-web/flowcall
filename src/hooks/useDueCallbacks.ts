import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface DueCallback {
  id: string;
  company_name: string;
  phone: string;
  callback_scheduled_at: string;
  list_name: string;
}

export function useDueCallbacks() {
  const { user } = useAuth();
  const [dueCallbacks, setDueCallbacks] = useState<DueCallback[]>([]);
  const [loading, setLoading] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  const lastToastTime = useRef<number>(0);

  const fetchDueCallbacks = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("leads")
        .select(`
          id,
          callback_scheduled_at,
          data,
          lists(name)
        `)
        .not("callback_scheduled_at", "is", null)
        .lte("callback_scheduled_at", now)
        .eq("status", "callback")
        .order("callback_scheduled_at", { ascending: true })
        .limit(20);

      if (error) {
        console.error("Error fetching due callbacks:", error);
        return;
      }

      const callbacks: DueCallback[] = (data || []).map((lead: any) => {
        const leadData = lead.data || {};
        
        // Get company name
        let companyName = "Unknown";
        const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma", "name"];
        for (const field of companyFields) {
          const value = leadData[field] || leadData[field.charAt(0).toUpperCase() + field.slice(1)];
          if (value && typeof value === "string" && value.trim()) {
            companyName = value;
            break;
          }
        }

        // Get phone
        let phone = "";
        for (const [key, value] of Object.entries(leadData)) {
          const keyLower = key.toLowerCase();
          if ((keyLower.includes("phone") || keyLower.includes("tel")) && typeof value === "string" && value.trim()) {
            phone = value;
            break;
          }
        }

        return {
          id: lead.id,
          company_name: companyName,
          phone,
          callback_scheduled_at: lead.callback_scheduled_at,
          list_name: lead.lists?.name || "Unknown List",
        };
      });

      // Show toast for new due callbacks (max once per minute)
      const now_ts = Date.now();
      const newCallbacks = callbacks.filter(cb => !notifiedIds.current.has(cb.id));
      
      if (newCallbacks.length > 0 && now_ts - lastToastTime.current > 60000) {
        lastToastTime.current = now_ts;
        newCallbacks.forEach(cb => notifiedIds.current.add(cb.id));
        
        if (newCallbacks.length === 1) {
          toast({
            title: "📞 Callback Due",
            description: `${newCallbacks[0].company_name} is waiting for your call`,
            duration: 8000,
          });
        } else {
          toast({
            title: "📞 Callbacks Due",
            description: `You have ${newCallbacks.length} callbacks that need attention`,
            duration: 8000,
          });
        }
      }

      setDueCallbacks(callbacks);
    } catch (error) {
      console.error("Error in fetchDueCallbacks:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!user) return;

    fetchDueCallbacks();

    // Check every 60 seconds for due callbacks
    const interval = setInterval(fetchDueCallbacks, 60000);

    return () => clearInterval(interval);
  }, [user, fetchDueCallbacks]);

  return {
    dueCallbacks,
    dueCount: dueCallbacks.length,
    loading,
    refetch: fetchDueCallbacks,
  };
}
