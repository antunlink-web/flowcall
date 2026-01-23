-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update leads they claimed or admins/managers" ON public.leads;

-- Create new update policy that allows:
-- 1. Users who already claimed the lead
-- 2. Users who are assigned to the lead
-- 3. Admins and managers
-- 4. Any authenticated user can claim an unclaimed lead (claimed_by is null)
CREATE POLICY "Users can update leads they own or claim unclaimed"
ON public.leads
FOR UPDATE
USING (
  (claimed_by = auth.uid()) 
  OR (assigned_to = auth.uid()) 
  OR is_admin_or_manager(auth.uid())
  OR (claimed_by IS NULL)
);