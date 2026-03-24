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
  nextActionType: string | null; // call | follow_up | retry | none
  nextActionAt: string | null;
  callbackAt: string | null;
  lastContactedAt: string | null;
  callAttempts: number;
  rawData: Record<string, unknown>;
};

function parseLeadData(row: any): FlowLead {
  const d = (row.data as Record<string, unknown>) || {};

  // Flexible field mapping — supports English, Croatian, and common aliases
  const name =
    String(d.name || d.Name || d.ime || d.Ime || d.full_name || d.contact || d.Contact || "");
  const company =
    String(d.company || d.Company || d.tvrtka || d.Tvrtka || d.firma || d.Firma || "");
  const phone =
    String(d.phone || d.Phone || d.telefon || d.Telefon || d.tel || d.Tel || d.mobitel || "");
  const email =
    String(d.email || d.Email || d.e_mail || d["e-mail"] || "");
  const notes =
    String(d.notes || d.Notes || d.napomena || d.Napomena || d.komentar || "");

  return {
    id: row.id,
    name,
    company,
    phone,
    email,
    status: row.status,
    notes,
    nextActionType: row.next_action_type || null,
    nextActionAt: row.next_action_at || null,
    callbackAt: row.callback_scheduled_at,
    lastContactedAt: row.last_contacted_at,
    callAttempts: row.call_attempts || 0,
    rawData: d,
  };
}

/** Derive a next-action from existing fields when next_action_type is not explicitly set */
function deriveNextAction(lead: FlowLead): { type: string; at: string | null } {
  if (lead.nextActionType) return { type: lead.nextActionType, at: lead.nextActionAt };
  if (lead.callbackAt) return { type: "callback", at: lead.callbackAt };
  if (lead.status === "callback") return { type: "retry", at: lead.callbackAt };
  if (lead.status === "new" && lead.callAttempts === 0) return { type: "call", at: null };
  if (lead.status === "no_answer") return { type: "retry", at: null };
  return { type: "none", at: null };
}

export { deriveNextAction };

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
    mutationFn: async ({
      leadId,
      status,
      nextActionType,
      nextActionAt,
      notes,
    }: {
      leadId: string;
      status: string;
      nextActionType?: string | null;
      nextActionAt?: string | null;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Map outcome to next action fields
      if (nextActionType !== undefined) {
        updates.next_action_type = nextActionType;
        updates.next_action_at = nextActionAt || null;
      } else {
        // Auto-derive next action from status
        switch (status) {
          case "interested":
            updates.next_action_type = "follow_up";
            updates.next_action_at = new Date(Date.now() + 86400000).toISOString(); // +1 day
            break;
          case "no_answer":
            updates.next_action_type = "retry";
            updates.next_action_at = new Date(Date.now() + 7200000).toISOString(); // +2 hours
            break;
          case "callback":
            updates.next_action_type = "call";
            updates.callback_scheduled_at = nextActionAt || new Date(Date.now() + 3600000).toISOString();
            updates.next_action_at = updates.callback_scheduled_at;
            break;
          case "answered":
            updates.next_action_type = "follow_up";
            updates.next_action_at = new Date(Date.now() + 86400000).toISOString();
            break;
          case "not_interested":
            updates.next_action_type = null;
            updates.next_action_at = null;
            break;
        }
      }

      if (status !== "new") {
        updates.last_contacted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", leadId);
      if (error) throw error;

      // Log the call in call_logs (activity history)
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow-leads"] });
      qc.invalidateQueries({ queryKey: ["flow-stats"] });
    },
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
      const answered = logs.filter(
        (l) => l.outcome === "answered" || l.outcome === "interested" || l.outcome === "not_interested"
      ).length;
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
