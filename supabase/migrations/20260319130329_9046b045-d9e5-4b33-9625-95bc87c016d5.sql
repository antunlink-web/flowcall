CREATE OR REPLACE FUNCTION public.get_org_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      GREATEST(
        COALESCE((SELECT max(cl2.created_at) FROM call_logs cl2 WHERE cl2.tenant_id = t.id), t.created_at),
        COALESCE((SELECT max(l2.updated_at) FROM leads l2 WHERE l2.tenant_id = t.id), t.created_at)
      ) as last_activity,
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