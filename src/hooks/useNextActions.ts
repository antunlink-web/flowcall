import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

// ── Types ──────────────────────────────────────────────────────────

export type ActionType =
  | "call"
  | "retry_call"
  | "follow_up_call"
  | "send_sms"
  | "send_email"
  | "wait_for_reply"
  | "meeting"
  | "custom";

export type ActionStatus = "pending" | "completed" | "canceled" | "snoozed";
export type ActionPriority = "low" | "normal" | "high" | "urgent";
export type ActionSource = "manual" | "system" | "call_outcome" | "import" | "workflow";

export type NextAction = {
  id: string;
  tenant_id: string;
  lead_id: string;
  assigned_user_id: string | null;
  action_type: ActionType;
  title: string | null;
  description: string | null;
  due_at: string | null;
  scheduled_for: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  outcome: string | null;
  source: ActionSource;
  created_by: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
};

// ── Business hour helpers ──────────────────────────────────────────

function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

export function nextBusinessDay(from: Date, hour = 10, minute = 0): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (!isBusinessDay(d)) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function nextBusinessHour(from: Date): Date {
  const d = new Date(from);
  if (!isBusinessDay(d) || d.getHours() >= 17) {
    return nextBusinessDay(d, 10, 0);
  }
  if (d.getHours() < 9) {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

export function laterToday(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  if (d.getHours() >= 17) return nextBusinessDay(new Date(), 10, 0);
  return d;
}

export function tomorrowMorning(): Date {
  return nextBusinessDay(new Date(), 10, 0);
}

// ── Effective time helper ──────────────────────────────────────────

export function getEffectiveTime(action: NextAction): Date {
  const raw = action.snoozed_until || action.scheduled_for || action.due_at || action.created_at;
  return new Date(raw);
}

// ── Action labels for UI ──────────────────────────────────────────

export const actionTypeLabels: Record<string, string> = {
  call: "Call",
  retry_call: "Retry",
  follow_up_call: "Follow up",
  send_sms: "SMS",
  send_email: "Email",
  wait_for_reply: "Waiting",
  meeting: "Meeting",
  custom: "Task",
};

// ── Hooks ──────────────────────────────────────────────────────────

export function useNextActions(options?: { statusFilter?: ActionStatus[] }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const statusFilter = options?.statusFilter ?? ["pending", "snoozed"];

  return useQuery({
    queryKey: ["next-actions", tenant?.id, statusFilter],
    enabled: !!user && !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("next_actions")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .in("status", statusFilter)
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as NextAction[];
    },
  });
}

export function useLeadNextAction(leadId: string | undefined) {
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["next-action-lead", leadId],
    enabled: !!user && !!tenant?.id && !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("next_actions")
        .select("*")
        .eq("lead_id", leadId!)
        .in("status", ["pending", "snoozed"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as NextAction) || null;
    },
  });
}

// ── Complete active action for a lead ──────────────────────────────

async function completeActiveActions(leadId: string, outcome?: string) {
  const { data: active } = await supabase
    .from("next_actions")
    .select("id")
    .eq("lead_id", leadId)
    .in("status", ["pending", "snoozed"]);

  if (active && active.length > 0) {
    const ids = active.map((a) => a.id);
    await supabase
      .from("next_actions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        outcome: outcome || null,
      })
      .in("id", ids);
  }
}

// ── Create next action (auto-closing previous) ────────────────────

export function useCreateNextAction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (params: {
      leadId: string;
      actionType: ActionType;
      scheduledFor?: string | null;
      dueAt?: string | null;
      title?: string | null;
      description?: string | null;
      priority?: ActionPriority;
      source?: ActionSource;
      outcome?: string | null;
      snoozedUntil?: string | null;
      status?: ActionStatus;
    }) => {
      if (!tenant || !user) throw new Error("No tenant/user");

      // Close any existing active actions for this lead
      await completeActiveActions(params.leadId, "superseded");

      const { error } = await supabase.from("next_actions").insert({
        tenant_id: tenant.id,
        lead_id: params.leadId,
        assigned_user_id: user.id,
        action_type: params.actionType,
        scheduled_for: params.scheduledFor || null,
        due_at: params.dueAt || null,
        title: params.title || null,
        description: params.description || null,
        priority: params.priority || "normal",
        source: params.source || "manual",
        outcome: params.outcome || null,
        snoozed_until: params.snoozedUntil || null,
        status: params.status || "pending",
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-actions"] });
      qc.invalidateQueries({ queryKey: ["next-action-lead"] });
      qc.invalidateQueries({ queryKey: ["flow-leads"] });
    },
  });
}

