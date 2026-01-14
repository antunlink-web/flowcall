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
  const isInitialLoad = useRef(true);

  const fetchDueCallbacks = useCallback(async () => {
    if (!user) return;
    
    if (isInitialLoad.current) {
      setLoading(true);
    }
    
    try {
      const now = new Date().toISOString();
      
      // Single optimized query - just get count and basic info
      const { data, error } = await supabase
        .from("leads")
        .select(`
          id,
          callback_scheduled_at,
          data,
          list_id
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
        
        // Get company name - quick lookup
        let companyName = "Unknown";
        const companyFields = ["pavadinimas", "company", "company name", "name", "Pavadinimas", "Company"];
        for (const field of companyFields) {
          if (leadData[field] && typeof leadData[field] === "string") {
            companyName = leadData[field];
            break;
          }
        }

        // Get phone - quick lookup
        let phone = "";
        for (const key of Object.keys(leadData)) {
          if (key.toLowerCase().includes("phone") || key.toLowerCase().includes("tel")) {
            phone = String(leadData[key] || "");
            break;
          }
        }

        return {
          id: lead.id,
          company_name: companyName,
          phone,
          callback_scheduled_at: lead.callback_scheduled_at,
          list_name: "Queue",
        };
      });

      // Only show toast for NEW callbacks after initial load
      if (!isInitialLoad.current) {
        const newCallbacks = callbacks.filter(cb => !notifiedIds.current.has(cb.id));
        
        if (newCallbacks.length > 0) {
          newCallbacks.forEach(cb => notifiedIds.current.add(cb.id));
          
          toast({
            title: "📞 Callback Due",
            description: newCallbacks.length === 1 
              ? `${newCallbacks[0].company_name} is waiting for your call`
              : `You have ${newCallbacks.length} callbacks that need attention`,
            duration: 8000,
          });
        }
      } else {
        // On initial load, just mark all as notified
        callbacks.forEach(cb => notifiedIds.current.add(cb.id));
        isInitialLoad.current = false;
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

    // Check every 2 minutes for due callbacks (less frequent = faster)
    const interval = setInterval(fetchDueCallbacks, 120000);

    return () => clearInterval(interval);
  }, [user, fetchDueCallbacks]);

  return {
    dueCallbacks,
    dueCount: dueCallbacks.length,
    loading,
    refetch: fetchDueCallbacks,
  };
}
