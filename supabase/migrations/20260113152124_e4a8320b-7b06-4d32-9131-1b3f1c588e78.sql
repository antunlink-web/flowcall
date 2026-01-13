
-- Drop the existing SELECT policy for leads
DROP POLICY IF EXISTS "All authenticated can view leads" ON public.leads;

-- Create a new SELECT policy that checks list access for agents
-- Admins/managers can see all leads, agents only see leads from lists they have access to
CREATE POLICY "Users can view leads based on role and list access" 
ON public.leads 
FOR SELECT 
USING (
  is_admin_or_manager(auth.uid())
  OR
  list_id IN (
    SELECT lu.list_id 
    FROM list_users lu 
    WHERE lu.user_id = auth.uid()
  )
);
