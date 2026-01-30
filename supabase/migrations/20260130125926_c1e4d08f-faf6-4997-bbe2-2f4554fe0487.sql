-- Allow product owners to manage platform-level account settings (tenant_id IS NULL)
CREATE POLICY "Product owners can manage platform settings"
ON public.account_settings
FOR ALL
USING (
  is_product_owner(auth.uid()) AND tenant_id IS NULL
)
WITH CHECK (
  is_product_owner(auth.uid()) AND tenant_id IS NULL
);