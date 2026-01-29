
-- Create a function to check tenant access for normal operations (excludes product_owner bypass)
CREATE OR REPLACE FUNCTION public.is_user_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_tenant_id(_user_id) = _tenant_id
$$;

-- Drop existing policies on lists table
DROP POLICY IF EXISTS "Users can view lists in their tenant" ON public.lists;
DROP POLICY IF EXISTS "Admins and managers can manage lists" ON public.lists;

-- Create new policies that enforce strict tenant isolation
-- Product owners should only see their OWN tenant's lists when operating normally
CREATE POLICY "Users can view lists in their tenant"
ON public.lists
FOR SELECT
USING (get_user_tenant_id(auth.uid()) = tenant_id);

CREATE POLICY "Admins and managers can manage lists"
ON public.lists
FOR ALL
USING (
  get_user_tenant_id(auth.uid()) = tenant_id 
  AND is_admin_or_manager(auth.uid())
);

-- Also fix the leads table policies for strict tenant isolation
DROP POLICY IF EXISTS "Users can view leads based on role and ownership" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads in their tenant" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads they own or claim unclaimed" ON public.leads;
DROP POLICY IF EXISTS "Admins and managers can delete leads" ON public.leads;

CREATE POLICY "Users can view leads based on role and ownership"
ON public.leads
FOR SELECT
USING (
  get_user_tenant_id(auth.uid()) = tenant_id
  AND (
    is_admin_or_manager(auth.uid())
    OR claimed_by = auth.uid()
    OR assigned_to = auth.uid()
    OR list_id IN (SELECT lu.list_id FROM list_users lu WHERE lu.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert leads in their tenant"
ON public.leads
FOR INSERT
WITH CHECK (get_user_tenant_id(auth.uid()) = tenant_id);

CREATE POLICY "Users can update leads they own or claim unclaimed"
ON public.leads
FOR UPDATE
USING (
  get_user_tenant_id(auth.uid()) = tenant_id
  AND (
    claimed_by = auth.uid()
    OR assigned_to = auth.uid()
    OR is_admin_or_manager(auth.uid())
    OR claimed_by IS NULL
  )
);

CREATE POLICY "Admins and managers can delete leads"
ON public.leads
FOR DELETE
USING (
  get_user_tenant_id(auth.uid()) = tenant_id
  AND is_admin_or_manager(auth.uid())
);

-- Fix list_users table
DROP POLICY IF EXISTS "Users can view list users in their tenant" ON public.list_users;
DROP POLICY IF EXISTS "Admins and managers can manage list users" ON public.list_users;

CREATE POLICY "Users can view list users in their tenant"
ON public.list_users
FOR SELECT
USING (get_user_tenant_id(auth.uid()) = tenant_id);

CREATE POLICY "Admins and managers can manage list users"
ON public.list_users
FOR ALL
USING (
  get_user_tenant_id(auth.uid()) = tenant_id
  AND is_admin_or_manager(auth.uid())
);
