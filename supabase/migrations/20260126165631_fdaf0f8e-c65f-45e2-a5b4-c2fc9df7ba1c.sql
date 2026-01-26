-- Create a function to get lead counts by list efficiently
CREATE OR REPLACE FUNCTION public.get_list_lead_counts(list_ids uuid[])
RETURNS TABLE (
  list_id uuid,
  total bigint,
  new_count bigint,
  callback_count bigint,
  won_count bigint,
  lost_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.list_id,
    COUNT(*)::bigint as total,
    COUNT(*) FILTER (WHERE l.status = 'new')::bigint as new_count,
    COUNT(*) FILTER (WHERE l.status = 'callback')::bigint as callback_count,
    COUNT(*) FILTER (WHERE l.status = 'won')::bigint as won_count,
    COUNT(*) FILTER (WHERE l.status = 'lost')::bigint as lost_count
  FROM leads l
  WHERE l.list_id = ANY(list_ids)
  GROUP BY l.list_id;
$$;