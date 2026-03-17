
-- Function to get operator control center analytics
CREATE OR REPLACE FUNCTION public.get_operator_analytics()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  today_start timestamptz := date_trunc('day', now());
  week_start timestamptz := now() - interval '7 days';
  two_days_ago timestamptz := now() - interval '48 hours';
BEGIN
  SELECT json_build_object(
    -- TODAY PANEL
    'signups_today', (SELECT count(*) FROM tenants WHERE created_at >= today_start),
    'trials_expiring_today', (SELECT count(*) FROM tenants WHERE trial_end_date::date = CURRENT_DATE AND status = 'active'),
    'trials_expiring_tomorrow', (SELECT count(*) FROM tenants WHERE trial_end_date::date = CURRENT_DATE + 1 AND status = 'active'),
    'inactive_orgs_48h', (
      SELECT count(*) FROM tenants t 
      WHERE t.status = 'active' 
      AND NOT EXISTS (
        SELECT 1 FROM call_logs cl WHERE cl.tenant_id = t.id AND cl.created_at >= two_days_ago
      )
      AND NOT EXISTS (
        SELECT 1 FROM leads l WHERE l.tenant_id = t.id AND l.updated_at >= two_days_ago
      )
    ),
    'failed_calls_today', (SELECT count(*) FROM call_logs WHERE outcome IN ('no_answer', 'busy') AND created_at >= today_start),
    'total_calls_today', (SELECT count(*) FROM call_logs WHERE created_at >= today_start),
    
    -- MONEY PANEL
    'active_paid_orgs', (SELECT count(*) FROM tenants WHERE status = 'active' AND (trial_end_date IS NULL OR trial_end_date > now() OR trial_end_date = '2099-12-31T00:00:00Z'::timestamptz)),
    'total_active_orgs', (SELECT count(*) FROM tenants WHERE status = 'active'),
    'total_seats', (SELECT COALESCE(sum(seat_count), 0) FROM tenants WHERE status = 'active'),
    
    -- PRODUCT HEALTH
    'total_calls_7d', (SELECT count(*) FROM call_logs WHERE created_at >= week_start),
    'total_active_users_7d', (SELECT count(DISTINCT user_id) FROM call_logs WHERE created_at >= week_start),
    'total_users', (SELECT count(*) FROM profiles),
    
    -- SYSTEM STATUS
    'call_success_rate_7d', (
      SELECT CASE 
        WHEN count(*) = 0 THEN 0
        ELSE round((count(*) FILTER (WHERE outcome = 'answered')::numeric / count(*)::numeric) * 100, 1)
      END
      FROM call_logs WHERE created_at >= week_start
    ),
    'sms_total_7d', (SELECT count(*) FROM sms_logs WHERE created_at >= week_start),
    'device_issues', (
      SELECT count(*) FROM user_devices 
      WHERE is_active = true 
      AND last_seen_at < now() - interval '5 minutes'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get per-org analytics for churn radar & org table
CREATE OR REPLACE FUNCTION public.get_org_analytics()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(org_data))
  INTO result
  FROM (
    SELECT 
      t.id,
      t.name,
      t.subdomain,
      t.status,
      t.created_at,
      t.trial_start_date,
      t.trial_end_date,
      t.seat_count,
      t.max_seats,
      (SELECT count(*) FROM profiles p WHERE p.tenant_id = t.id) as user_count,
      (SELECT count(*) FROM leads l WHERE l.tenant_id = t.id) as lead_count,
      (SELECT count(*) FROM lists li WHERE li.tenant_id = t.id) as list_count,
      (SELECT count(*) FROM call_logs cl WHERE cl.tenant_id = t.id AND cl.created_at >= now() - interval '24 hours') as calls_today,
      (SELECT count(*) FROM call_logs cl WHERE cl.tenant_id = t.id AND cl.created_at >= now() - interval '7 days') as calls_7d,
      (SELECT max(cl.created_at) FROM call_logs cl WHERE cl.tenant_id = t.id) as last_call_at,
      (SELECT max(GREATEST(
        COALESCE((SELECT max(cl2.created_at) FROM call_logs cl2 WHERE cl2.tenant_id = t.id), t.created_at),
        COALESCE((SELECT max(l2.updated_at) FROM leads l2 WHERE l2.tenant_id = t.id), t.created_at)
      ))) as last_activity,
      (SELECT count(DISTINCT cl.user_id) FROM call_logs cl WHERE cl.tenant_id = t.id AND cl.created_at >= now() - interval '7 days') as active_users_7d,
      CASE
        WHEN t.trial_end_date IS NOT NULL AND t.trial_end_date <= now() + interval '2 days' AND t.trial_end_date > now() THEN 'high'
        WHEN (SELECT count(*) FROM call_logs cl WHERE cl.tenant_id = t.id AND cl.created_at >= now() - interval '7 days') = 0 THEN 'high'
        WHEN (SELECT count(*) FROM call_logs cl WHERE cl.tenant_id = t.id AND cl.created_at >= now() - interval '48 hours') = 0 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      CASE
        WHEN t.trial_end_date = '2099-12-31T00:00:00+00'::timestamptz THEN 'unlimited'
        WHEN t.trial_end_date IS NOT NULL AND t.trial_end_date > now() THEN 'trial'
        WHEN t.trial_end_date IS NOT NULL AND t.trial_end_date <= now() THEN 'expired'
        ELSE 'active'
      END as plan_status
    FROM tenants t
    WHERE t.status != 'pending'
    ORDER BY t.created_at DESC
  ) org_data;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;
