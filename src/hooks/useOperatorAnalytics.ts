import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OperatorStats {
  signups_today: number;
  trials_expiring_today: number;
  trials_expiring_tomorrow: number;
  inactive_orgs_48h: number;
  failed_calls_today: number;
  total_calls_today: number;
  active_paid_orgs: number;
  total_active_orgs: number;
  total_seats: number;
  total_calls_7d: number;
  total_active_users_7d: number;
  total_users: number;
  call_success_rate_7d: number;
  sms_total_7d: number;
  device_issues: number;
}

export interface OrgAnalytics {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  created_at: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  seat_count: number;
  max_seats: number | null;
  user_count: number;
  lead_count: number;
  list_count: number;
  calls_today: number;
  calls_7d: number;
  last_call_at: string | null;
  last_activity: string | null;
  active_users_7d: number;
  risk_level: "high" | "medium" | "low";
  plan_status: "unlimited" | "trial" | "expired" | "active";
}

export function useOperatorAnalytics() {
  const [stats, setStats] = useState<OperatorStats | null>(null);
  const [orgs, setOrgs] = useState<OrgAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes] = await Promise.all([
        supabase.rpc("get_operator_analytics"),
        supabase.rpc("get_org_analytics"),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as OperatorStats);
      if (orgsRes.data) setOrgs((orgsRes.data as unknown as OrgAnalytics[]) || []);
    } catch (err) {
      console.error("Failed to fetch operator analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { stats, orgs, loading, refetch: fetchAll };
}
