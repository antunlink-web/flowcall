-- Add list_id to email_templates, sms_templates, and call_scripts
ALTER TABLE public.email_templates ADD COLUMN list_id uuid REFERENCES public.lists(id) ON DELETE CASCADE;
ALTER TABLE public.sms_templates ADD COLUMN list_id uuid REFERENCES public.lists(id) ON DELETE CASCADE;
ALTER TABLE public.call_scripts ADD COLUMN list_id uuid REFERENCES public.lists(id) ON DELETE CASCADE;

-- Create indexes for faster lookups
CREATE INDEX idx_email_templates_list_id ON public.email_templates(list_id);
CREATE INDEX idx_sms_templates_list_id ON public.sms_templates(list_id);
CREATE INDEX idx_call_scripts_list_id ON public.call_scripts(list_id);

-- Add email configuration to lists table
ALTER TABLE public.lists ADD COLUMN email_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Update RLS policies to allow list-based access
DROP POLICY IF EXISTS "Admins and managers can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "All authenticated can view email templates" ON public.email_templates;

CREATE POLICY "Admins and managers can manage email templates" 
ON public.email_templates 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "All authenticated can view email templates" 
ON public.email_templates 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage sms templates" ON public.sms_templates;
DROP POLICY IF EXISTS "All authenticated can view sms templates" ON public.sms_templates;

CREATE POLICY "Admins and managers can manage sms templates" 
ON public.sms_templates 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "All authenticated can view sms templates" 
ON public.sms_templates 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage scripts" ON public.call_scripts;
DROP POLICY IF EXISTS "All authenticated can view scripts" ON public.call_scripts;

CREATE POLICY "Admins and managers can manage scripts" 
ON public.call_scripts 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "All authenticated can view scripts" 
ON public.call_scripts 
FOR SELECT 
USING (true);