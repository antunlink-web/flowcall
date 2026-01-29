-- Allow tenant owners to update their own tenant's seat_count and other settings
CREATE POLICY "Owners can update their own tenant"
ON public.tenants
FOR UPDATE
USING (
  id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner'::app_role)
);