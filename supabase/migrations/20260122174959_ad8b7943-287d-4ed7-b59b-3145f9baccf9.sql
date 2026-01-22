-- Drop the existing SELECT policy on leads
DROP POLICY IF EXISTS "Users can view leads based on role and ownership" ON public.leads;

-- Create an improved SELECT policy that allows agents to see leads from their assigned lists
CREATE POLICY "Users can view leads based on role and ownership" 
ON public.leads 
FOR SELECT 
USING (
  is_admin_or_manager(auth.uid()) 
  OR (claimed_by = auth.uid()) 
  OR (assigned_to = auth.uid())
  OR (
    -- Agents can also see unclaimed leads from lists they are assigned to
    list_id IN (
      SELECT lu.list_id 
      FROM public.list_users lu 
      WHERE lu.user_id = auth.uid()
    )
  )
);