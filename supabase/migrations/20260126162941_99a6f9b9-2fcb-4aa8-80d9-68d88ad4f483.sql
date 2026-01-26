-- Drop existing policy and create new one that includes product_owner
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;

CREATE POLICY "Owners and product owners can manage roles" 
ON public.user_roles 
FOR ALL 
USING (
  has_role(auth.uid(), 'owner'::app_role) 
  OR is_product_owner(auth.uid())
);