-- Create a helper function to check if user belongs to same tenant as record
CREATE OR REPLACE FUNCTION public.is_same_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Product owners can access all tenants
    is_product_owner(_user_id)
    OR
    -- Regular users can only access their own tenant
    get_user_tenant_id(_user_id) = _tenant_id
  )
$$;

-- Create a combined check for admin/manager within same tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin_or_manager(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    is_product_owner(_user_id)
    OR
    (
      get_user_tenant_id(_user_id) = _tenant_id
      AND is_admin_or_manager(_user_id)
    )
  )
$$;

-- ========== LEADS TABLE ==========
DROP POLICY IF EXISTS "Users can view leads based on role and ownership" ON public.leads;
CREATE POLICY "Users can view leads based on role and ownership" 
ON public.leads FOR SELECT 
USING (
  is_same_tenant(auth.uid(), tenant_id)
  AND (
    is_admin_or_manager(auth.uid()) 
    OR claimed_by = auth.uid() 
    OR assigned_to = auth.uid()
    OR list_id IN (SELECT lu.list_id FROM list_users lu WHERE lu.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update leads they own or claim unclaimed" ON public.leads;
CREATE POLICY "Users can update leads they own or claim unclaimed" 
ON public.leads FOR UPDATE 
USING (
  is_same_tenant(auth.uid(), tenant_id)
  AND (
    claimed_by = auth.uid() 
    OR assigned_to = auth.uid() 
    OR is_admin_or_manager(auth.uid()) 
    OR claimed_by IS NULL
  )
);

DROP POLICY IF EXISTS "Admins and managers can delete leads" ON public.leads;
CREATE POLICY "Admins and managers can delete leads" 
ON public.leads FOR DELETE 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can insert leads" ON public.leads;
CREATE POLICY "Users can insert leads in their tenant" 
ON public.leads FOR INSERT 
WITH CHECK (is_same_tenant(auth.uid(), tenant_id));

-- ========== LISTS TABLE ==========
DROP POLICY IF EXISTS "Admins and managers can manage lists" ON public.lists;
CREATE POLICY "Admins and managers can manage lists" 
ON public.lists FOR ALL 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can view lists" ON public.lists;
CREATE POLICY "Users can view lists in their tenant" 
ON public.lists FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

-- ========== CAMPAIGNS TABLE ==========
DROP POLICY IF EXISTS "Admins and managers can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins and managers can manage campaigns" 
ON public.campaigns FOR ALL 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can view campaigns" ON public.campaigns;
CREATE POLICY "Users can view campaigns in their tenant" 
ON public.campaigns FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

-- ========== PROFILES TABLE ==========
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their tenant" 
ON public.profiles FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id) OR id = auth.uid());

-- ========== LIST_USERS TABLE ==========
DROP POLICY IF EXISTS "Admins and managers can manage list users" ON public.list_users;
CREATE POLICY "Admins and managers can manage list users" 
ON public.list_users FOR ALL 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can view list users" ON public.list_users;
CREATE POLICY "Users can view list users in their tenant" 
ON public.list_users FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

-- ========== EMAIL_TEMPLATES TABLE ==========
DROP POLICY IF EXISTS "Admins and managers can manage email templates" ON public.email_templates;
CREATE POLICY "Admins and managers can manage email templates" 
ON public.email_templates FOR ALL 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can view email templates" ON public.email_templates;
CREATE POLICY "Users can view email templates in their tenant" 
ON public.email_templates FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

-- ========== SMS_TEMPLATES TABLE ==========
DROP POLICY IF EXISTS "Admins and managers can manage sms templates" ON public.sms_templates;
CREATE POLICY "Admins and managers can manage sms templates" 
ON public.sms_templates FOR ALL 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can view sms templates" ON public.sms_templates;
CREATE POLICY "Users can view sms templates in their tenant" 
ON public.sms_templates FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

-- ========== CALL_SCRIPTS TABLE ==========
DROP POLICY IF EXISTS "Admins and managers can manage scripts" ON public.call_scripts;
CREATE POLICY "Admins and managers can manage scripts" 
ON public.call_scripts FOR ALL 
USING (is_tenant_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "All authenticated can view scripts" ON public.call_scripts;
CREATE POLICY "Users can view scripts in their tenant" 
ON public.call_scripts FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

-- ========== CALL_LOGS TABLE ==========
DROP POLICY IF EXISTS "Users can view own call logs or admins/managers view all" ON public.call_logs;
CREATE POLICY "Users can view call logs in their tenant" 
ON public.call_logs FOR SELECT 
USING (
  is_same_tenant(auth.uid(), tenant_id)
  AND (user_id = auth.uid() OR is_admin_or_manager(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert own call logs" ON public.call_logs;
CREATE POLICY "Users can insert call logs in their tenant" 
ON public.call_logs FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_same_tenant(auth.uid(), tenant_id));

-- ========== EMAIL_LOGS TABLE ==========
DROP POLICY IF EXISTS "Users can view own email logs or admins/managers view all" ON public.email_logs;
CREATE POLICY "Users can view email logs in their tenant" 
ON public.email_logs FOR SELECT 
USING (
  is_same_tenant(auth.uid(), tenant_id)
  AND (user_id = auth.uid() OR is_admin_or_manager(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert own email logs" ON public.email_logs;
CREATE POLICY "Users can insert email logs in their tenant" 
ON public.email_logs FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_same_tenant(auth.uid(), tenant_id));

-- ========== SMS_LOGS TABLE ==========
DROP POLICY IF EXISTS "Users can view own sms logs or admins/managers view all" ON public.sms_logs;
CREATE POLICY "Users can view sms logs in their tenant" 
ON public.sms_logs FOR SELECT 
USING (
  is_same_tenant(auth.uid(), tenant_id)
  AND (user_id = auth.uid() OR is_admin_or_manager(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert own sms logs" ON public.sms_logs;
CREATE POLICY "Users can insert sms logs in their tenant" 
ON public.sms_logs FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_same_tenant(auth.uid(), tenant_id));

-- ========== USER_INVITATIONS TABLE ==========
DROP POLICY IF EXISTS "All authenticated can view invitations" ON public.user_invitations;
CREATE POLICY "Users can view invitations in their tenant" 
ON public.user_invitations FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage invitations" ON public.user_invitations;
CREATE POLICY "Owners can manage invitations in their tenant" 
ON public.user_invitations FOR ALL 
USING (
  is_same_tenant(auth.uid(), tenant_id) 
  AND has_role(auth.uid(), 'owner'::app_role)
);

-- ========== ACCOUNT_SETTINGS TABLE ==========
DROP POLICY IF EXISTS "All authenticated can view account settings" ON public.account_settings;
CREATE POLICY "Users can view account settings in their tenant" 
ON public.account_settings FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage account settings" ON public.account_settings;
CREATE POLICY "Owners can manage account settings in their tenant" 
ON public.account_settings FOR ALL 
USING (
  is_same_tenant(auth.uid(), tenant_id) 
  AND has_role(auth.uid(), 'owner'::app_role)
);

-- ========== BRANDING_SETTINGS TABLE ==========
DROP POLICY IF EXISTS "Branding settings are viewable by everyone" ON public.branding_settings;
CREATE POLICY "Users can view branding in their tenant" 
ON public.branding_settings FOR SELECT 
USING (is_same_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Only owners can insert branding settings" ON public.branding_settings;
CREATE POLICY "Owners can insert branding in their tenant" 
ON public.branding_settings FOR INSERT 
WITH CHECK (
  is_same_tenant(auth.uid(), tenant_id) 
  AND has_role(auth.uid(), 'owner'::app_role)
);

DROP POLICY IF EXISTS "Only owners can update branding settings" ON public.branding_settings;
CREATE POLICY "Owners can update branding in their tenant" 
ON public.branding_settings FOR UPDATE 
USING (
  is_same_tenant(auth.uid(), tenant_id) 
  AND has_role(auth.uid(), 'owner'::app_role)
);