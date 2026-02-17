
CREATE TABLE public.lead_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert comments in their tenant"
ON public.lead_comments FOR INSERT
WITH CHECK ((user_id = auth.uid()) AND is_same_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can view comments in their tenant"
ON public.lead_comments FOR SELECT
USING (is_same_tenant(auth.uid(), tenant_id) AND ((user_id = auth.uid()) OR is_admin_or_manager(auth.uid())));

CREATE POLICY "Users can delete own comments"
ON public.lead_comments FOR DELETE
USING (user_id = auth.uid());
