-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view leads based on role and list access" ON public.leads;

-- Create new policy: agents only see their own claimed/assigned leads
CREATE POLICY "Users can view leads based on role and ownership"
ON public.leads
FOR SELECT
USING (
  is_admin_or_manager(auth.uid()) 
  OR claimed_by = auth.uid() 
  OR assigned_to = auth.uid()
);