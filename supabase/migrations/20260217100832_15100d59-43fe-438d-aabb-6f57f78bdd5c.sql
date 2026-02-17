
-- Drop the restrictive SELECT policy
DROP POLICY "Users can view comments in their tenant" ON public.lead_comments;

-- Create a new policy that lets all tenant users see all comments
CREATE POLICY "Users can view comments in their tenant"
ON public.lead_comments
FOR SELECT
USING (is_same_tenant(auth.uid(), tenant_id));
