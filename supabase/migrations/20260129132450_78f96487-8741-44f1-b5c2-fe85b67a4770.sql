
-- Update search_leads_with_access to use strict tenant isolation (no product_owner bypass)
CREATE OR REPLACE FUNCTION public.search_leads_with_access(search_term text, _user_id uuid)
RETURNS SETOF leads
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.*
  FROM leads l
  WHERE l.data::text ILIKE '%' || search_term || '%'
    -- CRITICAL: Strict tenant filter - user can only see their own tenant's data
    AND l.tenant_id = get_user_tenant_id(_user_id)
    AND (
      -- If user is admin or manager, they can see all leads in their tenant
      is_admin_or_manager(_user_id)
      OR
      -- Otherwise, user can only see leads from lists they have access to
      l.list_id IN (
        SELECT lu.list_id 
        FROM list_users lu 
        WHERE lu.user_id = _user_id
      )
    )
  ORDER BY l.created_at DESC
  LIMIT 100;
$$;