// ── Complete a specific action ─────────────────────────────────────

export function useCompleteNextAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionId, outcome }: { actionId: string; outcome?: string }) => {
      const { error } = await supabase
        .from("next_actions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          outcome: outcome || null,
        })
        .eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-actions"] });
      qc.invalidateQueries({ queryKey: ["next-action-lead"] });
    },
  });
}

// ── Snooze an action ───────────────────────────────────────────────

export function useSnoozeNextAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionId, until }: { actionId: string; until: string }) => {
      const { error } = await supabase
        .from("next_actions")
        .update({
          status: "snoozed",
          snoozed_until: until,
        })
        .eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-actions"] });
      qc.invalidateQueries({ queryKey: ["next-action-lead"] });
    },
  });
}

// ── Cancel an action ───────────────────────────────────────────────

export function useCancelNextAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionId }: { actionId: string }) => {
      const { error } = await supabase
        .from("next_actions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-actions"] });
      qc.invalidateQueries({ queryKey: ["next-action-lead"] });
    },
  });
}

// ── Handle call outcome (orchestration) ────────────────────────────

export function useHandleCallOutcome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({
      leadId,
      outcome,
      notes,
      callbackTime,
    }: {
      leadId: string;
      outcome: string;
      notes?: string;
      callbackTime?: string;
    }) => {
      if (!user || !tenant) throw new Error("No user/tenant");

      // 1. Complete active actions
      await completeActiveActions(leadId, outcome);

      // 2. Update lead status + log call
      const leadUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        last_contacted_at: new Date().toISOString(),
        call_attempts: undefined, // will be incremented below
      };

      // Increment call_attempts
      const { data: currentLead } = await supabase
        .from("leads")
        .select("call_attempts, status")
        .eq("id", leadId)
        .single();

      leadUpdates.call_attempts = (currentLead?.call_attempts || 0) + 1;

      // Map outcome to pipeline status
      switch (outcome) {
        case "answered":
          leadUpdates.status = "contacted";
          break;
        case "no_answer":
          leadUpdates.status = "no_answer";
          break;
        case "interested":
          leadUpdates.status = "interested";
          break;
        case "not_interested":
          leadUpdates.status = "not_interested";
          break;
        case "callback_requested":
          leadUpdates.status = "contacted";
          break;
        case "wrong_number":
          leadUpdates.status = "lost";
          break;
      }

      await supabase.from("leads").update(leadUpdates).eq("id", leadId);

      // 3. Log call
      await supabase.from("call_logs").insert({
        lead_id: leadId,
        user_id: user.id,
        outcome,
        notes: notes || null,
        tenant_id: tenant.id,
      });

      // 4. Create next action based on outcome
      const nbd = nextBusinessDay(new Date()).toISOString();

      switch (outcome) {
        case "no_answer":
          await supabase.from("next_actions").insert({
            tenant_id: tenant.id,
            lead_id: leadId,
            assigned_user_id: user.id,
            action_type: "retry_call",
            scheduled_for: nbd,
            source: "call_outcome",
            outcome: "no_answer",
            created_by: user.id,
            status: "pending",
            priority: "normal",
          });
          break;

        case "interested":
          await supabase.from("next_actions").insert({
            tenant_id: tenant.id,
            lead_id: leadId,
            assigned_user_id: user.id,
            action_type: "follow_up_call",
            scheduled_for: nbd,
            source: "call_outcome",
            outcome: "interested",
            created_by: user.id,
            status: "pending",
            priority: "high",
          });
          break;

        case "callback_requested":
          await supabase.from("next_actions").insert({
            tenant_id: tenant.id,
            lead_id: leadId,
            assigned_user_id: user.id,
            action_type: "follow_up_call",
            scheduled_for: callbackTime || nbd,
            source: "call_outcome",
            outcome: "callback_requested",
            created_by: user.id,
            status: "pending",
            priority: "high",
          });
          break;

        // answered, not_interested, wrong_number → no auto next action
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-actions"] });
      qc.invalidateQueries({ queryKey: ["next-action-lead"] });
      qc.invalidateQueries({ queryKey: ["flow-leads"] });
      qc.invalidateQueries({ queryKey: ["flow-stats"] });
    },
  });
}
