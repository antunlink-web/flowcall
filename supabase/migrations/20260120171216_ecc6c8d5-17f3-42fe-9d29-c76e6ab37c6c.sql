-- Create tenants table for multi-tenancy
CREATE TABLE public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    subdomain text NOT NULL UNIQUE,
    logo_url text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT subdomain_format CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
);

-- Add tenant_id to profiles
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- Add tenant_id to all relevant tables
ALTER TABLE public.lists ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.leads ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.campaigns ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.call_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.email_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sms_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.call_scripts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.email_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sms_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.smtp_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_devices ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_invitations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.list_users ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.dial_requests ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sms_requests ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.branding_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.account_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create indexes for tenant_id columns
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX idx_lists_tenant_id ON public.lists(tenant_id);
CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX idx_campaigns_tenant_id ON public.campaigns(tenant_id);
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);

-- Update updated_at trigger for tenants
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();