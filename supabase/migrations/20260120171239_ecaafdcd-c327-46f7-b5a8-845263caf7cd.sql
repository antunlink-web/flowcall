-- Create function to check if user is product owner
CREATE OR REPLACE FUNCTION public.is_product_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'product_owner'
  )
$$;

-- Create function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- RLS policies for tenants table
CREATE POLICY "Product owners can manage all tenants"
ON public.tenants FOR ALL
USING (is_product_owner(auth.uid()));

CREATE POLICY "Users can view their own tenant"
ON public.tenants FOR SELECT
USING (id = get_user_tenant_id(auth.uid()));

-- Update the handle_new_user function to support product_owner and tenant registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _is_first_user boolean;
BEGIN
  -- Check if this is the very first user in the system
  SELECT COUNT(*) = 0 INTO _is_first_user FROM public.profiles;
  
  -- Get tenant_id from user metadata if provided (for tenant registration)
  _tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    _tenant_id
  );
  
  -- First ever user becomes product_owner
  IF _is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'product_owner');
  -- If tenant_id is provided and user metadata says they're the tenant owner
  ELSIF _tenant_id IS NOT NULL AND (NEW.raw_user_meta_data ->> 'is_tenant_owner')::boolean = true THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  ELSE
    -- Regular user within a tenant
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update is_admin_or_manager to include product_owner
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'account_manager', 'product_owner')
  )
$$;