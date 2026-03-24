import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

export type FlowLead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: string;
  notes: string;
  nextAction: string | null;
  callbackAt: string | null;
  lastContactedAt: string | null;
  callAttempts: number;
  rawData: Record<string, unknown>;
};

function parseLeadData(row: any): FlowLead {
  const d = (row.data as Record<string, unknown>) || {};
  return {
    id: row.id,
    name: String(d.name || d.Name || d.ime || d.Ime || d.full_name || ""),
    company: String(d.company || d.Company || d.tvrtka || d.Tvrtka || ""),
    phone: String(d.phone || d.Phone || d.telefon || d.Telefon || d.tel || ""),
    email: String(d.email || d.Email || d.e_mail || ""),
    status: row.status,
    notes: String(d.notes || d.Notes || d.napomena || ""),
    nextAction: d.next_action as string | null,
    callbackAt: row.callback_scheduled_at,
    lastContactedAt: row.last_contacted_at,
    callAttempts: row.call_attempts || 0,
    rawData: d,
  };
}

export function useFlowLeads() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["flow-leads", tenant?.id],
    enabled: !!user && !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map(parseLeadData);
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ leadId, status, callbackAt, notes }: { leadId: string; status: string; callbackAt?: string | null; notes?: string }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (callbackAt !== undefined) updates.callback_scheduled_at = callbackAt;
      if (status !== "new") updates.last_contacted_at = new Date().toISOString();
      updates.call_attempts = undefined; // will increment via RPC or manually

      const { error } = await supabase.from("leads").update(updates).eq("id", leadId);
      if (error) throw error;

      // Log the call
      if (user && tenant) {
        await supabase.from("call_logs").insert({
          lead_id: leadId,
          user_id: user.id,
          outcome: status,
          notes: notes || null,
          tenant_id: tenant.id,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flow-leads"] }),
  });
}

export function useTodayStats() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["flow-stats", tenant?.id],
    enabled: !!user && !!tenant?.id,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("call_logs")
        .select("outcome")
        .eq("tenant_id", tenant!.id)
        .eq("user_id", user!.id)
        .gte("created_at", today.toISOString());

      if (error) throw error;
      const logs = data || [];
      const total = logs.length;
      const answered = logs.filter((l) => l.outcome === "answered" || l.outcome === "interested" || l.outcome === "not_interested").length;
      const interested = logs.filter((l) => l.outcome === "interested").length;

      return {
        calls: total,
        pickups: answered,
        interested,
        conversionPct: total > 0 ? Math.round((interested / total) * 100) : 0,
      };
    },
  });
}
