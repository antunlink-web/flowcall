-- Update existing roles: admin -> owner, manager -> account_manager
UPDATE public.user_roles SET role = 'owner' WHERE role = 'admin';
UPDATE public.user_roles SET role = 'account_manager' WHERE role = 'manager';

-- Add agent role to all users who have owner or account_manager but don't have agent yet
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, 'agent'::app_role
FROM public.user_roles ur
WHERE ur.role IN ('owner', 'account_manager')
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur2 
  WHERE ur2.user_id = ur.user_id AND ur2.role = 'agent'
);

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- First user becomes owner + agent, others are just agents
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the is_admin_or_manager function to check for owner or account_manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'account_manager')
  )
$$;

-- Update RLS policies for account_settings
DROP POLICY IF EXISTS "Admins can manage account settings" ON public.account_settings;
CREATE POLICY "Owners can manage account settings"
ON public.account_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'));

-- Update RLS policies for user_invitations  
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Owners can manage invitations"
ON public.user_invitations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'));

-- Update RLS policies for user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'));

-- Update user_invitations table to use new role values
UPDATE public.user_invitations SET role = 'owner' WHERE role = 'admin';
UPDATE public.user_invitations SET role = 'account_manager' WHERE role = 'manager';